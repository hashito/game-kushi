// The story of 札の家: what is said when (data/talk.json, js/ext/words.js), the tasks that need code, the basement (2.0, rebuilt:
// 「封じの間」), the comb and the run back, the hatch, the questions at the bench, and the three endings. Shares G with fuda.js (the
// charms and seals), ghost.js (千草さん) and house.js (the things).
//
// The basement, in order (one rule: 札は死んだ者を通さない。千草さんは、清次さんの櫛のある所へ来る):
//   T_LIGHT   the candle at the kiln            T_HIKAE   ハル's ledger of charms (what is charmed, and why)
//   T_DORO    the corridor door charm           T_KOSHI_SEE  the lattice of 奥の室: she comes to it and the waxed charm holds her
//   T_LURE    清次's unfinished comb on the drying rack of 燻しの間
//   T_TRAP    peel the flue charm, get out, seal 燻しの間's door from the corridor: she comes through the flue to the comb and is shut in
//   T_KOSHI   melt the wax with the candle, peel the lattice charm      T_OKUMURO  her remains
//   T_FLUE2   every road from 燻しの間 to 奥の室 holds at least one charm (2.4.0: the flue forks to 奥の室, 板の間 and 甕の間; each
//             mouth has a lid: shut it, paste on it; she always takes the weakest road)          T_BOX  the comb (L4)
//   then she wants her comb: she presses the seals (they char and fall, ~22 s a charm); run the corridor to the ladder (T_ESCAPE).
// A catch never strands the player: each phase has its own fixed checkpoint and its own reset (resetFlue, resetHunt), also on a resume.
import * as THREE from 'three';
import { W } from './words.js';
import { edgeStrength } from './roads.js';
import { installAsides } from './asides.js';

const ROOM_SURFACE = { MURO: 'dirt', DORO: 'dirt', IBUSHI: 'dirt', OKUMURO: 'dirt', OMOTE: 'dirt', HASHIRI: 'dirt' };
const CP = {
  flue: { x: 2.4, z: -7.6, yaw: -Math.PI / 2, floor: 0 },     // the corridor, before 燻しの間's door, facing it
  hunt: { x: 2.6, z: -24.6, yaw: Math.PI, floor: 0 },         // 奥の室, in front of the shelf, facing the way out
  chase2: { x: 5.6, z: 1.2, yaw: Math.PI, floor: 1 },         // 2.2: 作業場, at the top of the ladder, facing the door to the 渡り廊下 (the run upstairs starts here)
};
const CAGE_AT = { room: 'OKUMURO', x: 1.2, z: -25.4 };

