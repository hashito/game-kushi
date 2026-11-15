// The story of 札の家: what is said when (data/talk.json, js/ext/words.js), the tasks that need code, the scripted moments of the passage
// (one every few metres on the way in), the gate and the post lesson, the comb and the chase back, the hatch, the questions at the bench,
// and the three endings. Shares G with fuda.js (the charms), ghost.js (千草さん) and house.js (the things).
import { W } from './words.js';

const ROOM_SURFACE = { P3: 'water', P2: 'dirt', P5: 'dirt', MURO: 'dirt', OKUMURO: 'dirt', OMOTE: 'dirt', HASHIRI: 'dirt' };
// the scripted moments on the way in: [id, x, z, what]. Each runs once, when you first walk past its point
const EVENTS = [
  ['e1', 2.6, -8, 'comb'], ['e2', 2.6, -16.5, 'hair'], ['e3', 2.6, -27, 'flame'], ['e4', 2.6, -36, 'fall'],
  ['e5', 1.4, -41.8, 'low'], ['e6', -6, -41.8, 'hands'], ['e7', -12.5, -41.8, 'cross'],
  ['e8', -17.6, -44.6, 'water'], ['e9', -17.6, -55, 'splash'], ['e10', -17.6, -63, 'float'], ['e11', -17.6, -72, 'hum'],
  ['e12', -14, -81.8, 'whisper'], ['e13', 9, -89, 'steps'], ['e14', 9, -96.5, 'comb2'],
];

