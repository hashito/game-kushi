// 2.6.0 (play 2026-11-26 #4 「煙道の口の札が選択しづらい」): from the 燻しの間 side only (the check-select-range poses include 寝間 behind the
// wall), 300 poses in front of the flue mouth (1.0-2.2 m, ±50°, the aim ±8° off the charm): how often [E] is the charm. 2.5.3 on the live site: 47 %
// (the mouth's 調べる box stood in front of it), 2.6.0: 100 %. node tools/probe.mjs --out <dir> --steps tools/play/flue-aim.mjs  (LIVE=1: the live site)
export default async ({ p, G, sleep, log, base }) => {
  const url = process.env.LIVE ? 'https://kushi.autoarticles.net/?scene=flue&qa=1' : `${base}?scene=flue&qa=1`;
  await p.goto(url); await p.waitFor("window.__game && window.__game.state && window.__game.state.started", 120000); await sleep(3000);
  const r = await G(`(() => { const out = { n: 0, ok: 0, other: {} }; const c = g.camera.position, fy = g.world.floorY(g.floor);
    for (const d of [1.0, 1.4, 1.8, 2.2]) for (const a of [-50, -25, 0, 25, 50]) for (const ey of [-8, -4, 0, 4, 8]) for (const ex of [-8, 0, 8]) {
      const ar = a * Math.PI / 180; c.x = 7.5 + Math.sin(ar) * d; c.z = -12.91 + Math.cos(ar) * d;
      const tx = 7.5, ty = 0.57 + fy, tz = -12.91; g.fp.yaw = Math.atan2(-(tx - c.x), -(tz - c.z)) + ex * Math.PI / 180; g.fp.pitch = Math.atan2(ty - c.y, Math.hypot(tx - c.x, tz - c.z)) + ey * Math.PI / 180;
      g.camera.rotation.set(g.fp.pitch, g.fp.yaw, 0, 'YXZ'); g.camera.updateMatrixWorld(true);
      const pk = g.pickNow(); out.n++; const id = pk ? pk.kind + ':' + pk.id : '(none)'; if (id === 'fuda:F_FLUE') out.ok++; else out.other[id] = (out.other[id] || 0) + 1; }
    return out; })()`);
  log(process.env.LIVE ? 'LIVE 2.5.3' : 'local', 'F_FLUE picked', r.ok, '/', r.n, (100 * r.ok / r.n).toFixed(0) + '%', JSON.stringify(r.other));
};
