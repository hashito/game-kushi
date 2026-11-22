// 千草さん under the house (2.0: the basement rebuilt). She walks the rooms of the 室 on a small room graph (室・土の廊下・板の間・燻しの間・奥の室,
// plus the flue between 燻しの間 and 奥の室 that only the dead can pass). A charm on a doorway (or on a flue mouth) is a wall to her. Modes:
//   off      - not there (the player upstairs, or before the basement)
//   cage     - 奥の室 behind the lattice door, beside the box with her comb; she comes to the lattice when you are near it
//   flue     - a comb was put out in 燻しの間 and the flue charm is off: she crawls through the flue to it (unseen; the bells tell where)
//   trapped  - in 燻しの間 with the unfinished comb; she does not press (it is not her comb, but it is a comb)
//   hunt     - her own comb is in your hand: she comes for you. A pasted seal on her way stops her: she presses it, it chars and falls
//   follow   - 2.2: up out of the hatch after you, through the house along the way you ran (G.trail), until ハル's charm ring at the 帳場
//              stops her (「襲われたら終わりにして婆さんの部屋の手前まで逃げる」); upstairs (floor 1), so no room graph: your own trail
// She never lunges or teleports; she is slower than a walking player. Touching you is a catch (story.js decides what that resets).
import * as THREE from 'three';
import { buildChigusa } from './people.js';
import { EDGES, edgeStrength, weakest } from './roads.js';
export { EDGES, edgeStrength, weakest };

export const SPEED = { pace: 0.7, flue: 0.9, room: 1.1, hunt: 1.65, follow: 1.8, calm: 0.8 };
// the roads (EDGES) and the weakest-road search live in roads.js (pure, tested)

