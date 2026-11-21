// Nothing hangs where a door runs (2026-11-21 「スライドする戸のところに壁掛け時計があるので良くないです」): kit tools/wall-door.mjs over the built house.
//   node tools/probe.mjs --public [--path dot/] --query qa=1 --out <dir> --steps tools/dot/walldoor-steps.mjs
import { wallDoorSource } from './wall-door.mjs';
export default async ({ G, sleep, log }) => {
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(3000);
  const hits = await G(wallDoorSource());
  log('WALLDOOR', JSON.stringify(hits));
  if (hits.length) log('ERROR', `${hits.length} thing(s) on a door's wall band`);
};
