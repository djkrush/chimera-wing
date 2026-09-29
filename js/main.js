'use strict';
// Boot + fixed 60 Hz game loop.
(() => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // Scale the 256x240 screen by whole numbers for crisp pixels.
  function resize() {
    const fit = Math.min(window.innerWidth / NES.W, window.innerHeight / NES.H);
    const s = fit >= 1 ? Math.floor(fit) : fit;
    canvas.style.width = NES.W * s + 'px';
    canvas.style.height = NES.H * s + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  for (const ev of ['keydown', 'mousedown', 'touchstart']) window.addEventListener(ev, () => Sound.unlock());
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
  // Dev shortcut: index.html?stage=5 jumps straight into a stage.
  const q = new URLSearchParams(location.search);
  if (q.has('stage')) Game.startGame(Math.max(1, parseInt(q.get('stage'), 10) || 1));

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
