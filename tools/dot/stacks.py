#!/usr/bin/env python3
"""The sprite stacks of the dot version (ドット版), taken from the game-kit sprite-stack library and, where the library has no
fitting part, designed from one (never a voxelized game mesh, docs/sprite-stacks.md of game-kit).

    python tools/dot/stacks.py --kit ../kit-kushidot [--sheet D:/kushi-dot-stages/stacks.png]

Writes dot/assets/stacks/<id>.png (horizontal strip of slices, bottom first, like the library) and dot/assets/stacks/index.json.
The people (the worker, ハル, 千草) are not here: they are frame sets of the kit's shared motion rig
(tools/dot/figures.json -> game-kit tools/sprite-stacks/motion_frames.py -> dot/assets/figures/). Recoloured here:
  kake-kushi 清次さんの作りかけの櫛: the library's comb in raw, unpolished boxwood
  koteko     鉄の梃子: the library's crowbar in black iron
"""
import argparse
import json
import os
import random
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'dot', 'assets', 'stacks')

# library parts used as they are: id in the dot version -> library id
PLAIN = {
    'comb': 'game-kushi-comb', 'teshoku': 'game-kushi-teshoku', 'matches': 'game-kushi-matches', 'letter': 'game-kushi-letter-1',
    'old-fuda': 'game-kushi-old-fuda', 'phone': 'game-kushi-phone', 'sheet': 'game-kushi-visit-sheet',
    'kamado': 'game-kushi-HASHIRI_KAMADO', 'case': 'game-kushi-MISE_CASE', 'tea': 'game-kushi-MISE_TEA', 'ihai': 'game-kushi-NAKA_IHAI',
    'kurodenwa': 'game-kushi-NAKA_PHONE', 'tansu': 'game-kushi-NAKA_TANSU', 'shoes': 'game-kushi-OMOTE_SHOES',
    'kyodai': 'kushi-kyodai', 'tansu-kimono': 'kushi-tansu-kimono', 'kiln': 'kushi-smoke-kiln', 'tsuge-boards': 'kushi-tsuge-boards',
    'boards-hair': 'kushi-boards-hair', 'kimono-remains': 'kushi-indigo-kimono-remains', 'burnt-teshoku': 'kushi-burnt-teshoku',
    'wedding-photo': 'kushi-wedding-photo',
}


# the mood props (kit 1.20.1 atmosphere parts, K1 和 and K5 lights / rituals), placed by dot/js/dot/props.js. A part with emissive
# voxels (catalog "emissive": its glowing colours) is split in two: <id> (the body) and <id>-glow (only the glowing voxels, drawn
# unlit), both cut from the same box so they stay in register
PROPS = {
    'bangasa': 'atmos-k1-bangasa', 'morishio': 'atmos-k1-morishio-crumbled', 'hibachi': 'atmos-k1-hibachi',
    'ichimatsu': 'atmos-k1-ichimatsu', 'andon': 'atmos-k5-andon', 'kouro': 'atmos-k1-kouro-ash', 'mizugame': 'atmos-k1-mizugame',
    'tsukemono': 'atmos-k1-tsukemono', 'andon-torn': 'atmos-k1-andon-torn', 'futon-rolled': 'atmos-k1-futon-rolled',
    'seoikago': 'atmos-k1-seoikago', 'nata-stump': 'atmos-k1-nata-stump', 'tawara': 'atmos-k1-tawara',
    'box-sealed': 'atmos-k5-box-sealed', 'ofuda-wall': 'atmos-k5-ofuda-wall', 'box-chained': 'atmos-k5-box-chained',
    'mirror-cloth': 'atmos-k5-mirror-cloth', 'candle-fallen': 'atmos-k5-candle-fallen', 'byobu-sakasa': 'atmos-k1-byobu-sakasa',
    'kiku-oke': 'atmos-k1-kiku-oke',
}
# 2.2: the 札の家 parts (kit 1.20.2 Q1-Q5, ids kushi-q*), placed room by room by dot/js/dot/props-rooms.js; read from --qkit (kit main)
QPROPS = {
    'q-geta': 'kushi-q5-child-geta', 'q-photo-down': 'kushi-q5-photo-facedown', 'q-salt-jar': 'kushi-q5-salt-jar',
    'q-ohajiki': 'kushi-q5-ohajiki', 'q-nail-box': 'kushi-q5-nail-box', 'q-charcoal': 'kushi-q4-charcoal-sack',
    'q-wet-feet': 'kushi-q5-foot-wet-line', 'q-mushiro': 'kushi-q4-mushiro', 'q-ash-pile': 'kushi-q4-ash-pile',
    'q-sake': 'kushi-q4-offering-sake', 'q-fuda-ash': 'kushi-q5-fuda-ash',
}


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def save_glow(vol, e, out_id, meta, index):
    """body and glow of one part, cut from the same box"""
    solid = vol[..., 3] > 0
    xs, ys, zs = np.where(solid)
    vol = vol[xs.min():xs.max() + 1, ys.min():ys.max() + 1, :zs.max() + 1]
    em = np.zeros(vol.shape[:3], bool)
    for c in e.get('emissive') or []:
        r, g, b = hexrgb(c)
        em |= (vol[..., 3] > 0) & (vol[..., 0] == r) & (vol[..., 1] == g) & (vol[..., 2] == b)
    w, d, n = vol.shape[:3]
    parts = [(out_id, np.where(em[..., None], 0, vol))]
    if em.any():
        parts.append((f'{out_id}-glow', np.where(em[..., None], vol, 0)))
    for k, v in parts:
        strip = v.transpose(1, 2, 0, 3).reshape(d, n * w, 4)
        Image.fromarray(strip.astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'{k}.png'), optimize=True)
        index[k] = {'w': int(w), 'd': int(d), 'n': int(n), **meta, **({'glowOf': out_id} if k != out_id else {})}
    if em.any():
        index[out_id]['glow'] = f'{out_id}-glow'
        index[out_id]['glowColor'] = (e.get('glow') or {}).get('color')
    return int(em.sum())


