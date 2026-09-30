'use strict';
// Primary guns. Guns are parts: the pilot owns some (camp.guns), buys more at planet markets (gun:<id>
// entries in MARKET_POOL) and fits one to each form in the hangar (camp.fit[hull]; HULLS[h].guns is the
// hull's default fit). A hull's mounts limit what each form takes: a light mount takes light guns, a
// heavy mount takes either. Guns are written in vertical-stage terms (up = forward) through shoot(),
// which turns them to face right in side missions.
// Borrowed from the classics: Raiden's Vulcan, Gradius's Laser and Ripple Laser, R-Type's wave-like
// helix shots, U.N. Squadron's falling bombs, Gradius III's Energy Laser (charge shot), Thunder Force
// IV's Railgun (rear rail) and Axelay's Round Vulcan (swivel).
//   short = name on menus   cd = frames between shots   cap = most bullets of that form on screen at once
//   price, mount ('light' | 'heavy'), gal = first galaxy whose markets sell it, desc = two info lines,
//   lv = what LV2 to LV5 change. A gun levels up with the points it scores (GUN_LEVELS).

const GUNS = {
  twin: { name: 'TWIN CANNON', short: 'TWIN', cd: 9, cap: 5, price: 1200, mount: 'light', gal: 0,
    desc: ['FAST PAIRS OF BOLTS.', 'THE CHIMERA STANDARD.'], lv: ['FASTER BOLTS', 'THIRD STREAM', 'WIDER STREAMS', 'PIERCES ONE PLANE'] },
  spread: { name: '3-WAY SPREAD', short: 'SPREAD', cd: 15, cap: 10, price: 1500, mount: 'light', gal: 0,
    desc: ['THREE PELLETS IN A FAN.', 'COVERS A WIDE FRONT.'], lv: ['FASTER PELLETS', 'FIVE WAYS', 'BIGGER PELLETS', 'SEVEN WAYS'] },
  homing: { name: 'HOMING MISSILES', short: 'HOMING', cd: 26, cap: 5, price: 2800, mount: 'light', gal: 0,
    desc: ['MISSILES THAT HUNT THE', 'NEAREST TARGET.'], lv: ['TURNS FASTER', 'THREE MISSILES', 'TURNS FASTER STILL', 'FOUR MISSILES'] },
  laser: { name: 'PIERCING LASER', short: 'LASER', cd: 14, cap: 4, price: 3000, mount: 'heavy', gal: 0,
    desc: ['A BOLT THAT GOES THROUGH', 'THREE PLANES.'], lv: ['PIERCES 4 PLANES', 'PIERCES 5 PLANES', 'PIERCES 6 PLANES', 'PIERCES 7 PLANES'] },
  bomb: { name: 'BOMB SHOT', short: 'BOMB', cd: 24, cap: 3, price: 2600, mount: 'heavy', gal: 0,
    desc: ['BURSTS ON IMPACT. FALLS', 'ONTO GROUND TARGETS.'], lv: ['BIGGER BLAST', 'TWO BOMBS', 'BIGGER BLAST', 'THREE BOMBS'] },
  vulcan: { name: 'VULCAN', short: 'VULCAN', cd: 4, cap: 14, price: 1800, mount: 'light', gal: 0,
    desc: ['A RAPID MACHINE GUN. WEAK', 'ROUNDS, AND MANY OF THEM.'], lv: ['TIGHTER SPREAD', 'MORE ROUNDS', 'TIGHTER STILL', 'MORE ROUNDS STILL'] },
  wave: { name: 'HELIX WAVE', short: 'WAVE', cd: 12, cap: 8, price: 2400, mount: 'light', gal: 0,
    desc: ['TWO SHOTS TWISTING ROUND', 'EACH OTHER. WIDE HITS.'], lv: ['WIDER SWAY', 'FASTER SHOTS', 'THREE STRANDS', 'BIGGER ORBS'] },
  ripple: { name: 'RIPPLE LASER', short: 'RIPPLE', cd: 16, cap: 6, price: 3000, mount: 'light', gal: 0,
    desc: ['A RING THAT WIDENS AS IT', 'FLIES. PIERCES.'], lv: ['RING GROWS FASTER', 'WIDER RING', 'FASTER STILL', 'WIDEST RING'] },
  swivel: { name: 'SWIVEL VULCAN', short: 'SWIVEL', cd: 5, cap: 16, price: 4500, mount: 'light', gal: 1,
    desc: ['HOLD FIRE: GUNS SWING IN.', 'LET GO: THEY SPLAY OUT.'], lv: ['WIDER SWEEP', 'CENTER BARREL', 'FASTER SWING', 'HEAVIER ROUNDS'] },
  charge: { name: 'CHARGE SHOT', short: 'CHARGE', cd: 14, cap: 4, price: 6000, mount: 'heavy', gal: 1,
    desc: ['TAP FOR BOLTS. HOLD FIRE', 'TO CHARGE A BIG BALL.'], lv: ['CHARGES FASTER', 'BIGGER BALL', 'TAP FIRES A PAIR', 'FULL CHARGE BURSTS'] },
  rail: { name: 'REAR RAIL GUN', short: 'RAIL', cd: 22, cap: 4, price: 7500, mount: 'heavy', gal: 1,
    desc: ['FIRES BEHIND YOU. HITS', 'HARDER UP CLOSE.'], lv: ['FASTER RELOAD', 'PIERCES', 'TWIN RAILS', 'FORWARD RAIL TOO'] },
};
const GUN_IDS = Object.keys(GUNS);
const GUN_LEVELS = [0, 2000, 6000, 15000, 35000];   // XP for LV1 to LV5 (points scored with the gun)
const CHARGE_STEPS = [20, 50, 90];                  // frames of held fire per charge step: slower toward 3

