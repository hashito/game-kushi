// The reading panel (kit 1.20.3), the user's phone play 2026-11-21: 「スクロールできるようにではなく他のUIの邪魔にならないように広く場所を取るべき」,
// 「地下の帳面を開くとすぐに自分のコメントが始まり見づらい」, 「各手紙も拾ったタイミングで内容を表示」.
//   node tools/probe.mjs --public --path dot/ --query qa=1 --mobile --size 390x844 --out <dir> --steps tools/dot/reader-steps.mjs
// 1. a look-at card opens as a large panel: all of its text visible without scrolling, nothing of the HUD on it, a 閉じる inside; closed -> HUD back
// 2. the ledger (DOC_HIKAE): no comment, voice or talk while it is open; the comment comes after it is closed (ctx.readLog + a voice log)
// 3. a letter: picked up -> its text in the panel at once; its feeling after the panel is closed
import { clippedTextSource } from './frame-padding.mjs';
import { helpers } from '../play/lib.mjs';

const PANEL = `(() => {
  const r = document.querySelector('#gf-reader > .tl-read'); if (!r) return null;
  const b = r.querySelector('.tl-body'), R = r.getBoundingClientRect(), vis = (e) => { const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const hit = [];
  for (const e of document.querySelectorAll('#hud *, #touch *, #say, #prompt, .tl-lane > *')) {
    if (r.contains(e) || !vis(e)) continue; const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue;
    if (q.right > R.left + 1 && q.left < R.right - 1 && q.bottom > R.top + 1 && q.top < R.bottom - 1 && (e.textContent.trim() || e.matches('button, [id^=t-]'))) hit.push((e.id || e.className || e.tagName).toString().slice(0, 40));
  }
  const close = r.querySelector('.tl-close'), c = close && close.getBoundingClientRect();
  return { panel: [R.left, R.top, R.width, R.height].map(Math.round), vw: innerWidth, vh: innerHeight, share: +(R.width * R.height / (innerWidth * innerHeight)).toFixed(2),
    fits: b.scrollHeight <= b.clientHeight + 2, sh: b.scrollHeight, ch: b.clientHeight, inView: R.left >= 0 && R.top >= 0 && R.right <= innerWidth + 0.5 && R.bottom <= innerHeight + 0.5,
    close: c ? [Math.round(c.width), Math.round(c.height)] : null, reading: document.body.classList.contains('gf-reading'), overlap: [...new Set(hit)].slice(0, 8) };
})()`;

