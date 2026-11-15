// 札の家 ― 奥の棚の櫛: the game's own code. The rule (the charms) is js/ext/fuda.js; the house and the passage js/ext/house.js;
// 千草さん in the passage js/ext/ghost.js; the words and the scripted moments js/ext/story.js (+ words.js); the two women js/ext/people.js.
// They share one small state (G). Order matters: the charms first (house.js uses their paper), then the house, her, the story.
import { installFuda } from './fuda.js';
import { installHouse } from './house.js';
import { installGhost } from './ghost.js';
import { installStory } from './story.js';
import { installTests } from './test-scenes.js';
import { installAnswers } from './answers.js';

export default function (ext) {
  const G = {};
  installFuda(ext, G);
  installHouse(ext, G);
  installGhost(ext, G);
  installStory(ext, G);
  installTests(ext, G);
  installAnswers(ext, G);
  ext.on('bus:error', ({ name, error }) => console.error('[kushi]', name, error && error.stack ? error.stack.split(String.fromCharCode(10)).slice(0, 3).join(' ') : String(error)));
  ext.on('game:ready', () => { if (typeof window !== 'undefined') window.__kc = G; });
}
