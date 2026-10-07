/**
 * Challenger 2 - Empirical Adversarial Verification Suite
 * Milestone M4: 3D Turntable, Lighting, Web Audio & Build Integrity
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

console.log('=============================================================');
console.log('   CHALLENGER 2: TURNTABLE 3D, LIGHTING & AUDIO SYNTH AUDIT  ');
console.log('=============================================================');

let passCount = 0;
let failCount = 0;

function runCheck(title, fn) {
  try {
    fn();
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${title}`);
    passCount++;
  } catch (err) {
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${title}`);
    console.error(`  Reason: ${err.message}`);
    failCount++;
  }
}

// 1. Turntable3D.jsx Static Audit
const turntablePath = path.join(projectRoot, 'src/components/Turntable3D.jsx');
const turntableContent = fs.readFileSync(turntablePath, 'utf8');

runCheck('Turntable3D: Zero occurrences of strobe', () => {
  const matches = turntableContent.match(/strobe/gi) || [];
  assert.strictEqual(matches.length, 0, `Expected 0 matches for 'strobe', found ${matches.length}`);
});

runCheck('Turntable3D: Zero occurrences of 0xef4444 (red strobe/light)', () => {
  const matches = turntableContent.match(/0xef4444|#ef4444/gi) || [];
  assert.strictEqual(matches.length, 0, `Expected 0 matches for 0xef4444, found ${matches.length}`);
});

runCheck('Turntable3D: Zero occurrences of 0x90b0e0 (cool steel rim light)', () => {
  const matches = turntableContent.match(/0x90b0e0|#90b0e0/gi) || [];
  assert.strictEqual(matches.length, 0, `Expected 0 matches for 0x90b0e0, found ${matches.length}`);
});

runCheck('Turntable3D: Presence of walnut wood material 0x4a2c19', () => {
  assert(turntableContent.includes('0x4a2c19'), 'Expected walnut wood color 0x4a2c19 in Turntable3D.jsx');
});

runCheck('Turntable3D: Presence of brushed brass hardware 0xc8a265', () => {
  const matches = turntableContent.match(/0xc8a265/gi) || [];
  assert(matches.length >= 1, `Expected brushed brass color 0xc8a265 in Turntable3D.jsx, found ${matches.length}`);
});

runCheck('Turntable3D: Presence of 2700K warm desk lamp lighting (0xffedd5, 0xffd19a, 0xffb86c)', () => {
  assert(turntableContent.includes('0xffedd5'), 'Missing ambient warm lighting 0xffedd5');
  assert(turntableContent.includes('0xffd19a'), 'Missing key warm lighting 0xffd19a');
  assert(turntableContent.includes('0xffb86c'), 'Missing spot warm lighting 0xffb86c');
});

runCheck('Turntable3D: onScratch callback defined in props & invoked in pointer event handlers', () => {
  assert(turntableContent.includes('onScratch = null') || turntableContent.includes('onScratch'), 'onScratch prop missing');
  assert(turntableContent.includes('onScratchRef.current?.('), 'onScratchRef invocation missing');
  assert(turntableContent.includes('isScratching: true'), 'onScratch isScratching: true missing');
  assert(turntableContent.includes('isScratching: false'), 'onScratch isScratching: false missing');
});

runCheck('Turntable3D: onSeek callback defined in props & invoked in pointer event handlers', () => {
  assert(turntableContent.includes('onSeek = null') || turntableContent.includes('onSeek'), 'onSeek prop missing');
  assert(turntableContent.includes('onSeekRef.current?.(progress)'), 'onSeekRef invocation missing');
});

// 2. ambientSoundSynth.js Static & Procedural Audit
const synthPath = path.join(projectRoot, 'src/utils/ambientSoundSynth.js');
const synthContent = fs.readFileSync(synthPath, 'utf8');

runCheck('ambientSoundSynth: Contains 4 procedural channels (rain, cafe, fireplace, wind)', () => {
  assert(synthContent.includes("rain: 'rain'"), "Missing rain channel key");
  assert(synthContent.includes("cafe: 'cafe'"), "Missing cafe channel key");
  assert(synthContent.includes("fireplace: 'fireplace'"), "Missing fireplace channel key");
  assert(synthContent.includes("wind: 'wind'"), "Missing wind channel key");
});

runCheck('ambientSoundSynth: Zero static file URLs or remote downloads (0KB footprint)', () => {
  const networkPatterns = [
    /https?:\/\//i,
    /fetch\s*\(/i,
    /axios/i,
    /\.mp3/i,
    /\.wav/i,
    /\.ogg/i,
    /\.flac/i,
    /\.aac/i,
    /download/i
  ];
  for (const pat of networkPatterns) {
    const m = synthContent.match(pat);
    assert.strictEqual(m, null, `Found forbidden network/file reference: ${pat}`);
  }
});

runCheck('ambientSoundSynth: Procedural audio synthesis methods exist', () => {
  assert(synthContent.includes('createNoiseBuffer'), 'Missing createNoiseBuffer');
  assert(synthContent.includes('createBiquadFilter'), 'Missing createBiquadFilter');
  assert(synthContent.includes('createBufferSource'), 'Missing createBufferSource');
  assert(synthContent.includes('createOscillator'), 'Missing createOscillator');
});

// 3. Build Artifacts Audit
const distIndexPath = path.join(projectRoot, 'dist/index.html');
const distAssetsPath = path.join(projectRoot, 'dist/assets');

runCheck('dist: Production build artifacts exist', () => {
  assert(fs.existsSync(distIndexPath), 'dist/index.html does not exist');
  assert(fs.existsSync(distAssetsPath), 'dist/assets does not exist');
  const files = fs.readdirSync(distAssetsPath);
  const jsBundle = files.find(f => f.endsWith('.js'));
  const cssBundle = files.find(f => f.endsWith('.css'));
  assert(jsBundle, 'dist/assets missing JS bundle');
  assert(cssBundle, 'dist/assets missing CSS bundle');
});

console.log('=============================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASS: ${passCount} | FAIL: ${failCount}`);
console.log('=============================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
