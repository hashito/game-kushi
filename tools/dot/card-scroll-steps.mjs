// The look card on a phone (iPhone play 2026-11-21: 「スクロールできないので文字が見られません」, the ひとこと of 帳場の格子 cut by the frame):
// the card of 帳場の格子 with a long ひとこと is opened, shot, dragged with a finger (CDP touch scroll gesture on the card) and shot again.
// Passes when the card's body scrolls, the 「もっと」 cue goes once the end is reached, and no line is cut by a box that cannot scroll.
//   node tools/probe.mjs --public --path dot/ --query qa=1 --mobile --size 390x844 --out <dir> --steps tools/dot/card-scroll-steps.mjs
import { clippedTextSource } from './frame-padding.mjs';
import { helpers } from '../play/lib.mjs';

const LONG = 'ハルさんは、格子の内側から一歩も出てこない。札は、格子の桟の一本一本にまで、すき間なく貼ってある。火鉢の灰はまだ温かそうで、行灯の紙には、細い指の跡のような染みが三つ並んでいる。誰かが内側から、格子を何度も押したのだろうか。';

export default async (api) => {
  const { G, p, sleep, log, shot } = api, H = helpers(api);
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(2500); await H.idle(); await sleep(600);
  const ok = await G(`(() => { const T = g.data.things || []; const t = (Array.isArray(T) ? T : T.things || []).find((x) => x.id === 'MISE_LATTICE'); if (!t) return 'no thing'; t.feeling = ${JSON.stringify(LONG)};
    const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.kind === 'look' && x.id === t.id); if (!ia) return 'no interactable';
    return g.useInteract ? (g.useInteract(ia), 'opened') : 'no useInteract'; })()`);
  log('card', ok);
  await sleep(600);
  // things.js keeps its own copy of the data: the long ひとこと goes into the open card itself, then the lane looks again
  log('long', await G(`(() => { const f = document.querySelector('.tl-lookcard .iv-feel'); if (!f) return 'no ひとこと box'; f.textContent = '「' + ${JSON.stringify(LONG)} + '」'; document.querySelector('.tl-lookcard .tl-body').dispatchEvent(new Event('scroll')); return f.textContent.length; })()`));
  await sleep(400);
  const state = () => G(`(() => { const c = document.querySelector('.tl-lookcard'); if (!c) return null; const b = c.querySelector('.tl-body'); const r = c.getBoundingClientRect();
    return { more: c.classList.contains('tl-more'), top: b.scrollTop, sh: b.scrollHeight, ch: b.clientHeight, card: [r.left, r.top, r.width, r.height].map(Math.round), vh: innerHeight, inView: r.bottom <= innerHeight && r.top >= 0 }; })()`);
  const s0 = await state();
  log('card before', JSON.stringify(s0));
  await shot('card');
  if (!s0) { log('ERROR', 'no look card'); return; }
  const cut0 = await G(clippedTextSource('body'));
  log('clipped before', JSON.stringify(cut0));
  // a finger drags the card up: touch start, moves in small steps, end (CDP touch events, as a phone sends them)
  const drag = async (cx, cy, dist) => {
    await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
    for (let k = 1; k <= 10; k++) { await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - (dist * k) / 10 }] }); await sleep(16); }
    await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
  };
  const [x, y, w, h] = s0.card;
  await drag(Math.round(x + w / 2), Math.round(y + h * 0.75), Math.max(80, Math.round(h * 0.5)));
  await sleep(700);
  const s1 = await state();
  log('card after drag', JSON.stringify(s1));
  await shot('card-dragged');
  // to the end
  for (let i = 0; i < 4; i++) await drag(Math.round(x + w / 2), Math.round(y + h * 0.75), Math.max(80, Math.round(h * 0.5)));
  await sleep(700);
  const s2 = await state();
  log('card at the end', JSON.stringify(s2));
  await shot('card-end');
  const cut = await G(clippedTextSource('body'));
  log('clipped', JSON.stringify(cut));
  const scrolls = s0.sh > s0.ch + 2;
  if (scrolls && !(s1 && s1.top > 0)) log('ERROR', 'the card has more text but did not scroll under the finger');
  if (scrolls && !s0.more) log('ERROR', 'more text below but no 「もっと」 cue');
  if (scrolls && s2 && s2.more) log('ERROR', 'the cue stays at the end');
  if (cut.length) log('ERROR', `${cut.length} line(s) cut by a box that cannot scroll`);
  if (!s0.inView) log('ERROR', 'the card goes past the screen');
  log('result', JSON.stringify({ scrolls, dragged: s1 && s1.top, end: s2 && s2.top, cue: s0.more, cut: cut.length }));
};