def load(kit, lib_id):
    cats = load.cats if hasattr(load, 'cats') else {}
    load.cats = cats
    cat = cats.get(kit)
    if cat is None:   # one catalog per kit checkout (--kit and --qkit)
        with open(os.path.join(kit, 'assets', 'sprite-stacks', 'catalog.json'), encoding='utf-8') as f:
            cat = cats[kit] = {a['id']: a for a in json.load(f)['assets']}
    e = cat[lib_id]
    w, d = e['sliceSize']
    n = e['sliceCount']
    strip = Image.open(os.path.join(kit, 'assets', 'sprite-stacks', e['files']['slices']['file'])).convert('RGBA')
    a = np.asarray(strip).reshape(d, n, w, 4).transpose(2, 0, 1, 3).copy()   # (x, y, z, rgba); y grows toward the front
    a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
    return a, e


def save(vol, out_id, meta, index):
    # trim empty margins (x / y) and empty top slices, keep the bottom at z 0
    solid = vol[..., 3] > 0
    xs, ys, zs = np.where(solid)
    vol = vol[xs.min():xs.max() + 1, ys.min():ys.max() + 1, :zs.max() + 1]
    w, d, n = vol.shape[:3]
    strip = vol.transpose(1, 2, 0, 3).reshape(d, n * w, 4)
    Image.fromarray(strip.astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'{out_id}.png'), optimize=True)
    index[out_id] = {'w': int(w), 'd': int(d), 'n': int(n), **meta}
    return vol


def lum(c):
    return 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def sat(c):
    mx, mn = c[..., :3].max(-1).astype(float), c[..., :3].min(-1).astype(float)
    return (mx - mn) / np.maximum(mx, 1)


def ramp(vol, mask, colors):
    """recolour the voxels in mask by their brightness onto a dark-to-light list of colours"""
    L = lum(vol.astype(float))
    lo, hi = np.percentile(L[mask], 5), np.percentile(L[mask], 95)
    k = np.clip((L - lo) / max(hi - lo, 1), 0, 0.999)
    idx = (k * len(colors)).astype(int)
    pal = np.array(colors, dtype=np.uint8)
    vol[mask, :3] = pal[idx[mask]]


def pad(vol, px=0, py=0, pz=0):
    return np.pad(vol, ((px, px), (py, py), (0, pz), (0, 0)))


def axis(vol, z0, z1):
    xs, ys, zs = np.where(vol[:, :, z0:z1, 3] > 0)
    return xs.mean(), ys.mean()


HAIR = [(4, 4, 6), (10, 10, 14), (18, 18, 24), (28, 28, 34)]


