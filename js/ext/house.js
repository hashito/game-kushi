// The machiya and what lies under it, dressed from plain shapes (W: furniture against the walls, nothing floating). Every solid piece
// gets a collider. Built once at game:ready; the lights are a fixed set (the kit's lamp pool), only their numbers change.
//   house: the front door that will not open, the 帳場 lattice ringed with charms and ハル behind it, the empty display cases, the
//          butsudan and the black phone, the kamado, the well with its charmed lid, the kimono chest and the covered dresser, the workbench,
//          the hatch with the stone mill on it.
//   below: the cellar (the smoking kiln, the stacked boxwood boards, the ladder), the passage (timber frames, low beams you crawl under,
//          water to the ankles, a corridor papered with charms, a slope down), the room at the end (the shelf, the box, 千草's remains).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildHaru } from './people.js';

// where each station's invisible [E] box goes (height above the floor; x / z moves; scale of the box)
const HIT = {
  S_CHOBA: { y: 1.0, dx: 0.35, dz: -0.2 }, S_PHONE: { y: 0.7, s: [0.6, 0.6, 0.6] }, S_BUTSUDAN: { y: 0.9 }, S_BENCH: { y: 0.9 },
  S_LIGHT: { y: 0.35, s: [1.0, 0.5, 1.0] }, S_SHELF: { y: 1.0 },
  S_LAMP1: { y: 1.3, s: [0.5, 0.6, 0.6] }, S_LAMP2: { y: 1.3, s: [0.5, 0.6, 0.6] }, S_LAMP3: { y: 1.3, s: [0.6, 0.6, 0.5] }, S_LAMP4: { y: 1.3, s: [0.5, 0.6, 0.6] },
};
export const LAMPS = { S_LAMP1: [1.8, -2.6], S_LAMP2: [-18.4, -44.2], S_LAMP3: [-16.0, -82.4], S_LAMP4: [9.8, -84.8] };

