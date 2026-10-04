const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup() {
  const tones = [], voices = [], fallback = [], notices = [];
  let tick;
  const box = vm.createContext({
    window: { speechSynthesis: { speaking: false, speak(msg) { voices.push(msg); } } },
    document: { addEventListener() {}, getElementById() { return null; } },
    Audio: class { constructor(src) { this.src = src; this.plays = 0; fallback.push(this); } play() { this.plays++; return Promise.resolve(); } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    setInterval(fn) { tick = fn; }, setTimeout(fn) { fn(); }, Date
  });
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), box);
  // Substitute rendering only: these tests exercise the actual timer/audio logic.
  box.notices = notices;
  vm.runInContext('renderTimers = () => {}; audioNotice = message => notices.push(message)', box);
  return { run: code => vm.runInContext(code, box), tones, voices, fallback, notices, tick };
}

test('changes and endings use the original beep once at full volume', () => {
  const s = setup(); s.run('playSound(); playSound("finish")');
  assert.equal(s.fallback[0].src, 'sounds/beep.mp3');
  assert.equal(s.fallback[0].volume, 1);
  assert.equal(s.fallback[0].plays, 1);
  assert.equal(s.fallback[1].src, 'sounds/beep.mp3');
  assert.equal(s.fallback[1].volume, 1);
  assert.equal(s.fallback[1].plays, 1);
  assert.equal(s.fallback[1].onended, undefined);
});
test('simultaneous identical signals are merged', () => {
  const s = setup(); s.run('playSound("finish"); playSound("finish")');
  assert.equal(s.fallback.length, 1);
});
test('normal, plank and circuit timers finish once and stop', () => {
  for (const code of [
    'createTimer(1,"exercise","1 SEG");',
    'createPlankWorkout(1,1,1); timers[0].phase="rest";',
    'createGymCircuit(); timers[0].exerciseRemaining=1;'
  ]) {
    const s = setup(); s.run(code); s.tick(); s.tick();
    assert.equal(s.fallback.length, 1);
    assert.equal(s.fallback[0].plays, 1);
    assert.equal(s.run('timers[0].finished && !timers[0].running'), true);
  }
});
test('voices do not interrupt and busy countdowns are dropped', () => {
  const s = setup(); s.run('speak("Descanso"); speak("2"); speak("Plancha")');
  assert.deepEqual(s.voices.map(v => v.text), ['Descanso']);
  s.voices[0].onend();
  assert.deepEqual(s.voices.map(v => v.text), ['Descanso', 'Plancha']);
});
test('blocked audio shows a visible notice instead of an unhandled rejection', async () => {
  const s = setup(); s.run('Audio = class { play(){ return Promise.reject(new Error("blocked")) } }; playSound()');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.notices.length, 1);
});
