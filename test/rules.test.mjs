// 2.4.0 play test (2026-11-22): the rules behind the fixes, as pure checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EDGES, weakest, edgeStrength } from '../js/ext/roads.js';
import { ringPlan, ringPeak } from '../js/ext/ring.js';
import { asideDue, ASIDES } from '../js/ext/asides.js';
import { W } from '../js/ext/words.js';

const J = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const plan = J('data/plan.json'), fuda = J('data/fuda.json'), things = J('data/things.json'), tasks = J('data/tasks.json'), endings = J('data/endings.json');

test('#1 the kitchen: its door has no unlock and its charm waits only for ハル\'s first words', () => {
  const d = plan.doors.find((x) => x.id === 'D_HASHIRI');
  assert.ok(d && !d.unlock, 'D_HASHIRI must not carry an unlock');
  const story = readFileSync(new URL('../js/ext/story.js', import.meta.url), 'utf8');
  const rules = story.split('\n').filter((l) => /F_HASHIRI/.test(l) && /return/.test(l));
  assert.ok(rules.length >= 1);
  for (const l of rules) assert.doesNotMatch(l, /T_PASTE1|T_PHONE|T_SAGYO|T_HATCH|T_LIGHT|T_BOX|chase/, `kitchen gated by a later task: ${l.trim()}`);
});

test('#4 the first ring is louder than the others and never clips', () => {
  const a = ringPeak(ringPlan(true)), b = ringPeak(ringPlan(false));
  assert.ok(a > b, `first ${a} > later ${b}`);
  assert.ok(a <= 0.6 && b <= 0.6, `peaks ${a} / ${b} must stay under 0.6`);
  assert.ok(ringPlan(true).every((t) => t.near), 'the first ring is heard through the whole house');
});

const sealN0 = () => 0;
test('#9 she takes the weakest road: with the oku lid open, 奥の室 is reachable for free', () => {
  const peeled = ['F_FLUE', 'F_IBU', 'F_DORO', 'F_ITA', 'F_KAME', 'F_KOSHI'];
  const n = (id) => ({ K_IBU: 1 }[id] || 0);
  assert.equal(weakest('IBUSHI', 'OKUMURO', n, peeled).strength, 0);
  // 2.5.0 #3: the oku flue mouth is wide - one charm does not close it, two do
  assert.equal(weakest('IBUSHI', 'OKUMURO', (id) => ({ K_IBU: 1, K_FLUE: 1 }[id] || 0), peeled).strength, 0);
  const n2 = (id) => ({ K_IBU: 1, K_FLUE: 2 }[id] || 0);
  assert.equal(weakest('IBUSHI', 'OKUMURO', n2, peeled).strength, 1);
  // peel ハル's old lid charm in 板の間 and that road opens again
  assert.equal(weakest('IBUSHI', 'DORO', n2, [...peeled, 'W_ITAM']).strength, 0);
  assert.equal(weakest('IBUSHI', 'DORO', (id) => ({ K_IBU: 1, K_FLUE: 2, K_ITAM: 1 }[id] || 0), [...peeled, 'W_ITAM']).strength, 1);
  assert.equal(edgeStrength(EDGES.find((e) => e.id === 'e_ibu'), sealN0, []), 1);
});

test('#9 every road edge names real charms and seals', () => {
  const ids = new Set([...fuda.doors, ...fuda.walls, ...fuda.seals].map((x) => x.id));
  const doors = fuda.doors.map((d) => `K_${d.door.replace(/^D_/, '')}`);
  for (const e of EDGES) {
    if (e.charm) assert.ok(ids.has(e.charm), `${e.id} charm ${e.charm}`);
    if (e.seal) assert.ok(ids.has(e.seal) || doors.includes(e.seal), `${e.id} seal ${e.seal}`);
  }
});

test('#9 fewer spares: the old upstairs charms crumble', () => {
  assert.ok(fuda.doors.filter((d) => d.crumble).length >= 3);
  assert.ok(!tasks.some((t) => t.id === 'T_SQ2'), 'the spare-charm side quest is gone');
});

test('#3 asides: each names a thing and a voiced line, and plays only when looked at from near', () => {
  for (const [id, key] of Object.entries(ASIDES)) { assert.ok(things.some((t) => t.id === id), id); assert.ok(W[key], key); }
  const well = things.find((t) => t.id === 'HASHIRI_WELL');
  const p = { x: well.position[0], z: well.position[1] + 1.5, room: 'HASHIRI' };
  assert.equal(asideDue(p, { x: 0, z: -1 }, well), true);
  assert.equal(asideDue(p, { x: 0, z: 1 }, well), false);
  assert.equal(asideDue({ ...p, room: 'NAKA' }, { x: 0, z: -1 }, well), false);
});

test('#5 #11 the order: ハル is asked after the call; the ending waits for the front door', () => {
  const t = (id) => tasks.find((x) => x.id === id);
  assert.deepEqual(t('T_HARU2').needs, ['T_PHONE']);
  assert.ok(t('T_USU').needs.includes('T_HARU2'));
  assert.deepEqual(t('T_OUT').needs, ['T_END']);
  assert.equal(t('T_OUT').station, 'S_OUT');
  assert.ok(plan.stations.some((s) => s.id === 'S_OUT'));
});

test('#7 the lattice is a closable door', () => {
  const d = plan.doors.find((x) => x.id === 'D_KOSHI');
  assert.ok(d && d.closable && d.look === 'none');
});

test('#12 every ending has an end roll with pictures and words', () => {
  for (const e of endings) {
    assert.ok(Array.isArray(e.roll) && e.roll.length >= 3, e.id);
    for (const r of e.roll) { assert.match(r.photo, /^assets\/photos\/.+\.webp$/); assert.ok(r.text && r.text.length > 20); }
  }
});

// 2.5.3 (re-check 2026-11-24): what the re-check found, kept from coming back
test('2.5.3: the normal version marks what can be picked up (the dot versions draw their own)', () => {
  const idx = readFileSync(new URL('../js/ext/index.js', import.meta.url), 'utf8'), mk = readFileSync(new URL('../js/ext/marks.js', import.meta.url), 'utf8');
  assert.match(idx, /installMarks\(ext\)/, 'marks.js is installed');
  assert.match(mk, /dataset\.dot/, 'skips the dot layers (no double ▼)');
  assert.match(mk, /markSight/, 'never through walls (P42)');
});
test('2.5.3: 寝間 has things in its middle, not only along the walls', () => {
  const h = readFileSync(new URL('../js/ext/house.js', import.meta.url), 'utf8');
  // the room is x 3.6-9.6, z -19..-13: its middle third must hold the rug and the table
  for (const n of ['kc-nema-rug', 'kc-nema-table', 'kc-nema-teapot', 'kc-nema-letter', 'kc-nema-kori']) assert.ok(h.includes(`'${n}'`), n);
  const t = h.match(/const tx = ([\d.]+), tz = (-[\d.]+);\s*\{ const top/);
  assert.ok(t && +t[1] > 5.6 && +t[1] < 7.6 && +t[2] < -15 && +t[2] > -17, 'the table stands in the middle third');
});