Object.assign(Game, {
  // ---- Guns as parts ---------------------------------------------------------------------
  canMount(h, f, gun) { return HULLS[h].mounts[f] === 'heavy' || GUNS[gun].mount === 'light'; },
  // The gun on form f: the hangar's fit, or the hull's default if that isn't owned or doesn't fit.
  fittedGun(f) {
    const c = this.camp, h = c ? c.hull : 0, g = c && c.fit && c.fit[h] && c.fit[h][f];
    return g && GUNS[g] && c.guns.includes(g) && this.canMount(h, f, g) ? g : HULLS[h].guns[f];
  },
  gunXP(id) { return this.camp && this.camp.gunXP ? this.camp.gunXP[id] || 0 : 0; },
  gunLevel(id) {
    const x = this.gunXP(id);
    let n = 1;
    while (n < GUN_LEVELS.length && x >= GUN_LEVELS[n]) n++;
    return n;
  },
  // Points scored in a form train the gun fitted there. A new level works (and shows) at once.
  addGunXP(form, pts) {
    const c = this.camp;
    if (!c || !c.gunXP) return;
    const id = this.fittedGun(form), lv = this.gunLevel(id);
    c.gunXP[id] = (c.gunXP[id] || 0) + pts;
    const now = this.gunLevel(id);
    if (now > lv) { this.popup(this.player.x, this.player.y - 22, GUNS[id].short + ' LV' + now, C.aqua); Sound.sfx('levelup'); }
  },
  chargeStep(t, L) {
    const k = L >= 2 ? 0.7 : 1;
    let s = 0;
    while (s < 3 && t >= CHARGE_STEPS[s] * k) s++;
    return s;
  },

  // Every frame. Most guns fire while fire is held; the swivel vulcan's barrels swing with it, and the
  // charge shot charges while it's held and fires on release.
  triggerGun(canFire) {
    const p = this.player, gun = this.fittedGun(p.form), L = this.gunLevel(gun);
    const held = canFire && p.morphT === 0 && Input.pressed('fire');
    if (gun === 'swivel') p.swivel = clamp(p.swivel + (held ? 0.025 : -0.04) * (L >= 4 ? 1.6 : 1), 0, 1);
    if (gun !== 'charge') { p.charge = 0; if (held && p.fireCd <= 0) this.fireWeapon(); return; }
    if (!canFire || p.morphT > 0) { p.charge = 0; return; }   // a transform drops the charge
    if (held) {
      const s = this.chargeStep(p.charge, L), n = this.chargeStep(++p.charge, L);
      if (n > s) Sound.sfx(n === 1 ? 'charge' : 'move');
      return;
    }
    if (p.charge > 0 && p.fireCd <= 0) this.fireWeapon();
    p.charge = 0;
  },

  // Bullets of that form allowed on screen: guns that fire more per shot at higher levels get more room.
  gunCap(gun, L) {
    const G = GUNS[gun], n3 = L >= 5 ? 3 : L >= 3 ? 2 : 1;
    switch (gun) {
      case 'twin': return G.cap + (L >= 3 ? 3 : 0);
      case 'vulcan': return G.cap + (L >= 3 ? 6 : 0) + (L >= 5 ? 6 : 0);
      case 'homing': return (L >= 5 ? 4 : L >= 3 ? 3 : 2) * 2 + 1;
      case 'spread': return (L >= 5 ? 7 : L >= 3 ? 5 : 3) * 3 + 1;
      case 'bomb': return n3 * 3;
      case 'wave': return L >= 4 ? 12 : G.cap;
      case 'swivel': return G.cap + (L >= 3 ? 6 : 0);
      case 'rail': return 8;
    }
    return G.cap;
  },

  fireWeapon() {
    const p = this.player, f = p.form, gun = this.fittedGun(f), G = GUNS[gun], L = this.gunLevel(gun), hyper = this.hyperT > 0;
    const k = this.gunPower() * (hyper ? 1.5 : 1);
    let cd = gun === 'rail' && L >= 2 ? 16 : G.cd;
    if (this.pBul.filter(b => b.form === f).length >= this.gunCap(gun, L) * (hyper ? 2 : 1)) return;
    switch (gun) {
      case 'twin': {
        const vy = L >= 2 ? -7.5 : -6, ox = L >= 4 ? 5 : 3, pierce = () => (L >= 5 ? { pierce: 2, hit: [] } : {});
        for (const s of [-1, 1]) this.shoot(s * ox, -6, L >= 4 ? s * 0.4 : 0, vy, { kind: 'shot', dmg: k, form: f, ...pierce() });
        if (L >= 3) this.shoot(0, -8, 0, vy, { kind: 'shot', dmg: k, form: f, ...pierce() });
        this.shots += L >= 3 ? 3 : 2; Sound.sfx('shoot');
        break;
      }
      case 'spread': {
        const n = L >= 5 ? 7 : L >= 3 ? 5 : 3, sp = L >= 2 ? 6 : 5, big = L >= 4;
        for (let i = 0; i < n; i++) {
          const a = (i - (n - 1) / 2) * 0.22;
          this.shoot(0, -6, Math.sin(a) * sp, -Math.cos(a) * sp, { kind: 'spread', dmg: k * (big ? 1.25 : 1), form: f, big });
        }
        this.shots += n; Sound.sfx('spread');
        break;
      }
      case 'homing': {
        const n = L >= 5 ? 4 : L >= 3 ? 3 : 2, turn = L >= 4 ? 0.2 : L >= 2 ? 0.16 : 0.12;
        for (let i = 0; i < n; i++) {
          const s = (i / (n - 1)) * 2 - 1, hd = -Math.PI / 2 + s * 0.9;
          this.shoot(s * 6, -4, Math.cos(hd) * 1.2, Math.sin(hd) * 1.2, { hd, spd: 1.2, turn, kind: 'missile', dmg: 2 * k, form: f, life: 150, target: null });
        }
        this.shots += n; Sound.sfx('missile');
        break;
      }
      case 'laser':   // pierces three planes, one more per level
        this.shoot(0, -8, 0, -9, { kind: 'laser', dmg: 1.2 * k, form: f, pierce: 2 + L, hit: [] });
        this.shots++; Sound.sfx('spread');
        break;
      case 'bomb': {  // forward in vertical stages; in side missions it drops in an arc onto the ground
        const n = L >= 5 ? 3 : L >= 3 ? 2 : 1, blast = L >= 4 ? 34 : L >= 2 ? 28 : 22;
        for (let i = 0; i < n; i++) {
          const s = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
          const b = this.shoot(s * 6, -6, s * 0.8, this.isSide ? -3 : -3.2, { kind: 'bomb', dmg: 2 * k, form: f, life: 70, blast });
          if (this.isSide) { b.vy = 0.6 + s * 0.5; b.grav = true; b.life = 200; }
        }
        this.shots += n; Sound.sfx('missile');
        break;
      }
      case 'vulcan': {
        const a = rand(-1, 1) * (L >= 4 ? 0.025 : L >= 2 ? 0.045 : 0.07);
        this.shoot(randi(-2, 2), -6, Math.sin(a) * 7, -Math.cos(a) * 7, { kind: 'vulcan', dmg: 0.45 * k, form: f });
        this.shots++; if (this.t % 2) Sound.sfx('shoot');
        break;
      }
      case 'wave': {  // shots twisting round each other, like a double helix
        const n = L >= 4 ? 3 : 2, sway = L >= 2 ? 3.2 : 2.2, vy = L >= 3 ? -6 : -4.5, big = L >= 5;
        for (let i = 0; i < n; i++) this.shoot(0, -6, 0, vy, { kind: 'wave', dmg: 0.8 * k, form: f, ph: i / n * TAU, sway, big, rad: big ? 5 : 3 });
        this.shots += n; Sound.sfx('spread');
        break;
      }
      case 'ripple':  // a ring that widens as it flies
        this.shoot(0, -8, 0, -4, { kind: 'ripple', dmg: 1.1 * k, form: f, rad: 3, pierce: 2, hit: [], life: 70,
          grow: 0.3 + (L >= 2 ? 0.1 : 0) + (L >= 4 ? 0.1 : 0), maxR: 14 + (L >= 3 ? 4 : 0) + (L >= 5 ? 4 : 0) });
        this.shots++; Sound.sfx('spread');
        break;
      case 'swivel': {  // barrels splayed out to the sides, swinging in while fire is held
        const a = (1 - p.swivel) * (L >= 2 ? 2.2 : 1.4), heavy = L >= 5, angs = L >= 3 ? [-a, 0, a] : [-a, a];
        for (const q of angs) this.shoot(Math.sin(q) * 5, -Math.cos(q) * 5, Math.sin(q) * 5, -Math.cos(q) * 5, { kind: 'swivel', dmg: (heavy ? 0.7 : 0.5) * k, form: f, heavy });
        this.shots += angs.length; if (this.t % 2) Sound.sfx('shoot');
        break;
      }
      case 'charge': {  // a tap fires bolts; each charge step fires a bigger piercing ball
        const s = this.chargeStep(p.charge, L);
        if (!s) {
          for (const ox of L >= 4 ? [-3, 3] : [0]) this.shoot(ox, -6, 0, -6.5, { kind: 'shot', dmg: k, form: f });
          this.shots += L >= 4 ? 2 : 1; Sound.sfx('shoot');
          break;
        }
        this.shoot(0, -10, 0, -3, { kind: 'charge', step: s, dmg: [2.5, 4, 7][s - 1] * k, form: f,
          rad: [3, 5, 8][s - 1] + (L >= 3 ? 2 : 0), pierce: [3, 5, 9][s - 1], hit: [], burst: s === 3 && L >= 5 });
        this.shots++; Sound.sfx(s === 3 ? 'missile' : 'spread');
        cd = 18 + s * 6;
        break;
      }
      case 'rail': {  // a slug out of the back, strongest close in
        const rails = L >= 4 ? [-3, 3] : [0], pierce = L >= 3 ? 3 : 1;
        for (const ox of rails) this.shoot(ox, 8, 0, 10, { kind: 'rail', dmg: 3 * k, dmg0: 3 * k, form: f, pierce, hit: [] });
        if (L >= 5) this.shoot(0, -8, 0, -10, { kind: 'rail', dmg: 3 * k, dmg0: 3 * k, form: f, pierce, hit: [] });
        this.shots += rails.length + (L >= 5 ? 1 : 0); Sound.sfx('charge');
        break;
      }
    }
    cd *= (1 - 0.1 * this.upLevel('cooler')) * (this.hasPassive('overclock') ? 0.85 : 1) * (hyper ? 0.5 : 1);
    p.fireCd = Math.max(2, Math.round(cd));
    if (this.hasPassive('rear') && this.t - (this.rearT || -99) >= 16) {   // TAIL GUN
      this.rearT = this.t;
      this.shoot(0, 8, 0, 6, { kind: 'shot', dmg: 0.6 * k, form: -1 });
    }
    if (this.podT > 0 && this.t - (this.podShotT || -99) >= 10) {          // FORCE POD fires with you
      this.podShotT = this.t;
      const [ox, oy] = this.podOffset(), [vx, vy] = this.orient(0, -6);
      this.pBul.push({ x: p.x + ox, y: p.y + oy, vx, vy, kind: 'shot', dmg: k, form: -1 });
    }
  },

  updateBullets() {
    const chrono = this.chronoT > 0 && (this.t & 1);   // CHRONO FIELD: enemy bullets move every other frame
    for (const b of this.pBul) {
      b.age = (b.age || 0) + 1;
      if (b.kind === 'missile') {
        if (!b.target || !this.targetable(b.target)) b.target = this.findTarget(b.x, b.y);
        const turn = b.turn || 0.12;
        if (b.target) b.hd += clamp(angDiff(b.hd, Math.atan2(b.target.y - b.y, b.target.x - b.x)), -turn, turn);
        b.spd = Math.min(4.5, b.spd + 0.12);
        b.vx = Math.cos(b.hd) * b.spd;
        b.vy = Math.sin(b.hd) * b.spd;
        if (--b.life <= 0) b.dead = true;
        if (this.t % 2 === 0) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0.2, life: 10, max: 10, cols: [C.gray, C.lgray], sz: 1 });
      } else {
        this.steerBullet(b);
        if (b.life !== undefined && --b.life <= 0) {
          b.dead = true;
          if (b.kind === 'cluster') this.burstCluster(b);   // fuse ran out: burst in the air
          if (b.kind === 'bomb') this.bombBlast(b);
        }
      }
      if (b.kind === 'wave') {   // sideways sway, across the direction of flight
        const s = Math.hypot(b.vx, b.vy) || 1, sway = Math.cos(b.age * 0.3 + b.ph) * (b.sway || 2.2);
        b.x += -b.vy / s * sway; b.y += b.vx / s * sway;
      }
      b.x += b.vx; b.y += b.vy;
      if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
    }
    if (!chrono) {
      for (const b of this.eBul) {
        b.x += b.vx; b.y += b.vy;
        if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
      }
    }
    this.pBul = this.pBul.filter(b => !b.dead);
    this.eBul = this.eBul.filter(b => !b.dead);
  },

  // Per-kind flight for the newer bullets.
  steerBullet(b) {
    if (b.kind === 'ripple') b.rad = Math.min(b.maxR || 14, 3 + b.age * (b.grow || 0.3));
    else if (b.kind === 'bomb') {
      if (b.grav) {
        b.vy += 0.12;
        if (b.y >= SIDE_GROUND - 3) { b.dead = true; this.bombBlast(b); }
      } else if (Math.hypot(b.vx, b.vy) < 6) { b.vx *= 1.04; b.vy *= 1.04; }
    } else if (b.kind === 'gmissile') {   // drops to the deck, then skims along it
      const deck = SIDE_GROUND - 7;
      if (b.y < deck) b.vy = Math.min(3, b.vy + 0.15);
      else { b.y = deck; b.vy = 0; b.vx = Math.min(5, b.vx + 0.3); }
      if (this.t % 2 === 0) this.parts.push({ x: b.x - 4, y: b.y, vx: -0.3, vy: 0, life: 8, max: 8, cols: [C.gray, C.orange], sz: 1 });
    } else if (b.kind === 'charge') {   // leaves slowly, then speeds up
      if (Math.hypot(b.vx, b.vy) < 7) { b.vx *= 1.06; b.vy *= 1.06; }
    } else if (b.kind === 'swivel') {
      if (Math.hypot(b.vx, b.vy) < 7) { b.vx *= 1.03; b.vy *= 1.03; }
    } else if (b.kind === 'rail') {     // hits hardest close to the ship
      b.dmg = b.dmg0 * Math.max(0.35, 1.5 - b.age * 0.035);
      if (this.t % 2 === 0) this.parts.push({ x: b.x, y: b.y, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), life: 8, max: 8, cols: [C.aqua, C.ice], sz: 1 });
    }
  },

  // A bomb bursts: everything close by takes a share of the blast.
  bombBlast(b) {
    const R = b.blast || 22, d = b.dmg * 0.6;
    this.explode(b.x, b.y, R >= 28 ? 14 : 10, [C.red, C.orange, C.yellow, C.white]);
    Sound.sfx('explode');
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < R + ENEMY[e.type].hit) this.damageEnemy(e, d, b.form);
    const B = this.boss;
    if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead && Math.hypot(pt.x - b.x, pt.y - b.y) < R + pt.r) this.damageBossPart(pt, d, b.form, pt.x, pt.y);
    for (const q of this.capitalOnScreen()) if (Math.hypot(q.x - b.x, q.y - b.y) < R + q.r) this.damageCapTarget(q, d, b.form, q.x, q.y);
  },

  // A bullet that just died on a target: bombs blast, clusters and full charge balls burst.
  bulletEnd(b) {
    if (b.kind === 'cluster' || (b.kind === 'charge' && b.burst)) this.burstCluster(b);
    if (b.kind === 'bomb') this.bombBlast(b);
  },

  // Called by collide() when bullet b touches enemy e. Piercing shots note what they hit, so they
  // damage each plane only once.
  bulletHits(b, e) {
    if (b.pierce) {
      if (b.hit.includes(e)) return;
      b.hit.push(e);
      if (--b.pierce <= 0) b.dead = true;
    } else b.dead = true;
    this.damageEnemy(e, b.dmg, b.form);
    if (b.dead) this.bulletEnd(b);
  },

  // The charge shot's glow at the ship's nose, growing with each charge step.
  drawChargeFx(ctx) {
    const p = this.player;
    if (!p.alive || p.hidden || !p.charge || this.fittedGun(p.form) !== 'charge') return;
    const s = this.chargeStep(p.charge, this.gunLevel('charge'));
    if (!s) return;
    const [ox, oy] = this.orient(0, -10), x = Math.round(p.x + ox), y = Math.round(p.y + oy), r = [2, 4, 6][s - 1] + ((this.t >> 1) & 1);
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow(r + 3, s === 3 ? '#a06018' : '#2050a0'), x, y));
    NES.disc(ctx, x, y, Math.max(1, r - 2), s === 3 && (this.t >> 2) & 1 ? C.yellow : C.ice);
  },

  drawPlayerBullet(ctx, b) {
    const bx = Math.round(b.x), by = Math.round(b.y), horiz = Math.abs(b.vx) > Math.abs(b.vy);
    switch (b.kind) {
      case 'shot':    // a glowing bolt: additive halo, then a hot core
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(3, '#907020'), bx, by));
        ctx.fillStyle = C.yellow;
        if (horiz) ctx.fillRect(bx - 3, by, 7, 1); else ctx.fillRect(bx, by - 3, 1, 7);
        ctx.fillStyle = C.white;
        if (horiz) ctx.fillRect(bx + 1, by, 3, 1); else ctx.fillRect(bx, by - 3, 1, 3);
        break;
      case 'spread':
        ctx.fillStyle = C.aqua;
        if (b.big) { ctx.fillRect(bx - 1, by - 1, 3, 3); ctx.fillStyle = C.white; ctx.fillRect(bx, by, 1, 1); } else ctx.fillRect(bx - 1, by - 1, 2, 2);
        break;
      case 'vulcan':
        ctx.fillStyle = C.orange;
        if (horiz) ctx.fillRect(bx - 2, by, 4, 1); else ctx.fillRect(bx, by - 2, 1, 4);
        break;
      case 'swivel': {  // a short tracer along its flight
        const s = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / s, dy = b.vy / s;
        ctx.fillStyle = b.heavy ? C.orange : C.gold;
        for (let i = 1; i <= (b.heavy ? 3 : 2); i++) ctx.fillRect(Math.round(b.x - dx * i), Math.round(b.y - dy * i), 1, 1);
        ctx.fillStyle = C.white; ctx.fillRect(bx, by, b.heavy ? 2 : 1, b.heavy ? 2 : 1);
        break;
      }
      case 'laser':
        SNES.add(ctx, () => { ctx.fillStyle = '#2060c0'; if (horiz) ctx.fillRect(bx - 8, by - 1, 16, 3); else ctx.fillRect(bx - 1, by - 8, 3, 16); });
        ctx.fillStyle = C.ice;
        if (horiz) ctx.fillRect(bx - 7, by, 14, 1); else ctx.fillRect(bx, by - 7, 1, 14);
        break;
      case 'rail':      // a long slug: cyan halo, white-hot core
        SNES.add(ctx, () => { ctx.fillStyle = '#106878'; if (horiz) ctx.fillRect(bx - 10, by - 1, 20, 3); else ctx.fillRect(bx - 1, by - 10, 3, 20); });
        ctx.fillStyle = C.aqua;
        if (horiz) ctx.fillRect(bx - 9, by, 18, 1); else ctx.fillRect(bx, by - 9, 1, 18);
        ctx.fillStyle = C.white;
        if (horiz) ctx.fillRect(bx - 4, by, 8, 1); else ctx.fillRect(bx, by - 4, 1, 8);
        break;
      case 'charge': {  // a banded energy ball: glow, ring and hot center
        const r = Math.round(b.rad), hot = (this.t >> 1) & 1;
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(r + 3, b.step === 3 ? '#a06018' : '#2050a0'), bx, by));
        NES.disc(ctx, bx, by, r, b.step === 3 ? C.orange : C.sky);
        NES.disc(ctx, bx, by, Math.max(1, r - 2), hot ? C.white : C.ice);
        break;
      }
      case 'wave':
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(b.big ? 5 : 3, '#a02890'), bx, by));
        ctx.fillStyle = C.pink;
        if (b.big) NES.disc(ctx, bx, by, 2, C.pink); else ctx.fillRect(bx - 1, by - 1, 2, 2);
        break;
      case 'ripple': {
        const r = Math.round(b.rad);
        ctx.fillStyle = (this.t >> 1) & 1 ? C.lime : C.mint;
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * TAU;
          ctx.fillRect(Math.round(bx + Math.cos(a) * r), Math.round(by + Math.sin(a) * r * 0.6), 1, 1);
        }
        break;
      }
      case 'bomb': NES.disc(ctx, bx, by, 2, (this.t >> 2) & 1 ? C.lgray : C.gray); ctx.fillStyle = C.red; ctx.fillRect(bx, by - 1, 1, 1); break;
      case 'cluster': NES.disc(ctx, bx, by, 2, (this.t >> 2) & 1 ? C.orange : C.red); break;
      case 'frag': ctx.fillStyle = (this.t >> 1) & 1 ? C.yellow : C.orange; ctx.fillRect(bx - 1, by - 1, 2, 2); break;
      case 'gmissile': NES.drawRot(ctx, SPR.missile, b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI / 2); break;
      default: NES.drawRot(ctx, SPR.missile, b.x, b.y, b.hd + Math.PI / 2);
    }
  },
});
