// 千草さん in the passage: she moves along the middle of the passage (one line from the room at the end to the ladder, data/fuda.json
// "route"), so where she is is one number, s (metres from the shelf). She comes toward the player's s; a charm on a post (or on the gate)
// between her and the player stops her: she presses on it and it chars (fuda.js), then falls. Modes:
//   off     - not there
//   gate    - the first sight (L3): she comes up to the charmed gate from the far side and is thrown back (safe)
//   lesson  - the post lesson (L3): she comes from the far end of the charm corridor; a charm on the post stops her (safe: she never kills here)
//   chase   - the comb is in your hand (L4): she hunts you back to the ladder. Catch = death (back to the last checkpoint)
// She is slower in the water and much slower in the low passage, but now and then she flickers forward (a lunge). A hiding cupboard with a
// charm inside hides the comb: she loses you and falls back.
import * as THREE from 'three';
import { buildChigusa } from './people.js';

export const SPEED = { walk: 3.0, lesson: 1.4, gate: 1.3 };
export function installGhost(ext, G) {
  let ctx = null, fig = null, route = [], cum = [];
  const H = G.gh = { mode: 'off', s: 0, wait: 0, lunge: 6, hiddenT: 0, rise: 0, fade: 0, shown: false, onCatch: null, onStop: null };
  const v2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  /** the nearest point of the route to (x, z): { s, d } */
  function project(x, z) {
    let best = { s: 0, d: Infinity };
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, az] = route[i], [bx, bz] = route[i + 1], L = cum[i + 1] - cum[i];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L || 1)));
      const px = ax + (bx - ax) * t, pz = az + (bz - az) * t, d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { s: cum[i] + t * L, d };
    }
    return best;
  }
  function at(s) {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++;
    const t = (s - cum[i]) / (cum[i + 1] - cum[i] || 1), [ax, az] = route[i], [bx, bz] = route[i + 1];
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(bx - ax, bz - az) };
  }
  G.project = (x, z) => project(x, z);
  G.routeAt = (s) => at(s);
  // how fast she can go at s: the water (P3) and the low passage (P2) hold her back
  const slowAt = (s) => { const p = at(s), r = ctx.world.roomAt(p.x, p.z); return r === 'P2' ? 0.36 : r === 'P3' ? 0.58 : 1; };
  /** the charms between her and the player (their s), nearest first */
  function blockers(from, to) {
    const out = [];
    for (const P of G.posts.values()) if (P.on && P.def.room !== 'MISE') { const s = P.s ?? (P.s = project(P.def.x, P.def.z).s); if (s > from - 0.05 && s < to) out.push({ s, P }); }
    if (!G.peeled.includes('F_GATE')) { const s = G.gateS; if (s > from - 0.05 && s < to) out.push({ s, gate: true }); }
    return out.sort((a, b) => a.s - b.s);
  }
  G.ghostStart = (mode, s, o = {}) => { H.mode = mode; H.s = s; H.wait = o.wait || 0; H.lunge = 6; H.hiddenT = 0; H.rise = o.rise || 0; H.fade = 0; H.speed = o.speed; H.onStop = o.onStop || null; H.onCatch = o.onCatch || null; H.stopAt = o.stopAt ?? null; };
  G.ghostStop = () => { H.mode = 'off'; if (fig) fig.root.visible = false; for (const P of G.posts.values()) P.press = false; };
  G.ghostFade = () => { H.fade = 0.0001; };

  let T = 0;
  function update(dt, active) {
    if (!fig) return;
    T += dt;
    for (const P of G.posts.values()) P.press = false;
    if (H.mode === 'off' || ctx.floor !== 0) { fig.root.visible = false; return; }
    if (!active) return;
    const cam = ctx.camera.position, me = project(cam.x, cam.z), ps = me.s;
    let vis = H.wait <= 0;
    if (H.wait > 0) { H.wait -= dt; }
    // fading away (thrown back, the lesson over, lost you)
    if (H.fade > 0) { H.fade += dt; if (H.fade > 1.2) { const m = H.mode; G.ghostStop(); ext.emit('kushi:ghost-gone', { mode: m }); return; } }
    if (H.rise > 0) { H.rise -= dt; }
    else if (H.wait <= 0 && H.fade <= 0) {
      const chase = H.mode === 'chase';
      if (chase && ctx.hidden) {   // hidden in a charmed cupboard: she cannot find the comb, she drifts back and then goes away for a while
        H.hiddenT += dt; H.s = Math.max(0, H.s - dt * 0.6);
        if (H.hiddenT > 5) { H.wait = 7; H.s = Math.max(0, ps - 28); H.hiddenT = 0; ext.emit('kushi:ghost-lost', {}); }
      } else {
        H.hiddenT = 0;
        const bl = blockers(H.s, ps), stop = bl.length ? bl[0].s - 0.7 : H.stopAt != null ? H.stopAt : ps - 0.2;
        const base = (H.speed || SPEED.walk) * (ctx.calm ? 0.8 : 1) * (chase ? slowAt(H.s) : 1);
        H.s = Math.min(Math.max(H.s, stop), H.s + base * dt);
        if (bl.length && H.s >= bl[0].s - 0.75) { if (bl[0].P) bl[0].P.press = true; if (!H.pressing) { H.pressing = true; ext.emit('kushi:ghost-press', { id: bl[0].P ? bl[0].P.def.id : 'gate' }); } } else H.pressing = false;
        if (bl.length && bl[0].gate && H.s >= bl[0].s - 0.75 && H.onStop) { const f = H.onStop; H.onStop = null; f(); }
        // the lunge: she flickers forward when nothing stands between (never into a charm, never in calm mode beyond a short step)
        if (chase) {
          H.lunge -= dt;
          const gap = ps - H.s;
          if (H.lunge <= 0 && gap > 6 && !bl.length && slowAt(H.s) > 0.5) { H.s = Math.min(ps - 3, H.s + (gap > 25 ? 7 : ctx.calm ? 2 : 3.5)); H.lunge = (ctx.calm ? 11 : 7) + Math.random() * 3; ctx.sound('glitch'); }
        }
        if (ps - H.s < 1.1 && !bl.length && ctx.floor === 0) { const f = H.onCatch; if (f) f(); }
      }
    }
    // the figure
    const p = at(H.s);
    fig.root.visible = vis;
    fig.root.position.set(p.x, ctx.world.floorY(0) + (H.rise > 0 ? -Math.max(0, H.rise - 0.4) * 0.9 : 0), p.z);
    fig.root.rotation.y = p.yaw;
    fig.body.rotation.z = Math.sin(T * 2.4) * 0.05; fig.head.rotation.z = 0.3 + Math.sin(T * 0.9) * 0.1;
    for (const [i, s] of fig.strands.entries()) s.rotation.x = Math.sin(T * 1.7 + i) * 0.06;
    const near = ps - H.s;
    for (const a of fig.arms) a.rotation.x += ((near < 4 ? -1.2 : -0.2) - a.rotation.x) * Math.min(1, dt * 3);
    const op = H.fade > 0 ? Math.max(0, 1 - H.fade / 1.2) : 1;
    fig.root.traverse((o) => { if (o.material && o.material.transparent !== undefined && o.isSprite) o.material.opacity = 0.25 * op; });
    fig.root.scale.setScalar(H.fade > 0 ? 1 + H.fade * 0.15 : 1);
    if (H.fade > 0 && H.fade > 0.6) fig.root.visible = Math.sin(T * 50) > 0;
    // dread on the screen
    if (vis && near < 16) {
      const k = Math.max(0, Math.min(1, 1 - near / 16));
      const prev = ctx.fxState || {};
      ctx.fxState = { ...prev, danger: Math.max(prev.danger || 0, k * (H.mode === 'chase' ? 0.65 : 0.45)), mist: Math.max(prev.mist || 0, k * 0.3) };
    }
    // lit lamps go out as she passes them (the way back gets darker behind you)
    if (H.mode === 'chase') for (const [id, e] of Object.entries(G.lampEntry || {})) if (e.i > 0 && G.lampS && Math.abs(G.lampS[id] - H.s) < 1.0) { G.lampOut(id); }
  }

  ext.on('game:ready', (c) => {
    ctx = c;
    route = [[9, -107.3], ...ctx.data.fuda.route];
    cum = [0]; for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + v2(route[i - 1], route[i]));
    G.routeLen = cum[cum.length - 1];
    G.gateS = project(-4, -81.8).s;
    fig = buildChigusa(); fig.root.visible = false; ctx.world.group.add(fig.root); G.chigusa = fig;
    // warm-up: her materials compiled before play
    const warm = new THREE.Group(); warm.visible = false; warm.add(buildChigusa().root); ctx.scene.add(warm); ctx.warmObjects = [...(ctx.warmObjects || []), warm];
    ctx.systems.push({ id: 'kushi-ghost', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
  });
}
