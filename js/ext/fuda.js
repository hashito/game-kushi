// The charms (お札): the one rule of the game (docs/brief.md) - この家のお札は、死んだ者を通さない。千草さんは、櫛のある所へ来る。
//   - a charm across a door and its post keeps the door shut; [E] peels it off (a short peel), the door opens, the charm goes into your hand;
//   - a charm in your hand can be pasted on a seal spot (data/fuda.json "seals": a door seam or the mouth of the flue). A pasted door is shut
//     again, and the dead cannot pass it. Up to `max` charms stack on one spot (side by side, never on top of each other);
//   - while 千草さん presses on a seal it chars: from the bottom edge up, brown, then black with an ember line, smoke rising, and when it is
//     burnt through it drops off (2.0: 「徐々に暗くなっていく感じが良いです」). The next charm on the same spot starts then;
//   - wall charms (data/fuda.json "walls") are peeled the same way; one is fixed with candle wax (the lattice door): it needs the flame.
// Every charm sits flush on its wall (half the wall thickness + a hair). The count is in the HUD (「札 ×N」, top right). Everything is built
// once at game:ready; every charm uses one shared shader (the burn is a uniform per charm), so pasting or burning never compiles anything.
import * as THREE from 'three';

const NORMAL = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
export const BURN = { life: 22, calm: 38, house: 9, houseCalm: 15 };   // seconds one charm holds while she presses (house: a door upstairs in the chase, 2.4.0)

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

