#!/usr/bin/env node
// Since 2.0 the data files (data/*.json) are the source: the basement was rebuilt in them by hand, and the 1.x table builder that lived
// here (it wrote every data file from its own tables) would bring the old basement back. It is in git history (tools/gen-data.mjs before
// 2.0.0). What is left is the step tools/gen-voice.mjs asks for: each line of data/talk.json whose recording exists gets its "voice".
//   node tools/gen-data.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const file = path.join(ROOT, 'data/talk.json');
const talk = JSON.parse(fs.readFileSync(file, 'utf8'));
let added = 0, dropped = 0;
const walk = (v) => {
  if (Array.isArray(v)) return v.forEach(walk);
  if (!v || typeof v !== 'object') return;
  if (typeof v.id === 'string' && typeof v.text === 'string') {
    const rel = `assets/voice/${v.id}.mp3`;
    if (fs.existsSync(path.join(ROOT, rel))) { if (v.voice !== rel) { v.voice = rel; added++; } } else if (v.voice) { delete v.voice; dropped++; }
  }
  Object.values(v).forEach(walk);
};
walk(talk);
fs.writeFileSync(file, JSON.stringify(talk, null, 2) + '\n');
console.log(`data/talk.json: voice added to ${added} line(s), removed from ${dropped}`);
