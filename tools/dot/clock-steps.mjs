// The wall clock off the 中の間 fusuma's slide (2026-11-21 「スライドする戸のところに壁掛け時計があるので良くないです」): the 店の間 north wall
// with the fusuma shut and slid open, and the clock where it hangs now (above ハル's desk).
//   node tools/probe.mjs --public --path dot-fps/ --query qa=1 --out <dir> --steps tools/dot/clock-steps.mjs
export default async ({ p, G, sleep, log, shot, base }) => {
  await p.goto(`${base}?scene=choba&qa=1`);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000); await sleep(2500);
  for (let i = 0; i < 6 && (await G('g.blocked()')); i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close').forEach((b) => b.click()), 1)`); await sleep(500); }
  const look = (x, z, tx, tz) => G(`(g.setFloor(1, { x: ${x}, z: ${z} }), g.fp.yaw = Math.atan2(-(${tx} - ${x}), -(${tz} - ${z})), g.fp.pitch = 0.05, 1)`);
  const door = (open) => G(`(() => { const d = g.world.doors.get('D_NAKA'); if (!d) return 'no door'; if (open && !d.isOpen) d.open(); if (!open && d.isOpen && d.close) d.close(); return !!d.isOpen; })()`);
  await look(5.6, 22.9, 5.6, 20.0); log('door', await door(false)); await sleep(1500); await shot('wall-door-shut');
  log('door', await door(true)); await sleep(1800); await shot('wall-door-open');
  await look(6.6, 22.4, 7.3, 20.0); await sleep(900); await shot('clock-now');
  log('clock', await G(`(() => { const T = g.THREE, out = []; g.world.group.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry') { const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3()); if (Math.abs(c.z - 20.2) < 0.2 && c.y > 4.5) out.push([+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)]); } }); return out; })()`));
};