/** a charm material that can char: userData.burn.value 0 (white paper) .. 1 (burnt through). One program for all (customProgramCacheKey). */
export function burnMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 1 });
  m.userData.burn = { value: 0 }; m.userData.glow = { value: 1 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBurn = m.userData.burn; sh.uniforms.uGlow = m.userData.glow;
    sh.fragmentShader = 'uniform float uBurn;\nuniform float uGlow;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 kuv = vMapUv;
        float kn = fract(sin(dot(floor(kuv * vec2(18.0, 54.0)), vec2(12.9898, 78.233))) * 43758.5453);
        float kn2 = fract(sin(dot(floor(kuv * vec2(6.0, 18.0)), vec2(39.3468, 11.135))) * 24634.6345);
        float ke = (1.0 - kuv.y) * 0.62 + abs(kuv.x - 0.5) * 0.5 + kn * 0.12 + kn2 * 0.16;
        float kf = uBurn * 1.25 - 0.08;
        float kd = ke - kf;
        if (uBurn > 0.001 && kd < -0.22) discard;
        float kbrown = uBurn > 0.001 ? 1.0 - smoothstep(0.0, 0.32, kd) : 0.0;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.38, 0.22), kbrown * 0.85);
        float kblack = uBurn > 0.001 ? 1.0 - smoothstep(-0.02, 0.05, kd) : 0.0;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.02, 0.018), kblack);
        float kember = uBurn > 0.001 ? (smoothstep(-0.05, 0.0, kd) - smoothstep(0.0, 0.05, kd)) : 0.0;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.35, 0.06) * kember * 2.2 * uGlow;`);
  };
  m.customProgramCacheKey = () => 'kc-burn-charm';
  return m;
}

export function installFuda(ext, G) {
  let ctx = null;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const geo = new THREE.PlaneGeometry(0.1, 0.3);
  geo.translate(0, -0.15, 0);   // hinged at its top edge: the peel turns it down and away
  let tex = null, oldTex = null, oldM = null, fallM = null;
  const charms = G.charms = new Map();   // id -> { def, mesh, hit, door?, wall? }
  const seals = G.seals = new Map();     // id -> { def, slots[], n, burn, press, hit, room, door? }
  const peeling = [], falling = [];
  const W2 = { pressed: '向こうから、強く押されている。札が焦げている。……今はがしたら、すぐに来る。' };

  G.fuda = G.fuda || 0; G.peeled = G.peeled || [];

  // ---------------- HUD ----------------
  let chip = null;
  G.showFuda = () => {
    if (!chip) return;
    const on = ctx && (ctx.state.tasks.includes('T_CHOBA') || G.fuda > 0);
    chip.hidden = !on; chip.textContent = `札 ×${G.fuda}`; chip.classList.toggle('kc-none', G.fuda === 0);
  };
  G.addFuda = (n) => { G.fuda = Math.max(0, G.fuda + n); G.showFuda(); };

  // ---------------- smoke from a charring charm (a small pool of sprites) ----------------
  let smoke = [];
  function smokeTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(70,64,58,0.55)'); r.addColorStop(1, 'rgba(70,64,58,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  function puff(pos) {
    const s = smoke.find((p) => p.t <= 0); if (!s) return;
    s.t = 1.8; s.spr.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.06, 0, (Math.random() - 0.5) * 0.06)); s.spr.visible = true; s.spr.scale.setScalar(0.08);
  }

  // ---------------- building ----------------
  const floorOf = (room) => { const R = ctx.world.rooms.get(room); return (R && R.y) || 0; };
  const makeMat = (old = false) => burnMaterial(old ? oldTex : tex);
  function charmAt(room, x, y, z, face, mat, id, label) {
    const fy = floorOf(room);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, fy + y + 0.15, z); m.rotation.y = YAW[face]; m.name = `fuda:${id}`; m.userData.doorItem = true;   /* a seal is meant to sit on its door (kit tools/wall-door.mjs leaves it alone) */
    ctx.world.group.add(m);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.16), hidden);
    hit.position.set(x, fy + y, z); hit.rotation.y = YAW[face]; hit.name = `fudahit:${id}`; hit.userData.interact = { kind: 'fuda', id, label };
    ctx.world.group.add(hit); ctx.world.interactables.push(hit);
    return { mesh: m, hit, home: m.position.clone() };
  }
  // the room on the side the charm faces
  function sideRoom(d, side) {
    const a = ctx.data.plan.rooms.find((r) => r.id === d.a), b = ctx.data.plan.rooms.find((r) => r.id === d.b);
    const n = NORMAL[side], px = d.x + n[0] * 0.3, pz = d.z + n[1] * 0.3;
    const inR = (r) => px >= r.x && px <= r.x + r.w && pz >= r.z && pz <= r.z + r.d;
    return inR(a) ? a.id : b.id;
  }
  // a point on the door frame's post, flush on its face: the kit's frame post is 0.08 wide from the opening edge and (wall 0.16 + 0.05) deep,
  // so the face is 0.105 from the wall centre, and the door leaf and the wall's paper panel reach 0.13; 0.136 puts the paper a few mm in front
  // of all of them (2.0 #2/#4: 0.095 hid it inside the frame, 0.112 half under the leaf; tools/check-playtest.mjs P10 checks it)
  const FRAME_FACE = 0.136;
  function seam(d, side, y = 1.42) {
    const n = NORMAL[side], alongX = n[0] === 0, w = (d.width || 1.1) / 2;
    return { room: sideRoom(d, side), x: alongX ? d.x + w + 0.04 : d.x + n[0] * FRAME_FACE, y, z: alongX ? d.z + n[1] * FRAME_FACE : d.z + w + 0.04 };
  }
  G.seam = (doorId, side, y) => seam(ctx.data.plan.doors.find((x) => x.id === doorId), side, y);
  function doorCharm(def) {
    const d = ctx.data.plan.doors.find((x) => x.id === def.door);
    const p = seam(d, def.side);
    const c = charmAt(p.room, p.x, p.y, p.z, def.side, makeMat(), def.id, def.label);
    charms.set(def.id, { def, ...c, door: d.id });
    ctx.lockDoor(d.id, () => !G.peeled.includes(def.id), () => G.doorHint(def));
  }

  // 2.4.0 (#9 「もう少し蓋を使ったロジックを」): a flue mouth has a wooden lid. Open, nothing can be pasted there (and she comes through);
  // [E] closes it, then charms go on the lid. Closed: in the mouth, 2 cm behind the charm's plane; open: leaning on the wall beside it.
  let lidM = null;
  function lidPose(S) {
    const L = S.lidMesh; if (!L) return;
    const n = NORMAL[S.face], alongX = n[0] === 0, fy = floorOf(S.room), p = S.p;
    if (S.lid) { L.position.set(p.x - n[0] * 0.02, fy + 0.36, p.z - n[1] * 0.02); L.rotation.set(0, YAW[S.face], 0); }
    else { const off = -0.78; L.position.set(p.x + (alongX ? off : 0) + n[0] * 0.08, fy + 0.34, p.z + (alongX ? 0 : off) + n[1] * 0.08); L.rotation.set(-0.22, YAW[S.face], 0); }
  }
  function buildSeal(def) {
    const d = def.door ? ctx.data.plan.doors.find((x) => x.id === def.door) : null;
    const p = d ? seam(d, def.side, 1.62) : { room: def.room, x: def.x, y: def.y ?? 0.9, z: def.z };
    const face = d ? def.side : def.face, fy = floorOf(p.room), max = def.max || 1;
    const alongX = NORMAL[face][0] === 0;
    const slots = [];
    for (let i = 0; i < max; i++) {
      const mat = makeMat(), m = new THREE.Mesh(geo, mat);
      // down the post (a door) or side by side over the mouth (the flue): never on top of each other
      const off = d ? 0 : (i - (max - 1) / 2) * 0.14, dy = d ? -i * 0.34 : 0;
      m.position.set(p.x + (alongX ? off : 0), fy + p.y + dy + 0.15, p.z + (alongX ? 0 : off)); m.rotation.y = YAW[face]; m.visible = false; m.name = `seal:${def.id}:${i}`;
      ctx.world.group.add(m); slots.push({ mesh: m, mat, home: m.position.clone() });
    }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(d ? 0.5 : 0.8, d ? 1.1 : 0.6, 0.25), hidden);
    hit.position.set(p.x, fy + (d ? 1.25 : p.y + 0.05), p.z); hit.rotation.y = YAW[face]; hit.name = `sealhit:${def.id}`; hit.userData.interact = { kind: 'seal', id: def.id };
    ctx.world.group.add(hit);
    const S = { def, slots, n: 0, burn: 0, press: false, hit, room: p.room, door: d ? d.id : null, pos: new THREE.Vector3(p.x, fy + p.y, p.z), face, p, lid: !def.lid || !def.lidOpen };
    if (def.lid) {
      lidM = lidM || (ctx.textures ? (() => { try { return ctx.textures.material('planks_dark', { triplanar: true, color: 0x8a7866 }); } catch { return null; } })() : null) || new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.95 });
      S.lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.68, 0.02), lidM); S.lidMesh.name = `lid:${def.id}`; S.lidMesh.castShadow = true; ctx.world.group.add(S.lidMesh); lidPose(S);
    }
    seals.set(def.id, S);
    if (d) ctx.lockDoor(d.id, () => S.n > 0, () => (S.press ? W2.pressed : `${def.label}に、札を貼った。はがせば開く。`));
    return S;
  }
  /** a seal spot is offered ([E]) only when the story allows it: G.sealOpen(id) (story.js) */
  G.sealOpen = () => true;
  G.sealRefresh = () => {
    if (!ctx) return;
    for (const S of seals.values()) {
      const want = G.sealOpen(S.def.id) || S.n > 0;
      const I = ctx.world.interactables, i = I.indexOf(S.hit);
      if (want && i < 0) I.push(S.hit); if (!want && i >= 0) I.splice(i, 1);
      // a door with a seal spot: while the seal is offered, the door's own [E] is the seal (aiming at the leaf or at the post both paste)
      // 2.4.0: only a seal with "leaf" takes the door's [E] (the practice fusuma, 燻しの間's door); the seals put back on every other door are
      // pasted on the post, so the door itself still opens and shuts with [E] (#10 「各部屋でも札を再度貼れるように」)
      // 2.4.1: while the door's own charm is still on (燻しの間's F_IBU), the door's [E] peels it (charmdoor), as on every other charmed door:
      // the first refresh ran before answers.js and left 「[E] 扉（鍵がかかっている）」 on the leaf, so the aim on the door did nothing (select-range F_IBU)
      if (S.door && S.def.leaf) { const leaf = want && (G.sealLeaf ? G.sealLeaf(S.def.id) !== false : true), held = [...charms.values()].some((C) => C.door === S.door && !G.peeled.includes(C.def.id)); for (const o of I) { const it = o.userData && o.userData.interact; if (!it || it.id !== S.door || !(it.kind === 'door' || it.kind === 'sealdoor' || it.kind === 'charmdoor')) continue; it.kind = held ? 'charmdoor' : leaf ? 'sealdoor' : 'door'; it.seal = S.def.id; } }
    }
  };
  function showSeal(S) {
    S.slots.forEach((sl, i) => { sl.mesh.visible = i < S.n; sl.mesh.position.copy(sl.home); sl.mesh.rotation.set(0, sl.mesh.rotation.y, 0); sl.mat.userData.burn.value = i === S.n - 1 ? S.burn : 0; });
  }
  G.setSeal = (id, n, burn = 0, lid = null) => {
    const S = seals.get(id); if (!S) return;
    if (lid != null && S.def.lid) { S.lid = !!lid; lidPose(S); }
    if (n > 0 && S.def.lid) { S.lid = true; lidPose(S); }
    S.n = Math.max(0, Math.min(S.def.max || 1, n)); S.burn = S.n ? burn : 0; S.press = false; showSeal(S);
    if (S.door && S.n > 0) { const dd = ctx.world.doors.get(S.door); if (dd && dd.isOpen && dd.close) dd.close(); }
    G.sealRefresh();
  };
  G.sealN = (id) => (seals.get(id) || { n: 0 }).n;
  G.lidShut = (id) => { const S = seals.get(id); return !S || !S.def.lid || !!S.lid; };

  // ---------------- peel / paste ----------------
  G.canPeel = () => true;    // story.js sets the real rule (who may peel what, when)
  G.canPaste = () => true;
  G.onWax = null;            // story.js: the wax charm needs the flame (a mini game), then calls G.peel(id, { force: true })
  G.doorHint = () => '札が戸と柱にまたがって貼ってある。札をはがさないと開かない。';
  function peel(id, o = {}) {
    const C = charms.get(id); if (!C || G.peeled.includes(id)) return;
    if (!o.force) { const ok = G.canPeel(id); if (ok !== true) { ctx.answer(ok); return; } }
    if (C.def.wax && !o.force && G.onWax) { G.onWax(id); return; }
    G.peeled.push(id);
    const i = ctx.world.interactables.indexOf(C.hit); if (i >= 0) ctx.world.interactables.splice(i, 1);
    if (C.door) G.doorPlain(C.door);
    peeling.push({ m: C.mesh, t: 0 });
    ctx.sound('paper');
    setTimeout(() => {
      if (!C.def.crumble) G.addFuda(1);   // 2.4.0 #9: the oldest charms upstairs crumble as they come off (fewer spares)
      if (C.door) { const d = ctx.world.doors.get(C.door); if (d && d.open) d.open(); }
      ext.emit('kushi:peel', { id });
      G.sealRefresh();   // a peel can open a seal spot (the flue charm off: 燻しの間's door takes a charm)
      ctx.save();
    }, 900);
  }
  G.peel = peel;
  G.doorPlain = (doorId) => { for (const o of ctx.world.interactables) { const it = o.userData && o.userData.interact; if (it && it.kind === 'charmdoor' && it.id === doorId) it.kind = 'door'; } };
  G.peelQuiet = (id) => { const C = charms.get(id); if (!C) return; if (!G.peeled.includes(id)) G.peeled.push(id); if (C.door) G.doorPlain(C.door); C.mesh.visible = false; const i = ctx.world.interactables.indexOf(C.hit); if (i >= 0) ctx.world.interactables.splice(i, 1); };
  /** put a peeled charm back where it was (a reset after a catch) */
  G.unpeel = (id) => {
    const C = charms.get(id); if (!C) return; const k = G.peeled.indexOf(id); if (k < 0) return;
    G.peeled.splice(k, 1); C.mesh.visible = true; C.mesh.position.copy(C.home); C.mesh.rotation.set(0, C.mesh.rotation.y, 0); C.mesh.material.userData.burn.value = 0;
    if (!ctx.world.interactables.includes(C.hit)) ctx.world.interactables.push(C.hit);
  };
  function sealRun(id) {
    const S = seals.get(id); if (!S) return;
    const max = S.def.max || 1;
    if (S.press) { ctx.answer(W2.pressed); return; }
    if (S.def.lid && !S.lid) { S.lid = true; lidPose(S); ctx.sound('noise', 'thud'); ext.emit('kushi:lid', { id }); ctx.save(); G.sealRefresh(); return; }
    if (S.n > 0 && (G.fuda <= 0 || S.n >= max)) {
      const ok = G.canUnpaste ? G.canUnpaste(id) : true; if (ok !== true) { ctx.answer(ok); return; }
      S.n -= 1; S.burn = 0; showSeal(S); G.addFuda(1); ctx.sound('paper');
      ext.emit('kushi:unpaste', { id }); ctx.save(); G.sealRefresh(); return;
    }
    if (G.fuda <= 0) { ctx.answer(ctx.state.tasks.includes('T_CHOBA') ? '貼る札を持っていない。戸の札をはがすと、札が手に入る。' : `${S.def.label}だ。`); return; }
    const ok = G.canPaste(id); if (ok !== true) { ctx.answer(ok); return; }
    G.addFuda(-1); S.n += 1; if (S.n === 1) S.burn = 0; showSeal(S); ctx.sound('stamp');
    if (S.door) { const dd = ctx.world.doors.get(S.door); if (dd && dd.isOpen && dd.close) dd.close(); }
    ext.emit('kushi:paste', { id, n: S.n }); ctx.save(); G.sealRefresh();
  }
  G.paste = sealRun;

  ext.registerInteract('sealdoor', {
    // from the side a charm may not be put up (inside 燻しの間), the door is just a door
    prompt: (o) => (asDoor(o) ? (ctx.world.doors.get(o.id).isOpen ? '[E] 扉を閉める' : '[E] 扉を開ける') : sealPrompt(o.seal)),
    run: (o) => { if (asDoor(o)) { const d = ctx.world.doors.get(o.id); if (d.isOpen) d.close(); else d.open(); return; } sealRun(o.seal); },
  });
  ext.registerInteract('fuda', {
    prompt: (o) => { const C = charms.get(o.id); return C && C.def.wax ? `[E] 蝋を手燭の火であぶる：${o.label || '札'}` : `[E] 札をはがす：${o.label || '札'}`; },
    run: (o) => peel(o.id),
  });
  const asDoor = (o) => G.sealN(o.seal) === 0 && G.canPaste(o.seal) !== true && !!ctx.world.doors.get(o.id);
  function sealPrompt(id) {
      const S = seals.get(id); if (!S) return '';
      const name = S.def.label, max = S.def.max || 1;
      if (S.press) return `${name}（札が焦げている）`;
      if (S.def.lid && !S.lid) return `[E] 蓋を閉める：${name}`;
      if (S.n > 0 && G.fuda > 0 && S.n < max) return `[E] 札をもう一枚貼る：${name}（${S.n}枚／札 ×${G.fuda}）`;
      if (S.n > 0) return `[E] 札をはがす：${name}（${S.n}枚）`;
      return G.fuda > 0 ? `[E] 札を貼る：${name}（札 ×${G.fuda}）` : `${name}（貼る札がない）`;
  }
  ext.registerInteract('seal', { prompt: (o) => sealPrompt(o.id), run: (o) => sealRun(o.id) });

  // ---------------- every frame: the peel animation, the charring ----------------
  let puffT = 0;
  function update(dt, active) {
    for (let i = peeling.length - 1; i >= 0; i--) {
      const p = peeling[i]; p.t += dt;
      const k = Math.min(1, p.t / 0.9);
      p.m.rotation.x = -k * 1.4; p.m.position.y -= dt * 0.12 * k;
      if (k >= 1) { p.m.visible = false; peeling.splice(i, 1); }
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i]; f.t += dt; f.m.position.y -= dt * 0.9; f.m.rotation.x += dt * 3;
      if (f.t > 0.9) { ctx.world.group.remove(f.m); falling.splice(i, 1); }
    }
    for (const s of smoke) if (s.t > 0) { s.t -= dt; s.spr.position.y += dt * 0.35; s.spr.scale.setScalar(0.08 + (1.8 - s.t) * 0.22); s.spr.material.opacity = Math.max(0, s.t / 1.8) * 0.9; if (s.t <= 0) s.spr.visible = false; }
    if (!active) return;
    puffT -= dt;
    const life = ctx.calm ? BURN.calm : BURN.life;
    for (const S of seals.values()) {
      if (!S.press || S.n <= 0) continue;
      S.burn = Math.min(1, S.burn + dt / (S.def.house ? (ctx.calm ? BURN.houseCalm : BURN.house) : life));
      const sl = S.slots[S.n - 1];
      sl.mat.userData.burn.value = S.burn; sl.mat.userData.glow.value = 0.75 + 0.25 * Math.sin(performance.now() / 90);
      if (puffT <= 0) puff(sl.mesh.position.clone().add(new THREE.Vector3(0, -0.12 + S.burn * 0.2, 0)));
      if (S.burn >= 1) {
        S.n -= 1; S.burn = 0;
        const m = new THREE.Mesh(geo, fallM); m.position.copy(sl.mesh.position); m.rotation.copy(sl.mesh.rotation); ctx.world.group.add(m);
        falling.push({ m, t: 0, home: m.position.clone() }); sl.mesh.visible = false; sl.mat.userData.burn.value = 0;
        ctx.sound('ashFall');
        ext.emit('kushi:fall', { id: S.def.id, left: S.n }); ctx.save(); G.sealRefresh();
      }
    }
    // 2.4.0: a charm still on its door or lid (one of the house's own) chars the same way while she presses it with her comb in your hand
    const cid = G.charmPress;
    if (cid && !G.peeled.includes(cid)) {
      const C = charms.get(cid);
      if (C) {
        C.burn = Math.min(1, (C.burn || 0) + dt / life); const u = C.mesh.material.userData; u.burn.value = C.burn; u.glow.value = 0.75 + 0.25 * Math.sin(performance.now() / 90);
        if (puffT <= 0) puff(C.mesh.position.clone().add(new THREE.Vector3(0, -0.12 + C.burn * 0.2, 0)));
        if (C.burn >= 1) {
          const m = new THREE.Mesh(geo, fallM); m.position.copy(C.mesh.position); m.rotation.copy(C.mesh.rotation); ctx.world.group.add(m); falling.push({ m, t: 0 });
          G.peelQuiet(cid); C.burn = 0; u.burn.value = 0; ctx.sound('ashFall');
          ext.emit('kushi:fall', { id: cid, left: 0, charm: true }); ctx.save(); G.sealRefresh();
        }
      }
    }
    if (puffT <= 0) puffT = 0.16;
  }

  ext.on('game:ready', (c) => {
    ctx = c;
    tex = charmTexture(); oldTex = charmTexture(true);
    oldM = new THREE.MeshStandardMaterial({ map: charmTexture(true), side: THREE.DoubleSide, roughness: 1 });
    fallM = makeMat(); fallM.userData.burn.value = 0.97; fallM.userData.glow.value = 0.4;
    G.paperM = makeMat(); G.oldM = oldM; G.charmGeo = geo; G.burnMaterial = makeMat;
    const F = ctx.data.fuda;
    for (const d of F.doors) doorCharm(d);
    for (const w of F.walls) { const c2 = charmAt(w.room, w.x, w.y ?? 1.5, w.z, w.face, makeMat(!!w.old), w.id, w.label); charms.set(w.id, { def: w, ...c2, wall: true }); }
    for (const s of F.seals || []) buildSeal(s);
    // 2.4.0 (#10): every charmed door can take a charm again once its own is off (K_<door>, one charm, pasted on the post)
    for (const d of F.doors) {
      if ((F.seals || []).some((x) => x.door === d.door)) continue;
      const room = ctx.data.plan.rooms.find((r) => r.id === (ctx.data.plan.doors.find((x) => x.id === d.door) || {}).a) || {};
      buildSeal({ id: `K_${d.door.replace(/^D_/, '')}`, door: d.door, side: d.side, label: String(d.label || '').replace(/の札$/, ''), max: 1, auto: true, charm: d.id, house: (room.floor || 0) === 1 });
    }
    const st = smokeTex();
    smoke = Array.from({ length: 14 }, () => { const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 })); spr.visible = false; ctx.world.group.add(spr); return { spr, t: 0 }; });
    // the warm-up compiles the charm program once with the burn on (a burning charm never builds a program in play)
    const warm = new THREE.Mesh(geo, makeMat()); warm.material.userData.burn.value = 0.5;
    const wg = new THREE.Group(); wg.visible = false; wg.add(warm, new THREE.Sprite(smoke[0].spr.material)); ctx.scene.add(wg); ctx.warmObjects = [...(ctx.warmObjects || []), wg];
    chip = document.createElement('div'); chip.id = 'kc-fuda'; chip.className = 'kc-fuda'; chip.hidden = true;
    (document.getElementById('hud') || document.body).appendChild(chip);
    ctx.registerHudPart && ctx.registerHudPart('kc-fuda', { slot: 'tr', order: 30 });
    ctx.systems.push({ id: 'kushi-fuda', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
    G.showFuda(); G.sealRefresh();
  });
  ext.on('task:done', () => { if (G.showFuda) G.showFuda(); if (G.sealRefresh) G.sealRefresh(); });
  ext.registerPersist('fuda', {
    serialize: () => ({ fuda: G.fuda, peeled: G.peeled, seals: Object.fromEntries([...seals.values()].map((S) => [S.def.id, [S.n, Math.round(S.burn * 100) / 100, S.lid ? 1 : 0]])) }),
    restore: (s) => {
      if (!s) return;
      G.fuda = s.fuda || 0;
      for (const id of s.peeled || []) G.peelQuiet(id);
      for (const id of s.peeled || []) { const C = charms.get(id); if (C && C.door) { const d = ctx.world.doors.get(C.door); if (d && d.open) d.open(); } }
      for (const [id, v] of Object.entries(s.seals || {})) G.setSeal(id, v[0], v[1], v.length > 2 ? !!v[2] : null);
      G.showFuda();
    },
  });
}
