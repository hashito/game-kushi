// The machiya and what lies under it (W: furniture against the walls, nothing floating, nothing in a doorway, every surface textured).
// Every solid piece gets a collider. Built once at game:ready; the lights are a fixed set (the kit's lamp pool), only their numbers change.
//   house: the front door that will not open, the 帳場 lattice ringed with charms and ハル behind it, the empty display cases, the
//          butsudan and the black phone, the kamado, the well with its charmed lid, the kimono chest and the covered dresser, the workbench,
//          the hatch with the stone mill on it, and (2.0, 「もう少し物があってもいい」) the things of an old house in every room.
//   below (2.0, rebuilt): the 室 (the kiln, the stacked boxwood, the ledger, the bell-pull cord up to the 帳場), the earth corridor with the
//          old call-bell cord and its bells, 板の間 (racks of boards), 燻しの間 (the smoke pit, hanging boards, the drying rack, the flue
//          mouth), and 奥の室 behind its lattice door (the shelf, the box, 千草's remains, the other flue mouth).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeItemModel } from '../kit/item-kinds.js';
import { buildHaru } from './people.js';
import { ringPlan } from './ring.js';

// where each station's invisible [E] box goes (height above the floor; x / z moves; scale of the box)
const HIT = {
  S_CHOBA: { y: 1.0, dx: 0.35, dz: -0.2, s: [2.0, 1.4, 1.4] } /* 2.2: ハル is easy to speak to (「話しかけづらい」): a wide box along the lattice, talk reach in plan.json */, S_PHONE: { y: 0.8, dx: -0.15, dz: -0.25, s: [0.8, 0.8, 0.8] } /* 2.5.0 #2: on the phone itself, generous */, S_BUTSUDAN: { y: 0.9, s: [1.1, 1.5, 0.9] } /* 2.5.0 P60: the altar is one [E]; the tablet's look is small on it */, S_BENCH: { y: 0.9 },
  S_LIGHT: { y: 0.42, s: [1.2, 0.3, 0.4] } /* 2.4.0 #6: on the kiln's front rim (it was a box on the bare floor a metre before the kiln) */, S_SHELF: { y: 1.0 }, S_RACK: { y: 1.0, s: [0.5, 1.2, 1.2] }, S_KOSHI: { y: 1.2, s: [1.0, 1.6, 0.3] },
  S_OUT: { y: 1.05, s: [1.6, 1.9, 0.3] },
};

