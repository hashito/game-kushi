// Where the things to pick up are (2026-11-21 「アイテムの取得場所が不明なので明確にわかるようにしてください」): in each scene, every item
// still lying in the world has its mark (▼ icon + glow + floor ring, dot/js/dot/guide.js), is in the picture when the player stands in
// its room, and the items a task needs (tasks.json needItems) are pinned on the map once that task is the one to do.
//   node tools/probe.mjs --public --path dot/ --query qa=1 --out <dir> --steps tools/dot/pickup-steps.mjs   (also --mobile --size 390x844)
export default async ({ p, G, sleep, log, shot, base }) => {
  const SCENES = [['omote', 'HASHIRI'], ['hashiri', 'HASHIRI'], ['oku', 'OKU'], ['sagyo', 'SAGYO']];
  for (const [scene, room] of SCENES) {
    await p.goto(`${base}?scene=${scene}&qa=1`);
    await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
    await sleep(2500);
    for (let i = 0; i < 6 && (await G('g.blocked()')); i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close').forEach((b) => b.click()), 1)`); await sleep(500); }
    await sleep(1300);   // the marks are rescanned every second
    const r = await G(`(() => {
      const T = g.THREE, D = window.__dot, marks = D && D.marks ? D.marks() : [], cam = D && D.topCam ? D.topCam : g.camera;
      const rm = g.data.plan.rooms.find((q) => q.id === ${JSON.stringify(room)});
      const out = [];
      for (const o of g.world.interactables) {
        const ia = o.userData.interact; if (!ia || ia.kind !== 'item' || !o.visible) continue;
        const it = g.data.items.find((i) => i.id === ia.id); if (!it || it.room !== rm.id) continue;
        const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3());
        const m = marks.find((k) => k.id === ia.id);
        out.push({ id: ia.id, at: [+c.x.toFixed(1), +c.z.toFixed(1)], mark: !!(m && m.shown) });
      }
      return { room: rm.id, rect: [rm.x, rm.z, rm.w, rm.d], floor: rm.floor || 0, items: out };
    })()`);
    for (const it of r.items) {
      // stand in the room, a little away from the item, and look: is it (and its mark) in the picture?
      const [x, z] = it.at, mx = r.rect[0] + r.rect[2] / 2, mz = r.rect[1] + r.rect[3] / 2, dl = Math.hypot(mx - x, mz - z) || 1, k = Math.min(1.3, dl) / dl;
      const rx = Math.min(Math.max(x + (mx - x) * k, r.rect[0] + 0.5), r.rect[0] + r.rect[2] - 0.5), rz = Math.min(Math.max(z + (mz - z) * k, r.rect[1] + 0.5), r.rect[1] + r.rect[3] - 0.5);   // 1.3 m from it, toward the room's middle
      await G(`(g.setFloor(${r.floor}, { x: ${rx}, z: ${rz} }), g.fp.yaw = Math.atan2(-(${x} - ${rx}), -(${z} - ${rz})), g.fp.pitch = -0.35, 1)`);
      await sleep(900);
      it.inView = await G(`(() => { const D = window.__dot, cam = D && D.topCam ? D.topCam : g.camera; const v = new g.THREE.Vector3(${x}, g.world.floorY(${r.floor}) + 0.6, ${z}).project(cam); return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95; })()`);
      await shot(`pick-${scene}-${it.id}`);
      if (!it.mark) log('ERROR', `${scene}: ${it.id} has no visible mark`);
      if (!it.inView) log('ERROR', `${scene}: ${it.id} is not in the picture from its room`);
    }
    // the map: the items the next task needs are pinned
    const pins = await G(`(() => { const t = g.nextTask && g.nextTask(); return { task: t && t.id, need: (t && (t.needs || []).every((n) => g.state.tasks.includes(n)) && t.needItems) || [] }; })()`);   // the map pins a task's items once its needs are done (kit 1.18)
    if (pins.need.length) { await G(`(g.tm.open('map'), 1)`); await sleep(900);  await shot(`map-${scene}`); for (const id of pins.need) { if (await G(`g.state.inv.includes(${JSON.stringify(id)})`)) continue;   /* already held (a test scene can hand it over and leave the pickup): the kit pins only what is still to find */ const nm = await G(`(g.data.items.find((i) => i.id === ${JSON.stringify(id)}) || {}).name`); const lying = await G(`g.world.interactables.some((o) => o.userData.interact && o.userData.interact.kind === 'item' && o.userData.interact.id === ${JSON.stringify(id)})`); if (lying && !(await G(`!!document.querySelector('.wm-layer [data-pin="need:${id}"]')`))) log('ERROR', `${scene}: map has no pin for ${nm} (${pins.task} needs it)`); } await G('(g.tm.close(), 1)'); await sleep(300); }
    log('PICKUPS', scene, JSON.stringify({ ...r, pins }));
  }
};
