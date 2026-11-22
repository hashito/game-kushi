// The game's own words wherever the kit would answer with a generic line ("まだ、この作業には進めません", "先に済ませることがある：…",
// "[E] 扉（鍵がかかっている）", "（いまは使えません）"). Three parts:
//   1. ctx.canStart is wrapped: a "not yet" answer for a task becomes what the protagonist knows is missing and where to go.
//   2. a door held by a charm gets its own kind ('charmdoor'): "[E] 戸の札をはがす", and [E] peels the charm (or says why not).
//   2b. a station whose task is not open yet shows "[E] 帳場の格子（ハルさん）", not a bare name, and [E] gives that answer.
//   3. the ladder under the hatch gets its own kind ('kladder'): no generic "使えません", the hint says why.
import { W } from './words.js';

export function installAnswers(ext, G) {
  let ctx = null;
  const charmOf = (doorId) => { for (const [cid, C] of G.charms) if (C.door === doorId && !G.peeled.includes(cid)) return cid; return null; };
  const done = (id) => ctx.state.tasks.includes(id);
  const has = (id) => ctx.state.inv.includes(id);

  // ---------- 1. the station answers ----------
  function why(task) {
    switch (task.id) {
      case 'T_END':
        if (!has('COMB') && !done('T_RETURN')) return done('T_HATCH') ? W.no_comb_deep : W.no_comb;
        if (!done('T_SEAL')) return W.seal_first;
        return null;
      case 'T_PHONE': return W.phone_dead;
      case 'T_USU': return done('T_HARU2') ? null : done('T_PHONE') ? W.usu_haru : W.usu_phone;
      case 'T_OUT': return done('T_END') ? null : W.out_early;
      case 'T_HATCH': return done('T_USU') ? null : W.hatch_usu;
      case 'T_SEAL': return null;
      case 'T_RETURN': return done('T_THINK') ? null : W.give_wait;
      case 'T_THINK': return has('COMB') || done('T_SEAL') ? (done('T_SEAL') ? null : W.bench_busy) : W.bench_early;
      case 'T_LIGHT': return null;
      case 'T_LURE': return done('T_KOSHI_SEE') ? null : W.lure_early;
      case 'T_KOSHI': return done('T_TRAP') ? null : done('T_KOSHI_SEE') ? W.koshi_she : W.koshi_early;
      case 'T_BOX': return done('T_FLUE2') ? null : W.box_flue;
      case 'T_SQ1': return ctx.levelIndex(task.stage) > ctx.prog.index ? W.butsudan_early : null;
      default: return null;
    }
  }
  const GENERIC = /^(まだ、この作業には進めません|先に済ませることがある：|いまは、まだできません|この作業は、もう終わっています)/;

  ext.registerInteract('charmdoor', {
    prompt: (o) => (charmOf(o.id) ? '[E] 戸の札をはがす' : ''),
    run: (o) => {
      const cid = charmOf(o.id);
      if (!cid) { G.doorPlain(o.id); return; }
      const ok = G.canPeel(cid); if (ok !== true) { ctx.answer(ok); return; }
      G.peel(cid);
    },
  });
  ext.registerInteract('kladder', {
    prompt: (o) => (o.locked && o.locked() ? '[E] はしご（閉じてある）' : `[E] ${o.label || 'はしごを使う'}`),
    run: (o) => { if (o.locked && o.locked()) { ctx.answer(o.hint || W.stair_shut); return; } ctx.useStairs(o); },
  });

  ext.on('game:ready', (c) => {
    ctx = c;
    const cs0 = ctx.canStart;
    ctx.canStart = (task) => {
      const r = cs0(task);
      if (r === true || !task || typeof r !== 'string' || !GENERIC.test(r)) return r;
      if (/^この作業は、もう終わっています/.test(r)) return W.done_here;
      return why(task) || W.not_yet;
    };

    // ---------- 2. the charmed doors ----------
    for (const o of ctx.world.interactables) {
      const it = o.userData && o.userData.interact;
      if (it && it.kind === 'door' && charmOf(it.id)) it.kind = 'charmdoor';
    }

    // ---------- 2b. a station whose task is not open yet still offers [E] (the answer says what is missing) ----------
    const NAMES = { S_CHOBA: '帳場の格子（ハルさん）' };
    const tasks = ctx.data.tasks || [];
    for (const o of ctx.world.interactables) {
      const it = o.userData && o.userData.interact;
      if (!it || it.kind !== 'station') continue;
      const base = NAMES[it.id] || it.label;
      if (!base) continue;
      Object.defineProperty(it, 'label', { configurable: true, get: () => (tasks.some((t) => t.station === it.id && !done(t.id)) ? `[E] ${base}` : base) });
    }

    // ---------- 3. the ladder under the hatch ----------
    for (const o of [G.stairDown, G.stairUp]) { const it = o && o.userData.interact; if (it && it.kind === 'stairs') it.kind = 'kladder'; }
  });
}
