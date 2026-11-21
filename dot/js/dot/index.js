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
import { loadFrameSet, createFigure, buildStackGeometry, loadPixels, stripVolume } from '../kit/sprite-stack-mesh.js';
import { locomotion, turnToward } from '../kit/sprite-stack-anim.js';
import { installPhotoHooks, preparePhotos } from './photos.js';
import { installTopdown } from './topdown.js';

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
  const [worker, haru, chigusa, stackIndex, photoList] = await Promise.all([
    loadFrameSet(THREE, at('assets/figures/worker.json')),
    loadFrameSet(THREE, at('assets/figures/haru.json')),
    loadFrameSet(THREE, at('assets/figures/chigusa.json')),
    fetch(at('assets/stacks/index.json')).then((r) => r.json()),
    fetch(at('photos.json')).then((r) => r.json()).catch(() => []),
  ]);
  const stackPx = Object.fromEntries(await Promise.all(Object.keys(stackIndex).map(async (k) => [k, await loadPixels(at(`assets/stacks/${k}.png`))])));
  D.timings.load = Math.round(performance.now() - t0);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.name = 'dot-stack';
  D.material = mat;
  const geoCache = new Map();
  const stackGeo = (k) => {
    if (!geoCache.has(k)) { const s = stackIndex[k]; geoCache.set(k, buildStackGeometry(THREE, stripVolume(stackPx[k], s.w, s.d, s.n, 0), { mpp: s.mpp })); }
    return geoCache.get(k);
  };

  // behind the title: the photos as pixel art, the pixel font for every line of the game
  ext.registerBoot('dot-pictures', async (ctx, report) => {
    const t = performance.now();
    if (mode === 'top') D.clippedAtBoot = topApi.clipScene();   // the whole house is built now: the cut goes into every program the next step compiles
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
      haruFig = createFigure(THREE, haru, { height: 1.5, material: mat, state: 'kneel' });
      const keep = new Set(); haruFig.root.traverse((x) => keep.add(x));
      hideOwn(G.haru.root, keep);
      G.haru.root.add(haruFig.root);
      warm.push(haruFig.warm);
    }
    // 千草: her frames follow the ghost (js/ext/ghost.js moves fig.root, turns it, fades it)
    let chiFig = null;
    if (G.chigusa && G.chigusa.root) {
      chiFig = createFigure(THREE, chigusa, { height: 1.62, material: mat });
      const keep = new Set(); chiFig.root.traverse((x) => keep.add(x));
      hideOwn(G.chigusa.root, keep);
      G.chigusa.root.add(chiFig.root);
      warm.push(chiFig.warm);
    }
    // the worker (seen only from above)
    const wk = createFigure(THREE, worker, { height: 1.7, material: mat });
    wk.root.visible = false;
    scene.add(wk.root);
    warm.push(wk.warm);
    for (const w of warm) w.visible = false;
    ctx.warmObjects = [...(ctx.warmObjects || []), ...warm];
    figures = D.figures = { worker: wk, haru: haruFig, chigusa: chiFig };
    // every texture with hard edges (the stacks have none: colour per vertex)
    if (ctx.pixelStyle) ctx.pixelStyle.sweep();
    D.timings.dress = Math.round(performance.now() - t);
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
