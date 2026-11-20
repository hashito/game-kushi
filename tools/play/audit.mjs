// Placement audit in the running game (headless): props in doorways, floating objects, wall decals off the wall / overlapping,
// untextured big boxes. node tools/probe.mjs --out D:/kushi-stages/audit --steps tools/play/audit.mjs
export default async ({ G, sleep, log }) => {
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(3000);
  const r = await G(`(() => {
    const T = g.camera.constructor, W = g.world, plan = g.data.plan, out = { door: [], float: [], decal: [], plain: [] };
    const V3 = g.camera.position.constructor, Box3 = new (Object.getPrototypeOf(W.colliders[0].box).constructor)().constructor;
    const skip = (o) => /^(wall|floor|ceil|edge|doorlook|stairs|station|lamp|look|thing|fudahit|posthit|kc-frame|kc-ceiling)/.test(o.name || '') || !o.visible;
    const meshes = []; W.group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { let p = o, vis = true; while (p) { if (!p.visible) vis = false; p = p.parent; } if (vis) meshes.push(o); } });
    const name = (o) => (o.name || (o.parent && o.parent.name) || o.geometry.type) + '@' + [o.getWorldPosition(new V3()).x, o.getWorldPosition(new V3()).y, o.getWorldPosition(new V3()).z].map((v) => v.toFixed(2)).join(',');
    for (const o of meshes) {
      const n = o.name || ''; if (/^(wall|floor|ceil)/.test(n)) continue;
      const b = new Box3().setFromObject(o), s = b.getSize(new V3());
      if (s.x > 30 || s.z > 30) continue;
      // in a doorway: the opening +-0.6 m either side, up to 2 m high
      for (const d of plan.doors) { if (d.x == null || d.kind === 'stairs') continue; const R = W.rooms.get(d.a); const fy = R ? R.y : 0; const half = (d.width || 1) / 2;
        const horiz = Math.abs((plan.rooms.find((r) => r.id === d.a).z) - d.z) < 0.05 || Math.abs((plan.rooms.find((r) => r.id === d.a).z + plan.rooms.find((r) => r.id === d.a).d) - d.z) < 0.05;
        const zone = horiz ? [d.x - half + 0.05, d.x + half - 0.05, d.z - 0.6, d.z + 0.6] : [d.x - 0.6, d.x + 0.6, d.z - half + 0.05, d.z + half - 0.05];
        if (b.min.x < zone[1] && b.max.x > zone[0] && b.min.z < zone[3] && b.max.z > zone[2] && b.min.y < fy + 1.9 && b.max.y > fy + 0.15 && s.y > 0.05 && !/^(doorlook|fuda|kc-door)/.test(n) && !(o.parent && /doorlook|door/.test(o.parent.name||''))) out.door.push(d.id + ' <- ' + name(o));
      }
    }
    return out;
  })()`);
  log(JSON.stringify(r, null, 1));
};