def chigusa(vol, seed):
    rnd = random.Random(seed)
    vol = pad(vol, 2, 3, 0)
    s = vol[..., 3] > 0
    zs = np.where(s.any(axis=(0, 1)))[0]
    H = zs.max() + 1
    cx, cy = axis(vol, int(H * 0.5), int(H * 0.75))
    X, Y, Z = np.meshgrid(np.arange(vol.shape[0]), np.arange(vol.shape[1]), np.arange(vol.shape[2]), indexing='ij')
    pale = s & (lum(vol.astype(float)) > 140) & (sat(vol) < 0.25)
    # the head's own axis: the middle of the top tenth (a walking frame leans the head forward of the body)
    hx, hy = axis(vol, int(H * 0.9), H)
    near = np.hypot(X - hx, Y - hy) <= 6.0
    # the neck: the lowest pale voxel near the head's axis in the top fifth
    head = pale & near & (Z > H * 0.8)
    zneck = Z[head].min() if head.any() else int(H * 0.86)
    head = s & near & (Z >= zneck)
    hv = rnd.choices(range(len(HAIR)), weights=[3, 4, 2, 1], k=int(head.sum()))
    vol[head, :3] = np.array(HAIR, dtype=np.uint8)[hv]
    # wet hair swelling over the skull: one voxel out on the sides, the back and the top
    hz = np.where(head.any(axis=(0, 1)))[0]
    for z in range(zneck, hz.max() + 2 if hz.max() + 1 < vol.shape[2] else hz.max() + 1):
        for x in range(vol.shape[0]):
            for y in range(vol.shape[1]):
                if vol[x, y, z, 3]:
                    continue
                if abs(x - hx) > 6 or abs(y - hy) > 6:
                    continue
                nb = [(x + 1, y, z), (x - 1, y, z), (x, y - 1, z), (x, y, z - 1)]
                if any(0 <= a < vol.shape[0] and 0 <= b < vol.shape[1] and 0 <= c < vol.shape[2] and head[a, b, c] for a, b, c in nb):
                    if y > hy + 1 and z < hz.max():   # not in front: the front is the curtain below
                        continue
                    vol[x, y, z] = (*HAIR[rnd.randrange(3)], 255)
    # the curtain over the face and down the front to the knees: one layer in front of whatever is there, strand by strand
    zknee = int(H * 0.3)
    for x in range(int(round(hx)) - 3, int(round(hx)) + 4):
        bottom = zknee + rnd.randrange(0, int(H * 0.18))
        if abs(x - hx) >= 3:
            bottom += int(H * 0.15)
        for z in range(bottom, hz.max() + 1):
            col = np.where(vol[x, :, z, 3] > 0)[0]
            if not len(col):
                continue
            yf = col.max()
            if yf + 1 < vol.shape[1] and abs(yf - cy) < 8:
                vol[x, yf + 1, z] = (*HAIR[rnd.randrange(3)], 255)
                if z > zneck:
                    vol[x, yf, z] = (*HAIR[rnd.randrange(2)], 255)
    # the fall down the back
    for x in range(int(round(hx)) - 4, int(round(hx)) + 5):
        bottom = int(H * 0.42) + rnd.randrange(0, int(H * 0.12))
        for z in range(bottom, zneck + 2):
            col = np.where(vol[x, :, z, 3] > 0)[0]
            if not len(col):
                continue
            yb = col.min()
            if yb - 1 >= 0 and abs(yb - cy) < 8:
                vol[x, yb - 1, z] = (*HAIR[rnd.randrange(3)], 255)
    # the obi: dark, as in the game (the library's red reads as a different woman)
    s = vol[..., 3] > 0
    red = s & (vol[..., 0].astype(int) > vol[..., 2].astype(int) + 25) & (vol[..., 0] > 30) & (Z < zneck)
    ramp(vol, red, [(22, 22, 26), (34, 34, 40), (46, 46, 54)])
    # the kimono a little wetter and darker
    ind = s & ~red & (vol[..., 2].astype(int) > vol[..., 0].astype(int) + 8) & (Z < zneck)
    vol[ind, :3] = (vol[ind, :3].astype(float) * 0.85).astype(np.uint8)
    # bare feet / skin a cold grey
    skin = s & (lum(vol.astype(float)) > 120) & (Z < zneck)
    vol[skin, :3] = np.clip(vol[skin, :3].astype(float) * np.array([0.86, 0.9, 0.95]), 0, 255).astype(np.uint8)
    return vol


