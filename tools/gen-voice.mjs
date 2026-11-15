#!/usr/bin/env node
// Voices for every spoken line of data/talk.json through the local media queue (http://127.0.0.1:8765, kind "voice"), saved as
// assets/voice/<line id>.mp3 (ffmpeg, mono). Lines that already have a file are skipped; --force redoes them, --only ID,ID does a few.
//   node tools/gen-voice.mjs [--force] [--only MSG-001,MSG-002] [--dry]
// Then run tools/gen-data.mjs: it adds "voice" to each line whose file exists.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://127.0.0.1:8765';
const args = process.argv.slice(2), force = args.includes('--force'), dry = args.includes('--dry');
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
// VOICEVOX speakers (by the queue's speaker number) and speed per character
export const VOICES = { '声': { speaker: 14, speed: 0.95 }, '千鶴': { speaker: 46, speed: 1.0 }, '志乃': { speaker: 9, speed: 0.85 }, '木下': { speaker: 11, speed: 1.05 } };
const talk = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/talk.json'), 'utf8'));
const lines = new Map();
const add = (L) => { if (L && L.id && L.text && VOICES[L.who] && !lines.has(L.id)) lines.set(L.id, L); };
for (const seq of Object.values(talk)) for (const L of seq) { add(L); for (const o of L.options || []) for (const r of o.reply || []) add(r); }
const out = path.join(ROOT, 'assets/voice'); fs.mkdirSync(out, { recursive: true });
const todo = [...lines.values()].filter((L) => (!only || only.has(L.id)) && (force || !fs.existsSync(path.join(out, `${L.id}.mp3`))));
console.log(`${lines.size} spoken lines, ${todo.length} to make`);
if (dry) process.exit(0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (t) => t.replace(/[「」『』]/g, '').replace(/……/g, '、').replace(/―/g, '、');
const post = async (L) => { const v = VOICES[L.who]; const r = await fetch(`${API}/v1/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'voice', params: { text: say(L.text), speaker: v.speaker, speed: v.speed } }) }); const j = await r.json(); if (!j.id) throw new Error(JSON.stringify(j)); return j.id; };
let n = 0;
const pending = [];
for (const L of todo) pending.push({ L, id: await post(L) });
for (const job of pending) {
  for (;;) {
    const j = await (await fetch(`${API}/v1/jobs/${job.id}`)).json();
    if (j.status === 'done') {
      const src = j.files[0].path, dst = path.join(out, `${job.L.id}.mp3`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-b:a', '56k', dst]);
      await fetch(`${API}/v1/jobs/${job.id}`, { method: 'DELETE' }).catch(() => {});
      if (++n % 20 === 0) console.log(`${n} / ${pending.length}`);
      break;
    }
    if (j.status === 'failed' || j.status === 'cancelled') { console.log('failed', job.L.id, j.error || ''); break; }
    await sleep(800);
  }
}
console.log(`made ${n}`);
