// 千草さん under the house (2.0: the basement rebuilt). She walks the rooms of the 室 on a small room graph (室・土の廊下・板の間・燻しの間・奥の室,
// plus the flue between 燻しの間 and 奥の室 that only the dead can pass). A charm on a doorway (or on a flue mouth) is a wall to her. Modes:
//   off      - not there (the player upstairs, or before the basement)
//   cage     - 奥の室 behind the lattice door, beside the box with her comb; she comes to the lattice when you are near it
//   flue     - a comb was put out in 燻しの間 and the flue charm is off: she crawls through the flue to it (unseen; the bells tell where)
//   trapped  - in 燻しの間 with the unfinished comb; she does not press (it is not her comb, but it is a comb)
//   hunt     - her own comb is in your hand: she comes for you. A pasted seal on her way stops her: she presses it, it chars and falls
// She never lunges or teleports; she is slower than a walking player. Touching you is a catch (story.js decides what that resets).
import * as THREE from 'three';
import { buildChigusa } from './people.js';

export const SPEED = { pace: 0.7, flue: 0.9, room: 1.1, hunt: 1.65, calm: 0.8 };
// the graph: each edge joins two rooms through a doorway; pts runs from room a's side to room b's side
export const EDGES = [
  { id: 'e_doro', a: 'MURO', b: 'DORO', pts: [[2.6, -0.3], [2.6, -1.7]], charm: 'F_DORO' },
  { id: 'e_ita', a: 'DORO', b: 'ITA', pts: [[2.2, -6], [1.0, -6]], charm: 'F_ITA' },
  { id: 'e_ibu', a: 'DORO', b: 'IBUSHI', pts: [[3.0, -9], [4.2, -9]], charm: 'F_IBU', seal: 'K_IBU' },
  { id: 'e_koshi', a: 'DORO', b: 'OKUMURO', pts: [[2.6, -18.3], [2.6, -19.7]], charm: 'F_KOSHI' },
  { id: 'e_flue', a: 'IBUSHI', b: 'OKUMURO', pts: [[7.5, -12.3], [7.5, -13.2], [6.6, -15.8], [5.5, -18.8], [5.5, -19.7]], charm: 'F_FLUE', seal: 'K_FLUE', sealAt: 'b', hidden: true },
];