export function installStory(ext, G) {
  let ctx = null, RUN0 = 3.8, LIT = 0;
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
  G.ev = G.ev || []; G.lampsOut = G.lampsOut || [];
  const cam = () => ctx.camera.position;
  const removeItem = (id) => { const i = ctx.state.inv.indexOf(id); if (i >= 0) ctx.state.inv.splice(i, 1); };

  // ---------------- the world agrees with the tasks done (a resumed save, a test scene) ----------------
  function apply() {
    if (!ctx || !G.usu) return;
    if (done('T_USU')) G.moveUsu(true);
    G.hatchCharm.visible = !done('T_HATCH') || (done('T_SEAL') && !done('T_RETURN'));
    G.muroGlow.i = done('T_HATCH') ? 0.7 : 0;
    for (const id of ['S_LAMP1', 'S_LAMP2', 'S_LAMP3', 'S_LAMP4']) { const on = done(`T_LAMP${id.slice(-1)}`) && !G.lampsOut.includes(id); G.lampEntry[id].i = on ? 3.0 : 0; G.lampFlame[id].visible = on; }
    G.combBox.visible = !done('T_BOX'); G.boxCord.visible = !done('T_BOX');
    ctx.world.setLampFloor(ctx.floor, true);
    hatchSpot();
    if (G.showFuda) G.showFuda();
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

  // ---------------- the light: the candlestick (no light at all before it is lit) ----------------
  G.lampOn = (id) => { G.lampEntry[id].i = 3.0; G.lampFlame[id].visible = true; const k = G.lampsOut.indexOf(id); if (k >= 0) G.lampsOut.splice(k, 1); ctx.world.setLampFloor(ctx.floor, true); };
  G.lampOut = (id) => { G.lampEntry[id].i = 0; G.lampFlame[id].visible = false; if (!G.lampsOut.includes(id)) G.lampsOut.push(id); ctx.world.setLampFloor(ctx.floor, true); ctx.sound('creak'); };
  let relighting = false;

  // ---------------- the opening ----------------
  ext.on('game:start', ({ resume, scene }) => {
    if (!ctx) return;
    apply();
    if (done('T_LIGHT') && !G.candleOut) G.light0(true);
    if (resume || scene || ctx.testScene) return;
    talk('opening', 'はじまり').then(() => { say('start', 6); if (ctx.mapTip) ctx.mapTip(); });
  });

  ext.on('game:ready', (c) => {
    ctx = c;
    RUN0 = ctx.fp.o.run;
    // the light
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
    // a crouching body passes under the low beams of the passage
    const s0 = ctx.fp.solid.bind(ctx.fp);
    ctx.fp.solid = (cl) => (cl.low && ctx.fp.crouching ? false : s0(cl));
    ctx.stepSurfaceOf = (room) => ROOM_SURFACE[room] || null;
    // who may peel what, when (the rule is fuda.js; the order is the story's)
    G.canPeel = (id) => {
      if (id === 'F_NAKA' && !done('T_CHOBA')) return W.peel_haru_first;
      if (['F_HASHIRI', 'F_OKU', 'F_ROKA', 'F_SAGYO'].includes(id) && !done('T_PASTE1')) return done('T_CHOBA') ? W.peel_l1 : W.peel_haru_first;
      if (id === 'F_P1' && !done('T_LIGHT')) return W.peel_dark;
      if (id === 'F_GATE' && (!flag('gate_seen') || G.gh.mode === 'gate')) return W.peel_gate;
      return true;
    };
    G.doorHint = (def) => { const r = G.canPeel(def.id); return r === true ? W.door_charm : r; };
    G.lampS = {}; for (const [id, e] of Object.entries(G.lampEntry)) G.lampS[id] = G.project(e.x, e.z).s;
    G.evS = EVENTS.map(([id, x, z, what]) => ({ id, s: G.project(x, z).s, what }));
    // the ladder: shut while 千草さん is under the hatch
    const st = G.stairDown && G.stairDown.userData.interact;
    if (st) {
      const L0 = st.locked; st.locked = () => L0() || (done('T_ESCAPE') && !done('T_RETURN'));
      const h0 = st.hint; Object.defineProperty(st, 'hint', { configurable: true, get: () => (done('T_ESCAPE') && !done('T_RETURN') ? (done('T_SEAL') ? W.seal_shut : W.stair_shut) : h0) });
    }
    ctx.systems.push({ id: 'kc-story', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
    // the seal bar (the hatch pushed up from below)
    sealEl = document.createElement('div'); sealEl.id = 'kc-seal'; sealEl.className = 'kc-seal'; sealEl.hidden = true; sealEl.innerHTML = '<p>揚げ戸が押し上げられている</p><div class="kc-seal-bar"><i></i></div>';
    (document.getElementById('hud') || document.body).appendChild(sealEl);
    ctx.registerHudPart && ctx.registerHudPart('kc-seal', { slot: 'tc', order: 10 });
  });

  // ---------------- L1: the voice behind the lattice, the first charm, the post ----------------
  ext.registerTask('T_CHOBA', { run: async () => { await talk('choba1', '帳場の格子'); return true; } });
  ext.on('kushi:peel', ({ id }) => {
    if (id === 'F_NAKA') { ctx.completeTask('T_PEEL1'); later(() => talk('peel1_done', '帳場の声')); return; }
    if (id === 'F_P1') { tryDone('T_P1'); return; }
    if (id === 'F_GATE') { tryDone('T_GATE'); return; }
    if (/^W_/.test(id)) { const n = ['W_1', 'W_2', 'W_3'].filter((w) => G.peeled.includes(w)).length; if (n === 3) tryDone('T_SQ2'); else say('sq2_count', 3); return; }
    if (!flag('peel_first')) { setFlag('peel_first'); say('peel_first', 5); }
  });
  ext.on('kushi:paste', ({ id }) => {
    if (id === 'K_DAIKOKU' && done('T_PEEL1') && !done('T_PASTE1') && !flag('daikoku')) { setFlag('daikoku'); later(() => talk('paste1', '帳場の声'), 300); }
  });
  ext.on('kushi:unpaste', ({ id }) => {
    if (id === 'K_DAIKOKU' && flag('daikoku') && !done('T_PASTE1')) { ctx.completeTask('T_PASTE1'); later(() => talk('paste1_done', '帳場の声')); }
  });

  // ---------------- L2: the house ----------------
  ext.on('item:pickup', () => { if (has('TESHOKU') && has('MATCHES')) tryDone('T_HASHIRI'); });
  ext.on('doc:read', ({ id }) => { if (id === 'DOC_DIARY') tryDone('T_OKU'); });
  let ringT = -1;
  ext.registerTask('T_PHONE', { run: async () => {
    ringT = -1; ctx.sound('pickupPhone');
    await talk('phone', '黒電話');
    ctx.sound('hangup');
    await talk('haru_dead', '帳場の声');
    return true;
  } });
  ext.registerTask('T_USU', { canStart: () => (has('KOTEKO') ? true : W.usu_need), onDone: () => { G.moveUsu(); ctx.sound('noise', 'thud'); later(() => say('usu_done', 5), 1300); hatchSpot(); } });
  ext.registerTask('T_HATCH', { run: async () => { ctx.sound('paper'); G.hatchCharm.visible = false; return true; }, onDone: () => { G.muroGlow.i = 0.7; ctx.world.setLampFloor(ctx.floor, true); hatchSpot(); later(() => talk('hatch_done', '揚げ戸の札')); } });

  // ---------------- L3: the cellar and the passage ----------------
  ext.registerTask('T_LIGHT', { canStart: () => (has('TESHOKU') && has('MATCHES') ? true : W.light_need), onDone: () => { G.light0(true); ctx.sound('lighter'); later(() => talk('light_done', '室')); } });
  for (const n of [1, 2, 3, 4]) ext.registerTask(`T_LAMP${n}`, {
    canStart: () => (ctx.lightOn ? true : W.lamp_need),
    run: async () => { ctx.sound('lighter'); G.lampOn(`S_LAMP${n}`); return true; },
    onDone: () => say('lamp_done', 3),
  });
  ext.registerTask('T_BOX', { onDone: () => rise() });

  // the gate: the first sight of her (she is thrown back by the charm on the gate)
  function gateScene() {
    setFlag('gate_seen');
    G.ghostStart('gate', G.gateS - 7, { speed: 1.3, onStop: () => {
      ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.9);
      const C = G.charms.get('F_GATE'); if (C) { C.mesh.material = C.mesh.material.clone(); C.mesh.material.emissive.setRGB(0.7, 0.2, 0.05); later(() => C.mesh.material.emissive.setRGB(0, 0, 0), 1500); }
      later(async () => { await talk('gate', '格子戸'); G.ghostFade(); }, 1100);
    } });
  }
  // the post lesson: she comes from the far end; a charm on the post stops her (she never kills here)
  let lessonBack = 0;
  function lessonStart(again) {
    G.ghostStart('lesson', G.project(9, -81.8).s, { speed: 1.4, onCatch: () => { G.ghostFade(); G.gh.onCatch = null; } });
    say(again ? 'lesson_again' : 'lesson_start', 5); ctx.sound('stinger');
  }
  ext.on('kushi:ghost-press', ({ id }) => { if (id === 'K_LESSON' && !flag('post_ok')) { setFlag('post_ok'); talk('post_ok', '結界の柱'); } });
  ext.on('kushi:fall', ({ id }) => { if (id === 'K_LESSON' && G.gh.mode === 'lesson') { G.ghostStop(); ctx.completeTask('T_POST'); later(() => talk('post_done', '結界の柱'), 600); } });
  ext.on('kushi:ghost-gone', ({ mode }) => {
    if (mode === 'lesson' && !done('T_POST')) later(() => { if (!done('T_POST') && ctx.state.room === 'P4B') lessonStart(true); }, 1500);
  });
  ext.on('kushi:ghost-lost', () => say('hide_lost', 4));

  // ---------------- L4: the comb, the chase, the hatch ----------------
  let snap = null;
  const takeSnap = () => { snap = { fuda: G.fuda, posts: Object.fromEntries([...G.posts.values()].map((P) => [P.def.id, P.on ? P.burn : -1])) }; };
  function chaseFrom(s, rise) { G.ghostStart('chase', s, { rise, onCatch: () => { G.ghostStop(); ctx.die('chigusa'); } }); }
  async function rise() {
    G.combBox.visible = false; G.boxCord.visible = false;
    await talk('rise', '奥の棚');
    ctx.setLight(false); G.candleOut = true; ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(1);
    G.boxGlow.i = 0.9; ctx.world.setLampFloor(0, true);
    takeSnap(); chaseFrom(0, 2.6);
    say('chase_go', 6); later(() => say('chase_dark', 5), 6500);
  }
  ext.on('player:respawn', () => {
    if (done('T_BOX') && !done('T_ESCAPE') && snap) {
      G.fuda = snap.fuda; for (const [id, v] of Object.entries(snap.posts)) G.setPost(id, v >= 0, Math.max(0, v)); G.showFuda();
      const ps = G.project(cam().x, cam().z).s;
      chaseFrom(Math.max(0, ps - (flag('cp_mid') ? 16 : 0)), 2.6);
      G.candleOut = !ctx.lightOn;
    }
    if (G.seal) G.seal.t = 0;
    if (G.gh.mode === 'lesson') G.ghostStop();
  });
  let sealEl = null;
  ext.registerTask('T_SEAL', { run: async () => { G.seal = null; sealEl.hidden = true; ctx.sound('stamp'); G.hatchCharm.visible = true; removeItem('OLD_FUDA'); return true; }, onDone: () => { hatchSpot(); later(() => talk('seal_done', '揚げ戸')); } });

  // ---------------- L5: the questions, the return, the endings ----------------
  ext.registerTask('T_THINK', { run: async () => {
    const Q = ctx.data.fuda.think;
    await ctx.talk([{ who: '私', text: Q.intro }], { title: '作業台' });
    for (const [i, q] of Q.questions.entries()) {
      for (;;) {
        const v = await ctx.choose({ who: '私', title: `考える（${i + 1} / ${Q.questions.length}）`, text: q.q, options: q.options.map((o) => ({ id: o.id, label: o.label })) });
        if (!v) return false;
        const o = q.options.find((x) => x.id === v);
        if (o.ok) { await ctx.talk([{ who: '私', text: o.why }], { title: '作業台' }); break; }
        await ctx.talk([{ who: '私', text: `……ちがう。${o.why}` }], { title: '作業台' });
      }
    }
    await talk('think_done', '作業台');
    return true;
  }, onDone: () => hatchSpot() });
  ext.registerTask('T_RETURN', { run: async () => {
    const v = await ctx.choose({ who: '私', title: '揚げ戸', text: '揚げ戸の札をはがして、櫛を千草さんに返す。\n返した櫛は、ハルさんには渡せなくなる。', options: [{ id: 'no', label: 'まだ返さない' }, { id: 'yes', label: '札をはがし、櫛を返す', primary: true }] });
    if (v !== 'yes') { if (v) ans('return_wait'); return false; }
    ctx.sound('paper'); G.hatchCharm.visible = false;
    await talk('return', '揚げ戸');
    removeItem('COMB'); setFlag('returned');
    return true;
  }, onDone: () => hatchSpot() });
  ext.registerTask('T_END', {
    canStart: () => (has('COMB') || done('T_RETURN') ? true : W.haru_wait_comb),
    run: async () => {
      if (has('COMB')) {
        const v = await ctx.choose({ who: '私', title: '帳場の格子', text: `櫛をハルさんに渡せば、表の戸は開く。ハルさんは、櫛を火鉢で燃やすつもりだ。${done('T_THINK') ? '\n燃やせば、千草さんは二度と櫛に会えない。' : ''}`, options: [{ id: 'no', label: 'まだ渡さない' }, { id: 'give', label: '櫛をハルさんに渡す', primary: !done('T_THINK') }] });
        if (v !== 'give') { if (v) ans('give_wait'); return false; }
        await talk('give', '帳場の格子');
        removeItem('COMB'); if (G.ember) G.ember.material.color.setRGB(1, 0.45, 0.1);
        setFlag('end_give'); return true;
      }
      await talk('last', '帳場の格子');
      const letters = flag('letters');
      const v = await ctx.choose({ who: '私', title: '帳場の格子', text: `格子の内側には、ハルさんが五十年かけて貼った札。ハルさんは、自分の札の輪から出られない。${letters ? '\n札をはがせば、ハルさんは千草さんと同じ側へ行ける。' : ''}`, options: [{ id: 'keep', label: 'ハルさんの札は、そのままにする', primary: !letters }, ...(letters ? [{ id: 'free', label: '帳場の格子の札を、はがす', primary: true }] : [])] });
      if (!v) return false;
      if (v === 'free') { await talk('end_free', '帳場の格子'); if (G.chobaCharms) G.chobaCharms.visible = false; setFlag('end_free'); return true; }
      if (!letters) ans('end_free_no');
      await talk('end_keep', '帳場の格子'); setFlag('end_keep'); return true;
    },
  });
  ext.registerTask('T_SQ1', {
    canStart: () => { const miss = [['LETTER1', '走り庭の水屋'], ['LETTER2', '奥の間の箪笥'], ['LETTER3', '作業場の道具箱']].filter(([i]) => !has(i)).map(([, l]) => l); return miss.length ? `${W.letters_more}${miss.join('、')}` : true; },
    onDone: () => { setFlag('letters'); later(() => talk('letters_done', 'ハルさんの手紙')); },
  });

  // ---------------- rooms ----------------
  ext.on('player:room', ({ to }) => {
    if (!ctx) return;
    if (to === 'SAGYO') { if (tryDone('T_SAGYO')) { ringT = 2.5; } if (done('T_BOX') && !done('T_ESCAPE')) { ctx.completeTask('T_ESCAPE'); G.ghostStop(); startSeal(); } }
    if (to === 'MURO' && !flag('muro_in')) { setFlag('muro_in'); later(() => talk('muro_in', '室'), 500); }
    if (to === 'OKUMURO' && tryDone('T_OKUMURO')) later(() => talk('okumuro', '奥の室'), 300);
  });
  ext.on('task:done', ({ id }) => { if (id === 'T_SAGYO') ringT = 2.5; if (id === 'T_CHOBA') later(() => say('chip_first', 5), 800); });
  ext.on('thing:look', ({ id }) => { if (id === 'OMOTE_DOOR' && done('T_PHONE')) ctx.answer('戸は、死んだハルさんが押さえている。……櫛を持って来るまで、開かない。'); });

  function startSeal() {
    takeSnap();
    G.seal = { t: 0, max: ctx.calm ? 20 : 10, knock: 0, talked: false };
    hatchSpot();
    talk('top', '揚げ戸').then(() => { if (G.seal) { G.seal.talked = true; say('seal_go', 5); } });
  }

  // ---------------- every frame ----------------
  let hintT = 0, flick = 0, black = 0, peek = 0;
  function update(dt, active) {
    if (!active || !ctx) return;
    const c = cam(), room = ctx.state.room;
    // the phone rings until it is answered
    if (ringT >= 0 && !done('T_PHONE')) { ringT -= dt; if (ringT < 0) { ctx.audio && ctx.audio.ring && ctx.audio.ring({ x: 3.0, y: 4.3, z: 13.3 }); if (!flag('ring_said')) { setFlag('ring_said'); say('phone_ring', 5); } ringT = 3.4; } }
    // underground: no running before the comb (a small flame, wet stone); the water slows the legs
    ctx.fp.o.run = ctx.floor === 0 && !done('T_BOX') ? ctx.fp.o.speed : RUN0;
    ctx.fp.slow = room === 'P3' ? 0.6 : 1;
    if (room === 'P2' && !ctx.fp.crouching) { hintT -= dt; if (hintT <= 0) { say('crouch_hint', 3); hintT = 8; } } else hintT = Math.min(hintT, 1);
    // the candle: a flicker, a blackout
    if (ctx.flashlight && ctx.lightOn && LIT) {
      if (black > 0) { black -= dt; ctx.flashlight.intensity = black > 0 ? 0.05 : LIT; }
      else if (flick > 0) { flick -= dt; ctx.flashlight.intensity = flick > 0 ? LIT * (0.25 + Math.random() * 0.4) : LIT; }
    }
    if (peek > 0) { peek -= dt; if (peek <= 0 && G.gh.mode === 'peek') G.ghostStop(); }
    if (ctx.floor === 0) {
      const me = G.project(c.x, c.z);
      // the way in: a moment every few metres
      if (done('T_P1') && !done('T_BOX') && me.d < 3) for (const e of G.evS) if (!G.ev.includes(e.id) && me.s < e.s) { G.ev.push(e.id); moment(e.what); break; }
      // the gate, the lesson
      if (room === 'P4A' && done('T_LAMP3') && !flag('gate_seen') && c.x > -10.5 && G.gh.mode === 'off') gateScene();
      if (room === 'P4B' && done('T_GATE') && !done('T_POST') && G.gh.mode === 'off' && c.x > -2.6) lessonStart(false);
      if (G.gh.mode === 'lesson' && c.x > 2.65) { lessonBack -= dt; if (lessonBack <= 0) { say('lesson_back', 4); lessonBack = 6; } }
      // a checkpoint at the mouth of the low passage on the way back
      if (G.gh.mode === 'chase' && room === 'P2' && c.x > -16.6 && !flag('cp_mid')) { setFlag('cp_mid'); ctx.checkpoint = { x: -16.2, z: -41.8, yaw: -Math.PI / 2, floor: 0 }; takeSnap(); }
    }
    // the hatch pushed up from below
    if (G.seal && G.seal.talked) {
      const S = G.seal; S.t += dt; S.knock -= dt;
      if (S.knock <= 0) { ctx.sound('noise', 'knock', { pos: { x: 6.6, y: 3.4, z: -0.5 }, n: 3 }); S.knock = 1.1; }
      G.hatchLid.position.y = ctx.world.floorY(1) + 0.025 + Math.abs(Math.sin(S.t * 9)) * 0.05 * (S.t / S.max);
      sealEl.hidden = false; sealEl.querySelector('i').style.width = `${Math.min(100, (S.t / S.max) * 100)}%`;
      const prev = ctx.fxState || {}; ctx.fxState = { ...prev, danger: Math.max(prev.danger || 0, 0.4 + 0.5 * (S.t / S.max)) };
      if (S.t >= S.max) { S.t = 0; S.talked = true; sealEl.hidden = true; ctx.die('seal'); }
    } else if (sealEl && !sealEl.hidden) sealEl.hidden = true;
  }
  const noise = (name, pos, n) => ctx.audio && ctx.audio.noise && ctx.audio.noise(name, { pos, n });
  function moment(what) {
    const c = cam();
    const ahead = (d) => { const p = G.routeAt(G.project(c.x, c.z).s - d); return { x: p.x, y: 1.2, z: p.z }; };
    switch (what) {
      case 'comb': noise('rustle', ahead(14), 6); say('ev_comb', 5); break;
      case 'hair': say('ev_hair', 4); break;
      case 'flame': flick = 1.2; voice('whisper1'); say('ev_flame', 4); break;
      case 'fall': noise('thud', { x: c.x, y: 1, z: c.z + 6 }, 3); ctx.body && ctx.body.play && ctx.body.play('stagger'); say('ev_fall', 4); break;
      case 'low': say('ev_low', 5); break;
      case 'hands': say('ev_hands', 5); break;
      case 'cross': G.ghostStart('peek', G.project(-17.6, -47).s); peek = 0.7; ctx.sound('creak'); later(() => say('ev_cross', 4), 700); break;
      case 'water': noise('splash', { x: c.x, y: 0.2, z: c.z }, 2); say('ev_water', 5); break;
      case 'splash': noise('splash', { x: c.x, y: 0.2, z: c.z + 5 }, 3); say('ev_splash', 4); break;
      case 'float': say('ev_float', 5); break;
      case 'hum': black = 1.6; ctx.audio && ctx.audio.tone && ctx.audio.tone({ dur: 2.4, freq: 220, type: 'sine', gain: 0.035, vibrato: 4, wet: 0.6 }); say('ev_hum', 5); break;
      case 'whisper': voice('whisper2'); noise('rustle', { x: c.x, y: 2, z: c.z }, 8); say('ev_whisper', 5); break;
      case 'steps': say('ev_steps', 4); break;
      case 'comb2': noise('rustle', { x: 9, y: 1, z: -104 }, 8); say('ev_comb2', 4); break;
    }
  }
  function voice(key) { const L = (ctx.data.talk[key] || [])[0]; if (!L) return; if (L.voice && ctx.voiceLine) ctx.voiceLine(L.voice); ctx.ui.say(`<span class="who">女の声</span>${L.text}`, 3); }

  ext.registerPersist('story', {
    serialize: () => ({ ev: G.ev, lampsOut: G.lampsOut, candleOut: !!G.candleOut }),
    restore: (s) => { if (!s) return; G.ev = s.ev || []; G.lampsOut = s.lampsOut || []; G.candleOut = !!s.candleOut; apply(); },
  });
}
