// Phone-width look of a dot page (A12: text readable, windows top-anchored, the touch buttons clear of the picture's middle):
//   node tools/probe.mjs --public --path dot/ --query qa=1\&dotscript=1 --mobile --size 390x844 --out <dir> --steps tools/dot/phone-steps.mjs
import { helpers } from '../play/lib.mjs';

export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  await shot('title');
  // kit 1.21.0: portrait shows the 横向き notice first; this run plays on in portrait (「このまま遊ぶ」)
  await shot('rotate-notice'); log('rotate notice', await G(`getComputedStyle(document.getElementById('gf-rotate') || document.body).display !== 'none'`));
  await G(`((document.querySelector('#gf-rotate .gf-rot-ok') || { click() {} }).click(), 1)`);
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(1500); await shot('opening');
  await H.idle(); await sleep(400); await shot('start');
  await H.walkTo(3.6, 23.4); await H.walkTo(4.9, 23.2); await H.face(5.7, 22.55, 1.0); await sleep(400); await shot('choba');
  await G(`(window.__gfQ = [], 1)`);
  const p = api.p; await p.key('KeyE'); await sleep(1500); await shot('talk');
  // the smallest text on screen (px), outside the canvas
  log('smallest text', await G(`(() => { let min = 99, at = ''; for (const e of document.querySelectorAll('body *')) { if (!e.offsetParent || !e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const f = parseFloat(getComputedStyle(e).fontSize); if (f < min) { min = f; at = (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 24); } } return { min, at, font: getComputedStyle(document.body).fontFamily.slice(0, 40) }; })()`));
  await H.idle(); await sleep(300); await shot('after-talk');
};
