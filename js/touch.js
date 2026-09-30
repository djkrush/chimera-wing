'use strict';
// Touch controls for phones and tablets. They switch on by themselves on Android phones (Samsung
// Internet included), on the first touch on any other touch screen, or with index.html?touch.
// In flight: a floating joystick on the left half of the screen (it appears where your thumb lands)
// and A (fire, hold for autofire), B (special) and X (transform) on the right, START at the top.
// In menus the joystick steps aside: tap a row, planet or card to pick it, tap it again to use it.
// Buttons feed Input as virtual actions (Input.setVirtual), so the game reads them like a pad.

const Touch = (() => {
  const ua = navigator.userAgent;
  const mobile = /Android|SamsungBrowser/i.test(ua);
  const T = { on: false, mobile };
  let root, stick, knob, stickId = null, sx = 0, sy = 0;
  const DIRS = ['left', 'right', 'up', 'down'];

  // States where the left thumb flies the ship; everywhere else a touch is a tap.
  const flying = () => !Game.paused && ['play', 'clear', 'takeoff', 'landing', 'result'].includes(Game.state);

  function el(cls, parent, text) {
    const d = document.createElement('div');
    d.className = cls;
    if (text) d.textContent = text;
    parent.appendChild(d);
    return d;
  }

  function button(label, act, cls) {
    const b = el('tbtn ' + cls, root, label);
    const set = on => { Input.setVirtual(act, on); b.classList.toggle('down', on); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or finished pointer */ } set(true); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => set(false));
  }

  function setDirs(dx, dy) {
    const dead = 12;
    Input.setVirtual('left', dx < -dead); Input.setVirtual('right', dx > dead);
    Input.setVirtual('up', dy < -dead); Input.setVirtual('down', dy > dead);
  }

  // A tap at window coordinates goes to the game in screen pixels (424 x 240).
  function tap(cx, cy) {
    const r = document.getElementById('screen').getBoundingClientRect();
    const x = (cx - r.left) / r.width * NES.W, y = (cy - r.top) / r.height * NES.H;
    if (x >= 0 && y >= 0 && x < NES.W && y < NES.H) Game.tap(Math.round(x), Math.round(y));
  }

  function goFullscreen() {
    if (!mobile || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => { /* the browser said no: play in the window */ });
  }

  function build() {
    root = el('touch', document.body);
    stick = el('tstick', root);
    knob = el('tknob', stick);
    root.addEventListener('pointerdown', e => {
      e.preventDefault();
      Sound.unlock();
      goFullscreen();
      if (flying() && e.clientX < innerWidth * 0.5 && stickId === null) {
        stickId = e.pointerId; sx = e.clientX; sy = e.clientY;
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or finished pointer */ }
        stick.style.left = sx + 'px'; stick.style.top = sy + 'px';
        stick.classList.add('show');
        knob.style.transform = 'translate(-50%, -50%)';
        return;
      }
      tap(e.clientX, e.clientY);
    });
    root.addEventListener('pointermove', e => {
      if (e.pointerId !== stickId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy, d = Math.hypot(dx, dy), k = d > 40 ? 40 / d : 1;
      knob.style.transform = 'translate(calc(-50% + ' + dx * k + 'px), calc(-50% + ' + dy * k + 'px))';
      setDirs(dx, dy);
    });
    const release = e => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      stick.classList.remove('show');
      for (const a of DIRS) Input.setVirtual(a, false);
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    button('A', 'fire', 'ta');
    button('B', 'special', 'tb');
    button('X', 'transform', 'tx');
    button('START', 'start', 'tstart');
    el('trotate', document.body, 'TURN YOUR PHONE SIDEWAYS');
  }

  T.tapAt = tap;

  T.enable = () => {
    if (T.on) return;
    T.on = true;
    build();
    document.body.classList.add('touchmode');
    window.dispatchEvent(new Event('resize'));
  };

  if (mobile || new URLSearchParams(location.search).has('touch')) window.addEventListener('DOMContentLoaded', T.enable);
  window.addEventListener('touchstart', () => T.enable(), { once: true, passive: true });
  window.addEventListener('blur', () => Input.clearVirtual());
  return T;
})();

Object.assign(Game, {
  // A tap or click on the screen at (x, y) in screen pixels. Menus pick what was tapped (a second tap
  // on the picked item uses it); anywhere else a tap is a press of A.
  tap(x, y) {
    const px = x - OX;   // in the centered 256-wide panel
    if (this.paused) {
      const i = Math.floor((y - 100) / 14), n = this.gameMenuItems().length;
      if (i < 0 || i >= n) return;
      if (i === this.gameMenuSel) this.gameMenuPick(); else { this.gameMenuSel = i; Sound.sfx('move'); }
      return;
    }
    switch (this.state) {
      case 'title': {
        const i = Math.floor((y - 142) / 12);
        if (this.stateT < 20 || i < 0 || i >= this.titleItems().length || px < 44 || px > 212) return;
        if (i === this.menu) this.titlePick(); else { this.menu = i; Sound.sfx('move'); }
        return;
      }
      case 'pilot': {
        const i = Math.floor((x - (CX - 205)) / 139);
        if (i < 0 || i >= PILOTS.length) return;
        if (i === this.pilotSel) this.pilotPick(); else { this.pilotSel = i; Sound.sfx('move'); }
        return;
      }
      case 'map': this.tapMap(x, y); return;
      case 'base': this.tapBase(px, y); return;
      case 'learn': this.tapLearn(px, y); return;
      case 'hangar': this.tapHangar(px, y); return;
      case 'howto': this.tapHowto(x, y); return;
      case 'setup': return;
      default: Input.pulse('fire');
    }
  },
});
