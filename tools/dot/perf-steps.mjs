// First-sight costs during a whole play (tools/play/full.mjs): shader programs linked after the start button (should be none: everything
// is compiled behind the title), and the long frames (> 50 ms) with what was on screen then.
//   PLAY_END=give node tools/probe.mjs --public --path dot/ --query qa=1\&dotscript=1 --out <dir> --steps tools/dot/perf-steps.mjs
import full from '../play/full.mjs';

export default async (api) => {
  const { G, log } = api;
  await G(`(() => { const R = window.__game.renderer; window.__perf = { p0: R.info.programs.length, long: [], frames: 0, worst: 0, newPrograms: [] };
    const seen = new Set(R.info.programs.map((p) => p.id));
    let last = performance.now();
    const tick = (t) => { const d = t - last; last = t; const P = window.__perf; P.frames++; if (d > P.worst) P.worst = Math.round(d);
      if (d > 50 && window.__game.state.started) P.long.push({ ms: Math.round(d), room: window.__game.state.room, task: window.__game.state.tasks.length });
      for (const p of R.info.programs) if (!seen.has(p.id)) { seen.add(p.id); P.newPrograms.push({ name: p.name, room: window.__game.state.room, started: !!window.__game.state.started }); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); return 1; })()`);
  await full(api);
  const P = await G('window.__perf');
  const inPlay = P.newPrograms.filter((x) => x.started);
  log('DOTIFY', JSON.stringify(await G('(window.__dot && window.__dot.dotifyLog) || null')));
  log('PERF', JSON.stringify({ programsAtTitle: P.p0, newProgramsInPlay: inPlay.length, firstNew: inPlay.slice(0, 8), frames: P.frames, worstMs: P.worst, longFrames: P.long.length, longest: P.long.sort((a, b) => b.ms - a.ms).slice(0, 8) }));
};
