'use strict';
// Boot + fixed 60 Hz game loop.
(() => {
  const canvas = document.getElementById('screen');
  canvas.width = NES.W; canvas.height = NES.H;   // set before getContext: resizing resets its state
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // Scale the 424x240 screen by whole numbers for crisp pixels. On a phone, fill the screen instead:
  // every pixel counts there, and the touch buttons sit over the edges.
  function resize() {
    const fit = Math.min(window.innerWidth / NES.W, window.innerHeight / NES.H);
    const s = fit >= 1 && !Touch.on ? Math.floor(fit) : fit;
    canvas.style.width = NES.W * s + 'px';
    canvas.style.height = NES.H * s + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  for (const ev of ['keydown', 'mousedown', 'touchstart']) window.addEventListener(ev, () => Sound.unlock());
  // Mouse clicks pick things on the maps and menus, like taps (touch.js handles real touches).
  canvas.addEventListener('click', e => { if (!Touch.on) Touch.tapAt(e.clientX, e.clientY); });
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyM') {
      Sound.toggleMute();
      Game.toast(Sound.muted ? 'SOUND OFF' : 'SOUND ON');
    }
    if (e.code === 'KeyF') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    }
  });
  window.addEventListener('gamepadconnected', () => Game.toast('CONTROLLER CONNECTED'));
  window.addEventListener('gamepaddisconnected', () => Game.toast('CONTROLLER DISCONNECTED'));

  Game.init();
  // Dev shortcut: index.html?stage=N jumps into a mission leg (see testLeg in campaign.js).
  const q = new URLSearchParams(location.search);
  if (q.has('stage')) Game.testLeg(Math.max(1, parseInt(q.get('stage'), 10) || 1), q);

  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= STEP) {
      Input.update();
      Game.update();
      acc -= STEP;
    }
    Game.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