export default async (api) => {
  const { G, p, sleep, log, shot } = api, H = helpers(api);
  const mobile = await G('innerWidth < 600');
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(2500); await H.idle(); await sleep(600);
  await G(`(() => { window.__vlog = []; const v0 = g.voiceLine; g.voiceLine = (f, ...a) => { window.__vlog.push(['voice', String(f).split('/').pop(), Date.now()]); return v0.call(g, f, ...a); }; return 1; })()`);
  const check = async (name, o = {}) => {
    const s = await G(PANEL); log(name, JSON.stringify(s));
    if (!s) { log('ERROR', `${name}: no reading panel`); return null; }
    await shot(name);
    if (!s.inView) log('ERROR', `${name}: the panel goes past the screen`);
    if (o.fit !== false && !s.fits) log('ERROR', `${name}: the text needs scrolling (${s.sh} > ${s.ch})`);
    if (s.overlap.length) log('ERROR', `${name}: HUD on the panel: ${s.overlap.join(', ')}`);
    if (!s.close || s.close[1] < 44) log('ERROR', `${name}: no large 閉じる (${JSON.stringify(s.close)})`);
    if (mobile && s.share < 0.5) log('ERROR', `${name}: the panel takes only ${s.share} of a phone screen`);
    const cut = await G(clippedTextSource('body')); if (cut.length) log('ERROR', `${name}: ${cut.length} line(s) cut`, JSON.stringify(cut.slice(0, 3)));
    return s;
  };
  const closePanel = async () => { await G(`(document.querySelector('#gf-reader .tl-close') || { click() {} }).click(), 1`); await sleep(900); };
  const hudBack = async (name) => { const r = await G(`({ reader: !!document.querySelector('#gf-reader > .tl-read'), reading: document.body.classList.contains('gf-reading'), touch: getComputedStyle(document.getElementById('touch') || document.body).visibility, blocked: g.blocked() })`); log(name, JSON.stringify(r)); if (r.reader || r.reading || r.touch === 'hidden') log('ERROR', `${name}: the panel did not give the screen back`); };

  // 1. the look card of 帳場の格子
  log('look', await G(`(() => { const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.kind === 'look' && x.id === 'MISE_LATTICE'); return ia ? (g.useInteract(ia), 'opened') : 'no interactable'; })()`));
  await sleep(900);
  await check('look-card');
  log('blocked while reading', await G('g.blocked()'));
  await closePanel(); await hudBack('look-closed'); await shot('look-closed');

  // 2. the ledger: the document first, then the comment
  await G(`(g.readLog.length = 0, window.__vlog.length = 0, 1)`);
  log('doc', await G(`(() => { const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.id === 'DOC_HIKAE'); const k = ia ? ia : { kind: 'doc', id: 'DOC_HIKAE' }; return g.useInteract(k) ? 'opened ' + k.kind : 'no handler'; })()`));
  await sleep(2500);
  const during = await G(`({ wm: g.wm.isOpen, log: g.readLog.map((x) => x.slice(0, 2)), voice: window.__vlog.map((x) => x[1]), say: (document.getElementById('say') || {}).textContent || '' })`);
  log('doc open', JSON.stringify(during));
  await shot('doc-open');
  if (during.log.some(([k]) => k === 'say' || k === 'talk') || during.voice.length) log('ERROR', 'a comment / voice started while the document is open');
  await G(`(document.querySelector('.wm-layer .wm-x') || { click() {} }).click(), 1`);
  await sleep(1500);
  const after = await G(`({ log: g.readLog.map((x) => x.slice(0, 2)), voice: window.__vlog.map((x) => x[1]), say: (document.getElementById('say') || {}).textContent || '' })`);
  log('doc closed', JSON.stringify(after));
  await shot('doc-closed');
  const ci = after.log.findIndex(([k, v]) => k === 'close' && v === 'doc'), si = after.log.findIndex(([k]) => k === 'say' || k === 'talk');
  if (ci < 0) log('ERROR', 'the document window did not log its close');
  if (si < 0) log('ERROR', 'no comment after the document was closed');
  else if (si < ci) log('ERROR', 'the comment came before the close');
  await H.idle(); await sleep(400);

  // 3. a letter
  await G(`(g.readLog.length = 0, 1)`);
  log('letter', await G(`(() => { const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.kind === 'item' && x.id === 'LETTER3'); return ia ? (g.useInteract(ia), 'picked') : 'no letter'; })()`));
  await sleep(900);
  const ls = await check('letter', { fit: true });
  if (ls) { const t = await G(`(document.querySelector('#gf-reader .iv-text') || {}).textContent || ''`); if (!/令和七年/.test(t)) log('ERROR', 'the letter text is not in the panel'); }
  const sayDuring = await G(`g.readLog.filter((x) => x[0] === 'say').length`);
  await closePanel(); await sleep(600);
  const lafter = await G(`({ log: g.readLog.map((x) => x.slice(0, 2)), say: (document.getElementById('say') || {}).textContent || '' })`);
  log('letter closed', JSON.stringify(lafter));
  await hudBack('letter-closed'); await shot('letter-closed');
  // the item list keeps the text
  const inInv = await G(`(() => { const s = g.state.inv.includes('LETTER3'); return s; })()`);
  log('letter in the bag', inInv);
  log('voices', JSON.stringify(await G('window.__vlog.map((x) => x[1])')));
  log('result', JSON.stringify({ sayDuringLetter: sayDuring }));

  // 4. no floating picture (「第三者視点の場合に画像が画面中央の上部に出てきて邪魔」): a picked-up item with a photo is shown only in the
  // reading panel - no picture card in the lane / #look outside it, while it is open or after it is closed
  const FLOAT = `[...document.querySelectorAll('#look img, .tl-lane img, .tl-lane .tl-photocard, #hud .tl-photocard')].filter((e) => !e.closest('#gf-reader') && e.getBoundingClientRect().width > 8 && getComputedStyle(e).visibility !== 'hidden').map((e) => e.className || e.tagName)`;
  log('photo item', await G(`(() => { const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.kind === 'item' && g.data.items.find((i) => i.id === x.id && i.photo)); return ia ? (g.useInteract(ia), 'picked ' + ia.id) : 'no photo item here'; })()`));
  await sleep(900);
  const fl1 = await G(FLOAT); if (await G(PANEL)) await check('photo-pickup');
  await closePanel(); await sleep(600); const fl2 = await G(FLOAT);
  log('floating pictures', JSON.stringify({ open: fl1, closed: fl2 }));
  if (fl1.length || fl2.length) log('ERROR', `a picture floats outside the reading panel: ${JSON.stringify([...fl1, ...fl2])}`);
  await H.idle(); await sleep(300);

  // 5. 覚え書き・読んだもの: the menu tab lists the ledger and the letter; a tap opens it in the reading panel, closing it comes back to the tab
  await G(`(g.tm.open('reads'), 1)`); await sleep(900); await shot('reads-tab');
  const tab = await G(`({ items: [...document.querySelectorAll('.gf-read-open')].map((b) => b.textContent.trim().slice(0, 30)), now: (document.querySelector('.gf-memo-now') || {}).textContent || '', past: document.querySelectorAll('.gf-memo-past li').length, cut: 0 })`);
  log('reads tab', JSON.stringify(tab));
  if (!tab.items.some((t) => /札の控え/.test(t)) || !tab.items.some((t) => /手紙/.test(t))) log('ERROR', 'the ledger / the letter is not in 読んだもの');
  if (!/なぜ/.test(tab.now)) log('ERROR', '覚え書き has no reason (なぜ) for the task now');
  { const cut = await G(clippedTextSource('.wm-layer')); if (cut.length) log('ERROR', `reads tab: ${cut.length} line(s) cut`, JSON.stringify(cut.slice(0, 3))); }
  await G(`([...document.querySelectorAll('.gf-read-open')].find((b) => /札の控え/.test(b.textContent)) || { click() {} }).click(), 1`); await sleep(900);
  await check('reread-ledger', { fit: false });
  await closePanel(); await sleep(700);
  log('back on the tab', await G(`!!(g.tm.isOpen && g.tm.active === 'reads')`)); await shot('reads-back');
  await G('(g.tm.close(), 1)'); await sleep(400);
};
