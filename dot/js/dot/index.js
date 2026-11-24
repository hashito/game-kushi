// 札の家 ドット版: the dot layer over the same game (the root's js/ext/index.js runs first, with the same data and voices).
// game.json "dot": { "mode": "top" | "fps" } (written by tools/build-dot.mjs per page)
//   - the people (the worker, ハル, 千草) are sprite-stack frame sets of the kit's shared motion rig (game-kit js/sprite-stack-mesh.js +
//     js/sprite-stack-anim.js, docs/sprite-motions.md), played by MotionPlayer from what the game does (walk / run / crouch / reach / paste /
//     caught / fear; her walk and her grasp)
//   - the items in the world and the main furniture are library sprite stacks (dot/assets/stacks/, tools/dot/stacks.py) fitted to the
//     space the original parts took; the colliders and the picking boxes do not change
//   - the photos are the root's photos drawn as pixel art at boot (photos.js), the UI is the pixel skin of dot/css/dot.css
//   - top: the house seen from above with the player figure (topdown.js)
// Everything (frames, stacks, photos, the pixel font) is loaded and every mesh compiled before the start button opens (pixel games load first).
import * as THREE from 'three';
import { placeProps } from './props.js';
import { loadFrameSet, createFigure, buildStackGeometry, loadPixels, stripVolume, stackThumb } from '../kit/sprite-stack-mesh.js';
import { locomotion, turnToward } from '../kit/sprite-stack-anim.js';
import { installPhotoHooks, preparePhotos, setPhotoPalette } from './photos.js';
import { installTopdown } from './topdown.js';
import { installGuide } from './guide.js';
import { palette, dotifyScene, gradePixels } from '../kit/dot-world.js';
import { setItemThumbs } from '/js/kit/inventory-ui.js';

const LAYER = new URL('../../', import.meta.url).href;   // /dot/
const at = (p) => new URL(p, LAYER).href;

// the items in the world: item id -> stack (items.json)
const ITEM_STACK = { SHEET: 'sheet', PHONE: 'phone', TESHOKU: 'teshoku', MATCHES: 'matches', KOTEKO: 'koteko', KAKE_KUSHI: 'kake-kushi', OLD_FUDA: 'old-fuda', COMB: 'comb', LETTER1: 'letter', LETTER2: 'letter', LETTER3: 'letter' };
// the furniture: the parts of js/ext/house.js inside a rectangle (x0, z0, x1, z1; y above the room's floor) become one stack (or a row of them)
const FIXTURES = [
  { id: 'MISE_CASE', stack: 'case', rect: [2.85, 25.3, 5.15, 25.95], face: Math.PI },
  { id: 'MISE_TEA', stack: 'tea', rect: [5.4, 22.7, 5.82, 23.0] },
  { id: 'OMOTE_SHOES', stack: 'shoes', rect: [2.05, 22.2, 2.35, 22.6] },
  { id: 'NAKA_IHAI', stack: 'ihai', rect: [7.3, 15.9, 7.95, 17.1], face: -Math.PI / 2 },
  { id: 'NAKA_PHOTO', stack: 'wedding-photo', rect: [7.85, 17.4, 7.96, 17.8], face: -Math.PI / 2 },
  { id: 'NAKA_PHONE', stack: 'kurodenwa', rect: [2.85, 13.15, 3.15, 13.45], ymin: 0.69 },
  { id: 'NAKA_TANSU', stack: 'tansu', rect: [6.68, 13.07, 7.72, 13.56], face: Math.PI },
  { id: 'HASHIRI_KAMADO', stack: 'kamado', rect: [0.0, 15.15, 0.86, 16.45], face: Math.PI / 2 },
  { id: 'OKU_KYODAI', stack: 'kyodai', rect: [7.3, 7.55, 7.95, 8.45], face: -Math.PI / 2 },
  { id: 'OKU_KIMONO', stack: 'tansu-kimono', rect: [2.45, 6.5, 3.55, 7.15] },
  { id: 'MURO_KILN', stack: 'kiln', rect: [4.55, 2.1, 5.85, 3.1] },
  { id: 'MURO_BOARDS', stack: 'boards-hair', rect: [8.45, -0.6, 8.95, 1.9], face: -Math.PI / 2 },
];

