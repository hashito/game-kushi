// Rule W18: every interactable (doors, stations, items, documents) is easy to select: >= 85% of the reasonable approach poses, a hit region of
// >= 44 px at 1.5 m, a reach >= 1.8 m. Runs in a headless browser; skipped when there is none (CI without Edge / Chrome).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// the checker (1.7) counts only approaches from inside a room with no wall in between
// 2.3.2 (kit 1.34 rollout): known residuals by design - a charm on a door is peeled through the door ([E] 戸の札をはがす, kind charmdoor), so
// the door wins the aim over its charm (2.4.0: also 甕の間's F_KAME; and 奥の室's lattice D_KOSHI is a kit door with look none - the lattice
// you see is house.js's own mesh, so the checker finds no picture on the door; its waxed-charm station S_KOSHI sits on it until T_KOSHI); the trapdoor sits under the millstone (揚げ戸の上の臼) and is reached after the millstone is moved
const RESIDUALS = 'fuda:F_SAGYO,fuda:F_ITA,fuda:F_IBU,fuda:F_KAME,fuda:F_DORO,station:S_HATCH,door:D_KOSHI';
const have = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', process.env.BROWSER].filter(Boolean).some((p) => fs.existsSync(p));
test('select range: every interactable passes check-select-range (--preset core --strict)', { skip: !have && 'no headless browser' }, () => {
  const r = spawnSync(process.execPath, ['tools/check-select-range.mjs', '--root', '.', '--preset', 'core', '--query', 'qa=1&autostart', '--strict', ...(RESIDUALS ? ['--allow', RESIDUALS] : [])], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
