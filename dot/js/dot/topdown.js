// 見下ろし (the top-down dot version): the game keeps its first-person camera for everything it decides (what is in reach, her touch, the
// sound, the candle's light), and only the picture is drawn from above. Per frame (registerRender):
//   the logical camera is moved to a high point behind the player, the house is cut away above the player's head (one clipping plane on
//   the world's materials; the people are never cut), the frame is drawn through the normal look (fx-std, pixel style), and the camera
//   goes back where the game had it.
// The moves are screen-relative (up = away from the camera): the input turns the player toward its direction and walks forward, so the
// candle shines where the player goes. [E] / a tap uses the nearest thing in front (auto-aim), the same handlers as the first-person game.
// Play scripts (tools/play/*) set window.__dotScript = true: the controller then takes their keys and their yaw / pitch as they are.
import * as THREE from 'three';
import { pickInteractable } from '/js/kit/world-from-plan.js';

const Q = new URLSearchParams(location.search);
const camQ = (Q.get('dotcam') || '').split(',').map(Number);
export const VIEW = { up: camQ[0] || 6.4, back: camQ[1] || 4.0, fov: camQ[2] || 46, cut: 1.85, pitch: -0.32, amb: camQ[3] || 2.2, glow: camQ[4] || 3, mist: 0.35, danger: 0.75, under: 1.7, underGlow: [4.2, 9.5] };   // under: the basement seen from above is lit more (the room's shape, not only the candle's circle)

