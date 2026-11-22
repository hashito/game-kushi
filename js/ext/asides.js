// 2.4.0 (#3 「細かい語りを増やす」): small asides. When the player stands near a thing and looks at it, the protagonist says one short line
// about it, once (words.js as_<thing>, voiced). Not while 千草さん is after you, not over a talk, a card or a document, and never two at once.
// The list is data: thing id -> word key (positions come from data/things.json).
export const ASIDES = {
  HASHIRI_WELL: 'as_well', MISE_TEA: 'as_tea', NAKA_PHOTO: 'as_photo', OKU_KIMONO: 'as_kimono', ROKA_AMADO: 'as_amado',
  SAGYO_FLOOR: 'as_floor', MURO_SCRATCH: 'as_scratch', MURO_KILN: 'as_kiln', ITA_WRITING: 'as_writing', IBUSHI_FLUE: 'as_flue',
  DORO_BELLS: 'as_bells', OKUMURO_CANDLE: 'as_candle', KAME_JARS: 'as_jars', KAME_ROPE: 'as_rope', OMOTE_SHOES: 'as_shoes',
};
export const ASIDE_R = 2.2;      // metres: near enough
export const ASIDE_DOT = 0.82;   // looking at it (cos of the angle between the view and the thing)

/** would this aside play now? pure (test/data.test.mjs): p = player {x, z, room}, dir = view {x, z} (unit), t = thing {room, position, y} */
export function asideDue(p, dir, t) {
  if (!t || t.room !== p.room) return false;
  const dx = t.position[0] - p.x, dz = t.position[1] - p.z, d = Math.hypot(dx, dz);
  if (d > ASIDE_R || d < 0.05) return false;
  return (dx * dir.x + dz * dir.z) / d >= ASIDE_DOT;
}

export function installAsides(ext, G, { W, active }) {
  let ctx = null, t = 0, quiet = 0;
  ext.on('game:ready', (c) => { ctx = c; ctx.systems.push({ id: 'kc-asides', def: { update: (dt, c2, on) => tick(dt, on) }, inst: null }); });
  // anything said resets the gap (an aside never steps on another line)
  ext.on('task:done', () => { quiet = 4; });
  function busy() {
    if (!ctx || !ctx.state.started || ctx.state.ended) return true;
    if ((ctx.ui && ctx.ui.open) || (ctx.wm && ctx.wm.isOpen) || ctx.mgOpen) return true;
    const sl = ctx.ui && ctx.ui.sayLine; if (sl && (sl.cur || (sl.q && sl.q.length))) return true;
    return !active();
  }
  function tick(dt, on) {
    if (!on || !ctx) return;
    t -= dt; quiet -= dt; if (t > 0) return; t = 0.25;
    if (quiet > 0 || busy()) return;
    const room = ctx.state.room, c = ctx.camera.position, f = ctx.camera.getWorldDirection ? ctx.camera.getWorldDirection(new (c.constructor)()) : null;
    if (!f) return;
    const L = Math.hypot(f.x, f.z) || 1, dir = { x: f.x / L, z: f.z / L };
    G.ev = G.ev || [];
    const TH = ctx.data.things; for (const th of (Array.isArray(TH) ? TH : (TH && TH.things)) || []) {
      const key = ASIDES[th.id]; if (!key || !W[key] || G.ev.includes(`as:${th.id}`)) continue;
      if (!asideDue({ x: c.x, z: c.z, room }, dir, th)) continue;
      G.ev.push(`as:${th.id}`); quiet = 9;
      ctx.monologue(W[key], Math.min(8, 2.4 + W[key].length * 0.09));
      return;
    }
  }
}
