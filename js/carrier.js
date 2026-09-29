'use strict';
// The space carrier. Like 1942, every leg starts with a takeoff from its deck and ends with a landing
// on it. It is drawn to scale with the ship: the top view (bow up, vertical stages) nearly fills the
// screen's width and the side profile (bow right, side missions) is longer than the screen, so the
// camera follows the ship along the deck.
//
// Takeoff: the deck elevator lifts the ship out of the hangar, then the catapult throws it down the
// deck and the carrier falls away behind. Landing: the carrier overtakes from ahead, stern first, the
// ship touches down on the arresting wires, rolls out onto the elevator and is lowered into the hangar.
// Positions on the art: `d` is the ship's place along the deck (canvas y in the top view, canvas x
// in the side view).

const CAR = {
  tw: 360, th: 720, elevY: 420, touchY: 610,             // top view: canvas size, elevator, touchdown
  sw: 580, sh: 128, deck: 46, elevX: 300, touchX: 100,   // side view: canvas size, deck top, elevator, touchdown
};

Object.assign(Game, {
  // Where the ship sits on the deck, in screen space.
  deckSpot() {
    const K = this.carrier;
    return K.side ? [K.left + K.d, K.top + CAR.deck - 6] : [K.left + (CAR.tw >> 1), K.top + K.d];
  },

  // ---- Takeoff ------------------------------------------------------------------------
  startTakeoff() {
    const p = this.player, side = this.isSide;
    this.carrier = side
      ? { side, left: 110 - CAR.elevX, top: 116 - CAR.deck, d: CAR.elevX, lift: 0, v: 0, ship: true, sy: 0 }
      : { side, left: CX - (CAR.tw >> 1), top: 186 - CAR.elevY, d: CAR.elevY, lift: 0, v: 0, ship: true, sy: 186 };
    p.form = p.nextForm = 0; p.morphT = 0; p.hidden = true; p.invuln = 0;
    [p.x, p.y] = this.deckSpot();
    this.setState('takeoff');
    Sound.sfx('charge');
  },

  updateTakeoff() {
    this.stateT++;
    const T = this.stateT, K = this.carrier, p = this.player;
    if (T <= 50) K.lift = 1 - (1 - T / 50) ** 2;   // the elevator rises
    if (T < 70) { [p.x, p.y] = this.deckSpot(); return; }
    if (T === 70) { Sound.sfx('takeoff'); K.ship = false; p.hidden = false; }
    K.v = Math.min(11, K.v + 0.3);                  // the catapult, then the afterburner
    if (T < 90) this.steam();
    if (K.side) {
      K.d += K.v;
      K.left = 110 - K.d + Math.min(40, (T - 70) * 0.8);   // the ship pulls ahead of the camera, then drifts back
      p.x = K.left + K.d;
      if (K.d < CAR.sw - 10) p.y = K.top + CAR.deck - 6;
      else { p.y += (110 - p.y) * 0.06; K.top += 0.6; }     // off the bow: climb away, the carrier drops below
      p.x = Math.min(p.x, 150);
      if (K.left + CAR.sw < -20) { this.carrier = null; this.beginPlay(); }
    } else {
      K.d -= K.v;
      K.sy += (PY - K.sy) * 0.05;                    // the ship settles back to its flying row
      K.top = K.sy - K.d;
      [p.x, p.y] = [K.left + (CAR.tw >> 1), K.sy];
      if (K.top > H + 20) { this.carrier = null; this.beginPlay(); }
    }
  },

  // Catapult steam: white puffs behind the ship.
  steam() {
    const p = this.player, [bx, by] = this.orient(0, 12);
    this.parts.push({ x: p.x + bx + rand(-3, 3), y: p.y + by + rand(-2, 2), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4),
      life: 18, max: 18, cols: [C.gray, C.lgray, C.white], sz: 2 });
  },

  // ---- Landing ------------------------------------------------------------------------
  // The carrier comes in from ahead at speed v. At touchdown the arresting wires slow the ship to a
  // stop over the distance to the elevator.
  startLanding() {
    const p = this.player, side = this.isSide, v = 4, lead = 130;
    this.carrier = side
      ? { side, left: 120 - CAR.touchX + v * lead, top: 116 - CAR.deck, d: 0, v, lift: 1, ship: false, touched: false }
      : { side, left: CX - (CAR.tw >> 1), top: 150 - CAR.touchY - v * lead, d: 0, v, lift: 1, ship: false, touched: false };
    this.eBul = []; this.laser = null; this.wingT = 0;
    p.morphT = 0; p.invuln = 0; p.shieldT = 0;
    this.landedT = 0;
    this.setState('landing');
    Sound.sfx('charge');
  },

  updateLanding() {
    this.stateT++;
    const T = this.stateT, K = this.carrier, p = this.player;
    if (K.side) K.left -= K.v; else K.top += K.v;
    K.d = K.side ? 120 - K.left : 150 - K.top;
    if (this.landedT) {                             // stopped: the elevator lowers the ship
      K.lift = Math.max(0, K.lift - 1 / 50);
      if (T - this.landedT >= 80) { this.carrier = null; this.afterLanding(); }
      return;
    }
    if (!K.touched) {
      // fly to the approach point, then hold it while the deck slides underneath
      const tx = K.side ? 120 : CX, ty = K.side ? K.top + CAR.deck - 6 : 150;
      const vx = tx - p.x, vy = ty - p.y, d = Math.hypot(vx, vy), sp = Math.min(2.2, d);
      if (d > 0.01) { p.x += vx / d * sp; p.y += vy / d * sp; }
      if (K.side ? K.d >= CAR.touchX : K.d <= CAR.touchY) {
        K.touched = true; K.ship = true; p.hidden = true; p.x = tx; p.y = ty;
        K.a = K.v * K.v / (2 * (K.side ? CAR.elevX - CAR.touchX : CAR.touchY - CAR.elevY));
        p.form = p.nextForm = 0;
        Sound.sfx('land');
        this.spark(p.x, p.y, C.yellow, 8);
      }
      return;
    }
    K.v = Math.max(0, K.v - K.a);
    if (K.v === 0) {
      this.landedT = T;
      this.player.silenced = [false, false, false];   // the deck crew demethylates everything
    }
  },

  drawCarrierText(ctx) {
    const center = { align: 'center', scale: 2, shadow: C.navy };
    if (this.state === 'takeoff') {
      if (this.stateT < 70) NES.text(ctx, 'READY', 128, 84, C.white, center);
      else if (this.stateT < 110) NES.text(ctx, 'LAUNCH!', 128, 84, C.gold, center);
    } else if (this.landedT) {
      NES.text(ctx, 'LANDED', 128, 84, C.lime, center);
    }
  },

  // ---- Art ----------------------------------------------------------------------------
  // Pre-rendered once with the shipyard painter (shipyard.js), with a flat silhouette for the drop
  // shadow it casts on the planet below. Running lights and engine glow are drawn live.
  carrierArt() {
    if (this.carrierImg) return this.carrierImg;
    const top = this.carrierTopArt(), side = this.carrierSideArt();
    const icon = SNES.layer(18, 9, g => g.drawImage(side, 0, 0, CAR.sw, CAR.sh, 0, 1, 18, 4));
    return (this.carrierImg = { top, side, icon, topShadow: this.silhouette(top), sideShadow: this.silhouette(side) });
  },

  silhouette(img) {
    return SNES.layer(img.width, img.height, g => {
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#000010'; g.fillRect(0, 0, img.width, img.height);
    });
  },

  // Top view, bow up: a central flight-deck hull between two armored outrigger hulls, joined by
  // struts, with the island on the starboard edge and engine clusters at the stern.
  carrierTopArt() {
    const { tw, th } = CAR, cx = tw >> 1, S = YARD.sheet(tw, th);
    const hull = S.mat('#8c98ac'), hullL = S.mat('#8c98ac', { base: 3 }), seam = S.mat('#8c98ac', { base: 1 });
    const dark = S.mat('#5c6478'), metal = S.mat('#b0b8c8'), deck = S.mat('#3c4250'), deckL = S.mat('#465060');
    const red = S.mat('#c03028'), blue = S.mat('#2c50b0'), noz = S.mat('#303440');
    const glass = S.mat('#58c0f8', { flat: true }), yel = S.mat('#e8c838', { flat: true }), white = S.mat('#e0e4ec', { flat: true });
    const black = S.mat('#101418', { flat: true }), lamp = S.mat('#f8e8a0', { flat: true });
    // left half, mirrored below
    S.poly([[cx + 1, 2], [150, 40], [128, 80], [116, 130], [112, 160], [112, 690], [122, 714], [cx + 1, 714]], hull, 2);   // main hull
    S.poly([[cx + 1, 4], [158, 38], [148, 64], [cx + 1, 64]], metal, 3);                                                // armored prow
    S.poly([[58, 118], [80, 150], [92, 200], [96, 660], [92, 714], [30, 714], [22, 660], [24, 200], [36, 150]], hull, 2);   // outrigger
    S.poly([[88, 226], [114, 246], [114, 312], [88, 298]], dark, 1);                                            // struts
    S.poly([[92, 496], [114, 516], [114, 584], [92, 570]], dark, 1);
    YARD.plates(S, 0, 60, cx, 650, hull, hullL, seam, 18, 12, 7);
    S.rect(64, 170, 12, 470, metal, 3);                                                                          // outrigger spine
    for (let y = 190; y < 630; y += 40) YARD.vent(S, 66, y, 8, 14, dark, black, 4);
    S.disc(58, 150, 6, metal, 3);                                                                                // sensor dome
    S.disc(56, 148, 2, glass);
    for (const y of [230, 330, 430, 530]) YARD.turret(S, 42, y, 6, metal, dark, 4, 0, 3, 13);                  // gun turrets
    YARD.greebles(S, 24, 200, 70, 440, hull, metal, 3, 90, 11, 5);
    YARD.greebles(S, 24, 200, 70, 440, hullL, hull, 3, 40, 12, 5);
    for (let y = 170; y < 680; y += 60) { S.disc(117, y, 3, metal, 3); S.px(117, y - 4, dark, 4); }            // point defense
    S.rect(30, 650, 58, 64, metal, 3);                                                                           // outrigger engines
    for (const x of [36, 60]) S.rect(x, 700, 22, 14, noz, 4);
    S.rect(124, 690, cx + 1 - 124, 26, metal, 3);                                                                    // main engines
    for (const x of [132, 156]) S.rect(x, 704, 18, 12, noz, 4);
    S.rect(112, 120, 10, 30, red); S.rect(24, 200, 4, 30, red);                                                 // hull markings
    S.rect(30, 640, 58, 3, blue);
    S.poly([[cx + 1, 68], [140, 80], [126, 112], [122, 150], [122, 698], [cx + 1, 698]], deck, 2);                      // flight deck
    YARD.plates(S, 122, 68, cx - 122, 630, deck, deckL, deck, 24, 16, 5);
    S.mirrorX(cx);
    S.rect(cx - 8, 704, 16, 12, noz, 4);

    // the island, on the starboard edge
    S.rect(244, 288, 40, 104, metal, 3);
    S.rect(250, 298, 28, 72, metal, 4);
    S.rect(255, 304, 18, 30, hullL, 5);
    S.rect(253, 296, 22, 2, glass);                    // bridge windows face the bow
    S.disc(264, 348, 6, metal, 6); S.rect(262, 346, 4, 4, dark);          // radar
    S.rect(262, 372, 3, 14, dark, 5);                                     // mast
    YARD.greebles(S, 244, 288, 40, 104, metal, hull, 4, 20, 21, 4);

    // deck markings (paint)
    for (let y = 92; y < 696; y++) { S.px(128, y, yel); S.px(tw - 129, y, yel); }
    for (let y = 80; y < 392; y++) S.px(cx - 1, y, black), S.px(cx, y, black);               // catapult track
    for (let y = 90; y < 392; y += 20) S.rect(cx - 2, y, 4, 2, white);
    for (let y = 460; y < 690; y += 16) S.rect(cx - 1, y, 2, 8, white);                        // centerline
    for (let x = 152; x < 208; x++) for (const y of [392, 393, 446, 447]) S.px(x, y, ((x >> 2) & 1) ? yel : black);   // elevator
    for (let y = 392; y < 448; y++) for (const x of [152, 153, 206, 207]) S.px(x, y, ((y >> 2) & 1) ? yel : black);
    for (const y of [592, 604, 616, 628]) { S.rect(136, y, tw - 272, 1, white); S.rect(134, y - 1, 3, 3, lamp); S.rect(tw - 137, y - 1, 3, 3, lamp); }
    for (let k = 0; k < 8; k++) S.rect(136 + k * 12, 676, 6, 16, white);                       // threshold bars
    for (const y of [650, 660]) for (let k = 0; k < 6; k++) S.px(cx - 6 + k, y - Math.abs(k - 2.5) * 2, white);
    const img = S.bake({ shadow: 4 });
    const g = img.getContext('2d');
    SNES.half(g, () => NES.text(g, '07', cx, 500, '#d8dce8', { scale: 3, align: 'center' }), 0.5);   // deck number
    return img;
  },

  // Side profile, bow right: the long hull with its hangar bays, the flight deck on top, the island
  // amidships, the keel below and the engine block at the stern.
  carrierSideArt() {
    const { sw, sh, deck: dy } = CAR, S = YARD.sheet(sw, sh);
    const hull = S.mat('#8c98ac'), hullL = S.mat('#8c98ac', { base: 3 }), seam = S.mat('#8c98ac', { base: 1 });
    const dark = S.mat('#5c6478'), metal = S.mat('#b0b8c8'), deckM = S.mat('#3c4250'), red = S.mat('#c03028'), blue = S.mat('#2c50b0');
    const noz = S.mat('#303440'), glass = S.mat('#58c0f8', { flat: true }), glassD = S.mat('#2868b0', { flat: true });
    const black = S.mat('#101418', { flat: true }), lamp = S.mat('#f8e070', { flat: true }), lampD = S.mat('#806020', { flat: true });
    S.poly([[8, dy + 6], [470, dy + 6], [578, dy + 4], [560, dy + 26], [500, dy + 58], [22, dy + 58], [8, dy + 50]], hull, 2);   // hull
    S.poly([[80, dy + 58], [420, dy + 58], [404, dy + 72], [100, dy + 72]], dark, 1);                                          // keel
    for (const x of [140, 260, 380]) { S.ellipse(x, dy + 72, 9, 4, metal, 2); S.rect(x - 2, dy + 73, 4, 2, glass); }        // sensor pods
    YARD.plates(S, 8, dy + 6, 570, 52, hull, hullL, seam, 24, 13, 3);
    for (let x = 40; x < 500; x += 48) S.rect(x, dy + 6, 1, 52, seam);
    for (let x = 60; x < 440; x += 64) {                                                                  // hangar bays
      S.rect(x, dy + 13, 34, 13, dark, 3);
      S.rect(x + 2, dy + 15, 30, 9, black);
      for (let k = 4; k < 30; k += 6) S.px(x + 2 + k, dy + 22, lamp);
    }
    S.rect(20, dy + 38, 480, 3, blue);                                                                     // hull stripe
    S.rect(20, dy + 41, 480, 1, red);
    for (let x = 30; x < 470; x += 9) if (((x - 60) % 64 + 64) % 64 > 38) S.px(x, dy + 31, (x / 9) % 4 < 1 ? lampD : lamp);   // portholes
    S.rect(0, dy + 8, 30, 48, metal, 3);                                                                   // engine block
    for (const y of [dy + 12, dy + 26, dy + 40]) S.rect(0, y, 5, 10, noz, 4);
    YARD.greebles(S, 6, dy + 8, 24, 48, metal, dark, 4, 12, 5, 4);
    S.rect(12, dy, 566, 6, deckM, 3);                                                                      // flight deck
    S.poly([[470, dy], [579, dy], [579, dy + 4], [470, dy + 6]], deckM, 3);
    for (let x = 16; x < 576; x += 20) S.px(x, dy + 1, lamp);                                              // deck-edge lights
    // island amidships
    S.rect(330, dy - 18, 84, 18, metal, 4);
    S.rect(342, dy - 30, 60, 12, metal, 5);
    S.rect(344, dy - 27, 56, 3, glass); S.rect(344, dy - 24, 56, 1, glassD);
    S.rect(356, dy - 38, 32, 8, metal, 6);
    S.rect(370, dy - 46, 3, 8, dark, 6);                                                                   // mast
    S.ellipse(362, dy - 40, 5, 2, hullL, 7);                                                               // radar dish
    for (let x = 334; x < 410; x += 8) S.rect(x, dy - 12, 4, 2, glassD);
    YARD.greebles(S, 330, dy - 18, 84, 18, metal, hull, 5, 12, 8, 4);
    for (const x of [40, 180, 540]) { S.ellipse(x, dy - 2, 4, 3, metal, 4); S.rect(x - 8, dy - 3, 6, 1, dark, 5); }   // point defense
    const img = S.bake({ shadow: 3 });
    const g = img.getContext('2d');
    NES.text(g, '07', 520, dy + 14, '#e8ecf4', { scale: 2 });                                               // hull number
    return img;
  },

  // ---- Drawing ------------------------------------------------------------------------
  drawCarrier(ctx) {
    const K = this.carrier;
    if (K.side) this.drawCarrierSide(ctx, K.left, K.top, true);
    else this.drawCarrierTop(ctx, K.left, K.top);
    if (K.ship) this.drawDeckShip(ctx);
  },

  // Engine exhaust, blended additively.
  carrierJets(ctx, pts, s = 1) {
    const r = Math.max(1, Math.round((4 + ((this.t >> 2) & 1)) * s));
    SNES.add(ctx, () => {
      for (const [x, y] of pts) { NES.draw(ctx, SNES.glow(r + 3, '#1840a0'), x, y); NES.draw(ctx, SNES.glow(r, '#60c8f8'), x, y); }
    });
  },

  // Top view with its top-left corner at (x, y). Its shadow falls on the planet below.
  drawCarrierTop(ctx, x, y) {
    const A = this.carrierArt(), cx = CAR.tw >> 1;
    x = Math.round(x); y = Math.round(y);
    if (y > H || y + CAR.th < 0) return;
    SNES.half(ctx, () => ctx.drawImage(A.topShadow, x + 26, y + 40), 0.35);
    ctx.drawImage(A.top, x, y);
    const chase = this.t >> 1;
    for (let dy = 96; dy < 696; dy += 24) {                              // runway edge lights run toward the bow
      const on = ((dy >> 3) + chase) % 12 < 2;
      ctx.fillStyle = on ? C.white : C.olive;
      ctx.fillRect(x + 126, y + dy, 1, 1); ctx.fillRect(x + CAR.tw - 127, y + dy, 1, 1);
    }
    const K = this.carrier;
    if (K && K.lift < 1) {                                              // the elevator well
      SNES.half(ctx, () => { ctx.fillStyle = '#000010'; ctx.fillRect(x + cx - 26, y + CAR.elevY - 26, 52, 52); }, (1 - K.lift) * 0.85);
    }
    if ((this.t >> 4) & 1) { ctx.fillStyle = C.red; ctx.fillRect(x + 263, y + 373, 1, 1); }          // mast beacon
    this.carrierJets(ctx, [47, 71, 141, 165, cx, 195, 219, 289, 313].map(ex => [x + ex, y + 718]));
  },

  // Side profile with its top-left corner at (x, y), scaled by s (cutscenes show it smaller).
  drawCarrierSide(ctx, x, y, engines, s = 1) {
    const A = this.carrierArt();
    x = Math.round(x); y = Math.round(y);
    if (s === 1) ctx.drawImage(A.side, x, y);
    else ctx.drawImage(A.side, x, y, Math.round(CAR.sw * s), Math.round(CAR.sh * s));
    if ((this.t >> 4) & 1) { ctx.fillStyle = C.red; ctx.fillRect(x + Math.round(371 * s), y + Math.round((CAR.deck - 46) * s), 1, 1); }
    if (engines) this.carrierJets(ctx, [12, 26, 40].map(ey => [x - 1, y + Math.round((CAR.deck + ey + 5) * s)]), s);
  },

  // The ship on the deck: rising on (or sinking with) the elevator, it is smaller and darker below
  // deck level. In the side view the deck hides whatever is below it.
  drawDeckShip(ctx) {
    const K = this.carrier, p = this.player, k = K.lift, s = 0.7 + 0.3 * k;
    const img = SPR.hulls[this.camp ? this.camp.hull : 0][K.side ? 'side' : 'top'].normal[0];
    ctx.save();
    if (K.side) {
      const deckY = Math.round(K.top + CAR.deck);
      ctx.beginPath(); ctx.rect(0, 0, W, deckY); ctx.clip();
      NES.draw(ctx, img, p.x, p.y + (1 - k) * 12);
    } else {
      if (k < 1) ctx.filter = 'brightness(' + (0.35 + 0.65 * k).toFixed(2) + ')';
      SNES.drawRot(ctx, img, p.x, p.y, 0, s);
    }
    ctx.restore();
  },

  // Tiny carrier for the galaxy map.
  drawCarrierIcon(ctx, x, y) {
    x = Math.round(x); y = Math.round(y);
    ctx.drawImage(this.carrierArt().icon, x - 9, y - 4);
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow((this.t >> 2) & 1 ? 3 : 2, '#3890f0'), x - 9, y + 1));
  },
});