export function installGhost(ext, G) {
  let ctx = null, fig = null, glow = null;
  const H = G.gh = { floor: 0, mode: 'off', room: 'OKUMURO', x: 2.6, z: -25.8, path: [], wait: 0, fade: 0, rise: 0, onCatch: null, hidden: false, pressing: null, repath: 0, paceI: 0 };
  const roomAt = (x, z) => ctx.world.roomAt(x, z, ctx.world.floorY(H.floor || 0) + 1);
  const blocked = (e) => {
    if (e.seal && G.sealN(e.seal) > 0) return { seal: e.seal };
    if (e.charm && !G.peeled.includes(e.charm)) return { charm: e.charm };
    return null;
  };
  // the roads she may take: in her cage (奥の室, before the trap) only the lattice; otherwise every road
  const edgesFor = () => (H.mode === 'cage' ? EDGES.filter((e) => e.id === 'e_koshi') : EDGES);
  /** the rooms from a to b along the weakest road: [{ e, fwd }] */
  function route(a, b) { const w = weakest(a, b, G.sealN, G.peeled, edgesFor()); return w ? w.legs : null; }
  G.weakest = (a, b) => weakest(a, b, G.sealN, G.peeled);
  /** waypoints toward (tx, tz) in room troom; stops before the first charm in the way */
  function plan(troom, tx, tz) {
    const legs = route(H.room, troom); if (!legs) return { pts: [], stop: null };
    const pts = [];
    for (const { e, fwd } of legs) {
      const p = fwd ? e.pts : [...e.pts].reverse(), b = blocked(e), dest = fwd ? e.b : e.a;
      if (b) {
        // a block on the far mouth of a flue: she crawls up to it, unseen, and presses it from inside
        if (e.at && e.at === (fwd ? 'b' : 'a')) { p.slice(0, -1).forEach(([x, z], i) => pts.push({ x, z, hidden: !!e.hidden && i > 0, edge: e.id, end: false })); const q = pts[pts.length - 1]; q.press = { ...b, edge: e.id }; return { pts, stop: b }; }
        pts.push({ x: p[0][0], z: p[0][1], press: { ...b, edge: e.id } }); return { pts, stop: b };
      }
      // a flue: hidden between its two mouths (and at the fork); once she is in an edge she follows it to its end (no turning back at a re-plan)
      p.forEach(([x, z], i) => pts.push({ x, z, hidden: !!e.hidden && i > 0 && (i < p.length - 1 || dest === 'J'), edge: e.id, end: i === p.length - 1, node: i === p.length - 1 ? dest : null }));
    }
    pts.push({ x: tx, z: tz });
    return { pts, stop: null };
  }
  G.ghostRoute = (troom, tx, tz) => plan(troom, tx, tz);

  G.ghostStart = (mode, o = {}) => {
    H.floor = o.floor || 0; H.trailI = 0;
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
    if (H.mode === 'off' || ctx.floor !== (H.floor || 0)) { fig.root.visible = false; glow.intensity = 0; H.pressing = null; return; }
    if (!active) return;
    if (H.fade > 0) { H.fade += dt; if (H.fade > 1.2) { const m = H.mode; G.ghostStop(); ext.emit('kushi:ghost-gone', { mode: m }); return; } }
    if (H.wait > 0) H.wait -= dt;
    if (H.rise > 0) H.rise -= dt;
    const tg = H.mode === 'follow' ? null : target();
    let pressing = null;
    if (H.mode === 'follow' && H.wait <= 0 && H.rise <= 0 && H.fade <= 0) {
      // along the way you ran: the trail's points one after another, then straight at you once she is on your last point
      const T0 = G.trail || [];
      let step = SPEED.follow * (ctx.calm ? SPEED.calm : 1) * dt;
      // 2.4.0 (#10): a charm put back on a door behind you holds her there until it chars off (9 s a charm upstairs)
      const nextP = H.trailI < T0.length ? T0[H.trailI] : { x: ctx.camera.position.x, z: ctx.camera.position.z };
      for (const S of G.seals.values()) {
        if (!S.door || S.n <= 0 || S.def.house !== true) continue;
        const d0 = ctx.data.plan.doors.find((x) => x.id === S.door); if (!d0) continue;
        const sx = nextP.x - H.x, sz = nextP.z - H.z, L2 = sx * sx + sz * sz || 1e-6, t = Math.max(0, Math.min(1, ((d0.x - H.x) * sx + (d0.z - H.z) * sz) / L2));
        if (Math.hypot(H.x + sx * t - d0.x, H.z + sz * t - d0.z) < 0.7 && Math.hypot(H.x - d0.x, H.z - d0.z) < 1.4) { pressing = { seal: S.def.id }; step = 0; break; }
      }
      while (step > 0) {
        const p = H.trailI < T0.length ? T0[H.trailI] : { x: ctx.camera.position.x, z: ctx.camera.position.z }, d = Math.hypot(p.x - H.x, p.z - H.z);
        if (d <= step) { H.x = p.x; H.z = p.z; step -= d; if (H.trailI < T0.length) H.trailI++; else break; }
        else { H.x += ((p.x - H.x) / d) * step; H.z += ((p.z - H.z) / d) * step; step = 0; }
      }
      H.path = [{ x: ctx.camera.position.x, z: ctx.camera.position.z }];
      const r = roomAt(H.x, H.z); if (r) H.room = r;
    } else if (tg && H.wait <= 0 && H.rise <= 0 && H.fade <= 0) {
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
        if (d <= step) { H.x = p.x; H.z = p.z; step -= d; if (p.press) { pressing = p.press; break; } H.inEdge = p.edge && !p.end ? p.edge : null; if (p.node) H.room = p.node; H.path.shift(); }
        else { H.x += ((p.x - H.x) / d) * step; H.z += ((p.z - H.z) / d) * step; step = 0; }
      }
      if (!H.hidden) { const r = roomAt(H.x, H.z); if (r) H.room = r; }
      if (!H.path.length && H.room !== 'J') H.hidden = false;
    } else if (H.path[0] && H.path[0].press && Math.hypot(H.path[0].x - H.x, H.path[0].z - H.z) < 0.45) pressing = H.path[0].press;
    // pressing: a seal (or a charm still on its door / lid) chars only when she wants you (her comb is in your hand)
    G.charmPress = null;
    if (pressing && (H.mode === 'hunt' || H.mode === 'follow') && pressing.seal) { const S = G.seals.get(pressing.seal); if (S) S.press = true; }
    if (pressing && H.mode === 'hunt' && pressing.charm) G.charmPress = pressing.charm;
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
    const fy = ctx.world.floorY(H.floor || 0);
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