def haru(vol, seed):
    rnd = random.Random(seed)
    vol = pad(vol, 1, 2, 0)
    s = vol[..., 3] > 0
    Z = np.broadcast_to(np.arange(vol.shape[2]), vol.shape[:3])
    zs = np.where(s.any(axis=(0, 1)))[0]
    H = zs.max() + 1
    L = lum(vol.astype(float))
    S = sat(vol)
    white = s & (L > 185) & (S < 0.12) & (Z > H * 0.7)
    skin = s & (S > 0.2) & (vol[..., 0].astype(int) > vol[..., 2].astype(int) + 40)
    cloth = s & ~white & ~skin
    ramp(vol, cloth, [(16, 12, 10), (24, 18, 14), (34, 26, 20), (46, 36, 28)])
    vol[skin, :3] = np.clip(vol[skin, :3].astype(float) * np.array([0.82, 0.8, 0.8]), 0, 255).astype(np.uint8)
    # loose white hair from the crown down her back to the floor
    cx, cy = axis(vol, int(H * 0.7), H)
    hw = [(176, 172, 164), (150, 146, 138), (204, 200, 190)]
    for x in range(int(round(cx)) - 2, int(round(cx)) + 3):
        bottom = rnd.randrange(0, 6) if abs(x - cx) < 1.5 else rnd.randrange(6, 14)
        for z in range(bottom, int(H * 0.9)):
            if rnd.random() < 0.12:
                continue
            col = np.where(vol[x, :, z, 3] > 0)[0]
            if not len(col):
                continue
            yb = col.min()
            if yb - 1 >= 0:
                vol[x, yb - 1, z] = (*hw[rnd.randrange(3)], 255)
    return vol


def worker(vol, seed):
    s = vol[..., 3] > 0
    g = s & (vol[..., 1].astype(int) > vol[..., 0].astype(int) + 10) & (vol[..., 1].astype(int) > vol[..., 2].astype(int) + 5)
    ramp(vol, g, [(30, 44, 70), (40, 58, 90), (54, 76, 112), (70, 96, 134)])   # the green hoodie -> a navy care-worker polo
    return vol


def recolor_all(colors):
    def f(vol, seed):
        s = vol[..., 3] > 0
        ramp(vol, s, colors)
        return vol
    return f


def keep_dark_ends(colors):
    """the crowbar: the whole bar black iron"""
    return recolor_all(colors)


DESIGNED = [
    ('kake-kushi', 'game-kushi-comb', recolor_all([(170, 128, 72), (196, 156, 98), (218, 184, 128), (234, 206, 156)]), 1),
    ('koteko', 'game-kushi-crowbar', keep_dark_ends([(22, 22, 24), (36, 36, 40), (54, 54, 58), (78, 76, 74)]), 1),
]


