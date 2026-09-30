'use strict';
// Keyboard + USB gamepad input, merged into abstract actions.
// Uses the browser Gamepad API: works with Xbox/PlayStation pads and generic USB (SNES/NES-style) pads.
const Input = (() => {
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'fire', KeyZ: 'fire', KeyJ: 'fire',
    KeyX: 'transform', KeyK: 'transform',
    KeyC: 'special', KeyL: 'special',
    KeyQ: 'prevForm', ShiftLeft: 'prevForm', ShiftRight: 'prevForm',
    Enter: 'start', KeyP: 'start', Escape: 'back',
    Digit1: 'form1', Digit2: 'form2', Digit3: 'form3',
  };
  // Button indices. "standard" = browser-recognized layout (Xbox/PS style):
  // 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 D-pad.
  // Select (8) changes form, so NES-style pads (d-pad, A, B, Select, Start) have every action.
  // Start (9) opens the game menu. "back" is keyboard-only (Esc).
  const DEFAULT_STANDARD = { fire: [0], special: [1], transform: [2, 3, 5, 7, 8], prevForm: [4, 6], start: [9] };
  const DEFAULT_GENERIC = { fire: [0], special: [1], transform: [2, 3, 5, 8], prevForm: [4], start: [9] };
  const STORAGE_KEY = 'chimera.padmap';
  const DEADZONE = 0.4;

  const keys = new Set();
  const virt = {};          // on-screen touch controls (touch.js): action -> held
  let pulses = new Set();   // one-frame presses (a tap on the screen)
  let keysNow = new Set(), keysPrev = new Set();
  let cur = {}, prev = {};
  let mappings = {};
  try { mappings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { mappings = {}; }

  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  function pads() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(list || []).filter(p => p && p.connected);
  }
  function mapFor(pad) {
    return mappings[pad.id] || (pad.mapping === 'standard' ? DEFAULT_STANDARD : DEFAULT_GENERIC);
  }
  const btn = (pad, i) => { const b = pad.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };

  function readPad(pad, s) {
    const m = mapFor(pad);
    for (const a of ['fire', 'special', 'transform', 'prevForm', 'start', 'back']) {
      if ((m[a] || []).some(i => btn(pad, i))) s[a] = true;
    }
    if (pad.mapping === 'standard') {
      if (btn(pad, 12)) s.up = true;
      if (btn(pad, 13)) s.down = true;
      if (btn(pad, 14)) s.left = true;
      if (btn(pad, 15)) s.right = true;
    }
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (ax < -DEADZONE) s.left = true;
    if (ax > DEADZONE) s.right = true;
    if (ay < -DEADZONE) s.up = true;
    if (ay > DEADZONE) s.down = true;
    // Many generic USB pads report their D-pad as a "hat switch" on axis 9:
    // -1 = up, stepping by 2/7 clockwise, anything > 1 = centered.
    const hat = pad.axes[9];
    if (pad.mapping !== 'standard' && hat !== undefined && hat >= -1.05 && hat <= 1.05) {
      const dir = Math.round((hat + 1) / (2 / 7));   // 0 up, 1 up-right ... 7 up-left
      if (dir === 7 || dir === 0 || dir === 1) s.up = true;
      if (dir >= 1 && dir <= 3) s.right = true;
      if (dir >= 3 && dir <= 5) s.down = true;
      if (dir >= 5 && dir <= 7) s.left = true;
    }
  }

  function update() {
    prev = cur;
    cur = {};
    for (const k of keys) { const a = KEYMAP[k]; if (a) cur[a] = true; }
    for (const p of pads()) readPad(p, cur);
    for (const a in virt) if (virt[a]) cur[a] = true;
    for (const a of pulses) cur[a] = true;
    pulses = new Set();
    keysPrev = keysNow;
    keysNow = new Set(keys);
  }

  return {
    update,
    pressed: a => !!cur[a],
    just: a => !!cur[a] && !prev[a],
    keyJust: code => keysNow.has(code) && !keysPrev.has(code),
    setVirtual(a, on) { virt[a] = on; },
    clearVirtual() { for (const a in virt) virt[a] = false; },
    pulse(a) { pulses.add(a); },
    pads,
    // Indices of currently held buttons on the first connected pad (for remapping).
    rawButtons() {
      const p = pads()[0];
      if (!p) return [];
      const out = [];
      p.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) out.push(i); });
      return out;
    },
    saveMapping(id, m) {
      mappings[id] = m;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings)); } catch (e) { /* storage unavailable */ }
    },
    resetMapping(id) {
      delete mappings[id];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings)); } catch (e) { /* storage unavailable */ }
    },
    padName() {
      const p = pads()[0];
      if (!p) return null;
      return p.id.replace(/\s*\(.*$/, '').trim() || 'GAMEPAD';
    },
  };
})();
