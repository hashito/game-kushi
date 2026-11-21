// The basement must be readable (play 2026-11-21: 「地下室が真っ暗で見えずどこで何するか分かりづらいです」) while it stays frightening:
//  - a floor of light: under the house the sky light never drops below a dim level, so the shape of every room shows faintly
//    (from above it is raised more, the house is seen from outside the candle's reach); never pure black
//  - the next goal (the kit's ctx.nextPlace(): the door toward it, or the station itself) carries a small faint lantern-like glow:
//    the player always sees where to go. Basic materials only (no new light: the number of lights never changes in play, no program
//    is built after the boot)
//  2.3 (鏡屋 rolled out, 「アイテムなどが光りすぎ。少し明るくする程度で良い。床の白い円も不要」「壁を通り越してアイテムの矢印が見える」, GD-12):
//  no rings on the floor, the glows faint, the ▼ hidden while a wall stands between it and the eye (kit js/mark-sight.js, P42)
//  - D.guide reports where it is for the checks (tools/dot/basement-steps.mjs)
import { markSight } from '../kit/mark-sight.js';
export function installGuide(THREE, ctx, { D, mode }) {
  const UNDER = 0;   // the basement floor
  const MIN = mode === 'top' ? 0.56 : 0.85;   // 2.2: a step up for the dot tiles (the palette darkened the floors)   // first person: the hemisphere's colour is very dark (2a2420), so its floor is higher   // the sky light under the house never below this (top: before its own x2.2 for the view)
  const hemis = []; ctx.scene.traverse((o) => { if (o.isHemisphereLight || o.isAmbientLight) hemis.push({ l: o, base: null, set: null }); });

  // a soft round glow (a canvas gradient)
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,226,160,1)'); gr.addColorStop(0.25, 'rgba(255,190,110,0.75)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const glowM = new THREE.SpriteMaterial({ map: tex, color: 0xffd8a0, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false });
  glowM.name = 'dot-guide-glow';
  const grp = new THREE.Group(); grp.name = 'dot-guide'; grp.visible = false;
  const spr = new THREE.Sprite(glowM); spr.scale.set(0.9, 0.9, 1); spr.position.y = 1.15; spr.renderOrder = 5; grp.add(spr);
  const core = new THREE.Sprite(glowM); core.scale.set(0.28, 0.28, 1); core.position.y = 1.15; core.renderOrder = 5; grp.add(core);
  ctx.scene.add(grp);
  ctx.warmObjects = [...(ctx.warmObjects || []), grp];
  D.guide = { on: false, at: null, task: null };

  // first person: the eyes get used to the dark - a faint warm light round the player under the house (made now, before the boot compiles:
  // the number of lights never changes in play). Before the candle it is all there is besides the hatch; with the candle it adds a little
  const eyes = mode === 'top' ? null : new THREE.PointLight(0xc8a27a, 0, 6.5, 1.3);
  if (eyes) { eyes.name = 'dot-eyes'; ctx.scene.add(eyes); }
  let t = 0, look = 0, place = null;
  // the floor of light goes in at the moment of drawing (the game sets its sky light every frame; the frame is drawn with its own value
  // raised to the floor, then the value is put back): every renderer.render of the frame, the pixel pass included
  let floorMin = 0;
  const r0 = ctx.renderer.render.bind(ctx.renderer);
  ctx.renderer.render = (scene, camera) => {
    if (!floorMin || scene !== ctx.scene) return r0(scene, camera);
    const keep = hemis.map((h) => h.l.intensity);
    for (const h of hemis) h.l.intensity = Math.max(h.l.intensity, floorMin * (h.l.isAmbientLight ? 0.6 : 1));
    try { return r0(scene, camera); } finally { hemis.forEach((h, i) => { h.l.intensity = keep[i]; }); }
  };
  const update = (dt) => {
    t += dt; look -= dt;
    const under = ctx.floor === UNDER && ctx.state && ctx.state.started && !ctx.state.ended;
    floorMin = under ? (mode === 'top' || ctx.lightOn ? MIN : 1.0) : 0;   // first person before the candle is lit: still a shape to every wall
    if (eyes) { eyes.intensity = under ? (ctx.lightOn ? 0.6 : 3.4) : 0; eyes.position.set(ctx.camera.position.x, ctx.camera.position.y + 0.4, ctx.camera.position.z); }
    // the next goal
    if (look <= 0) { look = 0.4; place = under && ctx.nextPlace ? ctx.nextPlace() : null; }
    const on = !!(place && under && !ctx.blocked());
    grp.visible = on;
    D.guide.on = on; D.guide.at = place ? [+place.x.toFixed(2), +place.z.toFixed(2)] : null; D.guide.task = place ? place.task : null; D.guide.door = place ? place.door : null;
    if (!on) return;
    const fy = ctx.world.floorY(UNDER);
    grp.position.set(place.x, fy, place.z);
    const near = Math.hypot(ctx.camera.position.x - place.x, ctx.camera.position.z - place.z);
    spr.visible = core.visible = mode === 'top' || near > 1.6;   // first person: the glow never fills the view when you stand on it
    const k = 0.5 + 0.5 * Math.sin(t * 2.4);
    spr.material.opacity = 0.32 + 0.12 * k;
    spr.scale.setScalar((mode === 'top' ? 0.55 : 0.4) + 0.08 * k);
  };
  // every thing to pick up (items, documents) carries its own mark (2026-11-21 「アイテムの取得場所が不明なので明確にわかるようにしてください」):
  // a faint glow on it and a small ▼ floating above it (2.3: no ring on the floor). The mark is a child of the pickup:
  // it goes with it when it is taken (and is hidden while the pickup is). Same materials for all (nothing is built in play).
  const icv = document.createElement('canvas'); icv.width = icv.height = 32;
  { const x = icv.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.55)'; x.beginPath(); x.moveTo(4, 7); x.lineTo(28, 7); x.lineTo(16, 27); x.closePath(); x.fill();
    x.fillStyle = '#ffd88a'; x.beginPath(); x.moveTo(7, 9); x.lineTo(25, 9); x.lineTo(16, 24); x.closePath(); x.fill(); }
  const itex = new THREE.CanvasTexture(icv); itex.colorSpace = THREE.SRGBColorSpace; itex.magFilter = THREE.NearestFilter;
  const iconM = new THREE.SpriteMaterial({ map: itex, transparent: true, depthWrite: false, depthTest: false, fog: false }); iconM.name = 'dot-mark-icon';
  const softM = new THREE.SpriteMaterial({ map: tex, color: 0xffe2a8, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); softM.name = 'dot-mark-glow';
  // the guide's glows are light, not surfaces: the dot pass (dotifyScene) leaves them as they are (quantized, a soft glow went dark: 2.2 basement check)
  for (const m of [glowM, iconM, softM]) { m.userData.dot = 'light'; if (m.map) m.map.userData.dot = 'light'; }
  const marks = new Map();
  const markAll = () => {
    for (const o of ctx.world.interactables) {
      const ia = o.userData.interact;
      if (!ia || (ia.kind !== 'item' && ia.kind !== 'doc') || marks.has(o)) continue;
      const m = new THREE.Group(); m.name = 'dot-mark';
      const ic = new THREE.Sprite(iconM); ic.scale.set(0.26, 0.26, 1); ic.renderOrder = 6; m.add(ic);
      const gl = new THREE.Sprite(softM); gl.scale.set(0.4, 0.4, 1); gl.renderOrder = 5; m.add(gl);
      o.add(m); marks.set(o, { m, ic, gl });
    }
  };
  markAll();
  D.marks = () => [...marks.entries()].filter(([o]) => o.parent && ctx.world.interactables.includes(o)).map(([o, k]) => ({ id: o.userData.interact.id, kind: o.userData.interact.kind, shown: k.m.visible && o.visible }));
  let markT = 0;
  const sight = markSight(THREE, ctx, { camera: () => (window.__dot && window.__dot.topCam) || ctx.camera });   // from above: the camera the picture is drawn with (kit 1.22.5)
  const markUpdate = (dt) => {
    markT -= dt; if (markT <= 0) { markT = 1; markAll(); sight.refresh(); }   // walls cut away from above, doors opened: the blocking list again
    const k = 0.5 + 0.5 * Math.sin(t * 3.1);
    const wp = new THREE.Vector3();
    for (const [o, M] of marks) {
      if (!o.parent) { marks.delete(o); continue; }
      const on = ctx.world.interactables.includes(o) && !(o.userData.off);
      M.m.visible = on; if (!on) continue;
      o.getWorldPosition(wp);
      let F = ctx.world.floorY(0); for (let f = 1; f < 4; f++) { const y = ctx.world.floorY(f); if (Number.isFinite(y) && y <= wp.y + 0.05 && y > F) F = y; }   // the pickup's own floor
      const local = (y) => y - wp.y;   // the pickup is not scaled: world heights straight into its space
      M.ic.position.y = local(Math.min(wp.y + 0.45, F + 1.75)) + 0.04 * k;
      M.gl.position.y = 0;
      M.ic.visible = sight.clear(M.ic);   // the ▼ draws over its own prop (no depth test) but never through a wall
    }
  };
  ctx.systems.push({ id: 'dot-guide', def: { update: (dt) => { update(dt || 0.016); markUpdate(dt || 0.016); } }, inst: null });
  return { update };
}
