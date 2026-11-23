// Rule W18: every interactable (doors, stations, items, documents) is easy to select: >= 85% of the reasonable approach poses, a hit region of
// >= 44 px at 1.5 m, a reach >= 1.8 m. Runs in a headless browser; skipped when there is none (CI without Edge / Chrome).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// the checker (1.7) counts only approaches from inside a room with no wall in between
// 2.4.1 (the small fixes of 2026-11-23): a charm on a door is peeled through the door too ([E] 戸の札をはがす, kind charmdoor), so the aim
// landing on the door of the charm is the same action: NORM counts it as the charm (no residual any more; 燻しの間's F_IBU was a real one -
// its door said 「扉（鍵がかかっている）」 and did nothing, fixed in js/ext/fuda.js sealRefresh). The trapdoor S_HATCH is under the millstone
// until T_USU: in the start state the aim is the millstone's (by design), and a second pass after T_USU (scene hatch) must reach it.
// Left: 奥の室's lattice D_KOSHI is a kit door with look none - the lattice you see is house.js's own mesh, so the checker finds no picture
// on the door; its waxed-charm station S_KOSHI sits on it until T_KOSHI.
// 2.5.0: 寝間 shares its north wall with 燻しの間 - the two flue mouths sit back to back on it (F_FLUE on the 燻しの間 face, the pair
// W_NEMAM1/2 on the 寝間 face). The checker skips a wall the thing touches (what it hangs on), so half the poses stand in the room behind
// the wall and see nothing there ("(nothing)" = 1 - cover); from the thing's own room they select it. Listed, with that reason.
const RESIDUALS = 'station:S_HATCH,door:D_KOSHI,fuda:F_FLUE,fuda:W_NEMAM1,fuda:W_NEMAM2,look:NEMA_CANDLES';   // the candle board stands at 寝間's south wall, 奥の室 behind it (cover 71 %; from 寝間 itself 88 %)
const NORM = "const m = /^fuda:(.+)$/.exec(T.id); const C = m && window.__kc && window.__kc.charms.get(m[1]); return C && C.door && (a === 'charmdoor:' + C.door || a === 'door:' + C.door) ? T.id : a;";
const ONLY = (ids) => `const multi = ((G.data && G.data.plan && G.data.plan.rooms) || []).some((r) => r.floor); const fy = (f) => (G.world && G.world.floorY ? G.world.floorY(f) : f * 3.4); const floorOf = (y) => { let f = 0; while (f > -4 && y + 0.3 < fy(f) - 1.0) f--; while (f < 8 && fy(f + 1) <= y + 0.3) f++; return f; }; return G.selectables().filter((t) => ${JSON.stringify(ids)}.includes(t.id)).map((t) => ({ id: t.id, floor: multi ? floorOf(t.min[1]) : undefined, v: { min: t.min, max: t.max }, min: t.min, max: t.max }));`;
const have = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', process.env.BROWSER].filter(Boolean).some((p) => fs.existsSync(p));
test('select range: every interactable passes check-select-range (--preset core --strict)', { skip: !have && 'no headless browser' }, () => {
  const r = spawnSync(process.execPath, ['tools/check-select-range.mjs', '--root', '.', '--preset', 'core', '--query', 'qa=1&autostart', '--strict', '--norm', NORM, ...(RESIDUALS ? ['--allow', RESIDUALS] : [])], { encoding: 'utf8', timeout: 180000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('select range: the trapdoor once the millstone is moved (scene hatch)', { skip: !have && 'no headless browser' }, () => {
  const r = spawnSync(process.execPath, ['tools/check-select-range.mjs', '--root', '.', '--preset', 'core', '--query', 'qa=1&autostart&scene=hatch', '--strict', '--things', ONLY(['station:S_HATCH'])], { encoding: 'utf8', timeout: 180000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /station:S_HATCH/);
});
