// The per-room props list for the follow-up placement update (the 500 Q-series parts made for 札の家, kit branches sprites-q1..q5,
// brief _feedback/sprites-kushi-brief.md). Each room id lists entries in the same form as PROPS in props.js:
//   { k: '<stack id>', x, z, face: 0 | Math.PI / 2 | Math.PI | -Math.PI / 2, s?: scale, solid?: true, star?: true }
// placeProps() appends them after PROPS (the room comes from the key). A part whose stack is not in the sheet yet is reported as
// missing (D.props) and skipped, so entries can land before the parts do. Same rules: against the north / side walls, out of doorways
// and off the routes of tools/play/*.mjs and the guide; run tools/dot/walldoor-steps.mjs and the play scripts after editing (D.props lists overlaps: hits / near).
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI, S = 0;
// 2.2: the first pass (11 parts): small things a family left and the cellar's story, on the floor by the walls, off the routes
export default {
  OMOTE: [{ k: 'q-geta', x: 0.75, z: 21.5, face: E }],                            // a child's red-thonged geta in the entry (the house had a child once)
  MISE: [],
  NAKA: [{ k: 'q-photo-down', x: 3.1, z: 15.7, face: E }],                       // a photo stand laid face down by the andon
  HASHIRI: [{ k: 'q-salt-jar', x: 2.25, z: 10.15, face: W }],                    // salt by the pickles
  OKU: [{ k: 'q-ohajiki', x: 3.3, z: 8.55, face: E }],                           // marbles and beanbags by the rolled futon
  ROKA: [],
  SAGYO: [{ k: 'q-nail-box', x: 1.35, z: 0.35, face: S }],                       // nails and a hammer by the basket
  MURO: [{ k: 'q-charcoal', x: 1.6, z: 2.3, face: E, solid: true }],             // a charcoal bale next to the rice bale
  DORO: [{ k: 'q-wet-feet', x: 2.6, z: -15.5, face: N }],                        // wet bare footprints going on toward the lattice
  ITA: [{ k: 'q-mushiro', x: -2.4, z: -6.0, face: S }],                          // a straw mat on the board floor
  IBUSHI: [{ k: 'q-ash-pile', x: 8.6, z: -6.0, face: W }],                       // ash and a live coal, the smoking still warm
  OKUMURO: [{ k: 'q-sake', x: 1.3, z: -26.5, face: S }, { k: 'q-fuda-ash', x: 4.9, z: -26.4, face: S }],   // an offering and a burnt charm by her shelf
};