export function installGhost(ext, G) {
  let ctx = null, fig = null, glow = null;
  const H = G.gh = { mode: 'off', room: 'OKUMURO', x: 2.6, z: -25.8, path: [], wait: 0, fade: 0, rise: 0, onCatch: null, hidden: false, pressing: null, repath: 0, paceI: 0 };
  const roomAt = (x, z) => ctx.world.roomAt(x, z, ctx.world.floorY(0) + 1);
  const blocked = (e) => {
    if (e.seal && G.sealN(e.seal) > 0) return { seal: e.seal };
    if (e.charm && !G.peeled.includes(e.charm)) return { charm: e.charm };
    return null;
  };
  /** the rooms from a to b (breadth first, ignoring charms): [{ e, fwd }] */
  function route(a, b) {
    if (a === b) return [];
    const prev = new Map([[a, null]]), q = [a];
    while (q.length) {
      const r = q.shift();
      for (const e of EDGES) {
        const n = e.a === r ? e.b : e.b === r ? e.a : null; if (!n || prev.has(n)) continue;
        prev.set(n, { e, from: r }); q.push(n);
      }
    }
    if (!prev.has(b)) return null;
    const out = []; let r = b; while (prev.get(r)) { const p = prev.get(r); out.unshift({ e: p.e, fwd: p.e.a === p.from }); r = p.from; }
    return out;
  }
  /** waypoints toward (tx, tz) in room troom; stops before the first charm in the way */
  function plan(troom, tx, tz) {
    const legs = route(H.room, troom); if (!legs) return { pts: [], stop: null };
    const pts = [];
    for (const { e, fwd } of legs) {
      const p = fwd ? e.pts : [...e.pts].reverse(), b = blocked(e);
      if (b) {
        // a seal on the far mouth of the flue: she crawls up to it, unseen, and presses it from inside
        if (b.seal && e.sealAt && e.sealAt === (fwd ? 'b' : 'a')) { p.slice(0, -1).forEach(([x, z], i) => pts.push({ x, z, hidden: !!e.hidden && i > 0, edge: e.id, end: false })); const q = pts[pts.length - 1]; q.press = { ...b, edge: e.id }; return { pts, stop: b }; }
        pts.push({ x: p[0][0], z: p[0][1], press: { ...b, edge: e.id } }); return { pts, stop: b };
      }
      // a flue: hidden between its two mouths; once she is in an edge she follows it to its end (no turning back at a re-plan)
      p.forEach(([x, z], i) => pts.push({ x, z, hidden: !!e.hidden && i > 0 && i < p.length - 1, edge: e.id, end: i === p.length - 1 }));
    }
    pts.push({ x: tx, z: tz });
    return { pts, stop: null };
  }
  G.ghostRoute = (troom, tx, tz) => plan(troom, tx, tz);

  G.ghostStart = (mode, o = {}) => {
    H.mode = mode; H.path = []; H.inEdge = null; H.wait = o.wait || 0; H.fade = 0; H.rise = o.rise || 0; H.onCatch = o.onCatch || null; H.repath = 0; H.pressing = null; H.hidden = false;
    if (o.at) { H.room = o.at.room; H.x = o.at.x; H.z = o.at.z; }
  };
  G.ghostStop = () => { H.mode = 'off'; H.path = []; if (fig) fig.root.visible = false; if (glow) glow.intensity = 0; for (const S of G.seals.values()) S.press = false; H.pressing = null; };
  G.ghostFade = () => { H.fade = 0.0001; };

  let T = 0, bellT = 0;
  function target() {
    const c = ctx.camera.position, proom = ctx.state.room;
    if (H.mode === 'hunt') return { room: proom, x: c.x, z: c.z };
    if (H.mode === 'cage') {
      if (proom === 'DORO' && c.z < -14.5) return { room: 'DORO', x: 2.6, z: -18.0 };   // she comes to the lattice
      const P = [[1.2, -25.4], [3.4, -24.2], [0.6, -21.8], [4.4, -22.6]], p = P[H.paceI % P.length];
      if (Math.hypot(H.x - p[0], H.z - p[1]) < 0.3) { H.paceI++; H.wait = 1.5 + Math.random() * 2; }
      return { room: 'OKUMURO', x: p[0], z: p[1] };
    }
    if (H.mode === 'flue' || H.mode === 'trapped') {
      if (proom === 'IBUSHI' && H.room === 'IBUSHI') return { room: proom, x: c.x, z: c.z };   // whoever stands by the comb
      const L = G.lureAt || { x: 8.6, z: -9 };
      return { room: 'IBUSHI', x: L.x - 0.6, z: L.z };
    }
    return null;
  }
  function update(dt, active) {
    if (!fig) return;
    T += dt;
    for (const S of G.seals.values()) S.press = false;
    if (H.mode === 'off' || ctx.floor !== 0) { fig.root.visible = false; glow.intensity = 0; H.pressing = null; return; }
    if (!active) return;
    if (H.fade > 0) { H.fade += dt; if (H.fade > 1.2) { const m = H.mode; G.ghostStop(); ext.emit('kushi:ghost-gone', { mode: m }); return; } }
    if (H.wait > 0) H.wait -= dt;
    if (H.rise > 0) H.rise -= dt;
    const tg = target();
    let pressing = null;
    if (tg && H.wait <= 0 && H.rise <= 0 && H.fade <= 0) {
      H.repath -= dt;
      if ((H.repath <= 0 && !H.inEdge) || !H.path.length) { H.path = plan(tg.room, tg.x, tg.z).pts; H.repath = 0.4; H.inEdge = null; }
      const sp = (H.mode === 'hunt' ? SPEED.hunt : H.mode === 'cage' ? (tg.room === 'DORO' ? SPEED.room : SPEED.pace) : H.hidden ? SPEED.flue : SPEED.room) * (ctx.calm ? SPEED.calm : 1);
      let step = sp * dt;
      while (step > 0 && H.path.length) {
        const p = H.path[0], d = Math.hypot(p.x - H.x, p.z - H.z);
        H.hidden = !!p.hidden;
        // the charm she pressed is gone (burnt off, or peeled): go on through
        if (p.press && (p.press.seal ? G.sealN(p.press.seal) <= 0 : G.peeled.includes(p.press.charm))) { delete p.press; H.path = []; H.inEdge = p.edge && !p.end ? p.edge : null; if (H.inEdge) { const e = EDGES.find((x) => x.id === H.inEdge); const towardB = Math.hypot(e.pts[0][0] - H.x, e.pts[0][1] - H.z) > Math.hypot(e.pts[e.pts.length - 1][0] - H.x, e.pts[e.pts.length - 1][1] - H.z); const rest = towardB ? e.pts : [...e.pts].reverse(); const k = rest.findIndex(([x, z]) => Math.hypot(x - H.x, z - H.z) < 0.05); rest.slice(k + 1).forEach(([x, z], i, arr) => H.path.push({ x, z, hidden: !!e.hidden && i < arr.length - 1, edge: e.id, end: i === arr.length - 1 })); } break; }
        if (p.press && d < 0.45) { pressing = p.press; break; }
        if (d <= step) { H.x = p.x; H.z = p.z; step -= d; if (p.press) { pressing = p.press; break; } H.inEdge = p.edge && !p.end ? p.edge : null; H.path.shift(); }
        else { H.x += ((p.x - H.x) / d) * step; H.z += ((p.z - H.z) / d) * step; step = 0; }
      }
      const r = roomAt(H.x, H.z); if (r) H.room = r;
      if (!H.path.length) H.hidden = false;
    } else if (H.path[0] && H.path[0].press && Math.hypot(H.path[0].x - H.x, H.path[0].z - H.z) < 0.45) pressing = H.path[0].press;
    // pressing: a seal chars only when she wants you (her comb is in your hand)
    if (pressing && H.mode === 'hunt' && pressing.seal) { const S = G.seals.get(pressing.seal); if (S) S.press = true; }
    const key = pressing ? `${pressing.seal || pressing.charm}` : '';
    if (key !== (H.pressKey || '')) { H.pressKey = key; H.pressing = pressing; if (pressing) ext.emit('kushi:ghost-press', { id: key, mode: H.mode }); }
    // touching you
    const cam = ctx.camera.position, near = Math.hypot(cam.x - H.x, cam.z - H.z);
    if (near < 0.95 && !H.hidden && H.rise <= 0 && H.fade <= 0 && !pressing && H.onCatch && ctx.state.room === H.room) { const f = H.onCatch; f(); }
    // the bells of the old call-bell cord ring where she goes (house.js plays them); in the flue it is her own
    bellT -= dt;
    if (H.path.length && bellT <= 0 && H.wait <= 0 && H.rise <= 0) { bellT = H.hidden ? 0.75 : 1.1 + Math.random() * 0.6; ext.emit('kushi:bell', { x: H.x, z: H.z, hidden: H.hidden, near }); }
    // the figure
    const vis = !H.hidden && H.mode !== 'off';
    fig.root.visible = vis;
    const fy = ctx.world.floorY(0);
    glow.position.set(H.x, fy + 1.3, H.z); glow.intensity = vis ? (H.fade > 0 ? Math.max(0, 1 - H.fade / 1.2) : 1) * (2.0 + Math.sin(T * 7) * 0.4) : 0;
    fig.root.position.set(H.x, fy - (H.rise > 0 ? Math.min(1.6, H.rise * 0.7) : 0), H.z);
    const look = H.path[0] || { x: cam.x, z: cam.z };
    const yaw = Math.atan2(look.x - H.x, look.z - H.z);
    if (Number.isFinite(yaw)) fig.root.rotation.y += ((((yaw - fig.root.rotation.y) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 5);
    fig.body.rotation.z = Math.sin(T * 2.4) * 0.05; fig.head.rotation.z = 0.3 + Math.sin(T * 0.9) * 0.1;
    for (const [i, s] of fig.strands.entries()) s.rotation.x = Math.sin(T * 1.7 + i) * 0.06;
    for (const a of fig.arms) a.rotation.x += ((pressing || near < 3 ? -1.25 : -0.2) - a.rotation.x) * Math.min(1, dt * 3);
    fig.root.scale.setScalar(H.fade > 0 ? 1 + H.fade * 0.15 : 1);
    if (H.fade > 0.6) fig.root.visible = Math.sin(T * 50) > 0;
    if (vis && near < 12) {
      const k = Math.max(0, Math.min(1, 1 - near / 12)), prev = ctx.fxState || {};
      ctx.fxState = { ...prev, danger: Math.max(prev.danger || 0, k * (H.mode === 'hunt' ? 0.65 : 0.4)), mist: Math.max(prev.mist || 0, k * 0.3), pos: { x: H.x, y: fy + 1.5, z: H.z } };
    }
  }

  ext.on('game:ready', (c) => {
    ctx = c;
    glow = new THREE.PointLight(0x9db8d0, 0, 4.5, 2); ctx.scene.add(glow);
    fig = buildChigusa(); fig.root.visible = false; ctx.world.group.add(fig.root); G.chigusa = fig;
    const warm = new THREE.Group(); warm.visible = false; warm.add(buildChigusa().root); ctx.scene.add(warm); ctx.warmObjects = [...(ctx.warmObjects || []), warm];
    ctx.systems.push({ id: 'kushi-ghost', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
  });
}
