// The charms (お札): the one rule of the game (docs/brief.md) - この家のお札は、死んだ者を通さない。
//   - a charm across a door and its post keeps the door shut; [E] peels it off (a short peel), the door opens, the charm goes into your hand;
//   - a charm in your hand can be pasted on a post (結界の柱); the dead cannot pass it. While 千草さん presses on it, it chars and falls;
//   - the spare charms on the walls of the charm corridor can be peeled too (a side quest: more charms for the way back).
// The count is in the HUD (「札 ×N」, top right). Everything is built once at game:ready (one shared paper texture; one material per post).
import * as THREE from 'three';

const NORMAL = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };

/** the paper of a charm: real brush-style text drawn on a canvas (no generated picture carries letters) */
function charmTexture(old = false) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 96; c.height = 288;
  const g = c.getContext('2d');
  g.fillStyle = old ? '#b9a77c' : '#e9e2cf'; g.fillRect(0, 0, 96, 288);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(90,70,40,${Math.random() * (old ? 0.12 : 0.05)})`; g.fillRect(Math.random() * 96, Math.random() * 288, 2, 2); }
  g.strokeStyle = old ? '#5a3a20' : '#3a2a1a'; g.lineWidth = 2; g.strokeRect(6, 6, 84, 276);
  g.fillStyle = '#9e1b17'; g.globalAlpha = 0.85; g.beginPath(); g.arc(48, 40, 18, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  g.fillStyle = '#efe6d0'; g.font = 'bold 20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('封', 48, 41);
  g.fillStyle = '#16100c'; g.font = 'bold 30px serif';
  ['鎮', '魂', '急', '急', '如', '律'].forEach((ch, i) => g.fillText(ch, 48, 86 + i * 32));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function installFuda(ext, G) {
  let ctx = null;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const geo = new THREE.PlaneGeometry(0.1, 0.3);
  geo.translate(0, -0.15, 0);   // hinged at its top edge: the peel turns it down and away
  let paperM = null, oldM = null;
  const charms = new Map();   // id -> { def, mesh, hit, door?, wall? }
  const posts = new Map();    // id -> { def, charm, mat, hit, on, burn, press }
  const peeling = [];

  G.fuda = G.fuda || 0; G.peeled = G.peeled || []; G.postsOn = G.postsOn || {}; G.posts = posts; G.charms = charms;

  // ---------------- HUD ----------------
  let chip = null;
  G.showFuda = () => {
    if (!chip) return;
    const on = ctx && (ctx.state.tasks.includes('T_CHOBA') || G.fuda > 0);
    chip.hidden = !on; chip.textContent = `札 ×${G.fuda}`; chip.classList.toggle('kc-none', G.fuda === 0);
  };
  G.addFuda = (n) => { G.fuda = Math.max(0, G.fuda + n); G.showFuda(); };

  // ---------------- building ----------------
  function charmAt(room, x, y, z, face, mat, id, label) {
    const R = ctx.world.rooms.get(room), fy = (R && R.y) || 0;
    const m = new THREE.Mesh(geo, mat); m.position.set(x, fy + y + 0.15, z); m.rotation.y = YAW[face]; m.name = `fuda:${id}`;
    ctx.world.group.add(m);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.16), hidden);
    hit.position.set(x, fy + y, z); hit.rotation.y = YAW[face]; hit.name = `fudahit:${id}`; hit.userData.interact = { kind: 'fuda', id, label };
    ctx.world.group.add(hit); ctx.world.interactables.push(hit);
    return { mesh: m, hit };
  }
  function doorCharm(def) {
    const d = ctx.data.plan.doors.find((x) => x.id === def.door);
    const n = NORMAL[def.side], alongX = n[0] === 0;
    const room = n[1] > 0 || n[0] > 0 ? (sideRoom(d, def.side)) : sideRoom(d, def.side);
    const w = (d.width || 1.1) / 2;
    // on the seam between the door and its post (the charm holds both)
    const x = alongX ? d.x + w - 0.02 : d.x + n[0] * 0.13, z = alongX ? d.z + n[1] * 0.13 : d.z + w - 0.02;
    const c = charmAt(room, x, 1.42, z, def.side, paperM, def.id, def.label);
    charms.set(def.id, { def, ...c, door: d.id });
    ctx.lockDoor(d.id, () => !G.peeled.includes(def.id), () => G.doorHint(def));
  }
  // the room on the side the charm faces
  function sideRoom(d, side) {
    const a = ctx.data.plan.rooms.find((r) => r.id === d.a), b = ctx.data.plan.rooms.find((r) => r.id === d.b);
    const n = NORMAL[side], px = d.x + n[0] * 0.3, pz = d.z + n[1] * 0.3;
    const inR = (r) => px >= r.x && px <= r.x + r.w && pz >= r.z && pz <= r.z + r.d;
    return inR(a) ? a.id : b.id;
  }
  const rope = new THREE.MeshStandardMaterial({ color: 0xb8a77a, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 });
  const shide = new THREE.MeshStandardMaterial({ color: 0xe6e0cc, roughness: 1, side: THREE.DoubleSide });
  function buildPost(def) {
    const R = ctx.world.rooms.get(def.room), fy = (R && R.y) || 0, room = R.room;
    const grp = new THREE.Group(); grp.name = `post:${def.id}`; ctx.world.group.add(grp);
    const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); grp.add(o); return o; };
    const mat = paperM.clone();   // its own copy: it chars on its own (same shader: no new program)
    let charm, hitPos, face;
    if (def.kind === 'pillar') {   // the 大黒柱: one thick post; the charm on its east face
      add(new THREE.BoxGeometry(0.3, 3.0, 0.3), wood, def.x, fy + 1.5, def.z);
      ctx.world.colliders.push({ box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(def.x, fy + 1.5, def.z), new THREE.Vector3(0.3, 3, 0.3)), off: false });
      face = 'e'; charm = add(geo, mat, def.x + 0.16, fy + 1.55, def.z); charm.rotation.y = YAW.e; hitPos = [def.x + 0.2, def.z];
    } else {
      // two posts at the sides of the passage, a straw rope across with paper streamers; the charm hangs in the middle of the rope
      const across = def.along === 'z' ? room.w : room.d, half = across / 2 - 0.12;
      for (const s of [-1, 1]) {
        const px = def.along === 'z' ? def.x + s * half : def.x, pz = def.along === 'z' ? def.z : def.z + s * half;
        add(new THREE.BoxGeometry(0.14, 2.3, 0.14), wood, px, fy + 1.15, pz);
        ctx.world.colliders.push({ box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(px, fy + 1.15, pz), new THREE.Vector3(0.14, 2.3, 0.14)), off: false });
      }
      const r = add(new THREE.CylinderGeometry(0.03, 0.03, across - 0.2, 6), rope, def.x, fy + 1.95, def.z);
      if (def.along === 'z') r.rotation.z = Math.PI / 2; else r.rotation.x = Math.PI / 2;
      for (const t of [-0.6, 0.6]) { const sh = add(new THREE.PlaneGeometry(0.08, 0.22), shide, def.along === 'z' ? def.x + t : def.x, fy + 1.8, def.along === 'z' ? def.z : def.z + t); sh.rotation.y = def.along === 'z' ? 0 : Math.PI / 2; }
      face = def.along === 'z' ? 'n' : 'e';
      charm = add(geo, mat, def.x, fy + 1.92, def.z); charm.rotation.y = def.along === 'z' ? 0 : Math.PI / 2; hitPos = [def.x, def.z];
    }
    charm.visible = false;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(def.kind === 'pillar' ? 0.3 : 0.6, 1.0, def.kind === 'pillar' ? 0.5 : 0.6), hidden);
    hit.position.set(hitPos[0], fy + 1.35, hitPos[1]); hit.name = `posthit:${def.id}`; hit.userData.interact = { kind: 'post', id: def.id };
    ctx.world.group.add(hit); ctx.world.interactables.push(hit);
    const P = { def, charm, mat, hit, on: false, burn: 0, press: false, fall: -1, fy };
    posts.set(def.id, P);
    return P;
  }
  G.setPost = (id, on, burn = 0) => {
    const P = posts.get(id); if (!P) return;
    P.on = on; P.burn = burn; P.fall = -1; P.charm.visible = on; P.charm.rotation.x = 0; P.charm.position.y = P.fy + (P.def.kind === 'pillar' ? 1.55 : 1.92);
    P.mat.color.setRGB(1, 1, 1); P.mat.emissive.setRGB(0, 0, 0);
    G.postsOn[id] = on;
  };

  // ---------------- peel / paste ----------------
  G.canPeel = (id) => true;   // story.js sets the real rule (who may peel what, when)
  G.doorHint = () => '札が戸と柱にまたがって貼ってある。札をはがさないと開かない。';
  function peel(id) {
    const C = charms.get(id); if (!C || G.peeled.includes(id)) return;
    const ok = G.canPeel(id); if (ok !== true) { ctx.answer(ok); return; }
    G.peeled.push(id);
    ctx.world.interactables.splice(ctx.world.interactables.indexOf(C.hit), 1);
    peeling.push({ m: C.mesh, t: 0 });
    ctx.sound('paper');
    setTimeout(() => {
      G.addFuda(1);
      if (C.door) { const d = ctx.world.doors.get(C.door); if (d && d.open) d.open(); }
      ext.emit('kushi:peel', { id });
      ctx.save();
    }, 900);
  }
  G.peel = peel;
  // [E] on a charmed door peels its charm (the charm is small: the door around it is what the eye lands on)
  ext.on('player:interact', ({ kind, id }) => { if (kind !== 'door' || !ctx) return; for (const [cid, C] of charms) if (C.door === id && !G.peeled.includes(cid) && G.canPeel(cid) === true) { peel(cid); break; } });
  G.peelQuiet = (id) => { const C = charms.get(id); if (!C) return; if (!G.peeled.includes(id)) G.peeled.push(id); C.mesh.visible = false; const i = ctx.world.interactables.indexOf(C.hit); if (i >= 0) ctx.world.interactables.splice(i, 1); };
  function postRun(id) {
    const P = posts.get(id); if (!P) return;
    if (P.on) {
      if (P.press) { ctx.answer('札が押されて、焦げている。今はがしたら、すぐに来る。'); return; }
      G.setPost(id, false); G.addFuda(1); ctx.sound('paper');
      ext.emit('kushi:unpaste', { id }); ctx.save(); return;
    }
    if (G.fuda <= 0) { ctx.answer(ctx.state.tasks.includes('T_CHOBA') ? '貼る札を持っていない。戸の札をはがすと、札が手に入る。' : '柱だ。太くて、黒光りしている。'); return; }
    G.addFuda(-1); G.setPost(id, true); ctx.sound('stamp');
    ext.emit('kushi:paste', { id }); ctx.save();
  }
  G.paste = postRun;

  ext.registerInteract('fuda', {
    prompt: (o) => `[E] 札をはがす：${o.label || '札'}`,
    run: (o) => peel(o.id),
  });
  ext.registerInteract('post', {
    prompt: (o) => {
      const P = posts.get(o.id); if (!P) return '';
      const name = P.def.label;
      if (P.on) return P.press ? `${name}（札が焦げている）` : `[E] 札をはがす：${name}`;
      if (!ctx.state.tasks.includes('T_CHOBA')) return `${name}`;
      return G.fuda > 0 ? `[E] 札を貼る：${name}（札 ×${G.fuda}）` : `${name}（貼る札がない）`;
    },
    run: (o) => postRun(o.id),
  });

  // ---------------- every frame: the peel animation, the charring ----------------
  function update(dt, active) {
    for (let i = peeling.length - 1; i >= 0; i--) {
      const p = peeling[i]; p.t += dt;
      const k = Math.min(1, p.t / 0.9);
      p.m.rotation.x = -k * 1.4; p.m.position.y -= dt * 0.12 * k;
      if (k >= 1) { p.m.visible = false; peeling.splice(i, 1); }
    }
    if (!active) return;
    for (const P of posts.values()) {
      if (P.fall >= 0) {   // a charred charm drops and is gone
        P.fall += dt; P.charm.position.y -= dt * 1.6; P.charm.rotation.x += dt * 4;
        if (P.fall > 0.8) { P.fall = -1; P.charm.visible = false; }
        continue;
      }
      if (!P.on) continue;
      if (P.press) {
        const life = P.def.id === 'K_LESSON' ? 8 : ctx.calm ? 18 : 12;
        P.burn = Math.min(1, P.burn + dt / life);
        const c = 1 - P.burn * 0.85; P.mat.color.setRGB(c, c * 0.92, c * 0.85);
        P.mat.emissive.setRGB(0.5 * Math.min(1, P.burn * 1.6) * (0.7 + 0.3 * Math.sin(performance.now() / 70)), 0.12 * P.burn, 0);
        if (P.burn >= 1) {
          P.on = false; G.postsOn[P.def.id] = false; P.fall = 0; P.press = false; P.burn = 0;
          ctx.sound('ashFall');
          ext.emit('kushi:fall', { id: P.def.id }); ctx.save();
        }
      }
    }
  }

  ext.on('game:ready', (c) => {
    ctx = c;
    paperM = new THREE.MeshStandardMaterial({ map: charmTexture(), side: THREE.DoubleSide, roughness: 1, emissive: 0x000000 });
    oldM = new THREE.MeshStandardMaterial({ map: charmTexture(true), side: THREE.DoubleSide, roughness: 1 });
    G.paperM = paperM; G.oldM = oldM; G.charmGeo = geo;
    const F = ctx.data.fuda;
    for (const d of F.doors) doorCharm(d);
    for (const w of F.walls) { const c2 = charmAt(w.room, w.x, 1.5, w.z, w.face, paperM, w.id, w.label); charms.set(w.id, { def: w, ...c2, wall: true }); }
    for (const p of F.posts) buildPost(p);
    chip = document.createElement('div'); chip.id = 'kc-fuda'; chip.className = 'kc-fuda'; chip.hidden = true;
    (document.getElementById('hud') || document.body).appendChild(chip);
    ctx.registerHudPart && ctx.registerHudPart('kc-fuda', { slot: 'tr', order: 30 });
    ctx.systems.push({ id: 'kushi-fuda', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
    G.showFuda();
  });
  ext.on('task:done', () => G.showFuda && G.showFuda());
  ext.registerPersist('fuda', {
    serialize: () => ({ fuda: G.fuda, peeled: G.peeled, posts: Object.fromEntries([...posts.values()].map((P) => [P.def.id, P.on ? Math.round(P.burn * 100) / 100 + 0.001 : 0])) }),
    restore: (s) => {
      if (!s) return;
      G.fuda = s.fuda || 0;
      for (const id of s.peeled || []) G.peelQuiet(id);
      for (const id of s.peeled || []) { const C = charms.get(id); if (C && C.door) { const d = ctx.world.doors.get(C.door); if (d && d.open) d.open(); } }
      for (const [id, v] of Object.entries(s.posts || {})) G.setPost(id, v > 0, Math.max(0, v - 0.001));
      G.showFuda();
    },
  });
}