export function installTopdown(ext, { D, mat, locomotion, turnToward }) {
  let ctx = null, fp = null, wk = null, sil = null, glow = null;
  const ambients = [];
  const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);   // keeps y < constant
  const cutList = [cut];
  const topCam = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.1, 60);
  const focus = new THREE.Vector3(), saved = { p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 72, near: 0.05, far: 55 };
  const own = new WeakSet();   // the people's materials: never cut
  let clipT = 0, clipped = 0;
  const clipAll = (root) => {
    let n = 0;
    root.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (own.has(m) || m.clippingPlanes === cutList || m.isShaderMaterial && !m.lights) continue;
        m.clippingPlanes = cutList; m.needsUpdate = true; n++;
        if (ctx && ctx.booted) (D.lateNames = D.lateNames || []).push(`${o.name || o.type}|${m.type}|${m.name}`);
      }
    });
    return n;
  };
  // ?dotscript=1 (remembered for the tab: the scripts reload the page with their own queries)
  try { if (Q.has('dotscript')) sessionStorage.setItem('dotscript', '1'); } catch (e) { /* private mode */ }
  const fromTab = (() => { try { return sessionStorage.getItem('dotscript') === '1'; } catch (e) { return false; } })();
  const script = () => !!window.__dotScript || fromTab;

  function ready(c, worker) {
    ctx = c; fp = ctx.fp; wk = worker;
    ctx.renderer.localClippingEnabled = true;
    own.add(mat);
    // from above the house is lit a little more than at eye level: the sky / ambient light is raised while the picture is drawn, and a
    // warm light hangs over the player (a light added now, before the boot compiles: the number of lights never changes in play)
    glow = new THREE.PointLight(0xffc68a, VIEW.glow, 7, 1.4); glow.name = 'dot-glow'; ctx.scene.add(glow);
    ctx.scene.traverse((o) => { if (o.isHemisphereLight || o.isAmbientLight) ambients.push(o); });
    // the player behind a wall: a dim shape where the body is hidden. Drawn after the house (renderOrder 1) and before the body itself
    // (renderOrder 2), only where something is already nearer (GreaterDepth): the body never hides parts of itself under it
    const smat = new THREE.MeshBasicMaterial({ color: 0x6a5434, depthWrite: false, depthFunc: THREE.GreaterDepth });
    own.add(smat);
    wk.mesh.renderOrder = 2;
    sil = new THREE.Mesh(wk.mesh.geometry, smat); sil.renderOrder = 1; sil.frustumCulled = false;
    wk.root.add(sil);
    const sw = new THREE.Mesh(wk.mesh.geometry, smat); const g = new THREE.Group(); g.add(sw); g.visible = false;
    ctx.warmObjects = [...(ctx.warmObjects || []), g];
    // every material of the house now (before the boot compiles them: the cut is part of each program)
    clipped = clipAll(ctx.scene);
    for (const w of ctx.warmObjects) clipAll(w);
    // the controls
    const orig = fp.update.bind(fp);
    const stick = fp.stick;
    fp.update = (dt) => {
      if (script() || fp.blocked) return orig(dt);
      const k = fp.keys;
      let ix = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0) + stick.x;
      let iz = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0) + (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0) + stick.y;
      const l = Math.hypot(ix, iz);
      if (l > 0.08) fp.yaw = Math.atan2(-ix, -iz);   // the camera never turns: screen up is always -z
      fp.pitch = VIEW.pitch;
      const keys = fp.keys, sx = stick.x, sy = stick.y;
      fp.keys = new Set([...keys].filter((c2) => /^Shift/.test(c2)));
      stick.x = 0; stick.y = l > 0.08 ? -Math.min(1, l) : 0;
      try { orig(dt); } finally { fp.keys = keys; stick.x = sx; stick.y = sy; }
    };
    const look = fp.look.bind(fp), lock = fp.lock.bind(fp);
    fp.look = (dx, dy) => (script() ? look(dx, dy) : undefined);   // a drag or the mouse does not turn the view
    fp.lock = () => (script() ? lock() : undefined);                 // no pointer lock: the mouse stays free
    // [E] / a tap: auto-aim
    const W = ctx.world;
    const box = new THREE.Box3(), cen = new THREE.Vector3(), aim = new THREE.PerspectiveCamera();
    W.pick = (camera) => {
      const opts = { colliders: W.colliders, touch: fp.isTouch, viewH: innerHeight };
      const direct = pickInteractable(camera, W.interactables, 2.4, null, opts);
      if (direct || script()) return direct;
      const p = camera.position, fx = -Math.sin(fp.yaw), fz = -Math.cos(fp.yaw);
      let best = null, bs = 1e9;
      for (const o of W.interactables) {
        if (!o.visible) continue;
        const e = o.matrixWorld.elements;
        if (Math.abs(e[12] - p.x) > 3 || Math.abs(e[14] - p.z) > 3) continue;
        box.setFromObject(o); if (box.isEmpty()) continue;
        if (box.max.y < W.floorY(ctx.floor) - 0.2 || box.min.y > W.floorY(ctx.floor) + 2.6) continue;
        const qx = Math.max(box.min.x, Math.min(p.x, box.max.x)), qz = Math.max(box.min.z, Math.min(p.z, box.max.z));
        const d = Math.hypot(qx - p.x, qz - p.z);
        if (d > 1.35) continue;
        box.getCenter(cen);
        const vx = cen.x - p.x, vz = cen.z - p.z, vl = Math.hypot(vx, vz) || 1;
        const ang = Math.acos(Math.max(-1, Math.min(1, (vx * fx + vz * fz) / vl)));
        if (d > 0.3 && ang > 1.25) continue;
        const s = d + ang * 0.6;
        if (s < bs) { bs = s; best = cen.clone(); }
      }
      if (!best) return null;
      aim.position.copy(p); aim.fov = camera.fov; aim.aspect = camera.aspect; aim.near = camera.near; aim.far = camera.far; aim.updateProjectionMatrix();
      aim.lookAt(best); aim.updateMatrixWorld();
      return pickInteractable(aim, W.interactables, 2.4, null, opts);
    };
    // a tap on the screen: the thing under the finger, seen from the top camera (within reach of the player)
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
    W.pickAt = (x, y) => {
      ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
      topCam.updateMatrixWorld();
      ray.setFromCamera(ndc, topCam);
      const p = ctx.camera.position;
      let best = null, bd = 1e9;
      for (const o of W.interactables) {
        if (!o.visible) continue;
        box.setFromObject(o); if (box.isEmpty()) continue;
        box.expandByScalar(0.18);   // a finger is wide
        if (!ray.ray.intersectBox(box, hit)) continue;
        box.getCenter(cen);
        if (Math.hypot(cen.x - p.x, cen.z - p.z) > 2.4) continue;
        const d = hit.distanceTo(ray.ray.origin);
        if (d < bd) { bd = d; best = o; }
      }
      if (!best) return null;
      box.setFromObject(best).getCenter(cen);
      aim.position.copy(p); aim.fov = 72; aim.aspect = innerWidth / innerHeight; aim.updateProjectionMatrix(); aim.lookAt(cen); aim.updateMatrixWorld();
      return pickInteractable(aim, W.interactables, 2.4, null, { colliders: W.colliders, touch: true, viewH: innerHeight }) || { object: best, ...best.userData.interact, distance: cen.distanceTo(p), via: 'tap' };
    };
    // a click on the picture uses the thing under the pointer, as a tap does on a phone
    ctx.renderer.domElement.addEventListener('click', (e) => { if (!script() && ctx.state.started && !ctx.blocked()) ctx.tapSelect(e.clientX, e.clientY); });
    focus.set(ctx.camera.position.x, 0, ctx.camera.position.z);
    D.topCam = topCam;
    D.topCam = topCam;   // the camera the picture was drawn with (the checks project points with it)
    return { clipped, view: VIEW };
  }

  // the player figure: where the camera stands, turned to where it goes
  const last = new THREE.Vector3(); let lastOk = false;
  function update(dt, c, fig, busy) {
    if (!ctx) return;
    const p = c.camera.position, fy = fp.floorY != null ? fp.floorY : c.world.floorY(c.floor);
    const moved = lastOk ? Math.hypot(p.x - last.x, p.z - last.z) : 0;
    last.copy(p); lastOk = true;
    const step = moved > 1 ? 0 : moved;   // a teleport is not a step
    fig.root.visible = !!(c.state && c.state.started && !c.state.ended);
    fig.root.position.set(p.x, fy, p.z);
    if (glow) { glow.position.set(p.x, fy + 3.2, p.z + 0.6); const u = c.floor === 0; glow.intensity = u ? VIEW.underGlow[0] : VIEW.glow; glow.distance = u ? VIEW.underGlow[1] : 7; }
    fig.root.rotation.y = turnToward(fig.root.rotation.y, fp.yaw + Math.PI, dt, 12);
    if (!busy) {
      const G = window.__kc || {}, H = G.gh;
      const scared = H && H.mode !== 'off' && !H.hidden && c.floor === 0 && Math.hypot(H.x - p.x, H.z - p.z) < 3.5;
      const speed = step / Math.max(dt, 1e-3);
      let st = locomotion({ speed, crouch: !!fp.crouching, run: fp.running && fp.running() });
      if (st === 'idle' && scared) st = 'fear';
      fig.anim.play(st);
    }
    fig.update(dt, { moved: step / fig.scale });
    if (sil) sil.geometry = fig.mesh.geometry;
  }

  // from above the floors are seen at a slant: a texel-hard minification sparkles into noise there. The textures keep their hard
  // magnification (pixels) but average when shrunk (after the pixel style's boot sweep; uploaded again behind the title)
  ext.on('game:booted', (c) => {
    const seen = new Set();
    c.scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap']) {
      const t = m[k]; if (!t || seen.has(t) || t.isRenderTargetTexture || t.generateMipmaps === false) continue;
      seen.add(t); t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; t.needsUpdate = true;
    } });
    D.smoothMin = seen.size;
  });

  ext.registerRender((dt, c, look) => {
    const cam = c.camera;
    saved.p.copy(cam.position); saved.q.copy(cam.quaternion); saved.fov = cam.fov; saved.near = cam.near; saved.far = cam.far;
    const fy = fp ? (fp.floorY != null ? fp.floorY : c.world.floorY(c.floor)) : 0;
    // follow softly; a teleport (stairs, a respawn) jumps
    const tx = saved.p.x, tz = saved.p.z - 0.35;
    if (Math.hypot(tx - focus.x, tz - focus.z) > 3 || Math.abs(fy - focus.y) > 0.5) focus.set(tx, fy, tz);
    else { const k = 1 - Math.exp(-dt * 7); focus.x += (tx - focus.x) * k; focus.z += (tz - focus.z) * k; focus.y = fy; }
    cut.constant = fy + VIEW.cut;
    // materials made during play (a new charm, a dropped item): cut too (rare; counted in window.__dot.lateClip)
    clipT -= dt;
    if (clipT <= 0) { clipT = 0.5; const n = clipAll(c.scene); if (n) D.lateClip = (D.lateClip || 0) + n; }
    // the camera of the picture
    cam.position.set(focus.x, fy + VIEW.up, focus.z + VIEW.back);
    cam.fov = VIEW.fov; cam.near = 0.5; cam.far = 40; cam.updateProjectionMatrix();
    cam.lookAt(focus.x, fy + 0.5, focus.z);
    cam.updateMatrixWorld();
    topCam.position.copy(cam.position); topCam.quaternion.copy(cam.quaternion); topCam.fov = cam.fov; topCam.aspect = cam.aspect; topCam.near = cam.near; topCam.far = cam.far; topCam.updateProjectionMatrix(); topCam.updateMatrixWorld();
    // what the game hangs on its camera (a held thing) is not seen from above
    const hidden = [];
    for (const ch of cam.children) if (ch.visible && !ch.isLight) { ch.visible = false; hidden.push(ch); }
    // the candle in hand: the game hangs its light at the eye, which from above is inside the player's head (the body lit white). For
    // the picture it is held in front of the chest and shines ahead and down; the game's own light state is put back after the frame
    const fl = c.flashlight, flSave = fl ? [fl.position.clone(), fl.target.position.clone()] : null;
    if (fl) {
      const fx = -Math.sin(fp.yaw), fz = -Math.cos(fp.yaw);
      fl.position.set(saved.p.x + fx * 0.32, fy + 1.15, saved.p.z + fz * 0.32);
      fl.target.position.set(saved.p.x + fx * 3.2, fy, saved.p.z + fz * 3.2);
      fl.updateMatrixWorld(); fl.target.updateMatrixWorld();
    }
    const amb = ambients.map((l) => l.intensity);
    for (const l of ambients) l.intensity *= VIEW.amb * (c.floor === 0 ? VIEW.under : 1);
    // the red mist of danger fills the whole screen in first person; from above it would hide the very corridor the player must run
    // down. Here it is kept lighter (the danger tint, the heartbeat and her bells stay as they are)
    const st0 = c.fxState;
    if (st0 && (st0.mist || st0.danger)) c.fxState = { ...st0, mist: (st0.mist || 0) * VIEW.mist, danger: (st0.danger || 0) * VIEW.danger };
    try {
      look.update(dt, performance.now() / 1000, saved.p);
      c.fxState = st0;
      look.render();
    } finally {
      ambients.forEach((l, i) => { l.intensity = amb[i]; });
      if (fl) { fl.position.copy(flSave[0]); fl.target.position.copy(flSave[1]); fl.updateMatrixWorld(); fl.target.updateMatrixWorld(); }
      for (const ch of hidden) ch.visible = true;
      cam.position.copy(saved.p); cam.quaternion.copy(saved.q); cam.fov = saved.fov; cam.near = saved.near; cam.far = saved.far; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
  });

  const clipScene = () => { if (!ctx) return 0; let n = clipAll(ctx.scene); for (const w of ctx.warmObjects || []) n += clipAll(w); return n; };
  return { ready, update, clipScene };
}
