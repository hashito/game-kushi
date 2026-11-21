// Phone play (kit 1.21.0, 2026-11-21 「携帯で行う場合は横でのプレイを推奨」「タスクなどは携帯の場合は常時表示をやめたほうが良い」「全画面表示」):
// the title (全画面 button), the portrait notice, the play screen with a notice on, the 目的 chip opened, the reading panel - each shot
// and measured with kit tools/phone-layout.mjs (HUD cover, overlapping panels).
//   node tools/probe.mjs --public --path dot-fps/ --query qa=1 --mobile --size 844x390 --out <dir> --steps tools/dot/phonefit-steps.mjs
import { phoneLayoutSource, PHONE_HUD_MAX } from './phone-layout.mjs';
export default async ({ G, sleep, log, shot }) => {
  const L = async (tag) => { const r = await G(phoneLayoutSource()); log(tag, JSON.stringify(r)); await shot(tag); return r; };
  const t = await L('title');
  if (t.portrait && !t.rotate) log('ERROR', 'no 横向き notice in portrait');
  log('fs button', await G(`(() => { const b = document.querySelector('.gf-fs-title'); return b ? getComputedStyle(b).display : 'none'; })()`));
  if (t.portrait) { await G(`((document.querySelector('#gf-rotate .gf-rot-ok') || { click() {} }).click(), 1)`); await sleep(400); }
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(2500);
  for (let i = 0; i < 20 && (await G('g.blocked()')); i++) { await G(`([...document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close, .gf-talk-choice')].filter((b) => b.offsetParent).slice(0, 1).forEach((b) => b.click()), 1)`); await sleep(500); }
  await sleep(800); await L('flash');   // the goal flashes open after the start
  await sleep(5500);
  await G(`(g.ui.toast('テストの通知 一つ目'), g.ui.toast('テストの通知 二つ目'), 1)`); await sleep(600);
  const r = await L('play');
  const max = r.portrait ? PHONE_HUD_MAX.portrait : PHONE_HUD_MAX.landscape;
  if (!r.phone) log('ERROR', 'not treated as a phone');
  if (r.cover > max) log('ERROR', `HUD covers ${r.cover} (max ${max})`);
  for (const o of r.overlaps) log('ERROR', `overlap ${o.join(' ')}`);
  // the crowded moment (「通知が多すぎます」): a thought line, a notice, a control hint, the goal flash at once -> one box, nothing overlaps
  await G(`(g.phone.flashGoal(4), g.controlHint('custom', { key: 'G', touch: '［テスト］', text: 'テストの操作', once: false }), g.ui.toast('三つ目の通知'), g.ui.say('テストの独り言。少し長めに、二行になるくらいの文。'), 1)`); await sleep(700);
  const c = await L('crowded');
  if (c.msgs.length > 1) log('ERROR', `${c.msgs.length} message boxes at once: ${c.msgs.join(', ')}`);
  for (const o of c.overlaps) log('ERROR', `crowded overlap ${o.join(' ')}`);
  await sleep(5000); const c2 = await L('after-say');   // the line gone: the notice comes back, still one box
  if (c2.msgs.length > 1) log('ERROR', `${c2.msgs.length} message boxes after the line: ${c2.msgs.join(', ')}`);
  await G(`(g.controlHintClose && g.controlHintClose(), 1)`);
  await G(`(document.getElementById('gf-goal-chip').click(), 1)`); await sleep(500);
  const o = await L('goal-open');
  log('goal open shows', await G(`(document.getElementById('hud-left') || {}).textContent.slice(0, 80)`));
  await G(`(document.getElementById('gf-goal-chip').click(), 1)`); await sleep(400);
  // the reading panel in this shape
  await G(`(() => { const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.kind === 'look'); return ia ? (g.useInteract(ia), 1) : 0; })()`); await sleep(900);
  const rd = await G(`(() => { const r = document.querySelector('#gf-reader > .tl-read'); if (!r) return null; const R = r.getBoundingClientRect(), b = r.querySelector('.tl-body'); return { inView: R.top >= 0 && R.bottom <= innerHeight + 0.5, fits: b.scrollHeight <= b.clientHeight + 2, h: Math.round(R.height), vh: innerHeight }; })()`);
  log('reader', JSON.stringify(rd)); await shot('reader');
  if (rd && !rd.inView) log('ERROR', 'the reading panel goes past the screen');
  await G(`((document.querySelector('#gf-reader .tl-close') || { click() {} }).click(), 1)`);
};