export default async function dotLayer(ext, { manifest, data }) {
  const mode = (manifest.dot && manifest.dot.mode) || 'fps';
  document.documentElement.dataset.dot = mode;
  installPhotoHooks();
  const D = window.__dot = { mode, timings: {}, fixtures: [], items: [] };
  // load first: the frame sets, the stacks and the list of photos (all small)
  const t0 = performance.now();
  // the people at the fine resolution (kit 1.21.0, res 2: 1.25 cm a voxel; 「人や敵…近くで見るとドットが目立つので解像度を上げて」), and the
  // same people at the normal resolution for far away in first person (LOD: assets/figures/far/)
  const fpsLod = mode === 'fps';
  const [worker, haru, chigusa, stackIndex, photoList, haruFar, chigusaFar] = await Promise.all([
    loadFrameSet(THREE, at(fpsLod ? 'assets/figures/far/worker.json' : 'assets/figures/worker.json')),   // first person never shows the worker: the light set
    loadFrameSet(THREE, at('assets/figures/haru.json')),
    loadFrameSet(THREE, at('assets/figures/chigusa.json')),
    fetch(at('assets/stacks/index.json')).then((r) => r.json()),
    fetch(at('photos.json')).then((r) => r.json()).catch(() => []),
    fpsLod ? loadFrameSet(THREE, at('assets/figures/far/haru.json')) : null,
    fpsLod ? loadFrameSet(THREE, at('assets/figures/far/chigusa.json')) : null,
  ]);
  // one palette for everything (kit js/dot-world.js): the people and the parts are graded before their meshes are made, so a face of one
  // colour merges into one rectangle (fewer vertices) and nothing has to be recoloured later
  const PAL0 = palette((manifest.dot && manifest.dot.palette) || 'wa');
  for (const set of [worker, haru, chigusa, haruFar, chigusaFar]) if (set) gradePixels(set.px.data, PAL0);
  const stackPx = Object.fromEntries(await Promise.all(Object.keys(stackIndex).map(async (k) => { const px = await loadPixels(at(`assets/stacks/${k}.png`)); gradePixels(px.data, PAL0); return [k, px]; })));
  D.timings.load = Math.round(performance.now() - t0);
  // the menu's items have no photos: each shows a small dot picture of its own stack (kit 1.22.0, 「絵のない詳細は…ドットの絵」), never an
  // empty box or two letters of its name
  { const thumbs = {}; setItemThumbs((id) => { const k = ITEM_STACK[id], s = k && stackIndex[k]; if (!s || !stackPx[k]) return null; return thumbs[k] || (thumbs[k] = stackThumb(stripVolume(stackPx[k], s.w, s.d, s.n, 0), { px: 96 })); }); }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.name = 'dot-stack';
  D.material = mat;
  // the people: the same colours per vertex, plus a little light of their own (a share of their own colour as emission), so a
  // figure reads as a person in a dark room and not as a dark lump; the house lights still shape it
  const figMat = (self, name) => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.name = name;
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${self.toFixed(3)};`); };
    m.customProgramCacheKey = () => `dot-fig-${self}`;
    return m;
  };
  // an outline: the figure's own faces turned inside out and pushed out along their normals, in one flat colour (from above a
  // person must stand out of the floor: a thin edge, like the line round a sprite)
  const outlineMat = (color, w, name) => {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    m.name = name;
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${w.toFixed(4)};`); };
    m.customProgramCacheKey = () => `dot-outline-${w}`;
    return m;
  };
  const addOutline = (fig, m) => {
    const o = new THREE.Mesh(fig.mesh.geometry, m); o.name = 'dot-outline'; o.frustumCulled = false;
    fig.root.add(o);
    fig.warm.add(new THREE.Mesh(fig.mesh.geometry, m));
    const up = fig.update;
    fig.update = (dt, u) => { const r = up(dt, u); o.geometry = fig.mesh.geometry; return r; };
    fig.outline = o;
    return o;
  };
  const geoCache = new Map();
  const stackGeo = (k) => {
    if (!geoCache.has(k)) { const s = stackIndex[k]; geoCache.set(k, buildStackGeometry(THREE, stripVolume(stackPx[k], s.w, s.d, s.n, 0), { mpp: s.mpp })); }
    return geoCache.get(k);
  };

  // behind the title: the photos as pixel art, the pixel font for every line of the game
  ext.registerBoot('dot-pictures', async (ctx, report) => {
    const t = performance.now();
    if (mode === 'top') D.clippedAtBoot = topApi.clipScene();   // the whole house is built now: the cut goes into every program the next step compiles
    setPhotoPalette(palette((manifest.dot && manifest.dot.palette) || 'wa'));
    D.photos = await preparePhotos(photoList, (k) => report(k * 0.8, `ドット絵を準備中… ${Math.round(k * 100)}%`));
    try {
      const text = [...new Set(JSON.stringify([data, manifest]).replace(/\\u[0-9a-f]{4}|\\n/g, ''))].join('');
      await Promise.race([document.fonts.load('16px "DotGothic16"', text), new Promise((r) => setTimeout(r, 8000))]);
      await document.fonts.ready;
      D.font = document.fonts.check('16px "DotGothic16"', '札の家');
    } catch (e) { D.font = false; }
    report(1, '');
    D.timings.pictures = Math.round(performance.now() - t);
  });

  // the game's shader step (js/ext/boot.js) compiles every program: it must come after this one (the cut, the pixel textures)
  const shaders = ext.reg.boot.get('kushi-shaders');
  if (shaders) { ext.reg.boot.unregister('kushi-shaders'); ext.reg.boot.register('kushi-shaders', shaders); }

  // one stack (or a row of copies) filling a box: front (+z of the stack) toward `face`, its short side across the box
  function fitStack(k, box, o = {}) {
    const g = stackGeo(k), gb = g.boundingBox, gs = gb.getSize(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const longX = size.x >= size.z;
    // the stack's long side along the box's long side
    const sLong = Math.max(gs.x, gs.z), sShort = Math.min(gs.x, gs.z), stackLongX = gs.x >= gs.z;
    const bLong = longX ? size.x : size.z, bShort = longX ? size.z : size.x;
    let s = Math.min(bShort / sShort, (o.hmax || 2.6) / gs.y);
    const n = Math.max(1, Math.round(bLong / (sLong * s)));
    const stretch = bLong / (n * sLong * s);
    s *= Math.min(1, stretch);
    const grp = new THREE.Group(); grp.name = `dot-stack:${k}`;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
      m.scale.set(s * (stackLongX ? Math.max(1, stretch) : 1), s, s * (stackLongX ? 1 : Math.max(1, stretch)));
      const sub = new THREE.Group(); sub.add(m);
      // the stack's long axis onto the box's long axis
      if (stackLongX !== longX) m.rotation.y = Math.PI / 2;
      const off = (i - (n - 1) / 2) * (bLong / n);
      sub.position.set(longX ? off : 0, 0, longX ? 0 : off);
      grp.add(sub);
    }
    grp.position.set(c.x, box.min.y, c.z);
    if (o.face != null) for (const sub of grp.children) sub.children[0].rotation.y = faceRot(o.face, stackLongX, longX);
    return grp;
  }
  // a rotation that puts the stack's front toward `face` while its long side stays along the box's long side (a 180 turn if needed)
  function faceRot(face, stackLongX, longX) {
    const cands = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((r) => ((Math.abs(Math.sin(r)) > 0.5) ? !stackLongX : stackLongX) === longX);
    const d = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    return cands.sort((a, b) => d(a, face) - d(b, face))[0];
  }

  let figures = null;
  ext.on('game:ready', (ctx) => {
    const t = performance.now();
    const G = window.__kc || {};
    const W = ctx.world, scene = ctx.scene;
    const tb = document.querySelector('#title .gf-title-box');
    if (tb) tb.setAttribute('data-dot-label', mode === 'top' ? 'ドット版・見下ろし' : 'ドット版・一人称');
    const house = scene.getObjectByName('kc-house');
    // ---- furniture ----
    if (house) {
      const roomAt = (x, z) => (ctx.data.plan.rooms || []).find((r) => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d);
      for (const f of FIXTURES) {
        const [x0, z0, x1, z1] = f.rect, R = roomAt((x0 + x1) / 2, (z0 + z1) / 2), fy = R ? W.floorY(R.floor || 0) : 0;
        const hide = [], u = new THREE.Box3(), b = new THREE.Box3();
        for (const m of house.children) {
          if (m.name || m.userData.interact || !m.visible) continue;
          b.setFromObject(m);
          if (b.isEmpty()) continue;
          if (b.min.x < x0 - 0.05 || b.max.x > x1 + 0.05 || b.min.z < z0 - 0.05 || b.max.z > z1 + 0.05) continue;
          if (f.ymin != null && b.min.y < fy + f.ymin - 0.02) continue;
          hide.push(m); u.union(b);
        }
        if (!hide.length) { D.fixtures.push({ id: f.id, hidden: 0 }); continue; }
        for (const m of hide) m.visible = false;
        const st = fitStack(f.stack, u, { face: f.face });
        house.add(st);
        D.fixtures.push({ id: f.id, hidden: hide.length, box: [u.min.x, u.min.y, u.min.z, u.max.x, u.max.y, u.max.z].map((v) => +v.toFixed(2)) });
      }
    }
    // ---- the mood props (designed parts of the kit's atmosphere library; dot/js/dot/props.js) ----
    if (house) {
      const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true }); glowMat.name = 'dot-glow-voxels';   // a lamp's paper / flame: lit by itself
      D.props = placeProps(THREE, ctx, { stackGeo, stackIndex, mat, glowMat, parent: house });
    }
    // ---- the lattices (play 2026-11-21 「鉄の格子？が分かりづらかった」): the photo house's thin dark sticks give way to designed wooden
    // panels (tools/dot/stacks.py lattice_panel: pale hinoki bars, a dark frame), and the charms on them are larger and lit enough to read as paper
    if (house) {
      const centred = new Map();
      const cgeo = (k) => { if (!centred.has(k)) { const g = stackGeo(k).clone(); g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()); g.translate(-c.x, -b.min.y, -c.z); g.computeBoundingBox(); centred.set(k, g); } return centred.get(k); };
      const panel = (k, parent, x, y, z, ry) => { const m = new THREE.Mesh(cgeo(k), mat); m.name = `dot-lattice:${k}`; m.castShadow = true; m.receiveShadow = true; m.rotation.y = ry; m.position.set(x, y, z); parent.add(m); return m; };
      D.lattices = [];
      const lat = house.getObjectByName('kc-lattice');
      if (lat && stackIndex['koshi-choba-s']) {
        lat.visible = false;
        const y0 = W.yOf('MISE');
        D.lattices.push(panel('koshi-choba-s', house, 6.9, y0, 22.445, 0).name, panel('koshi-choba-w', house, 5.755, y0, 21.2, -Math.PI / 2).name);
      }
      if (G.koshi && stackIndex['koshi-door']) {
        for (const ch of G.koshi.children) if (ch.isMesh) ch.visible = false;
        D.lattices.push(panel('koshi-door', G.koshi, 0, 0, -0.045, 0).name);
      }
      if (G.chobaCharms) {
        const inst = G.chobaCharms, M4 = new THREE.Matrix4(), S = new THREE.Matrix4().makeScale(1.35, 1.35, 1.35);
        for (let i = 0; i < inst.count; i++) { inst.getMatrixAt(i, M4); inst.setMatrixAt(i, M4.multiply(S)); }
        inst.instanceMatrix.needsUpdate = true;
        inst.material = new THREE.MeshLambertMaterial({ map: (G.paperM && G.paperM.map) || null, color: 0xf2e8cc, emissive: 0x8a7c5c, side: THREE.DoubleSide });
        inst.material.name = 'dot-choba-charms';
      }
    }
    // ---- papers on walls (2026-11-21 「張り紙よりも大きな枠が見えて、ちらついている」): a sheet a few mm off the plaster is drawn pulled toward the
    // camera in depth (polygonOffset), so at the low resolution of the picture it never fights the wall behind it (tools/dot/wallpaper-steps.mjs)
    {
      const flat = new Set();
      W.group.traverse((o) => { if (o.isMesh && /^fuda:/.test(o.name)) flat.add(o); });
      for (const o of W.interactables) { const ia = o.userData.interact; if (ia && ia.kind === 'doc' && o.userData.pasted) (o.userData.model || o).traverse((m) => { if (m.isMesh) flat.add(m); }); }
      if (G.chobaCharms) flat.add(G.chobaCharms);
      for (const m of flat) for (const mt of [].concat(m.material)) if (mt && !mt.polygonOffset) { mt.polygonOffset = true; mt.polygonOffsetFactor = -2; mt.polygonOffsetUnits = -4; mt.needsUpdate = true; }
      D.wallPapers = flat.size;
    }
    // ---- items lying in the world ----
    for (const o of W.interactables) {
      const ia = o.userData.interact, k = ia && ia.kind === 'item' && ITEM_STACK[ia.id];
      const model = o.userData.model;
      if (!k || !model) continue;
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(model);
      model.visible = false;
      const st = fitStack(k, b, {});
      // into the pickup's own space (it is removed with the pickup)
      const p = o.worldToLocal(st.position.clone());
      st.position.copy(p);
      o.add(st);
      D.items.push(ia.id);
    }
    // ---- the people ----
    const warm = [];
    const hideOwn = (root, keep) => root.traverse((x) => { if (x.isMesh && !keep.has(x)) x.visible = false; });
    // ハル behind the lattice: kneeling
    let haruFig = null;
    if (G.haru && G.haru.root) {
      haruFig = createFigure(THREE, haru, { height: 1.5, material: figMat(0.3, 'dot-haru'), state: 'kneel', holdOk: ['kneel'], ...(haruFar ? { lod: { set: haruFar, far: 6, camera: ctx.camera } } : {}) });
      if (mode === 'top') addOutline(haruFig, outlineMat(0x8a7a62, 0.016, 'dot-outline-haru'));
      const keep = new Set(); haruFig.root.traverse((x) => keep.add(x));
      hideOwn(G.haru.root, keep);
      G.haru.root.add(haruFig.root);
      warm.push(haruFig.warm);
    }
    // 千草: her frames follow the ghost (js/ext/ghost.js moves fig.root, turns it, fades it)
    let chiFig = null;
    if (G.chigusa && G.chigusa.root) {
      chiFig = createFigure(THREE, chigusa, { height: 1.62, material: figMat(mode === 'top' ? 0.3 : 0.12, 'dot-chigusa'), ...(chigusaFar ? { lod: { set: chigusaFar, far: 6, camera: ctx.camera } } : {}) });
      // from above her outline is cold and pale: she is seen the moment she comes into the room (in first person she stays in the dark)
      if (mode === 'top') addOutline(chiFig, outlineMat(0x9fb4d0, 0.02, 'dot-outline-chigusa'));
      const keep = new Set(); chiFig.root.traverse((x) => keep.add(x));
      hideOwn(G.chigusa.root, keep);
      G.chigusa.root.add(chiFig.root);
      warm.push(chiFig.warm);
    }
    // the worker (seen only from above)
    const wk = createFigure(THREE, worker, { height: 1.7, material: figMat(0.42, 'dot-worker') });
    if (mode === 'top') addOutline(wk, outlineMat(0xe6c890, 0.02, 'dot-outline-worker'));
    wk.root.visible = false;
    if (mode === 'top') scene.add(wk.root);   // first person never draws the worker (its light set animates off the scene)
    if (mode === 'top') warm.push(wk.warm);
    for (const w of warm) w.visible = false;
    ctx.warmObjects = [...(ctx.warmObjects || []), ...warm];
    figures = D.figures = { worker: wk, haru: haruFig, chigusa: chiFig };
    // every texture with hard edges (the stacks have none: colour per vertex)
    if (ctx.pixelStyle) ctx.pixelStyle.sweep();
    D.timings.dress = Math.round(performance.now() - t);
    installGuide(THREE, ctx, { D, mode });   // the basement: a floor of light and the next goal's glow (before the cut and the boot compile)
    // ---- one palette, every surface dot (2026-11-21 「壁もドット絵でないです。全てドットで再構築してください」「全体の色合いを合わせる」):
    // the walls, floors, ceilings, doors, lamps, glow planes and the old item models are redrawn as dot tiles / quantized pictures in the
    // game's palette (game-kit js/dot-world.js); the sprite stacks and the people are graded to the same palette. Things added later (a
    // charm put back, a texture that loads late) are caught by the same pass every two seconds (it only touches what is not dot yet).
    const PAL = D.palette = palette((manifest.dot && manifest.dot.palette) || 'wa');
    const dotify = () => { const s = dotifyScene(THREE, scene, { pal: PAL }); for (const w of warm) dotifyScene(THREE, w, { pal: PAL }); return s; };
    D.dotify = dotify();
    D.dotifyLog = [];   // passes over 16 ms (a check reads it: tools/dot/perf-steps.mjs)
    setInterval(() => { const t0 = performance.now(); const s = dotify(); const ms = performance.now() - t0; if (ms > 16 && D.dotifyLog.length < 40) D.dotifyLog.push({ ms: Math.round(ms), room: ctx.state && ctx.state.room, s }); }, 2000);
    if (mode === 'top') D.top = topApi.ready(ctx, wk);
  });

  // ---- the motions ----
  const lastChi = { x: 0, z: 0, ok: false };
  let busy = null;
  const oneShot = (state) => {
    if (!figures || mode !== 'top') return;
    const p = figures.worker.anim.once(state);
    busy = state;
    p.then(() => { if (busy === state) busy = null; });
  };
  ext.on('item:pickup', () => oneShot('reach'));
  ext.on('kushi:paste', () => oneShot('paste'));
  ext.on('kushi:peel', () => oneShot('paste'));
  ext.on('kushi:unpaste', () => oneShot('reach'));
  ext.on('player:dead', () => oneShot('caught'));
  ext.on('player:respawn', () => { busy = null; if (figures) figures.worker.anim.play('idle', { restart: true }); });
  ext.on('player:crouch', ({ on }) => { if (!on) oneShot('stand-up'); });

  ext.registerSystem('dot-figures', {
    update(dt, ctx) {
      if (!figures) return;
      const G = window.__kc || {}, H = G.gh;
      // 千草
      const cf = figures.chigusa;
      if (cf && G.chigusa && G.chigusa.root.visible && H) {
        const r = G.chigusa.root.position;
        const moved = lastChi.ok ? Math.min(0.5, Math.hypot(r.x - lastChi.x, r.z - lastChi.z)) : 0;
        lastChi.x = r.x; lastChi.z = r.z; lastChi.ok = true;
        const c = ctx.camera.position, near = Math.hypot(c.x - H.x, c.z - H.z);
        cf.anim.play(H.pressing || near < 2.2 ? 'attack' : moved > 0.002 ? 'walk' : 'idle');
        cf.update(dt, { moved: moved / cf.scale });   // the stride of the motion is in the frame set's own metres
      } else lastChi.ok = false;
      if (figures.haru) figures.haru.update(dt);
      if (mode === 'top') topApi.update(dt, ctx, figures.worker, busy);
    },
  });

  const topApi = mode === 'top' ? installTopdown(ext, { D, mat, locomotion, turnToward }) : { ready() {}, update() {} };

  // the other versions, from the title
  ext.registerTitleButton('dot-versions', {
    label: mode === 'top' ? '一人称のドット版へ' : '見下ろしのドット版へ', order: 200,
    run() { location.href = mode === 'top' ? '/dot-fps' : '/dot'; },
  });
  ext.registerTitleButton('dot-original', { label: '元の版（写真の3D）へ', order: 210, run() { location.href = '/'; } });
}
