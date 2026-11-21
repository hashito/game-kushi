// The key-art background of a dot page (tools/dot/og-compose.mjs puts the title over it):
//   node tools/probe.mjs --public --path dot/ --query qa=1\&dotscript=1 --size 1200x630 --out <dir> --steps tools/dot/og-steps.mjs   (OG_MODE=top)
//   node tools/probe.mjs --public --path dot-fps/ --query qa=1 --size 1200x630 --out <dir> --steps tools/dot/og-steps.mjs            (OG_MODE=fps)
import { helpers } from '../play/lib.mjs';

export default async (api) => {
  const { G, sleep, shot } = api, H = helpers(api);
  const top = (process.env.OG_MODE || 'top') === 'top';
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(2500); await H.idle(); await sleep(300);
  if (top) {
    await H.walkTo(3.6, 23.4); await H.walkTo(4.6, 22.9); await H.face(7.15, 21.2, 0.6);
  } else {
    await H.walkTo(3.6, 23.4); await H.walkTo(4.6, 22.9); await H.face(7.15, 21.2, 0.75);
  }
  await sleep(1200);
  // the picture only: every overlay of the page hidden, the canvas kept
  await G(`(() => { const s = document.createElement('style'); s.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important}'; document.head.appendChild(s); return 1; })()`);
  await sleep(500);
  await shot(`bg-${top ? 'top' : 'fps'}`);
};
