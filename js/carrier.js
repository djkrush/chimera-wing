'use strict';
// The space carrier. Like 1942, every leg starts with a takeoff from its deck and ends with a landing
// on it. Vertical stages show it top-down (bow up); side missions show its side profile (bow right).
// Its hull is pre-rendered with SNES shading (carrierArt); lights and engine glow are drawn live.

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
  // The hull is pre-rendered once with SNES shading (plated panels lit from the top-left, a dark
  // outline); running lights, the beacon and engine glow are drawn live on top.
  carrierArt() {
    if (this.carrierImg) return this.carrierImg;
    const hull = SNES.ramp('#8090a8'), deck = SNES.ramp('#384048'), isl = SNES.ramp('#a8b0c0');
    const glass = SNES.ramp('#40a0e0'), red = SNES.ramp('#d83028'), stripe = SNES.ramp('#2848a0');
    const P = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // A shaded box: lit top and left edges, dark bottom and right.
    const block = (g, r, x, y, w, h) => {
      P(g, r[2], x, y, w, h); P(g, r[4], x, y, w, 1); P(g, r[3], x, y + 1, 1, h - 1);
      P(g, r[1], x + w - 1, y + 1, 1, h - 1); P(g, r[0], x, y + h - 1, w, 1);
    };

    // Top-down, bow up: 44 x 124 hull centered at (24, 64) on a 48 x 134 canvas.
    const top = SNES.layer(48, 134, g => {
      const cx = 24, cy = 64;
      for (let dy = -62; dy <= 62; dy++) {
        const hw = dy < -40 ? Math.round(6 + (dy + 62) * 0.72) : 22;
        for (let dx = -hw; dx <= hw; dx++) {
          let i = dx <= -hw + 1 ? 4 : dx >= hw - 1 ? 1 : ((dx + 40) >> 3) % 2 ? 2 : 3;   // plating strips
          if ((dy + 62) % 14 === 0) i = 1;                                          // panel seams
          P(g, hull[i], cx + dx, cy + dy);
        }
      }
      for (let dy = -50; dy < 60; dy++) for (let dx = -8; dx <= 8; dx++) {         // runway
        P(g, deck[(dx * 7 + dy * 3) % 5 === 0 ? 2 : 1], cx + dx, cy + dy);
      }
      P(g, '#c8a830', cx - 8, cy - 50, 1, 110); P(g, '#c8a830', cx + 8, cy - 50, 1, 110);   // edge lines
      for (let dy = -44; dy < 44; dy += 10) P(g, '#e8e8f0', cx, cy + dy, 1, 5);             // center line
      for (let k = 0; k < 4; k++) P(g, '#e8e8f0', cx - 6 + k * 4, cy + 50, 2, 8);           // threshold bars
      P(g, '#e8e8f0', cx - 3, cy - 48, 7, 1); P(g, '#e8e8f0', cx - 2, cy - 47, 5, 1);       // bow chevron
      for (const ey of [-8, 22]) {                                                          // elevators
        P(g, hull[0], cx - 20, cy + ey, 10, 1); P(g, hull[0], cx - 20, cy + ey + 9, 10, 1);
        P(g, hull[0], cx - 20, cy + ey, 1, 10); P(g, hull[4], cx - 11, cy + ey, 1, 10);
      }
      block(g, isl, cx + 13, cy - 14, 8, 28);                                               // island
      for (let dy = -10; dy < 12; dy += 5) { P(g, glass[3], cx + 15, cy + dy, 4, 1); P(g, glass[1], cx + 15, cy + dy + 1, 4, 1); }
      P(g, red[3], cx - 20, cy - 30, 3, 3); P(g, red[1], cx - 18, cy - 28, 1, 1);           // hull markings
      P(g, red[3], cx + 17, cy + 26, 3, 3);
      for (const ex of [-14, -1, 12]) {                                                     // engine nozzles
        P(g, hull[1], cx + ex - 1, cy + 62, 5, 4); P(g, '#101418', cx + ex, cy + 63, 3, 3);
      }
      SNES.outline(g.canvas);
    });

    // Side profile, bow right: about 168 x 36, centered at (84, 30) on a 172 x 48 canvas.
    const side = SNES.layer(172, 48, g => {
      const cx = 85, cy = 30;
      for (let dx = -80; dx <= 80; dx++) {
        const bot = dx > 50 ? Math.round(cy + 12 - (dx - 50) * 0.5) : dx < -70 ? cy + 8 : cy + 12;
        for (let y = cy - 7; y <= bot; y++) {
          const t = (y - (cy - 7)) / Math.max(1, bot - (cy - 7));
          let i = y === cy - 7 ? 4 : t < 0.3 ? 3 : t < 0.75 ? 2 : 1;
          if ((dx + 80) % 16 === 0 && y > cy - 6) i = Math.max(0, i - 1);                  // panel seams
          if (y === bot) i = 0;
          P(g, hull[i], cx + dx, y);
        }
      }
      for (let dx = -76; dx < 52; dx++) { P(g, stripe[3], cx + dx, cy + 3); P(g, stripe[1], cx + dx, cy + 4); }
      for (let dx = -70; dx < 50; dx += 8) P(g, (dx / 8) % 3 ? '#f8e070' : '#605020', cx + dx, cy - 2, 2, 1);   // portholes
      block(g, deck, cx - 78, cy - 9, 158, 3);                                              // flight deck
      for (const fx of [-58, -40]) {                                                        // parked fighters
        P(g, '#c0c8d8', fx + cx, cy - 11, 7, 1); P(g, '#8890a0', fx + cx + 1, cy - 12, 3, 1); P(g, '#40a0e0', fx + cx + 4, cy - 12, 1, 1);
      }
      block(g, isl, cx + 10, cy - 22, 20, 13);                                              // island
      P(g, glass[3], cx + 12, cy - 19, 16, 1); P(g, glass[1], cx + 12, cy - 18, 16, 2);
      block(g, isl, cx + 18, cy - 28, 2, 6);                                                // mast
      P(g, isl[3], cx + 13, cy - 27, 4, 1); P(g, isl[1], cx + 14, cy - 26, 2, 1);           // radar dish
      P(g, red[3], cx + 56, cy - 4, 6, 3); P(g, red[1], cx + 56, cy - 2, 6, 1);             // bow marking
      SNES.outline(g.canvas);
    });

    // Galaxy map icon.
    const icon = SNES.layer(18, 9, g => {
      block(g, hull, 2, 3, 14, 3); block(g, isl, 9, 1, 3, 2); P(g, deck[3], 2, 2, 14, 1);
      SNES.outline(g.canvas);
    });
    return (this.carrierImg = { top, side, icon });
  },

  // Engine exhaust, blended additively.
  carrierJets(ctx, pts) {
    const r = 3 + ((this.t >> 2) & 1);
    SNES.add(ctx, () => {
      for (const [x, y] of pts) { NES.draw(ctx, SNES.glow(r + 3, '#1840a0'), x, y); NES.draw(ctx, SNES.glow(r, '#60c8f8'), x, y); }
    });
  },

  // Top-down, bow pointing up. About 44 x 124 pixels, centered on (x, y).
  drawCarrierTop(ctx, x, y) {
    x = Math.round(x); y = Math.round(y);
    ctx.drawImage(this.carrierArt().top, x - 24, y - 64);
    const blink = (this.t >> 3) & 1;
    for (let dy = -48; dy < 58; dy += 8) {                                  // runway edge lights
      ctx.fillStyle = ((dy >> 3) + (this.t >> 2)) % 4 === 0 ? C.white : blink ? C.yellow : C.olive;
      ctx.fillRect(x - 10, y + dy, 1, 1); ctx.fillRect(x + 10, y + dy, 1, 1);
    }
    this.carrierJets(ctx, [-13, 0, 13].map(ex => [x + ex, y + 67]));
  },

  // Side profile, bow pointing right. About 168 x 36 pixels, centered on (x, y).
  drawCarrierSide(ctx, x, y, engines) {
    x = Math.round(x); y = Math.round(y);
    ctx.drawImage(this.carrierArt().side, x - 85, y - 30);
    ctx.fillStyle = (this.t >> 3) & 1 ? C.red : C.darkred; ctx.fillRect(x + 18, y - 29, 2, 1);   // mast beacon
    if (engines) this.carrierJets(ctx, [[x - 83, y - 3], [x - 83, y + 4]]);
  },

  // Tiny carrier for the galaxy map.
  drawCarrierIcon(ctx, x, y) {
    x = Math.round(x); y = Math.round(y);
    ctx.drawImage(this.carrierArt().icon, x - 9, y - 4);
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow((this.t >> 2) & 1 ? 3 : 2, '#3890f0'), x - 9, y + 1));
  },
});
