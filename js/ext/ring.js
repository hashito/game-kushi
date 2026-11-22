// the black phone's bell, as data (pure: test/rules.test.mjs)
/** the black phone's bell (2.4.0 #4 「電話はもう少し大きな音でなるようにしてください（驚かせたい）」): the first ring is sudden and loud through the
 *  whole house (not from the phone alone: from 作業場 it was faint behind three walls), the next ones loud from the phone with a quieter
 *  house-wide layer. The strikes overlap by at most two, so the peak stays under 0.6 before the master compressor (test/data.test.mjs). */
export function ringPlan(first = false) {
  const out = [], n = first ? 22 : 17, g = first ? 0.23 : 0.16, room = first ? 0 : 0.06;
  for (let k = 0; k < n; k++) {
    const f = k % 2 ? 1980 : 1720, at = k * 0.06;
    out.push({ at, dur: 0.11, freq: f, type: 'triangle', gain: g, near: true });
    out.push({ at, dur: 0.08, freq: f * 2.76, type: 'sine', gain: g * 0.25, near: true });
    if (room) out.push({ at, dur: 0.11, freq: f, type: 'triangle', gain: room, near: false });
  }
  return out;
}
/** the loudest moment of a ring plan: the sum of the gains sounding at once */
export function ringPeak(plan) {
  let peak = 0;
  for (const a of plan) { let sum = 0; for (const b of plan) if (b.at <= a.at && b.at + b.dur > a.at) sum += b.gain; peak = Math.max(peak, sum); }
  return peak;
}
