'use strict';
// The space carrier. Like 1942, every leg starts with a takeoff from its deck and ends with a landing
// on it. Vertical stages show it top-down (bow up); side missions show its side profile (bow right).
// It is drawn with rectangles, so it stays crisp at any size.

Object.assign(Game, {
  // Where the ship sits on the flight deck.
  deckSpot() {
    const K = this.carrier;
    return K.side ? [K.x - 40, K.y - 13] : [K.x, K.y + 34];
  },

  // ---- Takeoff ------------------------------------------------------------------------
  startTakeoff() {
    const p = this.player, side = this.isSide;
    this.carrier = side ? { side, x: 70, y: 150 } : { side, x: 128, y: 150 };
    p.form = p.nextForm = 0; p.morphT = 0; p.hidden = false; p.invuln = 0;
    [p.x, p.y] = this.deckSpot();
    this.setState('takeoff');
  },

  updateTakeoff() {
    this.stateT++;
    const T = this.stateT, K = this.carrier, p = this.player;
    if (T < 40) { [p.x, p.y] = this.deckSpot(); return; }
    const k = T - 40;
    if (k === 0) Sound.sfx('takeoff');
    if (K.side) {
      K.x -= k * 0.06; K.y += 0.4;
      if (k <= 50) { p.x = K.x - 40 + k * 0.1 + 0.05 * k * k; p.y = K.y - 13 - Math.max(0, k - 25) * 0.6; }
      else { p.x += (70 - p.x) * 0.05; p.y += (110 - p.y) * 0.05; }
    } else {
      K.y += k * 0.04;
      if (k <= 50) p.y = K.y + 34 - 0.035 * k * k;
      else p.y += (176 - p.y) * 0.06;
    }
    if (k >= 100) { this.carrier = null; this.beginPlay(); }
  },

  // ---- Landing ------------------------------------------------------------------------
  startLanding() {
    const p = this.player, side = this.isSide;
    this.carrier = side ? { side, x: -100, y: 150, tx: 90 } : { side, x: 128, y: -80, ty: 124 };
    this.eBul = []; this.laser = null; this.wingT = 0;
    p.morphT = 0; p.invuln = 0; p.shieldT = 0;
    this.landedT = 0;
    this.setState('landing');
    Sound.sfx('charge');
  },

  updateLanding() {
    this.stateT++;
    const T = this.stateT, K = this.carrier, p = this.player;
    if (K.side) K.x = Math.min(K.tx, K.x + 2); else K.y = Math.min(K.ty, K.y + 2);
    const there = K.side ? K.x >= K.tx : K.y >= K.ty;
    const [dx, dy] = this.deckSpot();
    if (this.landedT) {
      p.x = dx; p.y = dy;
      if (T - this.landedT >= 70) { this.carrier = null; this.afterLanding(); }
      return;
    }
    if (T < 30) return;
    const vx = dx - p.x, vy = dy - p.y, d = Math.hypot(vx, vy);
    const sp = Math.min(2.2, d);
    if (d > 0.01) { p.x += vx / d * sp; p.y += vy / d * sp; }
    if ((there && d < 1) || T > 400) {
      this.landedT = T;
      p.form = p.nextForm = 0;
      Sound.sfx('land');
      this.player.silenced = [false, false, false];   // the deck crew demethylates everything
    }
  },

  drawCarrier(ctx) {
    const K = this.carrier;
    if (K.side) this.drawCarrierSide(ctx, K.x, K.y, true);
    else this.drawCarrierTop(ctx, K.x, K.y);
  },

  drawCarrierText(ctx) {
    const center = { align: 'center', scale: 2, shadow: C.navy };
    if (this.state === 'takeoff') {
      if (this.stateT < 40) NES.text(ctx, 'READY', 128, 84, C.white, center);
      else if (this.stateT < 80) NES.text(ctx, 'LAUNCH!', 128, 84, C.gold, center);
    } else if (this.landedT) {
      NES.text(ctx, 'LANDED', 128, 84, C.lime, center);
    }
  },

  // ---- Drawing ------------------------------------------------------------------------
  // Top-down, bow pointing up. About 44 x 124 pixels, centered on (x, y).
  drawCarrierTop(ctx, x, y) {
    x = Math.round(x); y = Math.round(y);
    for (let dy = -62; dy <= 62; dy++) {
      const hw = dy < -40 ? Math.round(6 + (dy + 62) * 0.72) : 22;
      ctx.fillStyle = C.lgray; ctx.fillRect(x - hw, y + dy, hw * 2 + 1, 1);
      ctx.fillStyle = C.gray; ctx.fillRect(x - hw + 1, y + dy, hw * 2 - 1, 1);
    }
    ctx.fillStyle = C.black; ctx.fillRect(x - 8, y - 50, 17, 110);        // runway
    ctx.fillStyle = C.white;
    for (let dy = -46; dy < 56; dy += 10) ctx.fillRect(x, y + dy, 1, 5);   // center line
    const blink = (this.t >> 3) & 1;
    for (let dy = -48; dy < 58; dy += 8) {                                  // edge lights
      ctx.fillStyle = ((dy >> 3) + (this.t >> 2)) % 4 === 0 ? C.white : blink ? C.yellow : C.olive;
      ctx.fillRect(x - 10, y + dy, 1, 1); ctx.fillRect(x + 10, y + dy, 1, 1);
    }
    ctx.fillStyle = C.lgray; ctx.fillRect(x + 13, y - 14, 8, 28);          // island
    ctx.fillStyle = C.sky;
    for (let dy = -10; dy < 12; dy += 5) ctx.fillRect(x + 15, y + dy, 4, 2);
    ctx.fillStyle = C.red; ctx.fillRect(x - 20, y - 30, 3, 3);              // hull markings
    ctx.fillRect(x + 17, y + 26, 3, 3);
    ctx.fillStyle = (this.t >> 1) & 1 ? C.sky : C.blue;                    // engines
    for (const ex of [-14, -1, 12]) ctx.fillRect(x + ex, y + 63, 3, 2 + ((this.t >> 2) & 1));
  },

  // Side profile, bow pointing right. About 168 x 36 pixels, centered on (x, y).
  drawCarrierSide(ctx, x, y, engines) {
    x = Math.round(x); y = Math.round(y);
    for (let dx = -80; dx <= 80; dx++) {
      const bot = dx > 50 ? Math.round(y + 12 - (dx - 50) * 0.5) : dx < -70 ? y + 8 : y + 12;
      ctx.fillStyle = C.gray; ctx.fillRect(x + dx, y - 7, 1, bot - y + 7);
      ctx.fillStyle = C.lgray; ctx.fillRect(x + dx, bot, 1, 1);
    }
    ctx.fillStyle = C.lgray; ctx.fillRect(x - 78, y - 9, 158, 2);           // flight deck
    ctx.fillStyle = C.navy; ctx.fillRect(x - 76, y + 3, 128, 2);            // hull stripe
    ctx.fillStyle = C.yellow;
    for (let dx = -70; dx < 50; dx += 8) ctx.fillRect(x + dx, y - 2, 2, 1); // portholes
    ctx.fillStyle = C.lgray; ctx.fillRect(x + 10, y - 22, 20, 13);          // island
    ctx.fillStyle = C.gray; ctx.fillRect(x + 18, y - 28, 2, 6);             // mast
    ctx.fillStyle = C.sky; ctx.fillRect(x + 12, y - 19, 16, 3);
    ctx.fillStyle = (this.t >> 3) & 1 ? C.red : C.darkred; ctx.fillRect(x + 18, y - 29, 2, 1);
    ctx.fillStyle = C.red; ctx.fillRect(x + 56, y - 4, 6, 3);               // bow marking
    if (engines) {
      ctx.fillStyle = (this.t >> 1) & 1 ? C.sky : C.blue;
      const len = 3 + ((this.t >> 2) & 1) * 2;
      ctx.fillRect(x - 80 - len, y - 4, len, 3);
      ctx.fillRect(x - 80 - len, y + 3, len, 3);
    }
  },

  // Tiny carrier for the galaxy map.
  drawCarrierIcon(ctx, x, y) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = C.lgray; ctx.fillRect(x - 6, y - 1, 13, 2);
    ctx.fillStyle = C.gray; ctx.fillRect(x - 5, y + 1, 11, 2);
    ctx.fillStyle = C.lgray; ctx.fillRect(x, y - 3, 3, 2);
    ctx.fillStyle = (this.t >> 2) & 1 ? C.sky : C.blue; ctx.fillRect(x - 8, y, 2, 2);
  },
});
