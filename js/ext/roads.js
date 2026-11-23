// 千草さん's roads under the house (pure: test/rules.test.mjs; ghost.js walks them, story.js asks which road is open)
// the graph: each edge joins two rooms through a doorway; pts runs from room a's side to room b's side.
// 2.4.0 (#9): the flue is a trunk from 燻しの間 to a fork (J, inside the rock) with three branches - 奥の室, 板の間 and the new 甕の間 - each
// mouth with a wooden lid. A door can take a charm again (K_<door>). `at: 'b'` = the block sits at the b end (a flue mouth: she crawls up to it).
export const EDGES = [
  { id: 'e_doro', a: 'MURO', b: 'DORO', pts: [[2.6, -0.3], [2.6, -1.7]], charm: 'F_DORO', seal: 'K_DORO' },
  { id: 'e_ita', a: 'DORO', b: 'ITA', pts: [[2.2, -6], [1.0, -6]], charm: 'F_ITA', seal: 'K_ITA' },
  { id: 'e_kame', a: 'DORO', b: 'KAME', pts: [[2.2, -14.6], [1.0, -14.6]], charm: 'F_KAME', seal: 'K_KAME' },
  { id: 'e_ibu', a: 'DORO', b: 'IBUSHI', pts: [[3.0, -9], [4.2, -9]], charm: 'F_IBU', seal: 'K_IBU' },
  { id: 'e_koshi', a: 'DORO', b: 'OKUMURO', pts: [[2.6, -18.3], [2.6, -19.7]], charm: 'F_KOSHI', seal: 'K_KOSHI' },
  { id: 'e_trunk', a: 'IBUSHI', b: 'J', pts: [[7.5, -12.3], [7.5, -13.2], [5.6, -15.6]], charm: 'F_FLUE', hidden: true },
  { id: 'e_f_oku', a: 'J', b: 'OKUMURO', pts: [[5.6, -15.6], [5.5, -18.8], [5.5, -19.7]], seal: 'K_FLUE', at: 'b', hidden: true, need: 2 },
  { id: 'e_f_ita', a: 'J', b: 'ITA', pts: [[5.6, -15.6], [3.0, -12.2], [-3.0, -9.3], [-3.0, -8.4]], charm: 'W_ITAM', seal: 'K_ITAM', at: 'b', hidden: true },
  // 2.5.0 (#3 「地下の構造を少し広く」「２枚とか３枚で塞いだり」): 寝間 (NEMA), the night-watch room off the corridor where 千草さん lived her
  // last days. Its flue mouth is wide: ハル shut it with two old charms side by side, and it holds only while two are on it (need 2)
  { id: 'e_nema', a: 'DORO', b: 'NEMA', pts: [[3.0, -16.2], [4.2, -16.2]], charm: 'F_NEMA', seal: 'K_NEMA' },
  { id: 'e_f_nema', a: 'J', b: 'NEMA', pts: [[5.6, -15.6], [5.2, -14.2], [5.2, -13.4]], charms: ['W_NEMAM1', 'W_NEMAM2'], seal: 'K_NEMAM', at: 'b', hidden: true, need: 2 },
  { id: 'e_f_kame', a: 'J', b: 'KAME', pts: [[5.6, -15.6], [1.0, -18.4], [-1.5, -18.3], [-1.5, -17.4]], charm: 'W_KAMEM', seal: 'K_KAMEM', at: 'b', hidden: true },
];
/** the charms of the house still on an edge (its door charm, or the old charms on a lid) */
export const edgeCharms = (e) => (e.charms || (e.charm ? [e.charm] : []));
/** how strong the blocks on an edge are: charms still on it + pasted charms, less what a wide mouth needs before it holds at all
 *  (2.5.0: `need` 2 = two charms side by side; one covers half the mouth and holds nothing). A route's strength is the sum. sealN / peeled from fuda.js */
export const edgeStrength = (e, sealN, peeled) => Math.max(0, edgeCharms(e).filter((c) => !peeled.includes(c)).length + (e.seal ? sealN(e.seal) : 0) - (e.need || 1) + 1);
/** the weakest way from a to b: [{ e, fwd }] with its strength - she always goes for the weakest road, the shortest of equals (pure: test/data.test.mjs) */
export function weakest(a, b, sealN, peeled, edges = EDGES) {
  if (a === b) return { legs: [], strength: 0 };
  const best = new Map([[a, { c: 0, legs: [] }]]), q = [a];
  while (q.length) {
    q.sort((x, y) => best.get(x).c - best.get(y).c); const r = q.shift(), cur = best.get(r);
    for (const e of edges) {
      const n = e.a === r ? e.b : e.b === r ? e.a : null; if (!n) continue;
      const c = cur.c + 1 + 1000 * edgeStrength(e, sealN, peeled);
      if (!best.has(n) || best.get(n).c > c) { best.set(n, { c, legs: [...cur.legs, { e, fwd: e.a === r }] }); q.push(n); }
    }
  }
  const t = best.get(b); if (!t) return null;
  return { legs: t.legs, strength: Math.floor(t.c / 1000) };
}