def sheet(index, path):
    sys.path.insert(0, HERE)
    from voxel_view import render_voxel
    tiles = []
    for k, m in index.items():
        strip = Image.open(os.path.join(OUT, f'{k}.png'))
        row = [render_voxel(strip, m['w'], m['d'], m['n'], yaw=y, elevation=e) for y, e in [(0, 8), (90, 8), (180, 8), (35, 35)]]
        tiles.append(row)
    cw = max(t.width for r in tiles for t in r)
    ch = max(t.height for r in tiles for t in r)
    cols = 2
    rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGBA', (cw * 4 * cols, ch * rows), (70, 70, 74, 255))
    for i, r in enumerate(tiles):
        for j, t in enumerate(r):
            out.paste(t, ((i % cols) * cw * 4 + j * cw + (cw - t.width) // 2, (i // cols) * ch + (ch - t.height)), t)
    k = max(1, 1600 // out.width)
    out.resize((out.width * k, out.height * k), Image.NEAREST).save(path)



# ---- the lattices (2026-11-21 play: 「鉄の格子？が分かりづらかった」): designed panels, not the photo house's thin dark sticks.
# Pale aged hinoki bars, thick and evenly spaced, each with a lit face and a darker side; a dark walnut frame (posts, top rail,
# sill, two cross rails) so the outline reads; wood grain flecks so it is plainly wood, not iron. 1 voxel = 2.5 cm.
LATTICE_MPP = 0.025


def lattice_panel(width_m, height_m, seed, bar=(206, 168, 116), frame=(70, 44, 28), pitch=10, barw=3, door=False):
    rnd = random.Random(seed)
    W, H = int(round(width_m / LATTICE_MPP)), int(round(height_m / LATTICE_MPP))
    D = 6
    v = np.zeros((W, D, H, 4), np.uint8)

    def put(x0, x1, y0, y1, z0, z1, c, grain=10):
        for x in range(max(0, x0), min(W, x1)):
            for z in range(max(0, z0), min(H, z1)):
                g = rnd.randint(-grain, grain)
                for y in range(max(0, y0), min(D, y1)):
                    k = 1.0
                    if y == y1 - 1: k = 1.12          # the front face: lit
                    elif y == y0: k = 0.82            # the back face
                    if x == x0 or x == x1 - 1: k *= 0.86   # the sides of a bar: darker, so each bar stands apart
                    col = [min(255, max(0, int(c[i] * k) + g)) for i in range(3)]
                    v[x, y, z] = (*col, 255)

    post = 5 if not door else 4
    # bars between the posts, evenly spaced
    x = post + (pitch - barw) // 2 + 2
    while x + barw <= W - post - 1:
        put(x, x + barw, 1, 5, 2, H - 4, bar, 9)
        x += pitch
    # cross rails (dark), the frame on top of them
    for zz in (H // 3, (2 * H) // 3):
        put(post, W - post, 0, 6, zz, zz + 3, frame, 6)
    put(0, post, 0, 6, 0, H, frame, 6); put(W - post, W, 0, 6, 0, H, frame, 6)     # posts
    put(0, W, 0, 6, H - 5, H, frame, 6)                                             # top rail
    put(0, W, 0, 6, 0, 3, (54, 36, 24), 5)                                          # sill
    # brass cap on each post top: a small bright point that marks the corners from above
    for xx in (0, W - post):
        put(xx + 1, xx + post - 1, 1, 5, H - 1, H, (196, 150, 70), 4)
    return v


def koshi_choba_s(seed):
    return lattice_panel(2.2, 2.2, seed)


def koshi_choba_w(seed):
    return lattice_panel(2.4, 2.2, seed + 1)


def koshi_door(seed):
    # 奥の室's 格子戸: the same wood, a little darker with age and soot, a closer pitch; it slides
    return lattice_panel(1.24, 2.18, seed + 2, bar=(176, 132, 86), frame=(60, 38, 24), pitch=8, barw=3, door=True)


LATTICES = [('koshi-choba-s', koshi_choba_s, 11), ('koshi-choba-w', koshi_choba_w, 12), ('koshi-door', koshi_door, 13)]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', required=True, help='a checkout of game-kit with the sprite-stack library (branch sprite-stacks)')
    ap.add_argument('--qkit', help='a checkout of game-kit main with the 札の家 Q parts (default: --kit)')
    ap.add_argument('--sheet', help='write a review sheet of every stack (front, side, back, from above)')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for out_id, lib in PLAIN.items():
        vol, e = load(a.kit, lib)
        save(vol, out_id, {'src': lib, 'mpp': e.get('metersPerPixel')}, index)
    for out_id, lib, fn, seed in DESIGNED:
        vol, e = load(a.kit, lib)
        save(fn(vol, seed), out_id, {'src': lib, 'mpp': e.get('metersPerPixel'), 'designed': fn.__name__}, index)
    for out_id, fn, seed in LATTICES:
        save(fn(seed), out_id, {'src': 'designed', 'mpp': LATTICE_MPP, 'designed': fn.__name__, 'prop': True}, index)
    for out_id, lib in PROPS.items():
        vol, e = load(a.kit, lib)
        save_glow(vol, e, out_id, {'src': lib, 'mpp': e.get('metersPerPixel'), 'prop': True}, index)
    for out_id, lib in QPROPS.items():
        vol, e = load(a.qkit or a.kit, lib)
        save_glow(vol, e, out_id, {'src': lib, 'mpp': e.get('metersPerPixel'), 'prop': True}, index)
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{len(index)} stacks -> {OUT}')
    if a.sheet:
        sheet(index, a.sheet)
        print('sheet', a.sheet)


if __name__ == '__main__':
    main()
