// The fine people (kit 1.21.0 res 2: 「人や敵…近くで見るとドットが目立つので解像度を上げて」): ハル up close behind her lattice, the far
// version from across the room (LOD), and the draw / memory numbers of the renderer, on whatever size the probe runs (a phone with --mobile).
//   node tools/probe.mjs --public --path dot-fps/ --query qa=1 --out <dir> --steps tools/dot/figure-steps.mjs [--mobile --size 844x390]
import { helpers } from '../play/lib.mjs';
export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  await G(`((document.querySelector('#gf-rotate .gf-rot-ok') || { click() {} }).click(), 1)`);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(2500);
  await H.idle(8000);
  const info = () => G(`(() => { const i = g.renderer.info; const F = window.__dot.figures; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, haruRes: F.haru && F.haru.res, chiRes: F.chigusa && F.chigusa.res, fineRes: F.haru && F.haru.root.userData.res }; })()`);
  // close: in front of the lattice, looking at her face
  await G(`(g.teleport({ x: 6.9, z: 23.1, floor: 0 }), 1)`); await H.face(7.15, 21.2, 0.75); await sleep(900);
  log('near', JSON.stringify(await info())); await shot('haru-near');
  // far: across the shop
  await G(`(g.teleport({ x: 2.6, z: 25.2, floor: 0 }), 1)`); await H.face(7.15, 21.2, 0.75); await sleep(900);
  log('far', JSON.stringify(await info())); await shot('haru-far');
  // the whole house's numbers with every figure built (both resolutions are in memory)
  log('memory', JSON.stringify(await G(`(() => { let v = 0; const seen = new Set(); for (const f of Object.values(window.__dot.figures)) if (f) f.warm.traverse((o) => { if (o.isMesh && !seen.has(o.geometry)) { seen.add(o.geometry); v += o.geometry.attributes.position.count; } }); return { figureVertices: v, figureGeometries: seen.size, jsHeapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; })()`)));
};
