/**
 * Challenger 1 - Empirical Adversarial Verification Suite
 * Milestone M4: UI Layout, Scene Switcher, Auto-Hide UI & Keyboard Navigation
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

console.log('=============================================================');
console.log('   CHALLENGER 1: UI LAYOUT, SCENE SWITCHER & SHORTCUT AUDIT   ');
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

// -------------------------------------------------------------
// 1. Static Grep on src/pages/LandingPage.jsx
// -------------------------------------------------------------
const landingPagePath = path.join(projectRoot, 'src/pages/LandingPage.jsx');
const landingPageContent = fs.readFileSync(landingPagePath, 'utf8');

runCheck('LandingPage: Zero occurrences of console-chassis', () => {
  const matches = landingPageContent.match(/console-chassis/gi) || [];
  assert.strictEqual(matches.length, 0, `Expected 0 matches for 'console-chassis', found ${matches.length}`);
});

runCheck('LandingPage: Zero occurrences of max-w-7xl', () => {
  const matches = landingPageContent.match(/max-w-7xl/gi) || [];
  assert.strictEqual(matches.length, 0, `Expected 0 matches for 'max-w-7xl', found ${matches.length}`);
});

// -------------------------------------------------------------
// 2. Validate src/data/lofiScenes.js
// -------------------------------------------------------------
import { LOFI_SCENES, DEFAULT_SCENE, getNextScene, getSceneById } from '../data/lofiScenes.js';

runCheck('lofiScenes: Exactly 4 scenes exist', () => {
  assert(Array.isArray(LOFI_SCENES), 'LOFI_SCENES must be an array');
  assert.strictEqual(LOFI_SCENES.length, 4, `Expected 4 scenes, found ${LOFI_SCENES.length}`);
});

runCheck('lofiScenes: Cyclic getNextScene works for all 4 scenes and wraps around', () => {
  const s0 = LOFI_SCENES[0].id;
  const s1 = LOFI_SCENES[1].id;
  const s2 = LOFI_SCENES[2].id;
  const s3 = LOFI_SCENES[3].id;

  assert.strictEqual(getNextScene(s0).id, s1, `Next from scene 0 (${s0}) should be scene 1 (${s1})`);
  assert.strictEqual(getNextScene(s1).id, s2, `Next from scene 1 (${s1}) should be scene 2 (${s2})`);
  assert.strictEqual(getNextScene(s2).id, s3, `Next from scene 2 (${s2}) should be scene 3 (${s3})`);
  assert.strictEqual(getNextScene(s3).id, s0, `Next from scene 3 (${s3}) should be scene 0 (${s0}) - cyclic wrap-around failed`);
});

runCheck('lofiScenes: getNextScene handles unknown ID gracefully', () => {
  const fallback = getNextScene('non-existent-scene-id');
  assert(fallback && fallback.id, 'Fallback next scene must be valid');
});

runCheck('lofiScenes: All 4 scenes have valid ambientPresets with keys (rain, cafe, fireplace, wind)', () => {
  const requiredKeys = ['rain', 'cafe', 'fireplace', 'wind'];
  LOFI_SCENES.forEach((scene, idx) => {
    assert(scene.theme, `Scene ${idx} (${scene.id}) missing theme object`);
    assert(scene.theme.ambientPreset, `Scene ${idx} (${scene.id}) missing ambientPreset object`);
    const preset = scene.theme.ambientPreset;
    for (const key of requiredKeys) {
      assert(key in preset, `Scene ${idx} (${scene.id}) missing preset key '${key}'`);
      assert(typeof preset[key] === 'number', `Scene ${idx} (${scene.id}) preset key '${key}' is not a number`);
      assert(preset[key] >= 0 && preset[key] <= 1, `Scene ${idx} (${scene.id}) preset key '${key}' value ${preset[key]} out of [0, 1] bounds`);
    }
  });
});

// -------------------------------------------------------------
// 3. Validate Keyboard Shortcuts in LandingPage.jsx
// -------------------------------------------------------------
runCheck('LandingPage: Space shortcut handler present', () => {
  assert(landingPageContent.includes("e.code === 'Space'"), 'Missing Space handler');
  assert(landingPageContent.includes('togglePlay()'), 'Missing togglePlay() call on Space');
});

runCheck('LandingPage: ArrowLeft & ArrowRight shortcut handlers present', () => {
  assert(landingPageContent.includes("e.code === 'ArrowLeft'"), 'Missing ArrowLeft handler');
  assert(landingPageContent.includes("e.code === 'ArrowRight'"), 'Missing ArrowRight handler');
  assert(landingPageContent.includes('handleSeek('), 'Missing handleSeek invocation on arrow keys');
});

runCheck('LandingPage: ArrowUp & ArrowDown volume handlers present', () => {
  assert(landingPageContent.includes("e.code === 'ArrowUp'"), 'Missing ArrowUp handler');
  assert(landingPageContent.includes("e.code === 'ArrowDown'"), 'Missing ArrowDown handler');
  assert(landingPageContent.includes('setVolume('), 'Missing setVolume invocation on arrow keys');
});

runCheck('LandingPage: KeyG scene switcher handler present', () => {
  assert(landingPageContent.includes("e.code === 'KeyG'") || landingPageContent.includes("e.key === 'g'") || landingPageContent.includes("e.key === 'G'"), 'Missing KeyG handler');
  assert(landingPageContent.includes('handleCycleScene()'), 'Missing handleCycleScene call on KeyG');
});

runCheck('LandingPage: KeyT Pomodoro toggle handler present', () => {
  assert(landingPageContent.includes("e.code === 'KeyT'") || landingPageContent.includes("e.key === 't'") || landingPageContent.includes("e.key === 'T'"), 'Missing KeyT handler');
  assert(landingPageContent.includes('setIsPomodoroOpen('), 'Missing setIsPomodoroOpen call on KeyT');
});

runCheck('LandingPage: KeyM Mute toggle handler present', () => {
  assert(landingPageContent.includes("e.code === 'KeyM'") || landingPageContent.includes("e.key === 'm'") || landingPageContent.includes("e.key === 'M'"), 'Missing KeyM handler');
  assert(landingPageContent.includes('toggleMute()'), 'Missing toggleMute call on KeyM');
});

runCheck('LandingPage: KeyH / ? Shortcut Modal handler present', () => {
  assert(landingPageContent.includes("e.code === 'KeyH'") || landingPageContent.includes("e.key === 'h'"), 'Missing KeyH handler');
  assert(landingPageContent.includes("e.key === '?'"), "Missing '?' handler for shortcut help");
  assert(landingPageContent.includes('setIsShortcutModalOpen(true)'), 'Missing setIsShortcutModalOpen(true) call');
});

runCheck('LandingPage: Escape handler present with cascading close priority', () => {
  assert(landingPageContent.includes("e.code === 'Escape'") || landingPageContent.includes("e.key === 'Escape'"), 'Missing Escape handler');
  assert(landingPageContent.includes('setIsShortcutModalOpen(false)'), 'Escape missing modal close');
});

// -------------------------------------------------------------
// 4. Validate Input Protection Guard
// -------------------------------------------------------------
runCheck('LandingPage: Input protection guard strictly implemented', () => {
  assert(landingPageContent.includes('e.target.isContentEditable'), 'Missing e.target.isContentEditable guard');
  assert(
    landingPageContent.includes("['INPUT', 'TEXTAREA'].includes(e.target.tagName?.toUpperCase())") ||
    landingPageContent.includes("['INPUT', 'TEXTAREA'].includes(e.target.tagName?.toUpperCase()"),
    'Missing uppercase INPUT/TEXTAREA tag guard'
  );
});

// -------------------------------------------------------------
// 5. Assert RetroCrtOsd & RetroShortcutModal rendered
// -------------------------------------------------------------
runCheck('LandingPage: RetroCrtOsd component imported and rendered', () => {
  assert(landingPageContent.includes("import RetroCrtOsd from '../components/RetroCrtOsd'"), 'Missing RetroCrtOsd import');
  assert(landingPageContent.includes('<RetroCrtOsd'), 'Missing <RetroCrtOsd render');
  assert(landingPageContent.includes('actionFeedback={actionFeedback}'), 'Missing actionFeedback prop on RetroCrtOsd');
});

runCheck('LandingPage: RetroShortcutModal component imported and rendered', () => {
  assert(landingPageContent.includes("import RetroShortcutModal from '../components/RetroShortcutModal'"), 'Missing RetroShortcutModal import');
  assert(landingPageContent.includes('<RetroShortcutModal'), 'Missing <RetroShortcutModal render');
  assert(landingPageContent.includes('isOpen={isShortcutModalOpen}'), 'Missing isOpen prop on RetroShortcutModal');
});

// -------------------------------------------------------------
// 6. Validate Auto-Hide UI Mechanism
// -------------------------------------------------------------
runCheck('LandingPage: 3-second auto-hide inactivity timer implemented', () => {
  assert(landingPageContent.includes('3000'), 'Missing 3000ms timer');
  assert(landingPageContent.includes('setIsUiVisible(false)'), 'Missing setIsUiVisible(false)');
  assert(landingPageContent.includes('setIsUiVisible(true)'), 'Missing setIsUiVisible(true)');
  assert(landingPageContent.includes('mousemove') && landingPageContent.includes('touchstart'), 'Missing user activity event listeners');
});

console.log('=============================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASS: ${passCount} | FAIL: ${failCount}`);
console.log('=============================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
