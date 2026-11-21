#!/usr/bin/env python3
"""The surfaces of the dot version (ドット版): the floors and walls of the house drawn from the game-kit sprite-stack library's
building parts (designed pixel parts), not the root's photo textures made blocky.

    python tools/dot/surfaces.py --kit ../kit-kushidot

Each texture id the house uses (data/plan.json floorTex / wallTex, js/ext/house.js TX(...)) that has a fitting building part is
drawn from it: a floor part is seen from above (the top voxel of each column), a wall part from the front (the front voxel of each
row); the voxels' height (or depth) shades them a little, so boards, mats and stones keep their relief. 65 px = 1.625 m, cut square
so it tiles. Writes dot/assets/textures/<id>.png and dot/assets/textures/catalog.json: the root catalog with these entries swapped
(every other id still points at the root's file, ../../../assets/textures/...). game.patch.json points recipes.textures there.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'dot', 'assets', 'textures')
sys.path.insert(0, HERE)
from stacks import load  # noqa: E402

# texture id of the game -> (library part, view)
SURFACES = {
    'dirt_floor': ('building-terrain-dirt-floor', 'top'),          # 土間, the earth corridors
    'planks_worn': ('building-terrain-planks-worn', 'top'),        # 店の間, 作業場
    'tatami_old': ('building-surface-floor-tatami', 'top'),        # 中の間, 奥の間
    'engawa_boards': ('building-floor-engawa-boards', 'top'),      # 渡り廊下
    'planks_dark': ('building-terrain-planks-dark', 'top'),        # 板の間 (and the timber of the house)
    'clay_wall': ('building-institution-wall-plaster-yellowed', 'front'),   # the rooms' walls: old yellowed plaster (the clay part has a hole that would repeat)
    'wall_clay_stained': ('building-finish-dark-plank-wall', 'front'),   # 表の土間, 作業場: dark boards
    'plaster_soot': ('building-unique-ceiling-soot-plaster', 'top'),     # 走り庭, 燻しの間: soot-black plaster
    'stone_wall': ('building-worn-wall-stone', 'front'),           # the cellar's stone
}
TILE = 65
MPP = 0.025


def view(vol, how):
    s = vol[..., 3] > 0
    X, Y, Z = vol.shape[:3]
    if how == 'top':
        # the highest voxel of each column; rows = y (front at the bottom), columns = x
        h = np.where(s.any(2), Z - 1 - np.argmax(s[:, :, ::-1], axis=2), -1)
        img = np.zeros((Y, X, 3), float)
        for x in range(X):
            for y in range(Y):
                if h[x, y] >= 0:
                    img[y, x] = vol[x, y, h[x, y], :3]
        depth = h.T.astype(float)
    else:
        # the front voxel (largest y) of each row; rows = z from the top, columns = x
        f = np.where(s.any(1), Y - 1 - np.argmax(s[:, ::-1, :], axis=1), -1)   # (x, z)
        img = np.zeros((Z, X, 3), float)
        for x in range(X):
            for z in range(Z):
                if f[x, z] >= 0:
                    img[Z - 1 - z, x] = vol[x, f[x, z], z, :3]
        depth = f.T[::-1].astype(float)
    ok = depth >= 0
    lo, hi = depth[ok].min(), depth[ok].max()
    k = (depth - lo) / max(hi - lo, 1) if hi > lo else np.ones_like(depth)
    img *= (0.8 + 0.2 * k)[..., None]
    # holes (no voxel): the mean colour
    img[~ok] = img[ok].mean(0)
    return np.clip(img, 0, 255).astype(np.uint8)


def square(img, trim=0):
    img = img[trim:img.shape[0] - trim, trim:img.shape[1] - trim] if trim else img   # a part's bevelled edge would draw a seam
    h, w = img.shape[:2]
    n = min(h, w, TILE)
    y0, x0 = (h - n) // 2, (w - n) // 2
    return img[y0:y0 + n, x0:x0 + n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', required=True)
    ap.add_argument('--sheet', help='a review sheet of every surface (2 x 2 tiles each)')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(ROOT, 'assets', 'textures', 'catalog.json'), encoding='utf-8') as f:
        cat = json.load(f)
    entries = cat['textures'] if isinstance(cat, dict) and 'textures' in cat else cat
    done = []
    for e in entries:
        e['file'] = '../../../assets/textures/' + e['file']
        if e['id'] in SURFACES:
            lib, how = SURFACES[e['id']]
            vol, _ = load(a.kit, lib)
            img = square(view(vol, how), 1 if 'dirt' in lib else 0)   # the dirt part's bevelled edge draws a seam; mats and boards keep theirs
            Image.fromarray(img, 'RGB').save(os.path.join(OUT, f"{e['id']}.png"), optimize=True)
            n = img.shape[0]
            e.update({'file': f"{e['id']}.png", 'size': [n, n], 'repeat': [n * MPP, n * MPP], 'bytes': os.path.getsize(os.path.join(OUT, f"{e['id']}.png")),
                      'pixel': True, 'source': f'game-kit sprite-stack {lib} ({how})'})
            e.pop('sha256', None)
            done.append((e['id'], lib, img))
    with open(os.path.join(OUT, 'catalog.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(cat, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{len(done)} surfaces -> {OUT}: ' + ', '.join(i for i, _, _ in done))
    if a.sheet:
        k = 4
        cell = TILE * 2 * k
        out = Image.new('RGB', (cell * 3 + 40, ((len(done) + 2) // 3) * (cell + 10)), (60, 60, 60))
        for i, (_, _, img) in enumerate(done):
            t = Image.fromarray(np.tile(img, (2, 2, 1)), 'RGB').resize((cell, cell), Image.NEAREST)
            out.paste(t, ((i % 3) * (cell + 20), (i // 3) * (cell + 10)))
        out.save(a.sheet)
        print('sheet', a.sheet)


if __name__ == '__main__':
    main()