export function installStory(ext, G) {
  let ctx = null, RUN0 = 3.8, LIT = 0, nearT = 0, nearK = 1, nearNow = 1;
  const ray = new THREE.Raycaster(), CENTER = new THREE.Vector2(0, 0);
  const done = (id) => ctx.state.tasks.includes(id);
  const has = (id) => ctx.state.inv.includes(id);
  const flag = (k) => ctx.state.flags.includes(k);
  const setFlag = (k) => { if (!flag(k)) ctx.setFlag(k, { silent: true }); };
  const talk = (key, title) => ctx.talk(key, { title: title || '札の家' });
  const say = (k, sec) => ctx.monologue(W[k], sec ?? Math.min(9, 2.4 + W[k].length * 0.09));
  const ans = (k) => ctx.answer(W[k]);
  const task = (id) => ctx.data.tasks.find((t) => t.id === id);
  const tryDone = (id) => { if (!done(id) && ctx.canStart(task(id)) === true) { ctx.completeTask(id); return true; } return false; };
  const later = (f, ms = 400) => setTimeout(f, ms);
  const cam = () => ctx.camera.position;
  const MURO_I = 3.5;   // the workshop light down the open hatch (2.4.1, P27: 0.7 left the 室 and its ladder - the way out - black)
  const removeItem = (id) => { const i = ctx.state.inv.indexOf(id); if (i >= 0) ctx.state.inv.splice(i, 1); };
  G.ev = G.ev || [];
  let flueSnap = null, huntSnap = null;   // what a catch puts back (persisted)

  // ---------------- the world agrees with the tasks done (a resumed save, a test scene) ----------------
  function apply() {
    if (!ctx || !G.usu) return;
    if (done('T_USU')) G.moveUsu(true);
    G.hatchCharm.visible = !done('T_HATCH') || (done('T_SEAL') && !done('T_RETURN'));
    G.muroGlow.i = done('T_HATCH') ? MURO_I : 0; if (G.kilnGlow) G.kilnGlow.i = done('T_HATCH') ? 0.55 : 0; if (G.kilnPatch) for (const m of G.kilnPatch) m.visible = done('T_HATCH');
    G.combBox.visible = !done('T_BOX'); G.boxCord.visible = !done('T_BOX'); G.boxCharm.visible = !done('T_BOX');
    if (G.lure) G.lure.visible = done('T_LURE');
    if (done('T_TRAP') && !G.peeled.includes('F_FLUE')) G.peelQuiet('F_FLUE');
    // 2.5.0 #3 「くしを返した後は地下に行けないほうが良い」: after the return the lid falls shut by itself and stays shut
    if (G.setHatch) G.setHatch(done('T_HATCH') && !done('T_SEAL'), true);
    if (G.frontDoor && done('T_OUT')) { G.frontTo = 1; G.frontK = 1; G.frontDoor.position.x = -1.5; }
    // 2.4.0 #11: after ハル's answer the front door is the player's to open (the look-only 表の戸 gives way to the S_OUT station)
    { const I = ctx.world.interactables; G.outHit = G.outHit || I.find((o) => o.name === 'station:S_OUT'); G.omoteLook = G.omoteLook || I.find((o) => { const it = o.userData && o.userData.interact; return it && it.id === 'OMOTE_DOOR'; });
      const swap = (o, want) => { if (!o) return; const i = I.indexOf(o); if (want && i < 0) I.push(o); if (!want && i >= 0) I.splice(i, 1); };
      swap(G.outHit, done('T_END') && !done('T_OUT')); swap(G.omoteLook, !done('T_END'));
      // 2.5.0 #2 「黒電話をクリックするのに取れない場合があります」: the look-only 黒電話 sat on the phone too and took the click from the call;
      // until the call is taken, the phone is the station alone
      G.phoneLook = G.phoneLook || I.find((o) => { const it = o.userData && o.userData.interact; return it && it.id === 'NAKA_PHONE'; }); swap(G.phoneLook, done('T_PHONE')); }
    G.boxGlow.i = done('T_BOX') && !done('T_ESCAPE') ? 0.9 : 0;
    if (G.koshiOld) for (const m of G.koshiOld) m.visible = !done('T_KOSHI_SEE');
    // the waxed charm on the lattice is worked from the lattice's own [E] spot (S_KOSHI: the wax needs the flame), not as a plain charm
    const K = G.charms.get('F_KOSHI'); if (K) { const i = ctx.world.interactables.indexOf(K.hit); if (i >= 0) ctx.world.interactables.splice(i, 1); }
    if (done('T_KOSHI') && G.koshiHit) { const i = ctx.world.interactables.indexOf(G.koshiHit); if (i >= 0) ctx.world.interactables.splice(i, 1); }
    ctx.world.setLampFloor(ctx.floor, true);
    hatchSpot();
    if (G.showFuda) G.showFuda(); if (G.sealRefresh) G.sealRefresh();
  }
  // the hatch's [E] spot is there only while a hatch task waits (otherwise [E] on the hatch is the ladder)
  function hatchSpot() {
    const want = !done('T_HATCH') || (done('T_ESCAPE') && !done('T_SEAL')) || (done('T_THINK') && !done('T_RETURN'));
    const I = ctx.world.interactables, i = I.indexOf(G.hatchHit);
    if (want && i < 0) I.push(G.hatchHit); if (!want && i >= 0) I.splice(i, 1);
    const sd = I.indexOf(G.stairDown); if (want && sd >= 0) I.splice(sd, 1); if (!want && sd < 0 && G.stairDown) I.push(G.stairDown);   // the ladder's [E] box sits over the lid
    const u = I.indexOf(G.usuHit); if (done('T_USU') && u >= 0) I.splice(u, 1);
  }
  G.applyStory = apply;

  // ---------------- 千草さん: where she is for the tasks done ----------------
  const catchFlue = () => { G.ghostStop(); ctx.checkpoint = { ...CP.flue }; ctx.die('chigusa'); };
  const catchHunt = () => { G.ghostStop(); ctx.checkpoint = { ...CP.hunt }; ctx.die('chigusa'); };
  const catchChase = () => { G.ghostStop(); ctx.checkpoint = { ...CP.chase2 }; ctx.die('chase'); };
  // 2.2 (「最後に敵が追ってくるところは襲われたら終わりにして婆さんの部屋の手前まで逃げるようにしたほうが良い」): up the ladder she comes too,
  // and follows the way you ran through the house (ghost.js 'follow'); a catch is the end (the death card, again from the top of the ladder).
  // Inside 店の間 ハル's ring of charms holds her: the safe beat, then the hatch to seal (no more timer under the lid).
  const haruCall = () => (ctx.data.talk && ctx.data.talk.chase_haru && ctx.data.talk.chase_haru[0].text) || 'こっちじゃ！';   // data/talk.json chase_haru (voiced as ハル)
  function chase2(again) {
    setFlag('chase2'); ctx.checkpoint = { ...CP.chase2 };
    G.trail = [{ x: 6.6, z: -0.5 }];
    G.ghostStart('follow', { at: { room: 'SAGYO', x: 6.6, z: -0.5 }, floor: 1, rise: again ? 3.0 : 2.4, onCatch: catchChase });
    ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.7);
    later(() => say(again ? 'chase_reset' : 'chase_up', 5), 300);
    later(() => { if (G.gh.mode === 'follow') { ctx.voiceLine && ctx.voiceLine('assets/voice/chase_haru-1.mp3', null, { prio: 'story' }); ctx.ui.say(`<span class="who">ハル</span>${haruCall()}`, 5); } }, 4200);
  }
  async function safeBeat() {
    ctx.completeTask('T_ESCAPE'); G.ghostFade(); ctx.checkpoint = null; hatchSpot();   // the hatch's seal spot back over the ladder (T_SEAL waits)
    { const sl = ctx.ui.sayLine; if (sl) { sl.q.length = 0; if (sl.cur) { sl.cur.readyAt = sl.cur.hideAt = 0; sl.arm(); } } }   // the run's 「止まるな」 lines go: she stopped at the ring
    ctx.sound('noise', 'thud');
    later(() => talk('safe', '帳場の格子'), 900);
    ctx.save();
  }
  const lureSpot = () => ({ room: 'IBUSHI', x: (G.lureAt || { x: 9.3 }).x - 0.7, z: (G.lureAt || { z: -9 }).z });
  /** the flue phase did not end (a catch, a reload): the flue charm back on, the door seal off, she back in 奥の室 */
  function resetFlue() {
    if (G.peeled.includes('F_FLUE')) G.unpeel('F_FLUE');
    if (flueSnap) G.fuda = flueSnap.fuda; else G.fuda = Math.max(0, G.fuda - 1 + G.sealN('K_IBU'));
    G.setSeal('K_IBU', 0); G.showFuda();
    G.ghostStart('cage', { at: CAGE_AT });
  }
  /** the run back did not end: the seals as they were when the comb was taken, she back by the drying rack */
  function resetHunt() {
    const s = huntSnap || { fuda: G.fuda, seals: { K_IBU: [Math.max(1, G.sealN('K_IBU')), 0], K_FLUE: [Math.max(2, G.sealN('K_FLUE')), 0, 1] } };
    G.fuda = s.fuda; for (const [id, v] of Object.entries(s.seals)) G.setSeal(id, v[0], v[1], v.length > 2 ? !!v[2] : null);
    // 2.4.0 #10: a charm she burnt off a door or a lid during the run is back on it after a catch
    if (s.peeled) for (const id of [...G.peeled]) if (!s.peeled.includes(id)) G.unpeel(id);
    G.showFuda();
    G.ghostStart('hunt', { at: lureSpot(), wait: 3.5, onCatch: catchHunt });
    G.candleOut = false; if (has('TESHOKU')) G.light0(true);
  }
  function placeGhost() {
    if (!done('T_HATCH') || done('T_ESCAPE')) { G.ghostStop(); return; }
    if (done('T_BOX') && flag('chase2')) { chase2(true); return; }
    if (done('T_BOX')) { ctx.checkpoint = { ...CP.hunt }; resetHunt(); return; }
    if (done('T_TRAP')) { G.ghostStart('trapped', { at: lureSpot(), onCatch: catchFlue }); return; }
    if (G.peeled.includes('F_FLUE')) { resetFlue(); return; }
    G.ghostStart('cage', { at: CAGE_AT });
  }
  G.placeGhost = placeGhost;

  // ---------------- the light: the candlestick (no light at all before it is lit) ----------------
  let relighting = false;

  // ---------------- the opening ----------------
  ext.on('game:start', ({ resume, scene }) => {
    if (!ctx) return;
    apply();
    if (done('T_LIGHT') && !G.candleOut) G.light0(true);
    if (!ctx.testScene) placeGhost();
    if (resume || scene || ctx.testScene) return;
    talk('opening', 'はじまり').then(() => { say('start', 6); if (ctx.mapTip) ctx.mapTip(); });
  });

  ext.on('game:ready', (c) => {
    ctx = c;
    RUN0 = ctx.fp.o.run;
    // the light
    // 2.4.1 (P27 「地下が暗すぎる」): a candle lights all round, not only ahead - a small warm halo goes with the lit candle underground, so the
    // room's walls and its doorways read without sweeping the flame about; past ~4 m it is still black. One light, made here (no recompile later)
    G.halo = new THREE.PointLight(0xffb070, 0, HALO_D, 1.6); G.halo.name = 'kc-candle-halo'; ctx.scene.add(G.halo);
    const l0 = ctx.setLight; G.light0 = (on) => { l0(on); if (on && ctx.flashlight) LIT = ctx.flashlight.intensity || LIT; };
    ctx.setLight = (on) => {
      if (!on) return l0(false);
      if (!has('TESHOKU')) return ans('light_none');
      if (!done('T_LIGHT')) return ans('light_unlit');
      if (G.candleOut) {
        if (relighting) return; relighting = true; say('relight_wait', 1.4); ctx.sound('lighter');
        return later(() => { relighting = false; G.candleOut = false; G.light0(true); say('relight', 2.5); }, 1300);
      }
      return G.light0(true);
    };
    ctx.stepSurfaceOf = (room) => ROOM_SURFACE[room] || null;
    // who may peel what, when (the rule is fuda.js; the order is the story's)
    G.canPeel = (id) => {
      if (id === 'F_NAKA' && !done('T_CHOBA')) return W.peel_haru_first;
      // 2.4.0 #1 「台所はどのタイミングでも行けるように」: the kitchen's door only waits for ハル's first words (test/data.test.mjs kitchen reach)
      if (id === 'F_HASHIRI' && !done('T_CHOBA')) return W.peel_haru_first;
      if (['F_OKU', 'F_ROKA', 'F_SAGYO'].includes(id) && !done('T_PASTE1')) return done('T_CHOBA') ? W.peel_l1 : W.peel_haru_first;
      if (id === 'F_KAME' && !done('T_LIGHT')) return W.peel_dark;
      // ハル's old charms on the flue lids: the first [E] says what they are (peeling one gives a charm and opens a road for her)
      if ((id === 'W_ITAM' || id === 'W_KAMEM') && !flag(`warn_${id}`)) { setFlag(`warn_${id}`); return W.lid_warn; }
      if (/^W_NEMAM/.test(id) && !flag('warn_W_NEMAM')) { setFlag('warn_W_NEMAM'); return W.lid_warn_pair; }
      if (id === 'F_NEMA' && !done('T_LIGHT')) return W.peel_dark;
      if (id === 'F_DORO' && !done('T_LIGHT')) return W.peel_dark;
      if (id === 'F_DORO' && !done('T_HIKAE')) return W.peel_hikae;
      if (id === 'F_FLUE' && !done('T_LURE')) return W.flue_first;
      if (id === 'F_KOSHI' && !done('T_TRAP')) return W.koshi_she;
      return true;
    };
    G.doorHint = (def) => { const r = G.canPeel(def.id); return r === true ? W.door_charm : r; };
    // the seals: where a charm may be put up, and taken down
    // 2.4.0 #10 「各部屋でも札を再度貼れるように」: a door whose charm is off takes a charm again (on the post); a lid once its old charm is off
    G.sealOpen = (id) => {
      if (id === 'K_NAKA') return done('T_PEEL1');
      if (id === 'K_IBU') return G.peeled.includes('F_FLUE') || done('T_TRAP');
      if (id === 'K_FLUE') return done('T_OKUMURO');
      if (id === 'K_KOSHI') return done('T_KOSHI');
      if (id === 'K_ITAM') return G.peeled.includes('W_ITAM');
      if (id === 'K_KAMEM') return G.peeled.includes('W_KAMEM');
      if (id === 'K_NEMAM') return G.peeled.includes('W_NEMAM1') && G.peeled.includes('W_NEMAM2');
      const S = G.seals.get(id); if (S && S.def.auto) return G.peeled.includes(S.def.charm);
      return false;
    };
    // the practice fusuma takes the door's [E] only during the practice; afterwards it is a door with a charm spot on its post
    G.sealLeaf = (id) => (id === 'K_NAKA' ? done('T_PEEL1') && !done('T_PASTE1') : true);
    G.canPaste = (id) => {
      if (id === 'K_IBU' && ctx.state.room === 'IBUSHI') return W.ibu_outside;
      if (id === 'K_KOSHI' && ctx.state.room === 'OKUMURO' && !done('T_BOX')) return W.koshi_outside;
      return true;
    };
    // 2.4.0 #7: the lattice is a door of its own; shut, it blocks (tools/check-playtest.mjs P54). It opens with [E] once the waxed charm is off
    ctx.lockDoor('D_KOSHI', () => !done('T_KOSHI'), () => W.koshi_locked);
    G.canUnpaste = (id) => {
      if (id === 'K_IBU' && done('T_TRAP') && !done('T_ESCAPE')) return W.ibu_keep;
      if (id === 'K_IBU' && G.gh.mode === 'flue') return W.ibu_keep;
      return true;
    };
    // the ladder: shut while 千草さん is under the hatch
    const st = G.stairDown && G.stairDown.userData.interact;
    if (st) {
      const L0 = st.locked; st.locked = () => L0() || done('T_ESCAPE') || (flag('chase2') && !done('T_ESCAPE'));
      const h0 = st.hint; Object.defineProperty(st, 'hint', { configurable: true, get: () => (flag('chase2') && !done('T_ESCAPE') ? W.chase_stair : done('T_RETURN') ? W.return_shut : done('T_ESCAPE') ? (done('T_SEAL') ? W.seal_shut : W.stair_shut) : h0) });
    }
    // 2.5.0 #5: two plain old charms on the lattice beside the waxed one (they burn away the first time she comes to it)
    if (G.cutFrontDoorway) G.cutFrontDoorway();   // 2.5.1: the front doorway, if the world built its wall after the house
    // 2.5.1 (coordinator: 「燃える札の火がほとんど見えない」, D-51): the grade stays muted (fx saturation), but a vivid orange - flame and
    // ember, nothing else in the house is that red and that bright - keeps its colour: the burn reads as the key picture
    { const F = ctx.fx && ctx.fx.mat; if (F && !F.userData.kcHot) { const src = F.fragmentShader, re = /c = mix\(c, vec3\(dot\(c, vec3\(0\.3, 0\.59, 0\.11\)\)\), ([^;]+)\);/;
      if (re.test(src)) { F.fragmentShader = src.replace(re, (m, amt) => `float kcHot = smoothstep(0.42, 0.62, c.r - c.b) * smoothstep(0.72, 0.92, c.r) * smoothstep(0.5, 0.75, (c.r - c.b) / max(c.r, 0.001));
  c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), (${amt}) * (1.0 - kcHot));
  c = mix(c, c * vec3(1.12, 0.98, 0.85), kcHot);`); F.userData.kcHot = true; F.needsUpdate = true; } } }
    G.koshiOld = [[2.22, -0.05], [2.98, 0.06]].map(([x, rz]) => { const m = new THREE.Mesh(G.charmGeo, G.burnMaterial()); m.position.set(x, ctx.world.floorY(0) + 1.78, -18.95); m.rotation.set(0, 0, rz); m.name = 'kc-koshi-old'; ctx.world.group.add(m); return m; });
    ctx.systems.push({ id: 'kc-story', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
    // the seal bar (the hatch pushed up from below)
    sealEl = document.createElement('div'); sealEl.id = 'kc-seal'; sealEl.className = 'kc-seal'; sealEl.hidden = true; sealEl.innerHTML = '<p>揚げ戸が押し上げられている</p><div class="kc-seal-bar"><i></i></div>';
    (document.getElementById('hud') || document.body).appendChild(sealEl);
    ctx.registerHudPart && ctx.registerHudPart('kc-seal', { slot: 'tc', order: 10 });
  });

  // ---------------- L1: the voice behind the lattice, the first charm, putting it back up ----------------
  ext.registerTask('T_CHOBA', { run: async () => { await talk('choba1', '帳場の格子'); return true; } });
  ext.on('kushi:peel', ({ id }) => {
    if (id === 'F_NAKA') { ctx.completeTask('T_PEEL1'); later(() => talk('peel1_done', '帳場の声')); return; }
    if (id === 'F_DORO') { if (tryDone('T_DORO')) later(() => say('doro_done', 6), 900); return; }
    if (id === 'F_FLUE') { flueStart(); return; }
    if (id === 'W_ITAM' || id === 'W_KAMEM') { say('lid_peeled', 6); return; }
    // 2.5.0 #3: the wide mouth's two old charms are one pair (one overlaps the other's edge): the second comes off with the first
    if (/^W_NEMAM/.test(id)) { const o = id === 'W_NEMAM1' ? 'W_NEMAM2' : 'W_NEMAM1'; if (!G.peeled.includes(o)) { G.peel(o, { force: true }); later(() => say('lid_pair_peeled', 7), 300); } return; }
    { const C = G.charms.get(id); if (C && C.def.crumble && !flag('crumble')) { setFlag('crumble'); later(() => say('crumble', 6), 300); return; } }
    if (!flag('peel_first')) { setFlag('peel_first'); say('peel_first', 5); }
  });
  ext.on('kushi:paste', ({ id, n }) => {
    // 2.5.0 #3 「２枚とか３枚で塞いだり」: a wide mouth says what one charm does there, and when it holds
    if (G.sealNeed && G.sealNeed(id) > 1) { const need = G.sealNeed(id); if (n < need && !flag('wide_half')) { setFlag('wide_half'); say('wide_half', 6); } else if (n === need && !flag('wide_full')) { setFlag('wide_full'); say('wide_full', 5); } }
    if (id === 'K_NAKA' && done('T_PEEL1') && !done('T_PASTE1') && !flag('naka_paste')) { setFlag('naka_paste'); later(() => talk('paste1', '帳場の声'), 300); return; }
    flueCheck();
  });
  ext.on('kushi:lid', ({ id }) => { if (!flag('lid_said')) { setFlag('lid_said'); say('lid_close', 5); } flueCheck(); });
  // 2.4.0 #9: T_FLUE2 is done when every road from 燻しの間 to 奥の室 holds at least one charm (ghost.js weakest)
  const routeHeld = () => G.weakest && G.weakest('IBUSHI', 'OKUMURO').strength >= 1 && G.weakest('IBUSHI', 'DORO').strength >= 1;
  const OPEN_WORD = { e_f_oku: 'box_open_oku', e_f_ita: 'box_open_ita', e_f_kame: 'box_open_kame', e_koshi: 'box_open_koshi', e_ita: 'box_open_ita', e_kame: 'box_open_kame', e_f_nema: 'box_open_nema', e_nema: 'box_open_nema' };
  function openRoad() {
    const w = G.weakest('IBUSHI', 'OKUMURO'); if (!w) return W.box_open_any;
    const leg = w.legs.find((l) => OPEN_WORD[l.e.id] && edgeStrength(l.e, G.sealN, G.peeled) === 0);
    // 2.5.0: a wide mouth with one charm on it: half of it is open
    if (leg && leg.e.need > 1 && leg.e.seal && G.sealN(leg.e.seal) > 0) return W[leg.e.id === 'e_f_oku' ? 'box_half_oku' : 'box_half_nema'];
    return W[leg ? OPEN_WORD[leg.e.id] : 'box_open_any'];
  }
  G.openRoad = openRoad;
  function flueCheck() { if (done('T_OKUMURO') && !done('T_FLUE2') && G.peeled.includes('F_FLUE') && routeHeld() && tryDone('T_FLUE2')) later(() => talk('flue2_done', '奥の室'), 300); }
  ext.on('kushi:unpaste', ({ id }) => {
    if (id === 'K_NAKA' && flag('naka_paste') && !done('T_PASTE1')) { const d = ctx.world.doors.get('D_NAKA'); if (d && d.open) d.open(); ctx.completeTask('T_PASTE1'); later(() => talk('paste1_done', '帳場の声')); }
  });

  // ---------------- L2: the house ----------------
  ext.on('item:pickup', () => { if (has('TESHOKU') && has('MATCHES')) tryDone('T_HASHIRI'); });
  ext.on('doc:read', ({ id }) => {
    if (id === 'DOC_DIARY') tryDone('T_OKU');
    if (id === 'DOC_HIKAE' && tryDone('T_HIKAE')) later(() => talk('hikae', '札の控え'), 300);
  });
  let ringT = -1;
  ext.registerTask('T_PHONE', { run: async () => {
    ringT = -1; ctx.sound('pickupPhone');
    await talk('phone', '黒電話');
    ctx.sound('hangup');
    return true;
  }, onDone: () => { apply(); later(() => say('phone_after', 6), 500); } });
  // 2.4.0 #5 「電話の後、婆さんのネタバラシは聞きに行く形に」: after the call the player walks back to the lattice and asks
  ext.registerTask('T_HARU2', { run: async () => { await talk('haru_dead', '帳場の格子'); return true; } });
  ext.registerTask('T_USU', { canStart: () => (has('KOTEKO') ? true : W.usu_need), onDone: () => { G.moveUsu(); ctx.sound('noise', 'thud'); later(() => say('usu_done', 5), 1300); hatchSpot(); } });
  ext.registerTask('T_HATCH', { run: async () => { ctx.sound('paper'); G.hatchCharm.visible = false; ctx.sound('creak'); G.setHatch(true); return true; }, onDone: () => { G.muroGlow.i = MURO_I; if (G.kilnGlow) G.kilnGlow.i = 0.55; if (G.kilnPatch) for (const m of G.kilnPatch) m.visible = true; ctx.world.setLampFloor(ctx.floor, true); hatchSpot(); G.ghostStart('cage', { at: CAGE_AT }); later(() => talk('hatch_done', '揚げ戸の札')); } });

  // ---------------- L3: the 室, the corridor, the lattice, the flue ----------------
  ext.registerTask('T_LIGHT', { canStart: () => (has('TESHOKU') && has('MATCHES') ? true : W.light_need), onDone: () => { G.light0(true); ctx.sound('lighter'); later(() => talk('light_done', '室')); } });
  ext.registerTask('T_LURE', {
    // the conditions of the moment are checked in run (a canStart that says no would hide the task's steps from the guide)
    run: async () => { if (!has('KAKE_KUSHI')) { ans('lure_need'); return false; } removeItem('KAKE_KUSHI'); if (G.lure) G.lure.visible = true; ctx.sound('paper'); return true; },
    onDone: () => { flueSnap = { fuda: G.fuda }; later(() => talk('lure_done', '燻しの間')); },
  });
  function flueStart() {
    flueSnap = { fuda: G.fuda - 1 };
    G.ghostStart('flue', { onCatch: catchFlue });
    ctx.checkpoint = { ...CP.flue };
    ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.6);
    later(() => say('flue_go', 6), 600);
  }
  function trapDone() {
    G.ghostStart('trapped', { at: { room: 'IBUSHI', x: G.gh.x, z: G.gh.z }, onCatch: catchFlue });
    ctx.completeTask('T_TRAP');
    later(() => talk('trap', '燻しの間'), 1200);
  }
  ext.registerTask('T_KOSHI', {
    run: async (c, t) => { if (!ctx.lightOn) { ans('koshi_fire'); return false; } ctx.sound('lighter'); return ctx.runMinigame(t); },
    onDone: () => { G.peel('F_KOSHI', { force: true }); apply(); later(() => talk('koshi_open', '格子戸'), 1300); },
  });
  // the comb: not before every road to 奥の室 holds (she comes by the weakest); the refusal names the open road
  ext.registerTask('T_BOX', { run: async (c, t) => { if (!routeHeld()) { ctx.answer(openRoad()); return false; } return ctx.runMinigame(t); }, onDone: () => rise() });

  // ---------------- L4: the comb, the run back, the hatch ----------------
  async function rise() {
    G.combBox.visible = false; G.boxCord.visible = false; G.boxCharm.visible = false;
    huntSnap = { fuda: G.fuda, peeled: [...G.peeled], seals: Object.fromEntries([...G.seals.keys()].map((id) => [id, [G.sealN(id), 0, G.lidShut(id) ? 1 : 0]])) };
    ctx.checkpoint = { ...CP.hunt };
    await talk('rise', '奥の棚');
    ctx.setLight(false); G.candleOut = true; ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(1);
    G.boxGlow.i = 0.9; ctx.world.setLampFloor(0, true);
    G.ghostStart('hunt', { at: lureSpot(), wait: 1.0, onCatch: catchHunt });
    say('hunt_go', 6); later(() => { if (G.candleOut) say('ev_dark', 5); }, 6500);
    ctx.save();
  }
  ext.on('player:respawn', () => {
    if (!ctx) return;
    if (done('T_BOX') && !done('T_ESCAPE') && flag('chase2')) { chase2(true); }
    else if (done('T_BOX') && !done('T_ESCAPE')) { resetHunt(); later(() => say('hunt_reset', 6), 300); }
    else if (G.peeled.includes('F_FLUE') && !done('T_TRAP')) { resetFlue(); later(() => say('flue_reset', 6), 300); }
    else if (done('T_TRAP') && !done('T_BOX')) G.ghostStart('trapped', { at: lureSpot(), onCatch: catchFlue });
    if (G.seal) G.seal.t = 0;
  });
  ext.on('kushi:ghost-press', ({ id, mode }) => {
    // the first sight: she comes to the lattice and the waxed charm throws her back
    if (id === 'F_KOSHI' && mode === 'cage' && !done('T_KOSHI_SEE')) koshiScene();
    if (mode === 'hunt' && id === 'K_FLUE' && ctx.state.room === 'OKUMURO' && !flag('press_flue')) { setFlag('press_flue'); say('ev_flue_bell', 4); }
  });
  let koshiBusy = false;
  async function koshiScene() {
    if (koshiBusy) return; koshiBusy = true;
    ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.9);
    // 2.5.0 #5 「札が燃えるところが見える場面」: the eyes go to the lattice; the two plain old charms at its sides catch fire, curl and fall to
    // ash while she presses; the waxed one in the middle smokes and holds
    G.turnTo = { x: 2.6, y: ctx.world.floorY(0) + 1.45, z: -19, t: 1.2 };
    (G.koshiOld || []).forEach((m, i) => later(() => G.burnAway(m, 2.6), 350 + i * 650));
    const C = G.charms.get('F_KOSHI'); if (C) { const u = C.mesh.material.userData; u.burn.value = 0.12; u.glow.value = 1; later(() => { u.glow.value = 0.2; }, 3400); }
    await new Promise((r) => later(r, 4000));
    await talk('koshi', '格子戸');
    ctx.completeTask('T_KOSHI_SEE');
    koshiBusy = false;
  }
  ext.on('kushi:fall', ({ left }) => { if (left === 0 && G.gh.mode === 'hunt') ctx.sound('stinger'); });
  let sealEl = null;
  ext.registerTask('T_SEAL', { run: async () => { G.seal = null; sealEl.hidden = true; G.setHatch(false); ctx.sound('noise', 'thud'); ctx.sound('stamp'); G.hatchCharm.visible = true; removeItem('OLD_FUDA'); return true; }, onDone: () => { hatchSpot(); later(() => talk('seal_done', '揚げ戸')); } });

  // ---------------- L5: the questions, the return, the endings ----------------
  // 2.4.1: the thinking and the return are the other branch - once the comb was given (T_END), they close: no stale 「作業台で、考えをまとめる」
  // on the guide or the map on the walk to the front door, and no return of a comb no longer held (kit check-playtest P59)
  const decided = () => (done('T_END') ? W.bench_after : true);
  ext.registerTask('T_THINK', { canStart: decided, run: async () => {
    const Q = ctx.data.fuda.think;
    await ctx.talk([{ who: '私', text: Q.intro }], { title: '作業台' });
    for (const [i, q] of Q.questions.entries()) {
      for (;;) {
        // 2.1.0 (水無瀬病院 2nd play test #14 #15, rolled out here): the question is written on an old page of Haru's 帳面, a bar runs down while
        // you think, and 千草 whispers for the comb under the work table. Running out never picks: she asks again, the candle gutters, the bar refills.
        const urge = ctx.data.talk.think_urge || [];
        const v = await ctx.choose({ who: '私', title: `考える（${i + 1} / ${Q.questions.length}）`, text: q.q, look: 'form', form: { org: '札の家　帳場の控え', title: '五 十 二 年 前', no: `問 ${i + 1} / ${Q.questions.length}`, stamp: '済', paper: 'ledger' },
          timer: { seconds: 28, urge: urge.slice(0, 2).map((L, k) => ({ ...L, at: k ? 0.3 : 0.65 })), out: urge[2], onOut: () => { flick = 1.0; ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.4); } },
          options: q.options.map((o) => ({ id: o.id, label: o.label })) });
        if (!v) return false;
        const o = q.options.find((x) => x.id === v);
        if (o.ok) { await ctx.talk([{ who: '私', text: o.why }], { title: '作業台' }); break; }
        await ctx.talk([{ who: '私', text: `……ちがう。${o.why}` }], { title: '作業台' });
      }
    }
    await talk('think_done', '作業台');
    return true;
  }, onDone: () => hatchSpot() });
  ext.registerTask('T_RETURN', { canStart: decided, run: async () => {
    const v = await ctx.choose({ who: '私', title: '揚げ戸', text: '揚げ戸の札をはがして、櫛を千草さんに返す。\n返した櫛は、ハルさんには渡せなくなる。', options: [{ id: 'no', label: 'まだ返さない' }, { id: 'yes', label: '札をはがし、櫛を返す', primary: true }] });
    if (v !== 'yes') { if (v) ans('return_wait'); return false; }
    ctx.sound('paper'); G.hatchCharm.visible = false; G.setHatch(true); ctx.sound('creak');
    await talk('return', '揚げ戸');
    removeItem('COMB'); setFlag('returned');
    G.setHatch(false); ctx.sound('noise', 'thud');   // 2.5.0 #3: the lid falls shut by itself (the hole's collider back off, the ladder locked: return_shut)
    return true;
  }, onDone: () => { hatchSpot(); later(() => say('return_closed', 6), 600); } });
  ext.registerTask('T_END', {
    canStart: () => (has('COMB') || done('T_RETURN') ? true : W.haru_wait_comb),
    run: async () => {
      if (has('COMB')) {
        const v = await ctx.choose({ who: '私', title: '帳場の格子', text: `櫛をハルさんに渡せば、表の戸は開く。ハルさんは、櫛を火鉢で燃やすつもりだ。${done('T_THINK') ? '\n燃やせば、千草さんは二度と櫛に会えない。' : ''}`, options: [{ id: 'no', label: 'まだ渡さない' }, { id: 'give', label: '櫛をハルさんに渡す', primary: !done('T_THINK') }] });
        if (v !== 'give') { if (v) ans('give_wait'); return false; }
        await talk('give', '帳場の格子');
        removeItem('COMB'); if (G.ember) G.ember.material.color.setRGB(1, 0.45, 0.1);
        setFlag('chose_give'); return true;
      }
      await talk('last', '帳場の格子');
      const letters = flag('letters');
      const v = await ctx.choose({ who: '私', title: '帳場の格子', text: `格子の内側には、ハルさんが五十二年かけて貼った札。ハルさんは、自分の札の輪から出られない。${letters ? '\n札をはがせば、ハルさんは格子の外へ出て、千草さんに謝りに行ける。もう、ここには残らない。' : '\n（ハルさんが五十二年、何を思っていたのか、まだ分からない。家のどこかに、出さなかった手紙があるかもしれない。）'}`, options: [{ id: 'keep', label: 'ハルさんの札は、そのままにする', primary: !letters }, ...(letters ? [{ id: 'free', label: '帳場の格子の札を、はがす', primary: true }] : [])] });
      if (!v) return false;
      if (v === 'free') { await talk('end_free', '帳場の格子'); if (G.chobaCharms) G.chobaCharms.visible = false; setFlag('chose_free'); return true; }
      if (!letters) ans('end_free_no');
      await talk('end_keep', '帳場の格子'); setFlag('chose_keep'); return true;
    },
    onDone: () => { apply(); later(() => say('out_go', 5), 600); },
  });
  // 2.4.0 #11 「最後に玄関まで歩いて開ける」: the player walks to the front door and opens it; the ending comes after the door, by the player's hand
  ext.registerTask('T_OUT', { run: async () => {
    ctx.sound('creak'); G.frontTo = 1; if (G.frontCharm) G.frontCharm.visible = false;
    // 2.5.1 (coordinator: D-32 見せてから語る): the eyes go out through the doorway to the lane and 野口さん's car while the door slides; the
    // player looks for a while; then the words, in a window at the bottom with no dimming, so the doorway stays in view
    G.turnTo = { x: 0.6, y: ctx.world.floorY(1) + 1.0, z: 31.5, t: 1.6 };
    await new Promise((r) => later(r, 3400));
    const cls = /\/dot\//.test(location.pathname) ? 'kc-out-top' : 'kc-out';   // the top view (/dot) sees the doorway at the bottom of the screen: the window stays at the top there
    document.body.classList.add(cls);
    try { await talk(flag('chose_give') ? 'out_give' : flag('chose_free') ? 'out_free' : 'out_keep', '表の戸'); } finally { document.body.classList.remove(cls); }
    return true;
  }, onDone: () => setFlag(flag('chose_give') ? 'end_give' : flag('chose_free') ? 'end_free' : 'end_keep') });
  ext.registerTask('T_SQ1', {
    canStart: () => { const miss = [['LETTER1', '走り庭の水屋'], ['LETTER2', '奥の間の箪笥'], ['LETTER3', '作業場の道具箱']].filter(([i]) => !has(i)).map(([, l]) => l); return miss.length ? `${W.letters_more}${miss.join('、')}` : true; },
    onDone: () => { setFlag('letters'); later(() => talk('letters_done', 'ハルさんの手紙')); },
  });

  // ---------------- rooms ----------------
  ext.on('player:room', ({ to }) => {
    if (!ctx) return;
    if (to === 'SAGYO') { if (tryDone('T_SAGYO')) { ringT = 2.5; } if (done('T_BOX') && !done('T_ESCAPE') && !flag('chase2')) { G.ghostStop(); chase2(false); } }
    if (to === 'MISE' && flag('chase2') && done('T_BOX') && !done('T_ESCAPE') && G.gh.mode === 'follow') safeBeat();
    if (to === 'MURO' && !flag('muro_in')) { setFlag('muro_in'); later(() => talk('muro_in', '室'), 500); }
    if (to === 'ITA' && !G.ev.includes('ita')) { G.ev.push('ita'); flick = 1.2; voice('whisper1'); later(() => say('ev_ita', 4), 900); }
    if (to === 'OKUMURO' && tryDone('T_OKUMURO')) later(() => talk('okumuro', '奥の室'), 300);
    if (to === 'KAME' && !G.ev.includes('kame')) { G.ev.push('kame'); later(() => say('kame_in', 6), 700); }
    if (to === 'NEMA' && !G.ev.includes('nema')) { G.ev.push('nema'); later(() => say('nema_in', 7), 700); }
  });
  // (T_HASHIRI is an L2 task; the kitchen is open from ハル's first words, so the candle and matches may be in hand before L2 begins)
  ext.on('task:done', ({ id }) => { if (has('TESHOKU') && has('MATCHES')) tryDone('T_HASHIRI'); if (id === 'T_SAGYO') ringT = 2.5; if (id === 'T_CHOBA' && !(ctx && ctx.testScene)) later(() => say('chip_first', 5), 800); });
  ext.on('thing:look', ({ id }) => {
    if (id === 'OMOTE_DOOR' && done('T_HARU2')) ctx.answer('戸は、死んだハルさんが押さえている。……櫛を持って来るまで、開かない。');
  });

  // (2.2: the lid pushed up from below with a timer is gone: the run ends at ハル's ring, the hatch is sealed after it at the player's pace)

  // ---------------- every frame ----------------
  let flick = 0, flueT = 0;
  const HALO = 4.5, HALO_D = 4.5;   // the candle's halo underground (2.4.1)
  function update(dt, active) {
    if (!ctx) return;
    // a short look toward a scene (2.5.0 #5: the burning charms on the lattice), eased; the player's own look takes over after it
    if (G.turnTo && ctx.fp) { const T0 = G.turnTo, p = ctx.camera.position; T0.t -= dt; const want = Math.atan2(-(T0.x - p.x), -(T0.z - p.z)); let d = want - ctx.fp.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const k = Math.min(1, dt * 4); ctx.fp.yaw += d * k; const wp = Math.atan2(T0.y - p.y, Math.hypot(T0.x - p.x, T0.z - p.z)); ctx.fp.pitch += (wp - ctx.fp.pitch) * k; if (T0.t <= 0) G.turnTo = null; }
    if (!active) return;
    const c = cam(), room = ctx.state.room;
    // the phone rings until it is answered: the bell of a black phone, from the phone (2.0, #5)
    // 2.4.0 #4 「電話をもっと大きな音で（驚かせたい）」: the first ring is sudden and loud through the house, with a start (stinger, a jolt)
    if (ringT >= 0 && !done('T_PHONE')) { ringT -= dt; if (ringT < 0) { const first = !flag('ring_said'); if (G.phoneRing) G.phoneRing(first); if (first) { setFlag('ring_said'); later(() => say('phone_ring', 5), 900); }   /* 2.5.0 #1 「演出が強すぎます。音が鳴るだけでいい」: the bell only, no stinger / jolt */ ringT = 3.0; } }
    if (done('T_OKUMURO') && !done('T_FLUE2')) { flueT -= dt; if (flueT <= 0) { flueT = 0.5; flueCheck(); } }
    // underground: no running before the comb (a small flame, a dirt floor)
    ctx.fp.o.run = ctx.floor === 0 && !done('T_BOX') ? ctx.fp.o.speed : RUN0;
    // the candle: a flicker; a wall right in front of the flame does not burn white (the light eases down, sampled 8 times a second)
    if (ctx.flashlight && ctx.lightOn && LIT) {
      nearT -= dt; if (nearT <= 0) { nearT = 0.125; ray.setFromCamera(CENTER, ctx.camera); ray.far = 2.6; const h = ray.intersectObject(ctx.world.group, true).find((x) => x.object.visible && !x.object.isSprite && !(x.object.material && (x.object.material.visible === false || x.object.material.opacity < 0.2))); nearK = h ? 0.3 + 0.7 * Math.max(0, Math.min(1, (h.distance - 0.3) / 2.3)) : 1; }
      nearNow += (nearK - nearNow) * Math.min(1, dt * 6);
      const L = LIT * nearNow;
      if (flick > 0) { flick -= dt; ctx.flashlight.intensity = flick > 0 ? L * (0.25 + Math.random() * 0.4) : L; }
      else ctx.flashlight.intensity = L;
    }
    if (G.halo) { const on = ctx.lightOn && ctx.floor === 0 && LIT && ctx.flashlight; G.halo.intensity = on ? HALO * (ctx.flashlight.intensity / LIT) : 0; if (on) G.halo.position.set(c.x, c.y - 0.3, c.z); }
    if (G.gh.mode === 'follow' && ctx.floor === 1) { const T0 = G.trail || (G.trail = []), l = T0[T0.length - 1]; if (!l || Math.hypot(c.x - l.x, c.z - l.z) > 0.35) T0.push({ x: c.x, z: c.z }); }   // the way you ran: she follows it
    if (ctx.floor === 0) {
      // the corridor: a bell far ahead, then the sound of combing from behind the lattice
      if (room === 'DORO' && c.z < -3 && !G.ev.includes('bell')) { G.ev.push('bell'); const b = G.bells && G.bells.find((x) => x.z < -16); if (b) { b.swing = 1; G.bellAt({ x: b.x, y: b.y, z: b.z }, 0.06); } later(() => say('ev_bell', 6), 900); }
      if (room === 'DORO' && c.z < -11 && !G.ev.includes('comb') && !done('T_KOSHI_SEE')) { G.ev.push('comb'); noise('rustle', { x: 2.6, y: 1, z: -24 }, 6); say('ev_comb', 5); }
      // she is shut in 燻しの間: the door sealed from the corridor and she out of the flue by the comb
      if (G.gh.mode === 'flue' && G.sealN('K_IBU') > 0 && G.gh.room === 'IBUSHI' && !G.gh.hidden && room !== 'IBUSHI' && !done('T_TRAP')) trapDone();
      if (G.gh.mode === 'flue' && G.gh.hidden && !G.ev.includes('flue_bell')) { G.ev.push('flue_bell'); say('ev_flue_bell', 4); }
    }
    // the hatch pushed up from below
    if (G.seal && G.seal.talked) {
      const S = G.seal; S.t += dt; S.knock -= dt;
      if (S.knock <= 0) { ctx.sound('noise', 'knock', { pos: { x: 6.6, y: 3.4, z: -0.5 }, n: 3 }); S.knock = 1.1; }
      G.hatchLid.position.y = 0.025 + Math.abs(Math.sin(S.t * 9)) * 0.05 * (S.t / S.max);
      sealEl.hidden = false; sealEl.querySelector('i').style.width = `${Math.min(100, (S.t / S.max) * 100)}%`;
      const prev = ctx.fxState || {}; ctx.fxState = { ...prev, danger: Math.max(prev.danger || 0, 0.4 + 0.5 * (S.t / S.max)) };
      if (S.t >= S.max) { S.t = 0; S.talked = true; sealEl.hidden = true; ctx.die('seal'); }
    } else if (sealEl && !sealEl.hidden) sealEl.hidden = true;
  }
  const noise = (name, pos, n) => ctx.audio && ctx.audio.noise && ctx.audio.noise(name, { pos, n });
  function voice(key) { const L = (ctx.data.talk[key] || [])[0]; if (!L) return; if (L.voice && ctx.voiceLine) ctx.voiceLine(L.voice); ctx.ui.say(`<span class="who">女の声</span>${L.text}`, 3); }

  installAsides(ext, G, { W, active: () => !!ctx && !(G.gh && ['hunt', 'follow', 'flue'].includes(G.gh.mode)) });

  ext.registerPersist('story', {
    serialize: () => ({ ev: G.ev, candleOut: !!G.candleOut, flueSnap, huntSnap }),
    restore: (s) => { if (!s) return; G.ev = s.ev || []; G.candleOut = !!s.candleOut; flueSnap = s.flueSnap || null; huntSnap = s.huntSnap || null; apply(); },
  });
}