/** a boxwood grain texture (yellow, fine lines), drawn once */
function grainTexture(base = '#a8823f', line = 'rgba(90,55,20,0.45)') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 70; i++) { g.strokeStyle = line; g.lineWidth = 0.6 + Math.random(); const x = Math.random() * 128; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y / 30 + i) * 3, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function installHouse(ext, G) {
  // 清次さんの作りかけの櫛: a boxwood comb (the kit's comb is black lacquer and vanished on the dark bench and rack, #7)
  ext.registerItemKind('tsuge_comb', (o = {}) => { const g = makeItemModel('comb', { scale: 1 }); const m = new THREE.MeshStandardMaterial({ color: 0xd2a868, roughness: 0.55 }); g.traverse((x) => { if (x.isMesh) x.material = m; }); return g; }, '柘植の櫛');
  ext.on('game:ready', (ctx) => {
    const W = ctx.world, grp = new THREE.Group(); grp.name = 'kc-house'; W.group.add(grp);
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const TX = (id, color, fb, o = {}) => { try { if (ctx.textures) return ctx.textures.material(id, { triplanar: true, color, ...o }); } catch { /* no library */ } return fb; };
    const boxwoodT = grainTexture();
    const M = {
      wood: TX('wood_dark', 0xb08a6a, std(0x4a3222)), dark: TX('wood_dark', 0x6a5444, std(0x24170f)), lacquer: std(0x0d0a09, { roughness: 0.3 }), gold: std(0x8a6a2a, { metalness: 0.6, roughness: 0.4 }),
      clay: TX('clay_wall', 0x9a8a78, std(0x5f5040, { roughness: 1 })), soot: TX('plaster_soot', 0x5a5450, std(0x15110f, { roughness: 1 })), iron: std(0x232323, { metalness: 0.5, roughness: 0.6 }),
      white: std(0xd8d6cc, { roughness: 0.4 }), paper: std(0xd9d0b8, { roughness: 1, side: THREE.DoubleSide }), glass: std(0x2a3a3c, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35 }),
      stone: TX('stone_wall', 0xb0aaa0, std(0x4f4b46, { roughness: 1 })), boxwood: new THREE.MeshStandardMaterial({ map: boxwoodT, roughness: 0.7 }), timber: TX('planks_dark', 0x8a7866, std(0x33251a, { roughness: 0.95 })),
      cloth: std(0x6a6458, { roughness: 1, side: THREE.DoubleSide }), indigo: std(0x1a2340, { roughness: 0.95, side: THREE.DoubleSide }), hair: std(0x060606, { roughness: 0.5, side: THREE.DoubleSide }), bone: std(0xbdb6a6, { roughness: 0.8 }),
      red: std(0x7a1a14), straw: std(0x8a7a48, { roughness: 1 }), cushion: std(0x3a2a40, { roughness: 1 }), ceramic: std(0x5a4a3a, { roughness: 0.5 }),
      flame: new THREE.MeshBasicMaterial({ color: 0xffb35a }), glow: new THREE.MeshBasicMaterial({ color: 0xffd08a }), black: std(0x060606, { roughness: 1 }), void: new THREE.MeshBasicMaterial({ color: 0x000000 }),
      ash: TX('dirt_floor', 0x6a6460, std(0x3a3632, { roughness: 1 })),
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
    const item = (kind, room, x, z, y0 = 0, rotY = 0, scale = 1.35) => { const m = makeItemModel(kind, { scale }); if (!m) return null; m.position.set(x, fy(room) + y0, z); m.rotation.y = rotY; grp.add(m); return m; };
    G.flames = [];
    const candle = (room, x, z, y0 = 0) => { cyl(room, x, z, 0.018, 0.018, 0.12, M.white, y0); const f = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 6), M.flame); f.position.set(x, fy(room) + y0 + 0.14, z); grp.add(f); G.flames.push(f); return f; };
    const zabuton = (room, x, z, rot = 0) => box(room, x, z, 0.55, 0.06, 0.6, M.cushion, 0, false, rot);

    function buildOutside(dx, dz) {
      const y0 = fy('OMOTE');
      // the doorway: the solid wall becomes three pieces round a 1.7 x 2.1 opening (the door slides into the wall to the west).
      // 2.5.1 (coordinator: 「開いた玄関の先が灰色の壁」): the wall is looked up anywhere in the world (W.group.getObjectByName - it is not a
      // direct child) and, if the world adds it later, again at game:ready (G.cutFrontDoorway)
      G.cutFrontDoorway = () => { if (G.frontCut) return true; const walls = []; W.group.traverse((o) => { if (o.isMesh && o.name === 'wall:OMOTE:s') { const b = new THREE.Box3().setFromObject(o); if (b.min.x < dx && b.max.x > dx) walls.push(o); } }); if (!walls.length) return false; G.frontCut = true; walls.forEach(cut); return true; };
      const cut = (wall) => {
        wall.visible = false; const wm = wall.material, b = new THREE.Box3().setFromObject(wall), zc = (b.min.z + b.max.z) / 2, t = b.max.z - b.min.z, x0 = dx - 0.85, x1 = dx + 0.85, H0 = b.max.y - b.min.y;
        for (const [w, h, x, y] of [[x0 - b.min.x, H0, (b.min.x + x0) / 2, H0 / 2], [b.max.x - x1, H0, (x1 + b.max.x) / 2, H0 / 2], [x1 - x0, H0 - 2.12, dx, 2.12 + (H0 - 2.12) / 2]]) { if (w <= 0.01) continue; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wm); m.position.set(x, b.min.y + y, zc); m.name = 'kc-front-wall'; m.receiveShadow = true; grp.add(m); }
      };
      G.cutFrontDoorway();
      const paint = (w, h, f) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
      const lit = (tx, o = {}) => new THREE.MeshBasicMaterial({ map: tx, ...o });
      const out = new THREE.Group(); out.name = 'kc-outside'; grp.add(out);
      const flat = (w, h, mat, x, y, zz, rx = 0, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, zz); m.rotation.set(rx, ry, 0); out.add(m); return m; };
      const solid = (w, h, d, color, x, y, zz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, zz); out.add(m); return m; };
      // the lane: gravel, a warm pool under the street lamp, the car's beams on the ground
      const lane = paint(512, 512, (g, w, h) => {
        g.fillStyle = '#2b2a2c'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { const v = 30 + Math.random() * 40; g.fillStyle = `rgb(${v | 0},${(v - 2) | 0},${(v - 4) | 0})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        const pool = (x, y, r, a) => { const q = g.createRadialGradient(x, y, 2, x, y, r); q.addColorStop(0, `rgba(255,205,140,${a})`); q.addColorStop(1, 'rgba(255,205,140,0)'); g.fillStyle = q; g.fillRect(0, 0, w, h); };
        pool(150, 120, 150, 0.5); pool(330, 300, 120, 0.3); pool(256, 40, 140, 0.35);
      });
      flat(14, 12, lit(lane), dx + 1.5, y0 - 0.12, dz + 6.3, -Math.PI / 2);
      solid(2.2, 0.12, 0.7, 0x2c2a28, dx, y0 - 0.06, dz + 0.5);   // the stone step down to the lane
      // across the lane: low houses (dark timber fronts, tiled eaves), a few windows still lit
      const front = paint(1024, 256, (g, w, h) => {
        g.fillStyle = '#1e1a17'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 14) { g.fillStyle = x % 28 ? '#2a241f' : '#332b25'; g.fillRect(x, 60, 10, h); }
        g.fillStyle = '#0a0a0c'; g.fillRect(0, 40, w, 24);
        for (const [x, ww] of [[100, 110], [560, 130], [840, 90]]) { const q = g.createLinearGradient(0, 110, 0, 170); q.addColorStop(0, '#f0b86a'); q.addColorStop(1, '#a8682e'); g.fillStyle = q; g.fillRect(x, 96, ww, 84); g.fillStyle = '#3a2614'; for (let k = 1; k < 6; k++) g.fillRect(x + (ww * k) / 6, 96, 3, 84); g.fillRect(x, 136, ww, 3); }
      });
      flat(16, 4.0, lit(front), dx + 1.5, y0 + 1.85, dz + 11.5, 0, Math.PI);
      for (let i = 0; i < 6; i++) { const m = solid(2.6, 0.12, 0.7, 0x0c0c0e, dx - 5 + i * 2.7, y0 + 3.95, dz + 11.2); m.rotation.x = 0.35; }
      // the sky: the last of the evening over the roofs (deep blue above, a thin band of dull orange low down), a few stars
      const sky = paint(512, 256, (g, w, h) => {
        const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#0b1020'); q.addColorStop(0.55, '#1c2540'); q.addColorStop(0.85, '#5a4a52'); q.addColorStop(1, '#8a5a3a'); g.fillStyle = q; g.fillRect(0, 0, w, h);
        g.fillStyle = '#cfd6e8'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h * 0.45, 1, 1);
        g.fillStyle = '#07080b'; g.beginPath(); g.moveTo(0, h); let x = 0; for (const [ww, hh] of [[70, 38], [54, 52], [90, 34], [60, 60], [80, 40], [48, 50], [110, 36]]) { g.lineTo(x, h - hh + 10); g.lineTo(x + 8, h - hh); g.lineTo(x + ww - 8, h - hh); g.lineTo(x + ww, h - hh + 10); x += ww; } g.lineTo(w, h); g.fill(); g.fillStyle = '#e8b870'; for (const [wx, wy] of [[130, 232], [300, 222], [420, 236]]) g.fillRect(wx, wy, 6, 5);
      });
      flat(40, 16, lit(sky, { fog: false }), dx + 1.5, y0 + 9.5, dz + 16, 0, Math.PI);
      // a wooden street lamp with a lit bulb under its shade, and the telephone wire
      solid(0.14, 4.2, 0.14, 0x141210, dx + 3.2, y0 + 2.0, dz + 3.4);
      solid(0.36, 0.05, 0.05, 0x141210, dx + 3.02, y0 + 3.85, dz + 3.4);
      { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 0.22, 12), new THREE.MeshBasicMaterial({ color: 0x1a1612 })); sh.position.set(dx + 2.85, y0 + 3.75, dz + 3.4); out.add(sh);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8, fog: false })); bulb.position.set(dx + 2.85, y0 + 3.6, dz + 3.4); out.add(bulb); }
      solid(16, 0.015, 0.015, 0x050505, dx + 1.5, y0 + 4.4, dz + 3.4);
      // 野口さん's little car on the lane, headlights on (the endings say she came)
      { const cx = dx - 1.6, cz = dz + 6.2;
        solid(3.4, 0.75, 1.5, 0x4d5560, cx, y0 + 0.55, cz); solid(1.8, 0.6, 1.4, 0x3c434c, cx - 0.2, y0 + 1.2, cz);
        for (const s of [-1, 1]) for (const e of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 14), new THREE.MeshBasicMaterial({ color: 0x050505 })); w.rotation.x = Math.PI / 2; w.position.set(cx + s * 1.05, y0 + 0.2, cz + e * 0.7); out.add(w); }
        for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false })); hl.position.set(cx + 1.71, y0 + 0.62, cz + s * 0.5); hl.rotation.y = Math.PI / 2; hl.name = 'kc-headlight'; out.add(hl); }
        // the lights' glow (a soft halo round each lamp, no light cast)
        const halo = paint(64, 64, (g) => { const q = g.createRadialGradient(32, 32, 1, 32, 32, 31); q.addColorStop(0, 'rgba(255,240,200,0.9)'); q.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = q; g.fillRect(0, 0, 64, 64); });
        for (const s2 of [-1, 1]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.position.set(cx + 1.8, y0 + 0.62, cz + s2 * 0.5); sp.scale.setScalar(0.7); out.add(sp); }
        { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.position.set(dx + 2.85, y0 + 3.6, dz + 3.4); sp.scale.setScalar(1.1); out.add(sp); } }
      // this house's eaves over the doorway
      solid(2.8, 0.08, 1.2, 0x0e0c0a, dx, y0 + 2.95, dz + 0.75);
      // 2.5.1: the outside is never fogged - the house's thick night fog (exp2 0.055) turned the lane and the car into a grey sheet 6 m away
      out.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { m.fog = false; m.needsUpdate = true; } });
      G.outside = out;
    }

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
      // under the house: timber frames along the earth corridor every 3 m (posts at the walls, a beam at 2.45 m - well above the head)
      const y0 = fy('DORO');
      for (let z = -3.5; z > -18.5; z -= 3) { for (const s of [-1, 1]) part(0.14, 2.45, 0.14, 2.6 + s * 0.9, y0 + 1.225, z); part(2.0, 0.16, 0.16, 2.6, y0 + 2.53, z); }
      for (const z of [-7.0, -11.0]) part(5.8, 0.16, 0.16, 6.6, fy('IBUSHI') + 2.55, z);   // 燻しの間: two beams the boards hang from
      const frame = new THREE.Mesh(mergeGeometries(geos), M.dark); frame.receiveShadow = true; frame.name = 'kc-frame'; grp.add(frame);
      const cm = new THREE.Mesh(mergeGeometries(cg), M.timber); cm.name = 'kc-ceiling'; grp.add(cm);
    }

    // ---------------- 表の土間: the front door (a lattice door that will not open), a charm on it too, the step up into the shop ----------------
    { const z = 25.9, x = 1.3, k0 = grp.children.length;
      box('OMOTE', x, z, 1.7, 2.1, 0.08, M.wood, 0, false);
      for (let i = 1; i < 8; i++) box('OMOTE', x - 0.85 + i * 0.2125, z - 0.05, 0.03, 2.0, 0.03, M.dark, 0.05, false);
      plane('OMOTE', x, z - 0.045, 1.6, 1.95, M.paper, 1.05, Math.PI);
      const c = new THREE.Mesh(G.charmGeo, G.paperM); c.position.set(x + 0.72, fy('OMOTE') + 1.6, z - 0.075); c.rotation.y = Math.PI; grp.add(c); G.frontCharm = c;
      // 2.4.0 (#11 「最後に玄関を開ける…まで歩いて」): the front door is one group that slides open at the very end, when the player opens it.
      // Behind it, the night street: the headlights of 野口さん's car (a lit plane, no new light)
      G.frontDoor = new THREE.Group(); for (const o of grp.children.slice(k0)) G.frontDoor.add(o); grp.add(G.frontDoor); G.frontK = 0;
      // 2.5.0 (#6 「玄関があいたら外が見えるように」): the wall behind the front door has a real doorway; outside, the town at dusk - a stone step,
      // the gravel lane in a street lamp's pool, 野口さん's car with its lights on, the low houses across the lane with a lit window or two,
      // and the last of the evening sky. Unlit materials with the light painted in (no new light, nothing compiles when the door opens)
      buildOutside(x, z);
      box('OMOTE', 0.35, 22.4, 0.5, 0.06, 0.32, M.dark, 0, false); box('OMOTE', 2.2, 22.4, 0.2, 0.05, 0.3, M.straw, 0, false); }
    box('OMOTE', 2.5, 23.4, 0.16, 0.3, 3.0, M.dark, 0, false);   // the 框 board along the step
    // 2.0: a water jar, an oiled-paper umbrella in the corner, a shoe cupboard along the west wall
    cyl('OMOTE', 0.36, 24.7, 0.24, 0.18, 0.62, M.ceramic, 0, true, 18); cyl('OMOTE', 0.36, 24.7, 0.25, 0.25, 0.03, M.wood, 0.62);
    { const u = cyl('OMOTE', 0.22, 25.55, 0.06, 0.012, 1.15, std(0x6a2a1a, { roughness: 0.9 }), 0); u.rotation.z = 0.08; }
    box('OMOTE', 0.27, 21.2, 0.38, 0.95, 1.2, M.wood);
    for (const dz of [-0.3, 0.3]) box('OMOTE', 0.47, 21.2 + dz, 0.02, 0.85, 0.52, M.dark, 0.05, false);
    // ---------------- 店の間: the display cases, the signboard, the 帳場 nook with its lattice and charms, ハル ----------------
    box('MISE', 4.0, 25.62, 2.2, 0.9, 0.55, M.dark); box('MISE', 4.0, 25.62, 2.1, 0.5, 0.5, M.glass, 0.9, false);
    box('MISE', 6.6, 25.62, 1.6, 0.9, 0.55, M.dark); box('MISE', 6.6, 25.62, 1.5, 0.5, 0.5, M.glass, 0.9, false);
    box('MISE', 5.0, 25.89, 1.5, 0.45, 0.03, M.wood, 1.4, false);
    {
      const geos = [], add = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); geos.push(g); }, y0 = fy('MISE');
      for (let x = 5.85; x <= 7.95; x += 0.12) add(0.035, 2.2, 0.035, x, y0 + 1.1, 22.4);   // south lattice (z 22.4)
      for (let z = 20.1; z <= 22.4; z += 0.12) add(0.035, 2.2, 0.035, 5.8, y0 + 1.1, z);    // west lattice (x 5.8)
      add(2.3, 0.08, 0.06, 6.9, y0 + 2.2, 22.4); add(0.06, 0.08, 2.4, 5.8, y0 + 2.2, 21.2); add(2.3, 0.05, 0.06, 6.9, y0 + 0.05, 22.4);
      const lat = new THREE.Mesh(mergeGeometries(geos), M.dark); lat.name = 'kc-lattice'; grp.add(lat);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(5.8, y0, 22.34), new THREE.Vector3(8, y0 + 2.3, 22.46)), off: false, gate: true });   // gate: the trap check sees through it (ハル's booth, nobody goes in)
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(5.74, y0, 20), new THREE.Vector3(5.86, y0 + 2.3, 22.46)), off: false, gate: true });
      // the charms on the inside of the lattice, close together but each in its own place (2.0: none overlaps another, the corner kept clear)
      const pts = [];
      for (let i = 0; i < 16; i++) pts.push([6.02 + i * 0.12, 1.75 - (i % 3) * 0.42, 22.36, Math.PI, i % 2 ? 0.05 : -0.04]);
      for (let k = 0; k < 15; k++) pts.push([5.84, 1.75 - (k % 3) * 0.42, 20.2 + k * 0.13, Math.PI / 2, k % 2 ? 0.05 : -0.04]);
      const inst = new THREE.InstancedMesh(G.charmGeo, G.paperM, pts.length), o = new THREE.Object3D();
      pts.forEach(([x, y, z, ry, rz], i) => { o.position.set(x, y0 + y, z); o.rotation.set(0, ry, rz); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
      inst.frustumCulled = false; inst.name = 'kc-choba-charms'; grp.add(inst); G.chobaCharms = inst;
      // inside: a low desk with an abacus, the andon lamp, the brazier (hibachi), the call bell on its cord (it goes down under the floor)
      box('MISE', 7.4, 20.6, 0.7, 0.3, 0.4, M.wood, 0, true);
      item('abacus', 'MISE', 7.4, 20.6, 0.3, 0.2);
      G.andon = box('MISE', 6.5, 20.5, 0.22, 0.4, 0.22, M.paper, 0, false); box('MISE', 6.5, 20.5, 0.1, 0.12, 0.1, M.glow, 0.15, false);
      cyl('MISE', 6.4, 21.8, 0.24, 0.2, 0.32, M.clay, 0, true); cyl('MISE', 6.4, 21.8, 0.2, 0.2, 0.02, M.soot, 0.31);
      G.ember = cyl('MISE', 6.4, 21.8, 0.12, 0.12, 0.02, new THREE.MeshBasicMaterial({ color: 0x5a1a08 }), 0.33);
      cyl('MISE', 7.75, 21.9, 0.004, 0.004, 1.6, M.straw, 1.35); G.chobaBell = item('bell', 'MISE', 7.75, 21.9, 1.3, 0, 1.8);
      const H = buildHaru(); H.root.position.set(7.15, y0, 21.2); H.root.rotation.y = Math.PI * 0.85; grp.add(H.root); G.haru = H;
      for (const dx of [-0.08, 0.1]) item('yunomi', 'MISE', 5.6 + dx, 22.85, 0, 0, 1.0);
    }
    // 2.0: cushions in front of the cases, a wall clock on the north wall (flush), its hands at a quarter to six. 2.2: it hung at x 5.1, where
    // the 中の間 fusuma slides open (「スライドする戸のところに壁掛け時計があるので良くない」); now on the solid wall above ハル's desk in the 帳場
    zabuton('MISE', 4.3, 24.3); zabuton('MISE', 5.4, 24.3, 0.1);
    { const y = 1.75, z = 20.08 + 0.06, CX = 7.3; box('MISE', CX, z, 0.34, 0.62, 0.12, M.wood, y - 0.31, false);
      const face = cyl('MISE', CX, z + 0.065, 0.12, 0.12, 0.01, M.white, y + 0.03); face.rotation.x = Math.PI / 2; face.position.y = fy('MISE') + y + 0.08;
      box('MISE', CX, z + 0.075, 0.008, 0.09, 0.004, M.black, y + 0.08, false); box('MISE', CX - 0.02, z + 0.078, 0.06, 0.006, 0.004, M.black, y + 0.08, false);
      box('MISE', CX, z + 0.065, 0.02, 0.22, 0.01, M.gold, y - 0.28, false); }
    // ---------------- 中の間: the butsudan, the wedding photo, the black phone, the chest of drawers, a low table ----------------
    { const x = 7.62, z = 16.5;
      box('NAKA', x, z, 0.58, 0.8, 1.1, M.lacquer); box('NAKA', x + 0.24, z, 0.06, 0.95, 1.1, M.lacquer, 0.8);
      for (const s of [-1, 1]) box('NAKA', x, z + s * 0.52, 0.58, 0.95, 0.06, M.lacquer, 0.8);
      box('NAKA', x, z, 0.58, 0.12, 1.1, M.lacquer, 1.75); box('NAKA', x - 0.1, z, 0.04, 0.04, 0.9, M.gold, 1.7, false);
      item('ihai', 'NAKA', x + 0.05, z, 0.8, -Math.PI / 2, 1.2);
      candle('NAKA', x - 0.15, z - 0.32, 0.8); candle('NAKA', x - 0.15, z + 0.32, 0.8);
      // the wedding photo hangs flush on the east wall (2.0: it floated 12 cm off the wall)
      box('NAKA', 7.905, 17.6, 0.03, 0.34, 0.28, M.dark, 1.35, false); plane('NAKA', 7.888, 17.6, 0.22, 0.28, M.white, 1.52, -Math.PI / 2); }
    // the black phone on its stand, the receiver resting on the body
    box('NAKA', 3.0, 13.32, 0.5, 0.7, 0.36, M.wood); box('NAKA', 3.0, 13.3, 0.24, 0.1, 0.2, M.black, 0.7, false); box('NAKA', 3.0, 13.3, 0.22, 0.05, 0.06, M.black, 0.8, false);
    for (const s of [-1, 1]) box('NAKA', 3.0 + s * 0.1, 13.3, 0.05, 0.05, 0.08, M.black, 0.83, false);
    G.phoneAt = { x: 3.0, y: fy('NAKA') + 0.85, z: 13.3 };
    box('NAKA', 7.2, 13.3, 1.0, 0.9, 0.42, M.wood); for (let j = 0; j < 3; j++) box('NAKA', 7.2, 13.52, 0.9, 0.02, 0.02, M.gold, 0.15 + j * 0.28, false);
    box('NAKA', 5.0, 16.8, 0.9, 0.32, 0.6, M.wood); item('teapot', 'NAKA', 4.8, 16.8, 0.32, 0.4, 1.1); item('yunomi', 'NAKA', 5.2, 16.7, 0.32, 0, 1.0);
    // 2.0: a long brazier by the west wall, cushions, a hanging scroll (flush), a tea cupboard by the east wall
    box('NAKA', 2.98, 16.3, 0.5, 0.36, 0.9, M.wood); box('NAKA', 2.98, 16.3, 0.36, 0.02, 0.6, M.ash, 0.36, false); item('kettle', 'NAKA', 2.98, 16.1, 0.38, 0, 1.0);
    zabuton('NAKA', 3.65, 16.3); zabuton('NAKA', 5.0, 17.75);
    { const x = 2.69; box('NAKA', x, 18.6, 0.01, 1.0, 0.48, std(0xcfc6aa, { roughness: 1 }), 0.95, false); box('NAKA', x + 0.008, 18.6, 0.012, 0.04, 0.56, M.dark, 1.93, false); box('NAKA', x + 0.008, 18.6, 0.012, 0.04, 0.56, M.dark, 0.93, false); }
    box('NAKA', 7.72, 19.0, 0.38, 0.95, 0.8, M.wood); box('NAKA', 7.52, 19.0, 0.02, 0.4, 0.7, M.glass, 0.5, false);
    // ---------------- 走り庭: the kamado, the sink, the mizuya cupboard, the well with charms on its lid ----------------
    box('HASHIRI', 0.42, 15.8, 0.75, 0.75, 1.2, M.clay); for (const dz of [-0.3, 0.3]) { cyl('HASHIRI', 0.42, 15.8 + dz, 0.2, 0.16, 0.2, M.iron, 0.75); box('HASHIRI', 0.81, 15.8 + dz, 0.02, 0.2, 0.22, M.soot, 0.15, false); }
    box('HASHIRI', 0.35, 12.2, 0.6, 0.8, 1.4, M.stone); box('HASHIRI', 0.35, 12.2, 0.4, 0.05, 1.0, M.soot, 0.78, false);
    box('HASHIRI', 2.28, 18.4, 0.55, 1.7, 1.2, M.wood); box('HASHIRI', 2.0, 18.4, 0.02, 0.6, 1.0, M.glass, 0.95, false);
    box('HASHIRI', 2.28, 17.7, 0.5, 0.9, 0.3, M.dark, 0);   // the small chest the candlestick and letter one sit on (solid: not walked through)
    cyl('HASHIRI', 1.3, 9.0, 0.5, 0.52, 0.55, M.stone, 0, true, 20); cyl('HASHIRI', 1.3, 9.0, 0.48, 0.48, 0.04, M.wood, 0.55, false, 20);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(G.charmGeo, G.paperM); c.rotation.set(-Math.PI / 2, 0, i * 0.5 - 0.5); c.position.set(1.0 + i * 0.3, fy('HASHIRI') + 0.596, 9.12 + (i - 1) * 0.08); grp.add(c); }
    // 2.0: a bucket by the well, a water jar, a charcoal stove, firewood along the east wall, a basket on the sink
    cyl('HASHIRI', 2.0, 9.6, 0.17, 0.14, 0.3, M.wood, 0, true); cyl('HASHIRI', 0.35, 14.0, 0.24, 0.18, 0.6, M.ceramic, 0, true);
    cyl('HASHIRI', 0.32, 17.3, 0.16, 0.13, 0.26, M.clay, 0, true); cyl('HASHIRI', 0.32, 17.3, 0.12, 0.12, 0.01, M.soot, 0.26);
    for (let i = 0; i < 9; i++) { const l = cyl('HASHIRI', 2.4, 13.4 + (i % 3) * 0.32, 0.07, 0.07, 0.6, M.timber, 0); l.rotation.z = Math.PI / 2; l.position.y = fy('HASHIRI') + 0.07 + Math.floor(i / 3) * 0.13; }
    W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(2.08, fy('HASHIRI'), 13.3), new THREE.Vector3(2.52, fy('HASHIRI') + 0.42, 14.2)), off: false });
    item('basket', 'HASHIRI', 0.35, 11.8, 0.8, 0, 1.2);
    // ---------------- 奥の間: the kimono chest, the dresser under its cloth, the writing desk, a kimono on its stand ----------------
    box('OKU', 3.0, 6.82, 0.95, 1.0, 0.55, M.wood); box('OKU', 3.0, 6.82, 0.7, 0.06, 0.45, M.indigo, 1.0, false);
    box('OKU', 7.62, 8.0, 0.5, 0.75, 0.8, M.wood); box('OKU', 7.75, 8.0, 0.06, 0.8, 0.55, M.cloth, 0.75, false);
    box('OKU', 7.35, 11.6, 0.55, 0.35, 0.9, M.wood);
    // the kimono stand stands by the west side, clear of the fusuma to 中の間 (2.0: it hid half of that door)
    box('OKU', 3.45, 12.7, 1.3, 0.04, 0.04, M.dark, 1.7, false); for (const s of [-1, 1]) box('OKU', 3.45 + s * 0.62, 12.72, 0.04, 1.72, 0.25, M.dark, 0, false);
    plane('OKU', 3.45, 12.68, 1.15, 1.35, M.indigo, 1.0, Math.PI);
    W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(2.8, fy('OKU'), 12.55), new THREE.Vector3(4.1, fy('OKU') + 1.8, 12.86)), off: false });
    // 2.0: folded futon by the east wall, an andon, a cushion by the desk
    box('OKU', 7.55, 9.8, 0.75, 0.42, 1.0, std(0x8a8270, { roughness: 1 })); box('OKU', 7.55, 9.8, 0.7, 0.08, 0.95, std(0x5a3a3a, { roughness: 1 }), 0.42, false);
    item('andon', 'OKU', 3.1, 10.8, 0, 0, 2.6); zabuton('OKU', 6.75, 11.6, Math.PI / 2);
    // ---------------- 渡り廊下: shutters with charms in the gaps ----------------
    box('ROKA', 7.94, 5.75, 0.06, 2.1, 1.4, M.wood, 0, false);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(G.charmGeo, G.paperM); c.rotation.y = -Math.PI / 2; c.position.set(7.905, fy('ROKA') + 1.85 - i * 0.45, 5.75); grp.add(c); }
    // ---------------- 作業場: the workbench, the boards, the tool chest, the board of how combs are made, the hatch and the stone mill ----------------
    box('SAGYO', 0.45, 2.2, 0.8, 0.85, 2.2, M.wood);
    for (let i = 0; i < 6; i++) box('SAGYO', 1.0 + i * 0.06, 4.6, 0.03, 1.4, 0.35, M.boxwood, 0, false, 0.05);
    W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(0.87, fy('SAGYO'), 4.4), new THREE.Vector3(1.37, fy('SAGYO') + 1.4, 4.8)), off: false });
    box('SAGYO', 2.6, 4.6, 0.7, 0.7, 0.4, M.dark);
    box('SAGYO', 3.6, -0.9, 1.2, 0.8, 0.03, M.wood, 1.1, false);
    // 2.4.0 (#8 「はしごの部分で穴があいている感じに」): the hatch is a lid on a hinge along its north edge. Open, it stands against the north
    // wall and the floor shows a real hole: a dark rim of boards, the shaft lined down through the floor's thickness, darkness below with the
    // ladder's head in it. A collider keeps you from walking over the hole (the ladder is [E]).
    { const y0 = fy('SAGYO'), x0 = 6.2, x1 = 7.0, z0 = -0.96, z1 = -0.04, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W0 = x1 - x0, D0 = z1 - z0;
      const rim = M.dark, lining = std(0x1a120c, { roughness: 1, side: THREE.DoubleSide });
      for (const [w, d, x, z] of [[W0 + 0.16, 0.08, cx, z0 - 0.04], [W0 + 0.16, 0.08, cx, z1 + 0.04], [0.08, D0, x0 - 0.04, cz], [0.08, D0, x1 + 0.04, cz]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), rim); m.position.set(x, y0 + 0.012, z); m.name = 'kc-hole-rim'; m.receiveShadow = true; grp.add(m); }
      const depth = 0.5;
      for (const [w, rot, x, z] of [[W0 - 0.08, 0, cx, z0 + 0.037], [W0 - 0.08, Math.PI, cx, z1 - 0.037], [D0 - 0.08, Math.PI / 2, x0 + 0.037, cz], [D0 - 0.08, -Math.PI / 2, x1 - 0.037, cz]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, depth), lining); m.position.set(x, y0 - depth / 2 - 0.01, z); m.rotation.y = rot; m.name = 'kc-hole-shaft'; m.userData.rectOk = true; grp.add(m); }
      const dark = new THREE.Mesh(new THREE.PlaneGeometry(W0, D0), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      dark.rotation.x = -Math.PI / 2; dark.position.set(cx, y0 - 0.72, cz); dark.name = 'kc-hole-dark'; dark.renderOrder = 2; grp.add(dark);
      G.hatchPivot = new THREE.Group(); G.hatchPivot.position.set(cx, y0, z0); grp.add(G.hatchPivot);
      G.hatchLid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 0.92), M.timber); G.hatchLid.position.set(0, 0.025, 0.46); G.hatchLid.castShadow = true; G.hatchLid.name = 'kc-hatch-lid'; G.hatchPivot.add(G.hatchLid);
      G.hatchCharm = new THREE.Mesh(G.charmGeo, G.oldM); G.hatchCharm.rotation.set(-Math.PI / 2, 0, 0.2); G.hatchCharm.position.set(0, 0.056, 0.61); G.hatchPivot.add(G.hatchCharm);
      G.holeCol = { box: new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y0 + 0.9, z1)), off: true }; W.colliders.push(G.holeCol);
      G.hatchOpen = false; G.hatchTo = 0; G.hatchK = 0;
      G.setHatch = (open, instant) => { G.hatchOpen = !!open; G.hatchTo = open ? 1 : 0; if (instant) G.hatchK = G.hatchTo; G.holeCol.off = !open; G.hatchPivot.rotation.x = -1.62 * G.hatchK; };
    }
    G.usu = new THREE.Group(); { const u1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.28, 20), M.stone); u1.position.y = 0.14; const u2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.26, 20), M.stone); u2.position.y = 0.41; G.usu.add(u1, u2); }
    G.usu.position.set(6.6, fy('SAGYO'), -0.5); grp.add(G.usu);
    G.usuCol = { box: new THREE.Box3(new THREE.Vector3(6.2, fy('SAGYO'), -0.9), new THREE.Vector3(7.0, fy('SAGYO') + 0.6, -0.1)), off: false }; W.colliders.push(G.usuCol);
    G.moveUsu = (instant) => { G.usuCol.off = true; G.usuTo = instant ? 1 : 0.0001; if (instant) { G.usu.position.set(7.45, fy('SAGYO'), 0.4); G.usu.rotation.z = 0; } };
    // 2.0: a shelf of camellia-oil jars on the east wall, shavings under the bench, a saw on the bench
    for (const y of [0.8, 1.35]) box('SAGYO', 7.78, 2.0, 0.3, 0.03, 1.0, M.wood, y, false);
    for (const s of [-1, 1]) box('SAGYO', 7.78, 2.0 + s * 0.485, 0.3, 1.4, 0.03, M.wood, 0, false);
    W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(7.62, fy('SAGYO'), 1.48), new THREE.Vector3(7.93, fy('SAGYO') + 1.4, 2.52)), off: false });
    for (let i = 0; i < 4; i++) { cyl('SAGYO', 7.78, 1.66 + i * 0.22, 0.06, 0.06, 0.16, M.ceramic, 0.83); cyl('SAGYO', 7.78, 1.68 + i * 0.21, 0.05, 0.05, 0.12, M.ceramic, 1.38); }
    for (let i = 0; i < 14; i++) plane('SAGYO', 1.0 + ((i * 37) % 50) / 100, 1.4 + ((i * 53) % 160) / 100, 0.06, 0.03, M.boxwood, 0.004, i * 0.7, -Math.PI / 2);
    item('saw', 'SAGYO', 0.45, 2.9, 0.85, 0.3, 1.0);

    // =====================================================================================================================================
    // ---------------- 室 (MURO): the kiln, the stacked boards, the ledger shelf, the bell-pull cord, the claw marks on the hatch ----------------
    // the kiln (燻し炉): a low clay hearth with a raised rim, cold ash and charred sticks inside, an iron grate. Its front rim is flat and broad:
    // the place to set the candlestick out of the draught from the hatch (2.4.0 #6: what it is, and why the rim)
    box('MURO', 5.2, 2.6, 1.2, 0.3, 0.9, M.clay);
    for (const [w, d, x, z] of [[1.24, 0.16, 5.2, 2.17], [1.24, 0.1, 5.2, 3.03], [0.1, 0.9, 4.6, 2.6], [0.1, 0.9, 5.8, 2.6]]) box('MURO', x, z, w, 0.12, d, M.clay, 0.3);
    box('MURO', 5.2, 2.62, 1.0, 0.03, 0.66, M.ash, 0.3, false); for (let i = 0; i < 5; i++) box('MURO', 4.85 + i * 0.17, 2.62, 0.03, 0.02, 0.6, M.iron, 0.34, false);
    // 2.4.0 #6: the workshop lamp's light through the open hatch lies on the kiln's front rim - a soft pale patch (shown by story.js once the
    // hatch is open), so the rim is the one thing you can make out in the dark cellar before the candle is lit
    { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const am = new THREE.CanvasTexture(cv);
      const mk = (w, d, y, z, op) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffe0b0, alphaMap: am, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(5.2, fy('MURO') + y, z); m.name = 'kc-kiln-light'; m.userData.dot = 'light'; m.renderOrder = 3; grp.add(m); return m; };
      G.kilnPatch = [mk(1.3, 0.2, 0.425, 2.17, 0.6), mk(2.4, 1.4, 0.012, 1.6, 0.22)]; for (const m of G.kilnPatch) m.visible = false; }
    for (let i = 0; i < 4; i++) { const st = box('MURO', 5.0 + i * 0.14, 2.55 + (i % 2) * 0.12, 0.34, 0.04, 0.04, M.black, 0.36, false, 0.4 + i * 0.5); st.name = 'kc-kiln-stick'; }
    for (let i = 0; i < 5; i++) box('MURO', 8.7, -0.35 + i * 0.5, 0.42, 1.3 + (i % 2) * 0.4, 0.45, M.boxwood, 0, true);
    // the ledger shelf on the west wall (the 札の控え lies on it: data/docs.json DOC_HIKAE)
    box('MURO', 1.24, 3.6, 0.32, 0.03, 0.9, M.wood, 1.0, false); for (const s of [-1, 1]) box('MURO', 1.24, 3.6 + s * 0.4, 0.3, 0.2, 0.03, M.dark, 0.8, false);
    W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(1.08, fy('MURO') + 0.98, 3.15), new THREE.Vector3(1.4, fy('MURO') + 1.03, 4.05)), off: false });
    item('candlestick', 'MURO', 1.24, 3.25, 1.03, 0, 1.1);
    // the bell-pull: a cord from a hole in the ceiling to a worn wooden grip (it rings the bell in the 帳場)
    cyl('MURO', 3.6, 3.9, 0.006, 0.006, 1.7, M.straw, 1.3); box('MURO', 3.6, 3.9, 0.05, 0.16, 0.05, M.dark, 1.15, false); cyl('MURO', 3.6, 3.9, 0.03, 0.03, 0.02, M.black, 2.98);
    // the claw marks on the underside of the hatch (seen when you look up from the ladder)
    { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(220,200,170,0.75)'; g.lineWidth = 1.5; for (let i = 0; i < 60; i++) { const x = 10 + Math.random() * 108, y = 10 + Math.random() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 8, y + 20 + Math.random() * 40); g.stroke(); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      plane('MURO', 6.6, -0.5, 0.82, 0.92, new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide }), 2.98, 0, Math.PI / 2); }

    // ---------------- the old call-bell cord: along the ceiling from the 室 through the corridor into every room; a bell every few metres ----------------
    G.bells = [];
    {
      const y = fy('DORO') + 2.75, cord = [];
      const run = (pts) => { for (let i = 0; i < pts.length - 1; i++) cord.push([pts[i], pts[i + 1]]); };
      run([[3.6, 3.9], [3.3, 0.2], [3.3, -18.6]]); run([[3.3, -6], [-2.0, -6]]); run([[3.3, -9], [8.5, -9]]); run([[3.3, -19.4], [3.3, -24.0]]); run([[3.3, -14.6], [-2.4, -14.6]]); run([[3.3, -16.2], [7.6, -16.2]]);
      const geos = [];
      for (const [[ax, az], [bx, bz]] of cord) { const L = Math.hypot(bx - ax, bz - az), g = new THREE.CylinderGeometry(0.006, 0.006, L, 4); g.rotateZ(Math.PI / 2); g.rotateY(-Math.atan2(bz - az, bx - ax)); g.translate((ax + bx) / 2, y, (az + bz) / 2); geos.push(g); }
      const cm = new THREE.Mesh(mergeGeometries(geos), M.straw); cm.name = 'kc-bellcord'; grp.add(cm);
      for (const [x, z] of [[3.3, -2.5], [3.3, -7.5], [3.3, -12.5], [3.3, -17.0], [-1.0, -6], [6.5, -9], [8.3, -9], [3.3, -21.5], [3.3, -24.0], [-1.0, -14.6], [6.4, -16.2]]) {
        const b = makeItemModel('bell', { scale: 2.2 }); if (!b) continue; const hold = new THREE.Group(); hold.position.set(x, y, z); b.position.y = -0.11; hold.add(b);
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 3), M.straw); str.position.y = -0.03; hold.add(str); grp.add(hold);
        G.bells.push({ x, z, y: y - 0.05, hold, swing: 0 });
      }
    }

    // ---------------- 土の廊下 (DORO): a broken crate, a stack of boards, the lattice door of 奥の室 at the end ----------------
    box('DORO', 3.25, -4.5, 0.5, 0.45, 0.6, M.timber); box('DORO', 3.25, -4.5, 0.55, 0.04, 0.62, M.timber, 0.45, false, 0.15);
    box('DORO', 1.92, -12.2, 0.36, 0.8, 0.5, M.boxwood);   // 2.4.0: moved off 甕の間's new doorway (P12)
    // 奥の室's lattice door (格子戸, 2.0 「格子戸が存在しないように見えます」): a real frame and bars you can see through, the waxed charm in the
    // middle; it slides open when the charm is off
    {
      const y0 = fy('DORO'), z = -19.0, g = new THREE.Group(); g.name = 'kc-koshi';
      const geos = [], add = (w, h, d, x, y, zz) => { const q = new THREE.BoxGeometry(w, h, d); q.translate(x, y, zz); geos.push(q); };
      add(1.24, 0.07, 0.07, 0, 2.15, 0); add(1.24, 0.07, 0.07, 0, 0.04, 0); add(0.07, 2.18, 0.07, -0.6, 1.09, 0); add(0.07, 2.18, 0.07, 0.6, 1.09, 0);
      for (let i = 1; i < 12; i++) add(0.028, 2.08, 0.04, -0.6 + i * 0.1, 1.09, 0);
      for (const yy of [0.62, 1.82]) add(1.2, 0.035, 0.045, 0, yy, 0);
      const m = new THREE.Mesh(mergeGeometries(geos), TX('wood_dark', 0x5a4434, std(0x2a1c12))); m.castShadow = true; g.add(m);
      g.position.set(2.6, y0, z); grp.add(g); G.koshi = g;
      box('DORO', 1.94, -18.98, 0.1, 2.4, 0.16, M.dark, 0, false); box('DORO', 3.26, -18.98, 0.1, 2.4, 0.16, M.dark, 0, false); box('DORO', 2.6, -18.98, 1.42, 0.14, 0.16, M.dark, 2.3, false);
      // 2.4.0 (#7 「奥の部屋に扉があかなくても入れてしまう」): the lattice was drawn but its collider was never added (the push sat inside a
      // comment). It is now the plan's door D_KOSHI (closable, look none): the kit's collider blocks it while it is shut, the story locks it
      // until the waxed charm is off (#10: then [E] opens it), and this lattice slides with the door (tools/check-playtest.mjs P54)
      G.koshiK = 0;
      G.openKoshi = (instant) => { const d = W.doors.get('D_KOSHI'); if (d && !d.isOpen) d.open(); if (instant) { G.koshiK = 1; G.koshi.position.x = 2.6 + 1.15; } };
    }

    // ---------------- 板の間 (ITA): racks of boxwood boards on two walls, boards leaning, a bench with tally tags ----------------
    {
      const rack = (x0, x1, z, d) => { for (const y of [0.05, 0.75, 1.45]) box('ITA', (x0 + x1) / 2, z, x1 - x0, 0.04, d, M.timber, y, false);
        for (let k = 0; k <= 3; k++) box('ITA', x0 + 0.03 + (k * (x1 - x0 - 0.06)) / 3, z, 0.06, 1.9, d, M.dark, 0, false);
        for (const y of [0.09, 0.79, 1.49]) for (let x = x0 + 0.2; x < x1 - 0.15; x += 0.28) box('ITA', x, z, 0.22, 0.04 + (Math.round(x * 10) % 3) * 0.02, d - 0.05, M.boxwood, y, false);
        W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(x0, fy('ITA'), z - d / 2), new THREE.Vector3(x1, fy('ITA') + 1.9, z + d / 2)), off: false }); };
      rack(-3.6, 0.9, -3.4, 0.6);     // along the south wall
      rack(-1.4, 1.3, -8.6, 0.6);     // along the north wall, clear of the wall charm at x -2.0
      for (let i = 0; i < 5; i++) { const b = box('ITA', -4.18, -4.6 - i * 0.18, 0.04, 1.5, 0.16, M.boxwood, 0, false); b.rotation.z = -0.1; }
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(-4.32, fy('ITA'), -5.45), new THREE.Vector3(-3.95, fy('ITA') + 1.5, -4.4)), off: false });
      box('ITA', -0.8, -6.3, 1.2, 0.75, 0.6, M.wood);
      for (let i = 0; i < 4; i++) box('ITA', -1.2 + i * 0.26, -6.3, 0.1, 0.005, 0.16, std(0xd8cfb4, { roughness: 1 }), 0.75, false, 0.2 * i);
    }

    // ---------------- 燻しの間 (IBUSHI): the smoke pit, boards hanging from the beams, the drying rack, the flue mouth ----------------
    {
      const y0 = fy('IBUSHI');
      box('IBUSHI', 6.4, -9.0, 1.4, 0.06, 1.4, M.stone, 0, false); box('IBUSHI', 6.4, -9.0, 1.2, 0.02, 1.2, M.ash, 0.06, false);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(5.7, y0, -9.7), new THREE.Vector3(7.1, y0 + 0.4, -8.3)), off: false });
      for (const z of [-7.0, -11.0]) for (let i = 0; i < 8; i++) { const x = 4.4 + i * 0.6; box('IBUSHI', x, z, 0.03, 0.8, 0.3, M.boxwood, 1.95, false); cyl('IBUSHI', x, z, 0.004, 0.004, 0.2, M.straw, 2.75); }   // above the head (1.95 m up)
      // the drying rack against the east wall: the place to put a comb out (S_RACK)
      for (const y of [0.9, 1.45]) box('IBUSHI', 9.33, -9.0, 0.36, 0.04, 1.6, M.timber, y, false);
      for (const s of [-1, 1]) box('IBUSHI', 9.33, -9.0 + s * 0.78, 0.36, 1.8, 0.05, M.dark, 0, false);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(9.15, y0, -9.83), new THREE.Vector3(9.51, y0 + 1.8, -8.17)), off: false });
      G.lureAt = { x: 9.3, z: -9.0, y: y0 + 0.94 };
      G.lure = makeItemModel('tsuge_comb', { scale: 2.6 }); if (G.lure) { G.lure.position.set(9.3, y0 + 0.94, -9.0); G.lure.rotation.y = Math.PI / 2; G.lure.visible = false; grp.add(G.lure); }
    }
    // the two flue mouths: a stone frame, black inside (only the dead go through)
    // 2.5.0 (#3): a wide mouth (wd 1.3: 奥の室, 寝間) is shut by two charms side by side (fuda.json need 2)
    const flueMouth = (room, x, z, facing, wd = 0.9) => {
      const s = facing === 'n' ? -1 : 1;
      box(room, x, z + s * 0.12, wd, 0.12, 0.08, M.stone, 0.72, false); for (const d of [-1, 1]) box(room, x + d * (wd / 2 - 0.05), z + s * 0.12, 0.12, 0.72, 0.08, M.stone, 0, false);
      const v = plane(room, x, z + s * 0.0855, wd - 0.22, 0.7, M.void, 0.36, facing === 'n' ? Math.PI : 0); v.name = 'kc-flue-dark';   // 2.1.0: 5.5 mm off the wall (at 1 mm the two flickered: P21), still behind the flue charm (1 cm)
    };
    flueMouth('IBUSHI', 7.5, -13, 's'); flueMouth('OKUMURO', 5.5, -19, 'n', 1.3); flueMouth('NEMA', 5.2, -13, 'n', 1.3);   /* 2.5.0: away from the 燻しの間 flue on the other face of the wall (select-range) */
    // 2.4.0 (#9): the flue's other two branches: 板の間 and the new 甕の間, each mouth shut with a wooden lid and one of ハル's old charms
    flueMouth('ITA', -3.0, -9, 's'); flueMouth('KAME', -1.5, -18, 's');
    // (their wooden lids are fuda.js seals K_ITAM / K_KAMEM: closed, with ハル's old charm on them)
    // ---------------- 甕の間 (KAME, 2.4.0 「もう少し地下室が大きくても」): the jars the boards were soaked in, a trough, the rope, a lamp niche ----------------
    {
      const y0 = fy('KAME');
      for (const [x, z, r] of [[-3.7, -12.0, 0.42], [-3.7, -13.2, 0.38], [-3.7, -14.4, 0.42], [-3.7, -15.7, 0.36], [0.6, -17.2, 0.4]]) {
        cyl('KAME', x, z, r * 0.8, r, 0.85, M.ceramic, 0, true, 20); cyl('KAME', x, z, r * 0.82, r * 0.82, 0.02, M.black, 0.84, false, 20);
        const lid = cyl('KAME', x + 0.05, z, r * 0.86, r * 0.86, 0.035, M.wood, 0.86, false, 20); lid.rotation.z = 0.05;
      }
      cyl('KAME', -3.7, -13.2, 0.28, 0.28, 0.01, std(0x0b1214, { roughness: 0.15 }), 0.855, false, 20).name = 'kc-kame-water';   // one lid off: black water
      for (let i = 0; i < 5; i++) { const b = box('KAME', -1.4 + i * 0.05, -12.0, 0.03, 0.06, 1.6, M.boxwood, 0.12, false); b.rotation.x = 0.02 * i; }
      box('KAME', -1.3, -12.0, 2.0, 0.12, 0.7, M.timber); box('KAME', -1.3, -12.0, 1.8, 0.02, 0.5, std(0x0b1214, { roughness: 0.15 }), 0.12, false);   // the soaking trough
      for (let i = 0; i < 6; i++) { const rg = cyl('KAME', 0.9, -12.1, 0.2 - i * 0.012, 0.2 - i * 0.012, 0.03, M.straw, i * 0.03, false, 18); rg.name = 'kc-rope'; }
      box('KAME', -4.3, -16.6, 0.2, 0.3, 0.4, M.stone, 1.3, false); item('candlestick', 'KAME', -4.25, -16.6, 1.6, 0, 1.0);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(-2.3, y0, -12.35), new THREE.Vector3(-0.3, y0 + 0.3, -11.65)), off: false });
    }

    // ---------------- 寝間 (NEMA, 2.5.0 #3 #4 「地下に生活していた痕跡を」): the night-watch room where 千草さん lived her last days ----------------
    // a thin futon still laid out, its pillow, two wooden bowls, a board of candle stubs burnt to nothing, her apron and tabi folded by the
    // pillow, the days counted on the wall (正 three times and one more), her writing low on the wall; the wide flue mouth with ハル's pair of charms
    {
      const scratchTex = (draw, w = 256, h = 256) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(226,212,186,0.82)'; g.fillStyle = 'rgba(226,212,186,0.82)'; g.lineCap = 'round'; draw(g); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: true }); };
      // the futon (a thin mattress, a quilt pushed back, a buckwheat pillow with a dent)
      box('NEMA', 8.75, -16.4, 1.0, 0.07, 2.0, std(0xd2c6a6, { roughness: 1 }), 0, false);   /* 2.5.1: a pale cotton futon reads in the andon's light */
      { const q = box('NEMA', 8.8, -16.0, 1.04, 0.05, 1.2, std(0x34466e, { roughness: 1 }), 0.07, false); q.rotation.z = 0.03; }
      box('NEMA', 8.75, -17.25, 0.45, 0.1, 0.24, std(0x9a8c6a, { roughness: 1 }), 0.06, false);
      for (let i = 0; i < 6; i++) plane('NEMA', 8.6 + i * 0.025, -16.9 + i * 0.04, 0.012, 0.5, M.hair, 0.072 + i * 0.0005, 0.3, -Math.PI / 2);
      // two wooden bowls by the head of the futon, one with a dry ring of water
      cyl('NEMA', 7.95, -17.6, 0.075, 0.05, 0.05, M.wood, 0, false); cyl('NEMA', 7.95, -17.6, 0.065, 0.065, 0.004, M.black, 0.046, false);
      { const b2 = cyl('NEMA', 8.15, -17.85, 0.07, 0.048, 0.048, M.wood, 0, false); b2.rotation.z = 0.25; }
      // the candle stubs on a low board against the south wall: a dozen, each burnt down to a stub, wax run onto the board
      box('NEMA', 6.3, -18.72, 1.3, 0.04, 0.26, M.timber, 0, false);
      for (let i = 0; i < 13; i++) { const x = 5.75 + i * 0.09, h = 0.012 + ((i * 7) % 5) * 0.006; cyl('NEMA', x, -18.72 + ((i % 3) - 1) * 0.05, 0.016, 0.02, h, M.white, 0.04, false, 8); cyl('NEMA', x + 0.01, -18.7, 0.03, 0.03, 0.003, M.white, 0.04, false, 8); }
      // her apron and tabi, folded by the pillow
      box('NEMA', 9.25, -18.25, 0.36, 0.05, 0.3, M.indigo, 0, false); box('NEMA', 9.25, -18.25, 0.3, 0.02, 0.24, std(0x24304e, { roughness: 1 }), 0.05, false);
      for (const dz of [-0.06, 0.06]) box('NEMA', 9.25, -17.9 + dz, 0.22, 0.03, 0.09, M.white, 0, false);
      // the days counted: 正 正 正 and one more stroke, scratched into the clay at sitting height (on the south wall, flush)
      { const m = scratchTex((g) => { g.lineWidth = 5; const glyph = (x0, n) => { const S = [[[10, 8], [70, 8]], [[40, 8], [40, 90]], [[40, 48], [66, 48]], [[18, 40], [18, 90]], [[4, 90], [76, 90]]]; for (const [[a, b], [c, d]] of S.slice(0, n)) { g.beginPath(); g.moveTo(x0 + a + Math.random() * 3, b + 40 + Math.random() * 3); g.lineTo(x0 + c + Math.random() * 3, d + 40 + Math.random() * 3); g.stroke(); } }; glyph(6, 5); glyph(92, 5); glyph(178, 5); g.beginPath(); g.moveTo(16, 160); g.lineTo(70, 160); g.stroke(); }, 256, 192);
        const t = plane('NEMA', 7.3, -18.905, 0.62, 0.46, m, 0.95, 0); t.name = 'kc-nema-tally'; }
      // her writing, low on the wall, in a shaking hand (vertical lines, right to left); the last line breaks off
      { const m = scratchTex((g) => { g.font = '30px serif'; const cols = ['あけてください', 'せいじさん', 'なにが　いけなかったのですか', 'くしは　おくの']; cols.forEach((t, c) => { [...t].forEach((ch, k) => { g.save(); g.translate(228 - c * 56 + Math.random() * 3, 34 + k * 30); g.rotate((Math.random() - 0.5) * 0.12); g.fillText(ch, -15, 10); g.restore(); }); }); }, 256, 512);
        const t = plane('NEMA', 5.1, -18.905, 0.42, 0.84, m, 0.62, 0); t.name = 'kc-nema-writing'; }
      // 2.5.1 (D-4 「行灯が灰色の箱」, D-51 「寝間が真っ暗」): a real andon by the head of the bed - a square wooden frame on a low base, four legs, a carrying bar
      // on top, paper sides lit from inside (one side torn) - with a stub still burning in it: a dim warm light that shows the futon, the
      // bowls, the candle stubs and the tally on entering (a light made with the house, so nothing compiles when you come down)
      { const ax = 7.7, az = -15.55, fr = M.timber, paper = new THREE.MeshBasicMaterial({ color: 0xf0b874, transparent: true, opacity: 0.92 }), torn = new THREE.MeshBasicMaterial({ color: 0x8a5a30, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        box('NEMA', ax, az, 0.36, 0.04, 0.36, fr, 0, false);                                     // the base board
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('NEMA', ax + sx * 0.15, az + sz * 0.15, 0.025, 0.74, 0.025, fr, 0.0, false);   // legs and posts
        for (const y of [0.16, 0.7]) { box('NEMA', ax, az - 0.15, 0.33, 0.025, 0.025, fr, y, false); box('NEMA', ax, az + 0.15, 0.33, 0.025, 0.025, fr, y, false); box('NEMA', ax - 0.15, az, 0.025, 0.025, 0.33, fr, y, false); box('NEMA', ax + 0.15, az, 0.025, 0.025, 0.33, fr, y, false); }
        box('NEMA', ax, az, 0.025, 0.025, 0.42, fr, 0.86, false); box('NEMA', ax, az - 0.2, 0.025, 0.14, 0.025, fr, 0.74, false); box('NEMA', ax, az + 0.2, 0.025, 0.14, 0.025, fr, 0.74, false);   // the carrying bar
        const side = (x, z, ry, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.52), mat); m.position.set(x, fy('NEMA') + 0.445, z); m.rotation.y = ry; m.name = 'kc-andon-paper'; grp.add(m); };
        side(ax, az + 0.148, 0, paper); side(ax + 0.148, az, Math.PI / 2, paper); side(ax - 0.148, az, -Math.PI / 2, paper); side(ax, az - 0.148, Math.PI, torn);
        const lt = new THREE.PointLight(0xffa860, 1.7, 9, 1.2); lt.position.set(ax - 0.35, fy('NEMA') + 0.95, az - 0.45); lt.name = 'kc-nema-andon'; W.group.add(lt); G.nemaLight = lt; }
      // a water jar from 甕の間 with a ladle
      cyl('NEMA', 9.2, -13.6, 0.22, 0.17, 0.5, M.ceramic, 0, true, 18); cyl('NEMA', 9.2, -13.6, 0.17, 0.17, 0.01, M.black, 0.49, false, 18);
      { const l = cyl('NEMA', 9.15, -13.6, 0.008, 0.008, 0.5, M.wood, 0.5); l.rotation.z = 0.5; }
    }

    // ---------------- 奥の室 (OKUMURO): the shelf, the box with its cord and charm, the remains, the burnt-out candlestick ----------------
    {
      const x = 2.6, zw = -27 + 0.08;
      box('OKUMURO', x, zw + 0.02, 1.7, 1.9, 0.03, M.timber, 0, false);
      for (const y of [0.5, 1.0, 1.55]) box('OKUMURO', x, zw + 0.25, 1.7, 0.06, 0.44, M.wood, y, false);
      for (const s of [-1, 1]) box('OKUMURO', x + s * 0.83, zw + 0.25, 0.06, 1.9, 0.44, M.wood, 0, false);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(x - 0.86, fy('OKUMURO'), zw), new THREE.Vector3(x + 0.86, fy('OKUMURO') + 1.9, zw + 0.47)), off: false });
      G.combBox = box('OKUMURO', x, zw + 0.3, 0.42, 0.11, 0.16, M.boxwood, 1.06, false);
      G.boxCord = box('OKUMURO', x, zw + 0.3, 0.03, 0.12, 0.17, M.red, 1.06, false);
      G.boxCharm = new THREE.Mesh(G.charmGeo, G.oldM); G.boxCharm.rotation.set(-Math.PI / 2, 0, Math.PI / 2); G.boxCharm.position.set(x - 0.05, fy('OKUMURO') + 1.172, zw + 0.3); G.boxCharm.scale.set(0.9, 0.5, 1); grp.add(G.boxCharm);
      item('jar', 'OKUMURO', x - 0.6, zw + 0.25, 1.06, 0, 1.0); item('jar', 'OKUMURO', x + 0.6, zw + 0.25, 0.56, 0, 1.0);
      plane('OKUMURO', x - 0.7, zw + 1.0, 0.9, 1.4, M.indigo, 0.012, 0.4, -Math.PI / 2);
      for (let i = 0; i < 9; i++) plane('OKUMURO', x - 1.1 + i * 0.05, zw + 0.75, 0.04, 0.9, M.hair, 0.016, 0.2, -Math.PI / 2);
      cyl('OKUMURO', x - 0.35, zw + 0.55, 0.012, 0.012, 0.2, M.bone, 0.012).rotation.x = Math.PI / 2;
      cyl('OKUMURO', x - 0.28, zw + 0.55, 0.01, 0.01, 0.17, M.bone, 0.012).rotation.x = Math.PI / 2;
      item('candlestick', 'OKUMURO', x + 1.4, zw + 0.6, 0, 0, 1.1);
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
    G.hatchHit = W.interactables.find((o) => o.name === 'station:S_HATCH');
    if (G.hatchHit) { G.hatchHit.position.set(6.6, fy('SAGYO') + 0.12, -0.5); G.hatchHit.scale.set(0.9 / 0.9, 0.24 / 1.1, 1.0 / 0.5); G.hatchHit.userData.noOwnMesh = true; }
    const usuHit = W.interactables.find((o) => o.name === 'station:S_USU');
    if (usuHit) { usuHit.position.set(6.6, fy('SAGYO') + 0.4, -0.5); usuHit.scale.set(0.95 / 0.9, 0.8 / 1.1, 0.95 / 0.5); G.usuHit = usuHit; }
    G.koshiHit = W.interactables.find((o) => o.name === 'station:S_KOSHI');
    for (const o of W.group.children) if (o.name === 'stair-flight' && o.children.some((k) => k.name === 'stair-well')) for (const k of o.children) if (k.position.y > fy('SAGYO') - 0.1) k.visible = false;
    G.stairDown = W.interactables.find((o) => o.name && o.name.startsWith('stairs:ST_HATCH') && o.position.y > fy('SAGYO') - 0.5);
    G.stairUp = W.interactables.find((o) => o.name && o.name.startsWith('stairs:ST_HATCH') && o.position.y < fy('SAGYO') - 0.5);

    // ---------------- the light: a dim house; underground only what is lit there ----------------
    const lamps = W.lamps || [];
    for (let i = lamps.length - 1; i >= 0; i--) if (lamps[i].floor === 0) lamps.splice(i, 1);
    const DIM = { OMOTE: 0.32, MISE: 0.42, NAKA: 0.4, HASHIRI: 0.32, OKU: 0.36, ROKA: 0.28, SAGYO: 0.42 };
    for (const l of lamps) { l.i *= DIM[l.room] ?? 0.4; l.d *= 0.85; }
    const mise = lamps.find((l) => l.room === 'MISE'); if (mise) { mise.x = 6.5; mise.z = 21.0; mise.y = fy('MISE') + 0.9; mise.i = 3.2; mise.d = 7; }
    for (const o of [...W.group.children]) if (/^lamp(shade|bulb|cord):(MURO|DORO|ITA|IBUSHI|KAME|NEMA|OKUMURO|MISE)/.test(o.name)) o.visible = false;
    G.muroGlow = { room: 'MURO', floor: 0, x: 6.6, y: 2.6, z: 0.0, i: 0, d: 7.5 }; lamps.push(G.muroGlow);
    // 2.4.0 #6: the workshop's lamp through the open hatch falls on the kiln's rim - the one place you can make out before the candle is lit
    G.kilnGlow = { room: 'MURO', floor: 0, x: 5.4, y: 1.5, z: 1.7, i: 0, d: 2.6 }; lamps.push(G.kilnGlow);
    G.boxGlow = { room: 'OKUMURO', floor: 0, x: 2.6, y: 0.8, z: -25.6, i: 0, d: 5 }; lamps.push(G.boxGlow);
    W.setLampFloor && W.setLampFloor(ctx.floor || 1, true);

    grp.updateMatrixWorld(true);
    for (const s of solids) W.colliders.push({ box: new THREE.Box3().setFromObject(s), off: false });
    ctx.seatPickups && ctx.seatPickups();

    // ---------------- sounds of the house: the black phone's bell, the little bells of the cord ----------------
    // 黒電話 (2.0, 「電話がなる場合は電話の音がなるべきです」): a clapper between two gongs, about 16 strikes a second for a second, from the phone
    G.phoneRing = (first = false) => {
      const A = ctx.audio; if (!A || !A.tone) return; const pos = G.phoneAt;
      for (const t of ringPlan(first)) A.tone({ at: t.at, dur: t.dur, freq: t.freq, type: t.type, gain: t.gain, pos: t.near && !first ? pos : null, wet: first ? 0.25 : 0.4, attack: 0.003 });
    };
    G.bellAt = (pos, gain = 0.05) => {
      const A = ctx.audio; if (!A || !A.tone) return;
      for (const [f, gk, d] of [[2650, 1, 0.9], [4120, 0.45, 0.6], [6200, 0.2, 0.35]]) A.tone({ dur: d, freq: f + Math.random() * 40, type: 'sine', gain: gain * gk, pos, wet: 0.6, attack: 0.002 });
    };
    ext.on('kushi:bell', ({ x, z, hidden }) => {
      if (hidden) { G.bellAt({ x, y: fy('IBUSHI') + 1.0, z }, 0.03); return; }
      let best = null, bd = 3.2; for (const b of G.bells) { const d = Math.hypot(b.x - x, b.z - z); if (d < bd) { bd = d; best = b; } }
      if (!best) return; best.swing = 1; G.bellAt({ x: best.x, y: best.y, z: best.z });
    });
    let t = 0;
    ctx.systems.push({ id: 'kc-flames', def: { update: (dt) => {
      t += dt;
      for (const [i, f] of G.flames.entries()) if (f.visible) f.scale.y = 1 + Math.sin(t * 9 + i * 1.7) * 0.18 + Math.sin(t * 23 + i) * 0.08;
      if (G.usuTo > 0 && G.usuTo < 1) { G.usuTo = Math.min(1, G.usuTo + dt / 1.2); const k = G.usuTo; G.usu.position.set(6.6 + 0.85 * k, fy('SAGYO'), -0.5 + 0.9 * k); G.usu.rotation.z = -k * 0.3; }
      { const dk = W.doors.get('D_KOSHI'), to = dk && dk.isOpen ? 1 : 0; if (G.koshiK !== to) { G.koshiK = to > G.koshiK ? Math.min(1, G.koshiK + dt / 1.2) : Math.max(0, G.koshiK - dt / 1.2); G.koshi.position.x = 2.6 + 1.15 * G.koshiK; } }
      if (G.hatchK !== G.hatchTo) { G.hatchK = G.hatchTo > G.hatchK ? Math.min(1, G.hatchK + dt / 0.9) : Math.max(0, G.hatchK - dt / 0.7); const e = G.hatchK * G.hatchK * (3 - 2 * G.hatchK); G.hatchPivot.rotation.x = -1.62 * e; }
      if (G.frontTo != null && G.frontK !== G.frontTo) { G.frontK = Math.min(1, (G.frontK || 0) + dt / 1.6); G.frontDoor.position.x = -1.5 * (G.frontK * G.frontK * (3 - 2 * G.frontK)); }
      for (const b of G.bells) if (b.swing > 0) { b.swing = Math.max(0, b.swing - dt * 0.8); b.hold.rotation.z = Math.sin(t * 14) * 0.35 * b.swing; }
      if (G.ember) G.ember.material.color.setRGB(0.35 + Math.sin(t * 2) * 0.05, 0.1, 0.03);
    } }, inst: null });
  });
}