export function installHouse(ext, G) {
  ext.on('game:ready', (ctx) => {
    const W = ctx.world, grp = new THREE.Group(); grp.name = 'kc-house'; W.group.add(grp);
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const M = {
      wood: std(0x4a3222), dark: std(0x24170f), lacquer: std(0x0d0a09, { roughness: 0.3 }), gold: std(0x8a6a2a, { metalness: 0.6, roughness: 0.4 }),
      clay: std(0x5f5040, { roughness: 1 }), soot: std(0x15110f, { roughness: 1 }), iron: std(0x232323, { metalness: 0.5, roughness: 0.6 }),
      white: std(0xd8d6cc, { roughness: 0.4 }), paper: std(0xd9d0b8, { roughness: 1, side: THREE.DoubleSide }), glass: std(0x2a3a3c, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35 }),
      stone: std(0x4f4b46, { roughness: 1 }), boxwood: std(0xc9a560, { roughness: 0.7 }), timber: std(0x33251a, { roughness: 0.95 }), cloth: std(0x6a6458, { roughness: 1, side: THREE.DoubleSide }),
      indigo: std(0x1a2340, { roughness: 0.95, side: THREE.DoubleSide }), hair: std(0x060606, { roughness: 0.5, side: THREE.DoubleSide }), bone: std(0xbdb6a6, { roughness: 0.8 }),
      water: std(0x22343a, { roughness: 0.04, metalness: 0.7, transparent: true, opacity: 0.78 }), tatami: std(0x6b6a45, { roughness: 1 }), red: std(0x7a1a14),
      flame: new THREE.MeshBasicMaterial({ color: 0xffb35a }), glow: new THREE.MeshBasicMaterial({ color: 0xffd08a }), black: std(0x060606, { roughness: 1 }),
    };
    G.M = M;
    const fy = (room) => W.yOf(room);
    const solids = [];
    const box = (room, x, z, w, h, d, mat, y0 = 0, solid = true, rotY = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, fy(room) + y0 + h / 2, z); m.rotation.y = rotY; m.castShadow = true; m.receiveShadow = true; grp.add(m);
      if (solid) solids.push(m); return m;
    };
    const cyl = (room, x, z, r0, r1, h, mat, y0 = 0, solid = false, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, fy(room) + y0 + h / 2, z); grp.add(m); if (solid) solids.push(m); return m; };
    const plane = (room, x, z, w, h, mat, y, rotY = 0, rotX = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, fy(room) + y, z); m.rotation.set(rotX, rotY, 0); grp.add(m); return m; };
    G.flames = [];
    const candle = (room, x, z, y0 = 0) => { cyl(room, x, z, 0.018, 0.018, 0.12, M.white, y0); const f = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 6), M.flame); f.position.set(x, fy(room) + y0 + 0.14, z); grp.add(f); G.flames.push(f); return f; };

    // ---------------- the frame of the house (posts, the kamoi band, a board ceiling with battens): one merged mesh ----------------
    {
      const geos = [], plan = ctx.data.plan, T = 0.08, part = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); geos.push(g); };
      const cg = [];
      for (const r of plan.rooms) {
        if ((r.floor || 0) !== 1) continue;
        const y0 = fy(r.id), x0 = r.x + T, x1 = r.x + r.w - T, z0 = r.z + T, z1 = r.z + r.d - T;
        const gaps = plan.doors.filter((d) => d.x != null && d.z != null && (d.a === r.id || d.b === r.id)).map((d) => ({ x: d.x, z: d.z, w: (d.width || 1.0) / 2 + 0.2 }));
        const free = (x, z) => !gaps.some((g) => Math.abs(g.x - x) < g.w && Math.abs(g.z - z) < 0.3) && !gaps.some((g) => Math.abs(g.z - z) < g.w && Math.abs(g.x - x) < 0.3);
        const post = (x, z) => { if (free(x, z)) part(0.12, 3.0, 0.12, x, y0 + 1.5, z); };
        for (const [x, z] of [[x0 + 0.06, z0 + 0.06], [x1 - 0.06, z0 + 0.06], [x0 + 0.06, z1 - 0.06], [x1 - 0.06, z1 - 0.06]]) post(x, z);
        const nx = Math.round(r.w / 1.8), nz = Math.round(r.d / 1.8);
        for (let i = 1; i < nx; i++) { const x = r.x + (r.w * i) / nx; post(x, z0 + 0.06); post(x, z1 - 0.06); }
        for (let i = 1; i < nz; i++) { const z = r.z + (r.d * i) / nz; post(x0 + 0.06, z); post(x1 - 0.06, z); }
        part(r.w - 2 * T, 0.1, 0.04, r.x + r.w / 2, y0 + 2.3, z0 + 0.02); part(r.w - 2 * T, 0.1, 0.04, r.x + r.w / 2, y0 + 2.3, z1 - 0.02);
        part(0.04, 0.1, r.d - 2 * T, x0 + 0.02, y0 + 2.3, r.z + r.d / 2); part(0.04, 0.1, r.d - 2 * T, x1 - 0.02, y0 + 2.3, r.z + r.d / 2);
        const along = r.w >= r.d;
        for (let t = 0.45; t < (along ? r.w : r.d) - 0.2; t += 0.45) along ? part(0.035, 0.035, r.d - 2 * T, r.x + t, y0 + 2.96, r.z + r.d / 2) : part(r.w - 2 * T, 0.035, 0.035, r.x + r.w / 2, y0 + 2.96, r.z + t);
        const g = new THREE.PlaneGeometry(r.w - 0.16, r.d - 0.16); g.rotateX(Math.PI / 2); g.translate(r.x + r.w / 2, y0 + 2.985, r.z + r.d / 2); cg.push(g);
      }
      // the passage: timber frames every 4 m along P1, P3 and P5 (posts at the walls, a beam over)
      const frameAt = (room, x, z, alongX, w) => {
        const y0 = fy(room);
        for (const s of [-1, 1]) part(0.14, 2.3, 0.14, alongX ? x : x + s * (w / 2 - 0.08), y0 + 1.15, alongX ? z + s * (w / 2 - 0.08) : z);
        part(alongX ? 0.16 : w, 0.16, alongX ? w : 0.16, x, y0 + 2.33, z);
      };
      for (let z = -4; z > -40; z -= 4) frameAt('P1', 2.6, z, false, 2);
      for (let z = -46; z > -80; z -= 4) frameAt('P3', -17.6, z, false, 2);
      for (let z = -86; z > -99; z -= 4) frameAt('P5', 9, z, false, 2);
      const frame = new THREE.Mesh(mergeGeometries(geos), M.dark); frame.receiveShadow = true; frame.name = 'kc-frame'; grp.add(frame);
      const cm = new THREE.Mesh(mergeGeometries(cg), std(0x2e2018, { roughness: 0.9 })); cm.name = 'kc-ceiling'; grp.add(cm);
    }

    // ---------------- 表の土間: the front door (a lattice door that will not open), a charm on it too, the step up into the shop ----------------
    { const z = 25.9, x = 1.3; box('OMOTE', x, z, 1.7, 2.1, 0.08, M.wood, 0, false);
      for (let i = 1; i < 8; i++) box('OMOTE', x - 0.85 + i * 0.2125, z - 0.05, 0.03, 2.0, 0.03, M.dark, 0.05, false);
      plane('OMOTE', x, z - 0.045, 1.6, 1.95, M.paper, 1.05, Math.PI);
      const c = new THREE.Mesh(G.charmGeo, G.paperM); c.position.set(x + 0.84, fy('OMOTE') + 1.6, z - 0.1); c.rotation.y = Math.PI; grp.add(c);
      box('OMOTE', 0.35, 22.4, 0.5, 0.06, 0.32, M.dark, 0, false); box('OMOTE', 2.2, 22.4, 0.2, 0.05, 0.3, M.straw || M.wood, 0, false); }
    box('OMOTE', 2.5, 23.4, 0.16, 0.3, 3.0, M.dark, 0, false);   // the 框 board along the step
    // ---------------- 店の間: the display cases, the signboard, the 帳場 nook with its lattice and charms, ハル ----------------
    box('MISE', 4.0, 25.62, 2.2, 0.9, 0.55, M.dark); box('MISE', 4.0, 25.62, 2.1, 0.5, 0.5, M.glass, 0.9, false);
    box('MISE', 6.6, 25.62, 1.6, 0.9, 0.55, M.dark); box('MISE', 6.6, 25.62, 1.5, 0.5, 0.5, M.glass, 0.9, false);
    box('MISE', 5.0, 25.94, 1.5, 0.45, 0.05, M.wood, 1.4, false);
    {
      const geos = [], add = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); geos.push(g); }, y0 = fy('MISE');
      for (let x = 5.85; x <= 7.95; x += 0.12) add(0.035, 2.2, 0.035, x, y0 + 1.1, 22.4);   // south lattice (z 22.4)
      for (let z = 20.1; z <= 22.4; z += 0.12) add(0.035, 2.2, 0.035, 5.8, y0 + 1.1, z);    // west lattice (x 5.8)
      add(2.3, 0.08, 0.06, 6.9, y0 + 2.2, 22.4); add(0.06, 0.08, 2.4, 5.8, y0 + 2.2, 21.2); add(2.3, 0.05, 0.06, 6.9, y0 + 0.05, 22.4);
      const lat = new THREE.Mesh(mergeGeometries(geos), M.dark); lat.name = 'kc-lattice'; grp.add(lat);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(5.8, y0, 22.34), new THREE.Vector3(8, y0 + 2.3, 22.46)), off: false });
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(5.74, y0, 20), new THREE.Vector3(5.86, y0 + 2.3, 22.46)), off: false });
      // the charms on the inside of the lattice, close together (they hold her in)
      const n = 34, inst = new THREE.InstancedMesh(G.charmGeo, G.paperM, n), o = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        if (i < 18) { o.position.set(5.9 + i * 0.115, y0 + 1.75 - (i % 3) * 0.42, 22.36); o.rotation.set(0, Math.PI, (i % 2 ? 0.05 : -0.04)); }
        else { const k = i - 18; o.position.set(5.84, y0 + 1.75 - (k % 3) * 0.42, 20.15 + k * 0.14); o.rotation.set(0, Math.PI / 2, (k % 2 ? 0.05 : -0.04)); }
        o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
      }
      inst.frustumCulled = false; inst.name = 'kc-choba-charms'; grp.add(inst); G.chobaCharms = inst;
      // inside: a low desk, the andon lamp, the brazier (hibachi)
      box('MISE', 7.4, 20.6, 0.7, 0.3, 0.4, M.wood, 0, true);
      G.andon = box('MISE', 6.5, 20.5, 0.22, 0.4, 0.22, M.paper, 0, false); box('MISE', 6.5, 20.5, 0.1, 0.12, 0.1, M.glow, 0.15, false);
      cyl('MISE', 6.4, 21.8, 0.24, 0.2, 0.32, M.clay, 0, true); cyl('MISE', 6.4, 21.8, 0.2, 0.2, 0.02, M.soot, 0.31);
      G.ember = cyl('MISE', 6.4, 21.8, 0.12, 0.12, 0.02, new THREE.MeshBasicMaterial({ color: 0x5a1a08 }), 0.33);
      const H = buildHaru(); H.root.position.set(7.15, y0, 21.2); H.root.rotation.y = Math.PI * 0.85; grp.add(H.root); G.haru = H;
      // tea cups in front of the lattice
      for (const dx of [-0.08, 0.1]) cyl('MISE', 5.6 + dx, 22.85, 0.035, 0.03, 0.07, M.white, 0);
    }
    // ---------------- 中の間: the butsudan, the wedding photo, the black phone, the chest of drawers, a low table ----------------
    { const x = 7.62, z = 16.5;
      box('NAKA', x, z, 0.58, 0.8, 1.1, M.lacquer); box('NAKA', x + 0.24, z, 0.06, 0.95, 1.1, M.lacquer, 0.8);
      for (const s of [-1, 1]) box('NAKA', x, z + s * 0.52, 0.58, 0.95, 0.06, M.lacquer, 0.8);
      box('NAKA', x, z, 0.58, 0.12, 1.1, M.lacquer, 1.75); box('NAKA', x - 0.1, z, 0.04, 0.04, 0.9, M.gold, 1.7, false);
      box('NAKA', x - 0.05, z, 0.04, 0.24, 0.08, M.lacquer, 0.8, false);   // the ihai
      candle('NAKA', x - 0.15, z - 0.32, 0.8); candle('NAKA', x - 0.15, z + 0.32, 0.8);
      box('NAKA', 7.78, 17.4, 0.04, 0.32, 0.26, M.dark, 1.3, false); plane('NAKA', 7.75, 17.4, 0.2, 0.26, M.white, 1.46, -Math.PI / 2); }
    box('NAKA', 3.0, 13.32, 0.5, 0.7, 0.36, M.wood); box('NAKA', 3.0, 13.3, 0.24, 0.1, 0.2, M.black, 0.7, false); box('NAKA', 3.0, 13.26, 0.2, 0.05, 0.06, M.black, 0.8, false);
    box('NAKA', 7.2, 13.3, 1.0, 0.9, 0.42, M.wood); for (let j = 0; j < 3; j++) box('NAKA', 7.2, 13.52, 0.9, 0.02, 0.02, M.gold, 0.15 + j * 0.28, false);
    box('NAKA', 5.0, 16.8, 0.9, 0.32, 0.6, M.wood);
    // ---------------- 走り庭: the kamado, the sink, the mizuya cupboard, the well with charms on its lid ----------------
    box('HASHIRI', 0.42, 15.8, 0.75, 0.75, 1.2, M.clay); for (const dz of [-0.3, 0.3]) { cyl('HASHIRI', 0.42, 15.8 + dz, 0.2, 0.16, 0.2, M.iron, 0.75); box('HASHIRI', 0.81, 15.8 + dz, 0.02, 0.2, 0.22, M.soot, 0.15, false); }
    box('HASHIRI', 0.35, 12.2, 0.6, 0.8, 1.4, M.stone); box('HASHIRI', 0.35, 12.2, 0.4, 0.05, 1.0, M.soot, 0.78, false);
    box('HASHIRI', 2.28, 18.4, 0.55, 1.7, 1.2, M.wood); box('HASHIRI', 2.0, 18.4, 0.02, 0.6, 1.0, M.glass, 0.95, false);
    box('HASHIRI', 2.28, 17.7, 0.5, 0.9, 0.3, M.dark, 0, false);
    cyl('HASHIRI', 1.3, 9.0, 0.5, 0.52, 0.55, M.stone, 0, true, 20); cyl('HASHIRI', 1.3, 9.0, 0.48, 0.48, 0.04, M.wood, 0.55, false, 20);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(G.charmGeo, G.paperM); c.rotation.set(-Math.PI / 2, 0, i * 0.7 - 0.7); c.position.set(1.1 + i * 0.2, fy('HASHIRI') + 0.6, 8.95 + (i - 1) * 0.1); grp.add(c); }
    // ---------------- 奥の間: the kimono chest, the dresser under its cloth, the writing desk, a kimono on its stand ----------------
    box('OKU', 3.0, 6.82, 0.95, 1.0, 0.55, M.wood); box('OKU', 3.0, 6.82, 0.7, 0.06, 0.45, M.indigo, 1.0, false);
    box('OKU', 7.62, 8.0, 0.5, 0.75, 0.8, M.wood); box('OKU', 7.75, 8.0, 0.06, 0.8, 0.55, M.cloth, 0.75, false);
    box('OKU', 7.35, 11.6, 0.55, 0.35, 0.9, M.wood);
    box('OKU', 4.6, 12.7, 1.3, 0.04, 0.04, M.dark, 1.7, false); for (const s of [-1, 1]) box('OKU', 4.6 + s * 0.62, 12.72, 0.04, 1.72, 0.25, M.dark, 0, false);
    plane('OKU', 4.6, 12.68, 1.15, 1.35, M.indigo, 1.0, Math.PI);
    // ---------------- 渡り廊下: shutters with charms in the gaps ----------------
    box('ROKA', 7.94, 5.75, 0.06, 2.1, 1.4, M.wood, 0, false);
    // ---------------- 作業場: the workbench, the boards, the tool chest, the board of how combs are made, the hatch and the stone mill ----------------
    box('SAGYO', 0.45, 2.2, 0.8, 0.85, 2.2, M.wood); box('SAGYO', 0.5, 1.2, 0.3, 0.02, 0.1, M.boxwood, 0.85, false);
    for (let i = 0; i < 6; i++) box('SAGYO', 1.0 + i * 0.06, 4.6, 0.03, 1.4, 0.35, M.boxwood, 0, false, 0.05);
    box('SAGYO', 1.12, 4.6, 0.5, 1.4, 0.4, new THREE.MeshBasicMaterial({ visible: false }), 0, true);
    box('SAGYO', 2.6, 4.6, 0.7, 0.7, 0.4, M.dark);
    box('SAGYO', 3.6, -0.94, 1.2, 0.8, 0.04, M.wood, 1.1, false);
    G.hatchLid = box('SAGYO', 6.6, -0.5, 0.82, 0.05, 0.92, M.timber, 0, false);
    G.hatchCharm = new THREE.Mesh(G.charmGeo, G.oldM); G.hatchCharm.rotation.set(-Math.PI / 2, 0, 0.2); G.hatchCharm.position.set(6.6, fy('SAGYO') + 0.06, -0.35); grp.add(G.hatchCharm);
    G.usu = new THREE.Group(); { const u1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.28, 20), M.stone); u1.position.y = 0.14; const u2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.26, 20), M.stone); u2.position.y = 0.41; G.usu.add(u1, u2); }
    G.usu.position.set(6.6, fy('SAGYO'), -0.5); grp.add(G.usu);
    G.usuCol = { box: new THREE.Box3(new THREE.Vector3(6.2, fy('SAGYO'), -0.9), new THREE.Vector3(7.0, fy('SAGYO') + 0.6, -0.1)), off: false }; W.colliders.push(G.usuCol);
    G.moveUsu = (instant) => { G.usuCol.off = true; G.usuTo = instant ? 1 : 0.0001; if (instant) { G.usu.position.set(7.45, fy('SAGYO'), 0.4); G.usu.rotation.z = 0; } };
    // ---------------- 室: the kiln, the boards, a hanging glow from the hatch ----------------
    box('MURO', 5.2, 2.6, 1.2, 0.35, 0.9, M.clay); box('MURO', 5.2, 2.6, 0.9, 0.04, 0.6, M.soot, 0.35, false);
    for (let i = 0; i < 5; i++) box('MURO', 8.75, -0.4 + i * 0.5, 0.4, 1.3 + (i % 2) * 0.4, 0.45, M.boxwood, 0, true);
    for (let i = 0; i < 4; i++) box('MURO', 1.4, 1.0 + i * 0.7, 0.5, 0.25, 0.5, M.timber, 0, true);
    // the claw marks on the underside of the hatch (seen when you look up from the ladder)
    { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(220,200,170,0.75)'; g.lineWidth = 1.5; for (let i = 0; i < 60; i++) { const x = 10 + Math.random() * 108, y = 10 + Math.random() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 8, y + 20 + Math.random() * 40); g.stroke(); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      plane('MURO', 6.6, -0.5, 0.82, 0.92, new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide }), 2.98, 0, Math.PI / 2); }
    // ---------------- the passage ----------------
    // P1: boards stacked along the west wall, hair caught in them
    for (let z = -6; z > -38; z -= 3.2) box('P1', 1.78, z, 0.3, 1.0 + ((z * 7) % 3 === 0 ? 0.3 : 0), 1.4, M.boxwood, 0, true, 0.02);
    for (let i = 0; i < 6; i++) { const h = plane('P1', 1.95, -16 + i * 0.05, 0.02, 0.5 + i * 0.07, M.hair, 1.2, Math.PI / 2); h.rotation.z = 0.2 * (i - 3); }
    // P2: low beams every 1.6 m (crawl under them: crouch). Their colliders are marked "low" (story.js lets a crouching body pass)
    G.low = [];
    for (let x = 0.4; x > -16.4; x -= 1.6) {
      const b = box('P2', x, -41.8, 0.22, 0.22, 1.6, M.timber, 1.12, false);
      const c = { box: new THREE.Box3().setFromObject(b), off: false, low: true }; c.box.min.y = fy('P2') + 0.2; W.colliders.push(c); G.low.push(c);
    }
    box('P2', -8, -41.8, 22, 0.05, 1.6, M.soot, 1.4, false);   // the ceiling hangs low the whole way
    for (let i = 0; i < 7; i++) { const h = plane('P2', -6.2 + i * 0.3, -41.8 + (i % 2 ? 0.3 : -0.3), 0.15, 0.1, M.water, 0.012, 0, -Math.PI / 2); h.scale.set(1, 1.4, 1); }
    for (let i = 0; i < 8; i++) plane('P2', -13 + i * 0.12, -41.6, 0.02, 0.6 + (i % 3) * 0.15, M.hair, 1.0, 0);
    // P3: water to the ankles
    G.water = plane('P3', -17.6, -61.8, 2, 38.4, M.water, 0.08, 0, -Math.PI / 2); G.water.name = 'kc-water';
    for (let i = 0; i < 10; i++) plane('P3', -17.4 + (i % 3) * 0.12, -58 + i * 0.1, 0.03, 0.6, M.hair, 0.1, 0, -Math.PI / 2);
    // P4: the corridor papered with charms (walls and ceiling), one instanced mesh
    {
      const pts = [];
      for (let x = -18.4; x < 9.8; x += 0.22) {
        if (Math.abs(x + 4) < 0.9) continue;   // not over the gate
        for (const [z, ry] of [[-81.11, Math.PI], [-82.49, 0]]) for (const y of [1.0, 1.45, 1.9, 2.35]) if (Math.sin(x * 13.1 + y * 7) > -0.55) pts.push([x, y + Math.sin(x * 5 + y) * 0.06, z, ry, Math.sin(x * 3 + y * 2) * 0.12]);
        if (Math.sin(x * 9) > 0) pts.push([x, 2.95, -81.8, 'ceil', Math.sin(x * 4) * 0.4]);
      }
      const inst = new THREE.InstancedMesh(G.charmGeo, G.paperM, pts.length), o = new THREE.Object3D();
      pts.forEach(([x, y, z, ry, rz], i) => { o.position.set(x, fy('P4A') + y, z); if (ry === 'ceil') o.rotation.set(Math.PI / 2, 0, rz); else o.rotation.set(0, ry, rz); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
      inst.frustumCulled = false; inst.name = 'kc-p4-charms'; grp.add(inst);
    }
    // P5: footprints going both ways in the damp earth
    for (let i = 0; i < 10; i++) plane('P5', 8.75 + (i % 2) * 0.3, -88 - i * 0.7, 0.1, 0.22, M.soot, 0.012, 0, -Math.PI / 2);
    // 奥の室: the shelf, the box with its cord, the remains, the burnt-out candlestick
    const shelfM = std(0x6a4a2c, { roughness: 0.85 });
    box('OKUMURO', 9, -107.93, 1.7, 1.9, 0.04, M.timber, 0, false);
    for (const y of [0.5, 1.0, 1.55]) box('OKUMURO', 9, -107.72, 1.7, 0.06, 0.44, shelfM, y, false);
    for (const s of [-1, 1]) box('OKUMURO', 9 + s * 0.83, -107.72, 0.06, 1.9, 0.44, shelfM, 0, true);
    G.combBox = box('OKUMURO', 9, -107.66, 0.42, 0.11, 0.16, std(0xb58a52, { roughness: 0.6 }), 1.06, false);
    G.boxCord = box('OKUMURO', 9, -107.66, 0.03, 0.12, 0.17, M.red, 1.06, false);
    cyl('OKUMURO', 8.35, -107.65, 0.05, 0.05, 0.12, M.clay, 1.06); cyl('OKUMURO', 9.7, -107.65, 0.06, 0.04, 0.1, M.clay, 0.56);
    plane('OKUMURO', 8.3, -106.7, 0.9, 1.4, M.indigo, 0.06, 0.4, -Math.PI / 2);
    for (let i = 0; i < 9; i++) plane('OKUMURO', 7.9 + i * 0.05, -107.2, 0.04, 0.9, M.hair, 0.03, 0.2, -Math.PI / 2);
    cyl('OKUMURO', 8.65, -107.15, 0.012, 0.012, 0.2, M.bone, 0.02).rotation.x = Math.PI / 2;
    cyl('OKUMURO', 8.72, -107.15, 0.01, 0.01, 0.17, M.bone, 0.02).rotation.x = Math.PI / 2;
    cyl('OKUMURO', 10.6, -107.2, 0.06, 0.07, 0.04, M.gold, 0); cyl('OKUMURO', 10.6, -107.2, 0.016, 0.016, 0.03, M.white, 0.04);

    // ---------------- 灯明 (the oil lamps of the passage): a niche, a dish, a flame that shows when lit ----------------
    G.lampFlame = {};
    for (const [id, [x, z]] of Object.entries(LAMPS)) {
      const room = ctx.data.plan.stations.find((s) => s.id === id).room;
      box(room, x, z, id === 'S_LAMP3' ? 0.5 : 0.18, 0.05, id === 'S_LAMP3' ? 0.18 : 0.5, M.timber, 1.1, false);
      cyl(room, x, z, 0.08, 0.05, 0.04, M.clay, 1.15);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 6), M.flame); f.position.set(x, fy(room) + 1.23, z); f.visible = false; grp.add(f); G.flames.push(f);
      G.lampFlame[id] = f;
    }

    // ---------------- the stations: invisible [E] boxes on the things (no green boxes; no collider in front of the furniture) ----------------
    for (const s of ctx.data.plan.stations) {
      const mesh = W.interactables.find((o) => o.name === `station:${s.id}`); if (!mesh) continue;
      const b0 = new THREE.Box3().setFromObject(mesh);
      const col = W.colliders.find((cl) => cl.box && cl.box.equals(b0)); if (col) col.off = true;
      mesh.material = new THREE.MeshBasicMaterial({ visible: false });
      for (const ch of [...mesh.children]) mesh.remove(ch);
      const h = HIT[s.id]; if (!h) continue;
      mesh.position.y = fy(s.room) + h.y; if (h.dx) mesh.position.x += h.dx; if (h.dz) mesh.position.z += h.dz;
      if (h.s) mesh.scale.set(h.s[0] / 0.9, h.s[1] / 1.1, h.s[2] / 0.5);
    }
    // the hatch: its [E] spot is the lid on the floor; the mill's is the mill
    G.hatchHit = W.interactables.find((o) => o.name === 'station:S_HATCH');
    if (G.hatchHit) { G.hatchHit.position.set(6.6, fy('SAGYO') + 0.12, -0.5); G.hatchHit.scale.set(0.9 / 0.9, 0.24 / 1.1, 1.0 / 0.5); }
    const usuHit = W.interactables.find((o) => o.name === 'station:S_USU');
    if (usuHit) { usuHit.position.set(6.6, fy('SAGYO') + 0.4, -0.5); usuHit.scale.set(0.95 / 0.9, 0.8 / 1.1, 0.95 / 0.5); G.usuHit = usuHit; }
    // the kit's ladder head on the workshop floor (a black well and rails) gives way to our hatch; its [E] box stays (it is the way down)
    for (const o of W.group.children) if (o.name === 'stair-flight' && o.children.some((k) => k.name === 'stair-well')) for (const k of o.children) if (k.position.y > fy('SAGYO') - 0.1) k.visible = false;
    G.stairDown = W.interactables.find((o) => o.name && o.name.startsWith('stairs:ST_HATCH') && o.position.y > fy('SAGYO') - 0.5);
    G.stairUp = W.interactables.find((o) => o.name && o.name.startsWith('stairs:ST_HATCH') && o.position.y < fy('SAGYO') - 0.5);

    // ---------------- the light: a dim house; underground only what is lit there ----------------
    const lamps = W.lamps || [];
    for (let i = lamps.length - 1; i >= 0; i--) if (lamps[i].floor === 0) lamps.splice(i, 1);
    const DIM = { OMOTE: 0.32, MISE: 0.42, NAKA: 0.4, HASHIRI: 0.32, OKU: 0.36, ROKA: 0.28, SAGYO: 0.42 };
    for (const l of lamps) { l.i *= DIM[l.room] ?? 0.4; l.d *= 0.85; }
    const mise = lamps.find((l) => l.room === 'MISE'); if (mise) { mise.x = 6.5; mise.z = 21.0; mise.y = fy('MISE') + 0.9; mise.i = 3.2; mise.d = 7; }   // the andon behind the lattice lights the shop
    for (const o of [...W.group.children]) if (/^lamp(shade|bulb|cord):(MURO|P\d|P4A|P4B|OKUMURO|MISE)/.test(o.name)) o.visible = false;
    G.muroGlow = { room: 'MURO', floor: 0, x: 6.6, y: 2.6, z: 0.0, i: 0, d: 6 }; lamps.push(G.muroGlow);
    G.lampEntry = {};
    const OFF = { S_LAMP1: [0.4, 0], S_LAMP2: [0.4, 0], S_LAMP3: [0, 0.4], S_LAMP4: [-0.4, 0] };
    for (const [id, [x, z]] of Object.entries(LAMPS)) { const e = { room: id, floor: 0, x: x + OFF[id][0], y: 1.5, z: z + OFF[id][1], i: 0, d: 11 }; lamps.push(e); G.lampEntry[id] = e; }
    G.boxGlow = { room: 'OKUMURO', floor: 0, x: 10.6, y: 0.6, z: -107.0, i: 0, d: 5 }; lamps.push(G.boxGlow);
    W.setLampFloor && W.setLampFloor(ctx.floor || 1, true);

    grp.updateMatrixWorld(true);
    for (const s of solids) W.colliders.push({ box: new THREE.Box3().setFromObject(s), off: false });
    ctx.seatPickups && ctx.seatPickups();
    let t = 0;
    ctx.systems.push({ id: 'kc-flames', def: { update: (dt) => {
      t += dt;
      for (const [i, f] of G.flames.entries()) if (f.visible) f.scale.y = 1 + Math.sin(t * 9 + i * 1.7) * 0.18 + Math.sin(t * 23 + i) * 0.08;
      if (G.usuTo > 0 && G.usuTo < 1) { G.usuTo = Math.min(1, G.usuTo + dt / 1.2); const k = G.usuTo; G.usu.position.set(6.6 + 0.85 * k, fy('SAGYO'), -0.5 + 0.9 * k); G.usu.rotation.z = -k * 0.3; }
      if (G.ember) G.ember.material.color.setRGB(0.35 + Math.sin(t * 2) * 0.05, 0.1, 0.03);
    } }, inst: null });
  });
}
