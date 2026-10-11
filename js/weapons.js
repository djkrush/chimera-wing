'use strict';
// Primary guns. Guns are parts: every gun belongs to one form, and each form of a hull takes exactly two
// (HULLS[h].fit: the start gun and an upgrade). The hulls make a ladder: each starts with the guns the one
// before it bought as upgrades (FUTURE.md, M4). The pilot owns guns (camp.guns), gets a hull's start guns
// with the hull, buys upgrades at planet markets (gun:<id> entries in MARKET_POOL) and picks one of the
// two for each form in the hangar (camp.fit[hull]). Guns are written in vertical-stage terms (up =
// forward) through shoot(), which turns them to face right in side missions.
// Borrowed from the classics: Raiden's Vulcan, Gradius's Laser and Ripple Laser, R-Type's wave-like
// helix shots, U.N. Squadron's falling bombs, Gradius III's Energy Laser (charge shot), Thunder Force
// IV's Railgun (rear rail) and Axelay's Round Vulcan (swivel).
//   short = name on menus   cd = frames between shots   cap = most bullets of that form on screen at once
//   form = 0 FIGHTER, 1 GUARDIAN, 2 BATTLOID   rung = the ladder step whose hull buys it as an upgrade
//   gal = first galaxy whose markets sell it (set from the rung; the price is GUN_PRICE[rung] in starbase.js), desc = two info lines,
//   lv = what LV2 to LV5 change (levels are bought at markets: camp.gunLv).

const GUNS = {
  twin: { name: 'TWIN CANNON', short: 'TWIN', form: 0, rung: 0, cd: 9, cap: 5,
    desc: ['FAST PAIRS OF BOLTS.', 'THE CHIMERA STANDARD.'], lv: ['FASTER BOLTS', 'THIRD STREAM', 'WIDER STREAMS', 'PIERCES ONE PLANE'] },
  vulcan: { name: 'VULCAN', short: 'VULCAN', form: 0, rung: 1, cd: 4, cap: 14,
    desc: ['A RAPID MACHINE GUN. WEAK', 'ROUNDS, AND MANY OF THEM.'], lv: ['TIGHTER SPREAD', 'MORE ROUNDS', 'TIGHTER STILL', 'MORE ROUNDS STILL'] },
  ripple: { name: 'RIPPLE LASER', short: 'RIPPLE', form: 0, rung: 2, cd: 14, cap: 6,
    desc: ['A RING THAT WIDENS AS IT', 'FLIES. PIERCES.'], lv: ['RING GROWS FASTER', 'WIDER RING', 'FASTER STILL', 'WIDEST RING'] },
  gunpod: { name: 'GUN POD', short: 'GUN POD', form: 0, rung: 3, cd: 22, cap: 9,
    desc: ['HEAVY THREE-ROUND BURSTS', 'FROM A VF GUN POD.'], lv: ['HEAVIER ROUNDS', '4-ROUND BURSTS', 'HEAVIER STILL', '5-ROUND BURSTS'] },
  tail: { name: 'TAIL VULCAN', short: 'TAIL', form: 0, rung: 4, cd: 8, cap: 12,
    desc: ['FIRES AHEAD AND BEHIND.', 'NOTHING SNEAKS UP ON YOU.'], lv: ['FASTER FIRE', 'ANGLED TAIL SHOTS', 'FASTER STILL', 'WIDER TAIL FAN'] },
  needle: { name: 'NEEDLE GUN', short: 'NEEDLE', form: 0, rung: 5, cd: 10, cap: 6,
    desc: ['A VERY FAST THIN SHOT.', 'PIERCES ONE PLANE.'], lv: ['PIERCES 2 PLANES', 'FASTER FIRE', 'PIERCES 3 PLANES', 'TWIN NEEDLES'] },
  rocket: { name: 'ROCKET SALVO', short: 'ROCKETS', form: 0, rung: 6, cd: 30, cap: 10,
    desc: ['A VOLLEY OF MICRO ROCKETS', 'THAT BURST ON IMPACT.'], lv: ['FOUR ROCKETS', 'BIGGER BLAST', 'FIVE ROCKETS', 'BIGGEST BLAST'] },
  burner: { name: 'AFTERBURNER', short: 'BURNER', form: 0, rung: 7, cd: 3, cap: 24,
    desc: ['A SHORT CONE OF FLAME.', 'HEAVY DAMAGE UP CLOSE.'], lv: ['LONGER FLAME', 'WIDER CONE', 'LONGER STILL', 'WIDEST CONE'] },
  freeway: { name: 'FREE WAY', short: 'FREEWAY', form: 0, rung: 8, cd: 7, cap: 12,
    desc: ['SHOTS ANGLE TOWARD', 'WHERE YOU STEER.'], lv: ['WIDER ANGLE', 'FASTER FIRE', 'HEAVIER SHOTS', 'EXTRA STREAM'] },
  spread: { name: '3-WAY SPREAD', short: 'SPREAD', form: 1, rung: 0, cd: 15, cap: 10,
    desc: ['THREE PELLETS IN A FAN.', 'COVERS A WIDE FRONT.'], lv: ['FASTER PELLETS', 'FIVE WAYS', 'BIGGER PELLETS', 'SEVEN WAYS'] },
  wave: { name: 'HELIX WAVE', short: 'WAVE', form: 1, rung: 1, cd: 12, cap: 8,
    desc: ['TWO SHOTS TWISTING ROUND', 'EACH OTHER. WIDE HITS.'], lv: ['WIDER SWAY', 'FASTER SHOTS', 'THREE STRANDS', 'BIGGER ORBS'] },
  bomb: { name: 'BOMB SHOT', short: 'BOMB', form: 1, rung: 2, cd: 24, cap: 3,
    desc: ['BURSTS ON IMPACT. FALLS', 'ONTO GROUND TARGETS.'], lv: ['BIGGER BLAST', 'TWO BOMBS', 'BIGGER BLAST', 'THREE BOMBS'] },
  swivel: { name: 'SWIVEL VULCAN', short: 'SWIVEL', form: 1, rung: 3, cd: 5, cap: 16,
    desc: ['HOLD FIRE: GUNS SWING IN.', 'LET GO: THEY SPLAY OUT.'], lv: ['WIDER SWEEP', 'CENTER BARREL', 'FASTER SWING', 'HEAVIER ROUNDS'] },
  flak: { name: 'FLAK FIELD', short: 'FLAK', form: 1, rung: 4, cd: 20, cap: 6,
    desc: ['SHELLS BURST AND HANG,', 'BLOCKING ENEMY MISSILES.'], lv: ['BIGGER BURSTS', 'LONGER HANG', 'BIGGER STILL', 'TWO SHELLS'] },
  diagonal: { name: 'DIAGONAL LASER', short: 'DIAGONAL', form: 1, rung: 5, cd: 24, cap: 15,
    desc: ['ARCING SHOTS THAT SPLIT', 'INTO DIAGONAL LASERS.'], lv: ['LONGER LASERS', 'FASTER FIRE', 'LONGER STILL', 'TWO SHOTS'] },
  mortar: { name: 'MORTAR', short: 'MORTAR', form: 1, rung: 6, cd: 28, cap: 6,
    desc: ['LOBBED SHELLS THAT BURST', 'OVER GROUND TARGETS.'], lv: ['TWO SHELLS', 'BIGGER BLAST', 'THREE SHELLS', 'BIGGEST BLAST'] },
  ring: { name: 'ORBIT RING', short: 'RING', form: 1, rung: 7, cd: 8, cap: 8,
    desc: ['SHOTS CIRCLE THE SHIP', 'AND BLOCK BULLETS.'], lv: ['WIDER RING', 'MORE SHOTS', 'WIDER STILL', 'MORE SHOTS STILL'] },
  chain: { name: 'CHAIN ARC', short: 'CHAIN', form: 1, rung: 8, cd: 18, cap: 1,
    desc: ['LIGHTNING THAT JUMPS', 'BETWEEN NEARBY PLANES.'], lv: ['MORE JUMPS', 'MORE DAMAGE', 'MORE JUMPS STILL', 'MOST DAMAGE'] },
  laser: { name: 'PIERCING LASER', short: 'LASER', form: 2, rung: 0, cd: 14, cap: 4,
    desc: ['A BOLT THAT GOES THROUGH', 'THREE PLANES.'], lv: ['PIERCES 4 PLANES', 'PIERCES 5 PLANES', 'PIERCES 6 PLANES', 'PIERCES 7 PLANES'] },
  grenade: { name: 'GRENADE LAUNCHER', short: 'GRENADE', form: 2, rung: 1, cd: 26, cap: 4,
    desc: ['THROWN ABOVE AND BELOW.', 'BURNS ALONG THE GROUND.'], lv: ['LONGER BURN', 'TWO AT ONCE', 'LONGER BURN STILL', 'BIGGER FLAMES'] },
  charge: { name: 'CHARGE SHOT', short: 'CHARGE', form: 2, rung: 2, cd: 14, cap: 4,
    desc: ['TAP FOR BOLTS. HOLD FIRE', 'TO CHARGE A BIG BALL.'], lv: ['CHARGES FASTER', 'BIGGER BALL', 'TAP FIRES A PAIR', 'FULL CHARGE BURSTS'] },
  rail: { name: 'REAR RAIL GUN', short: 'RAIL', form: 2, rung: 3, cd: 22, cap: 4,
    desc: ['FIRES BEHIND YOU. HITS', 'HARDER UP CLOSE.'], lv: ['FASTER RELOAD', 'PIERCES', 'TWIN RAILS', 'FORWARD RAIL TOO'] },
  hyper: { name: 'HYPER BEAM', short: 'HYPER', form: 2, rung: 4, cd: 4, cap: 14,
    desc: ['HOLD TO CHARGE, THEN RAPID', 'FIRE UNTIL IT OVERHEATS.'], lv: ['LONGER BURST', 'COOLS FASTER', 'LONGER STILL', 'COOLS FASTEST'] },
  sword: { name: 'THUNDER SWORD', short: 'SWORD', form: 2, rung: 5, cd: 30, cap: 1,
    desc: ['CHARGES WHEN NOT FIRING.', 'A BIG PIERCING BLADE.'], lv: ['CHARGES FASTER', 'LONGER BLADE', 'FASTER STILL', 'LONGEST BLADE'] },
  canister: { name: 'CANISTER SHOT', short: 'CANISTER', form: 2, rung: 6, cd: 20, cap: 24,
    desc: ['A SHORT-RANGE SHOTGUN', 'BLAST OF PELLETS.'], lv: ['MORE PELLETS', 'LONGER RANGE', 'MORE STILL', 'LONGEST RANGE'] },
  homing: { name: 'HOMING MISSILES', short: 'HOMING', form: 2, rung: 7, cd: 26, cap: 5,
    desc: ['MISSILES THAT HUNT THE', 'NEAREST TARGET.'], lv: ['TURNS FASTER', 'THREE MISSILES', 'TURNS FASTER STILL', 'FOUR MISSILES'] },
  lock: { name: 'LIGHTNING LOCK', short: 'LOCK', form: 2, rung: 8, cd: 6, cap: 4,
    desc: ['LOCKS ON TWO TARGETS.', 'HITS HARDER AS IT HOLDS.'], lv: ['FASTER RAMP', 'THREE TARGETS', 'FASTER STILL', 'FOUR TARGETS'] },
};
const GUN_IDS = Object.keys(GUNS);
for (const G of Object.values(GUNS)) G.gal = G.rung <= 3 ? 0 : G.rung <= 6 ? 1 : 2;   // rungs 0-3 Milky Way, 4-6 Magellanic, 7-8 Andromeda
const CHARGE_STEPS = [20, 50, 90];                  // frames of held fire per charge step: slower toward 3

Object.assign(Game, {
  // ---- Guns as parts ---------------------------------------------------------------------
  canMount(h, f, gun) { return HULLS[h].fit[f].includes(gun); },
  // Form f's guns on hull h that can be picked: the ones owned.
  hullGuns(h, f) { const c = this.camp; return HULLS[h].fit[f].filter(g => g && c && c.guns.includes(g)); },
  // The gun on form f: the hangar's pick, or the hull's start gun if that isn't owned or doesn't fit.
  fittedGun(f) {
    const c = this.camp, h = c ? c.hull : 0, g = c && c.fit && c.fit[h] && c.fit[h][f];
    return g && GUNS[g] && this.hullGuns(h, f).includes(g) ? g : HULLS[h].fit[f][0];
  },
  // Levels are bought at markets (camp.gunLv), never earned in flight; a level counts on every hull.
  gunLevel(id) { return clamp(this.camp && this.camp.gunLv ? this.camp.gunLv[id] || 1 : 1, 1, 5); },
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
    if (p.gunFx !== gun) { p.gunFx = gun; p.hyper = null; p.swordT = 0; p.locks = []; }   // a new gun starts cold
    if (gun === 'hyper') { this.triggerHyper(held, L); return; }
    if (gun === 'sword') { this.triggerSword(held, L); return; }
    if (gun === 'lock') { this.triggerLock(held, L); return; }
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

  // HYPER BEAM (R-Type III): hold fire to charge; once full it fires heavy twin bolts while held, until
  // it overheats and has to cool. Let go early and it cools for the share of the burst you used. A tap
  // before it's full fires one bolt.
  hyperTimes(L) { return { full: 40, burst: L >= 4 ? 120 : L >= 2 ? 90 : 60, cool: L >= 5 ? 40 : L >= 3 ? 60 : 90 }; },
  triggerHyper(held, L) {
    const p = this.player, T = this.hyperTimes(L), h = p.hyper || (p.hyper = { mode: 'charge', t: 0 });
    if (p.morphT > 0) { p.hyper = null; return; }
    if (h.mode === 'cool') { if (++h.t >= T.cool) { h.mode = 'charge'; h.t = 0; } return; }
    if (h.mode === 'fire') {
      if (!held || ++h.t >= T.burst) {
        if (held) { this.popup(p.x, p.y - 22, 'OVERHEAT', C.orange); Sound.sfx('denied'); }
        h.t = held ? 0 : T.cool - Math.max(20, Math.round(T.cool * h.t / T.burst));
        h.mode = 'cool';
        return;
      }
      if (p.fireCd <= 0) this.fireWeapon();
      return;
    }
    if (held) { if (++h.t >= T.full) { h.mode = 'fire'; h.t = 0; Sound.sfx('charge'); } return; }
    if (h.t > 0 && p.fireCd <= 0) this.fireWeapon();   // a tap
    h.t = 0;
  },

  // THUNDER SWORD (Thunder Force IV): it charges while you hold your fire; pressing fire swings the blade
  // once it's full. Firing early shoots small bolts and keeps the charge empty.
  swordNeed(L) { return L >= 4 ? 55 : L >= 2 ? 80 : 100; },
  triggerSword(held, L) {
    const p = this.player, need = this.swordNeed(L);
    if (p.morphT > 0) { p.swordT = 0; return; }
    if (!held) { if (p.swordT < need && ++p.swordT === need) Sound.sfx('charge'); return; }
    if (p.fireCd <= 0) this.fireWeapon();
  },

  // LIGHTNING LOCK (Radiant Silvergun): while fire is held, lightning locks onto the nearest targets
  // ahead and hurts each one harder the longer it holds.
  triggerLock(held, L) {
    const p = this.player, n = L >= 5 ? 4 : L >= 3 ? 3 : 2, ramp = L >= 4 ? 25 : L >= 2 ? 40 : 60;
    if (!held) { p.locks = []; return; }
    const [fx, fy] = this.orient(0, -1), all = this.allTargets();
    p.locks = (p.locks || []).filter(l => !l.t0.o.dead && all.some(t => t.o === l.t0.o) && Math.hypot(l.t0.o.x - p.x, l.t0.o.y - p.y) < 210);
    while (p.locks.length < n) {
      let best = null, bd = 190;
      for (const t of all) {
        const dx = t.o.x - p.x, dy = t.o.y - p.y, d = Math.hypot(dx, dy);
        if (d < bd && dx * fx + dy * fy > -10 && !p.locks.some(l => l.t0.o === t.o)) { bd = d; best = t; }
      }
      if (!best) break;
      p.locks.push({ t0: best, t: 0 });
      Sound.sfx('tink');
    }
    const k = this.gunPower() * (this.hyperT > 0 ? 1.5 : 1);
    for (const l of p.locks) {
      if (++l.t % 6) continue;
      this.shots++;
      this.damageAny(l.t0, 0.5 * k * Math.min(4, 1 + l.t / ramp), p.form);
    }
    if (p.locks.length && this.t % 8 === 0) Sound.sfx('shoot');
  },

  // ---- Hitting things that aren't bullets ------------------------------------------------
  // Everything a gun can hurt right now: planes, a boss warship's parts and a capital ship's targets.
  allTargets() {
    const out = this.enemies.filter(e => !e.dead).map(o => ({ o, r: ENEMY[o.type].hit, kind: 'e' })), B = this.boss;
    if (B && !B.dying && !B.entering && B.x <= W) for (const pt of B.parts) if (!pt.dead) out.push({ o: pt, r: pt.r, kind: 'p' });
    for (const q of this.capitalOnScreen()) out.push({ o: q, r: q.r, kind: 'c' });
    return out;
  },
  damageAny(t, d, form, hx = t.o.x, hy = t.o.y) {
    if (t.o.dead) return;
    if (t.kind === 'e') this.damageEnemy(t.o, d, form);
    else if (t.kind === 'p') this.damageBossPart(t.o, d, form, hx, hy);
    else this.damageCapTarget(t.o, d, form, hx, hy);
  },
  // Everything within R of x, y takes d.
  blastAt(x, y, R, d, form) {
    for (const t of this.allTargets()) if (Math.hypot(t.o.x - x, t.o.y - y) < R + t.r) this.damageAny(t, d, form);
  },
  // A lingering cloud or fire (b.zone = { r, every, dmg }) hurts each target in it once every `every` frames.
  zoneTick(b) {
    const z = b.zone;
    z.hit = z.hit || new Map();
    for (const t of this.allTargets()) {
      if (Math.hypot(t.o.x - b.x, t.o.y - b.y) >= z.r + t.r) continue;
      const last = z.hit.get(t.o);
      if (last !== undefined && b.age - last < z.every) continue;
      z.hit.set(t.o, b.age);
      this.shots++;   // counted as a shot so the hit ratio stays honest
      this.damageAny(t, z.dmg, b.form);
    }
    if (z.block) for (const e of this.eBul) if (z.block.includes(e.k) && Math.hypot(e.x - b.x, e.y - b.y) < z.r) { e.dead = true; this.spark(e.x, e.y, C.mint, 2); }
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
      case 'gunpod': return (L >= 5 ? 5 : L >= 3 ? 4 : 3) * 3;
      case 'tail': return G.cap + (L >= 3 ? 6 : 0) + (L >= 5 ? 6 : 0);
      case 'needle': return L >= 5 ? 12 : G.cap;
      case 'rocket': return (L >= 4 ? 5 : L >= 2 ? 4 : 3) * 3;
      case 'burner': return L >= 3 ? 36 : G.cap;
      case 'freeway': return G.cap + (L >= 5 ? 6 : 0);
      case 'flak': return L >= 5 ? 12 : 8;
      case 'diagonal': return L >= 5 ? 30 : G.cap;
      case 'mortar': return (L >= 4 ? 3 : L >= 2 ? 2 : 1) * 3;
      case 'ring': return L >= 5 ? 18 : L >= 3 ? 12 : G.cap;
      case 'grenade': return 14;
      case 'canister': return (L >= 4 ? 13 : L >= 2 ? 10 : 8) * 3;
    }
    return G.cap;
  },

  fireWeapon() {
    const p = this.player, f = p.form, gun = this.fittedGun(f), G = GUNS[gun], L = this.gunLevel(gun), hyper = this.hyperT > 0;
    const k = this.gunPower() * (hyper ? 1.5 : 1);
    let cd = gun === 'rail' && L >= 2 ? 16 : G.cd;
    if (this.pBul.filter(b => b.form === f && !b.copy).length >= this.gunCap(gun, L) * (hyper ? 2 : 1)) return;   // escorts' copies don't count
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
          this.shoot(s * 6, -4, Math.cos(hd) * 1.2, Math.sin(hd) * 1.2, { hd, spd: 1.2, turn, kind: 'missile', dmg: 2.8 * k, form: f, life: 150, target: null });
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
          const b = this.shoot(s * 6, -6, s * 0.8, this.isSide ? -3 : -3.2, { kind: 'bomb', dmg: 2.4 * k, form: f, life: 70, blast });
          if (this.isSide) { b.vy = 0.6 + s * 0.5; b.grav = true; b.life = 200; }
        }
        this.shots += n; Sound.sfx('missile');
        break;
      }
      case 'vulcan': {
        const a = rand(-1, 1) * (L >= 4 ? 0.025 : L >= 2 ? 0.045 : 0.07);
        this.shoot(randi(-2, 2), -6, Math.sin(a) * 7, -Math.cos(a) * 7, { kind: 'vulcan', dmg: 0.7 * k, form: f });
        this.shots++; if (this.t % 2) Sound.sfx('shoot');
        break;
      }
      case 'wave': {  // shots twisting round each other, like a double helix
        const n = L >= 4 ? 3 : 2, sway = L >= 2 ? 3.2 : 2.2, vy = L >= 3 ? -6 : -4.5, big = L >= 5;
        for (let i = 0; i < n; i++) this.shoot(0, -6, 0, vy, { kind: 'wave', dmg: k, form: f, ph: i / n * TAU, sway, big, rad: big ? 5 : 3 });
        this.shots += n; Sound.sfx('spread');
        break;
      }
      case 'ripple':  // a ring that widens as it flies
        this.shoot(0, -8, 0, -4, { kind: 'ripple', dmg: 2 * k, form: f, rad: 3, pierce: 2, hit: [], life: 70,
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
        this.shoot(0, -10, 0, -3, { kind: 'charge', step: s, dmg: [3, 6, 11][s - 1] * k, form: f,
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
      // ---- FIGHTER (white and yellow shots) ----
      case 'gunpod': {  // a burst of heavy rounds, spaced along the line of fire
        const n = L >= 5 ? 5 : L >= 3 ? 4 : 3, dmg = (L >= 4 ? 2.1 : L >= 2 ? 1.8 : 1.5) * k;
        for (let i = 0; i < n; i++) this.shoot(0, -6 - i * 7, 0, -8, { kind: 'pod', dmg, form: f });
        this.shots += n; Sound.sfx('shoot');
        cd = 18;
        break;
      }
      case 'tail': {  // twin bolts ahead, a tail gun behind
        for (const s of [-1, 1]) this.shoot(s * 3, -6, 0, -7.5, { kind: 'shot', dmg: 1.1 * k, form: f });
        const tail = L >= 5 ? [-0.6, 0, 0.6] : L >= 3 ? [-0.35, 0.35] : [0];
        for (const a of tail) this.shoot(0, 8, Math.sin(a) * 6, Math.cos(a) * 6, { kind: 'shot', dmg: 0.6 * k, form: f });
        this.shots += 2 + tail.length; if (this.t % 2) Sound.sfx('shoot');
        cd = L >= 4 ? 5 : L >= 2 ? 6 : 8;
        break;
      }
      case 'needle': {  // fast and thin, through planes
        const pierce = L >= 4 ? 4 : L >= 2 ? 3 : 2;
        for (const ox of L >= 5 ? [-3, 3] : [0]) this.shoot(ox, -8, 0, -12, { kind: 'needle', dmg: 2.8 * k, form: f, pierce, hit: [] });
        this.shots += L >= 5 ? 2 : 1; Sound.sfx('shoot');
        cd = L >= 3 ? 7 : 10;
        break;
      }
      case 'rocket': {  // a rack of micro rockets that speed up and burst on impact
        const n = L >= 4 ? 5 : L >= 2 ? 4 : 3, blast = L >= 5 ? 20 : L >= 3 ? 16 : 12;
        for (let i = 0; i < n; i++) {
          this.shoot((i - (n - 1) / 2) * 3, -6 - Math.abs(i - (n - 1) / 2) * 3, 0, -3, { kind: 'rocket', dmg: 1.9 * k, form: f, blast, life: 60 });
        }
        this.shots += n; Sound.sfx('missile');
        cd = 26;
        break;
      }
      case 'burner': {  // a short cone of flame, hottest close to the nose
        const wide = L >= 5 ? 0.55 : L >= 3 ? 0.4 : 0.25, life = L >= 4 ? 16 : L >= 2 ? 13 : 10;
        const n = L >= 3 ? 3 : 2, dmg = 0.5 * k * (1 + 0.1 * (L - 1));
        for (let i = 0; i < n; i++) {
          const a = rand(-wide, wide), sp = rand(5, 6);
          this.shoot(0, -10, Math.sin(a) * sp, -Math.cos(a) * sp, { kind: 'flame', dmg, dmg0: dmg, form: f, pierce: 99, hit: [], life });
        }
        this.shots += n; if (this.t % 6 < 3) Sound.sfx('spread');
        break;
      }
      case 'freeway': {  // the shots lean toward where you steer (the ship's bank or climb)
        const a = p.tilt * (L >= 2 ? 0.8 : 0.5), dmg = (L >= 4 ? 1.7 : 1.4) * k, lanes = L >= 5 ? [-1, 0, 1] : [-1, 1];
        for (const s of lanes) {
          const q = a + s * 0.035;
          this.shoot(s * 2, -6, Math.sin(q) * 7.5, -Math.cos(q) * 7.5, { kind: 'freeway', dmg, form: f });
        }
        this.shots += lanes.length; Sound.sfx('shoot');
        cd = L >= 3 ? 5 : 7;
        break;
      }
      // ---- GUARDIAN (aqua and green shots) ----
      case 'flak': {  // shells that burst into a hanging cloud (bulletEnd)
        const n = L >= 5 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const s = n === 1 ? 0 : i ? 1 : -1;
          this.shoot(s * 5, -6, s * 0.6, -5, { kind: 'flak', dmg: 1.5 * k, form: f, life: 28, cloudR: L >= 4 ? 22 : L >= 2 ? 18 : 14, hang: L >= 3 ? 70 : 45 });
        }
        this.shots += n; Sound.sfx('missile');
        break;
      }
      case 'diagonal': {  // slowing shots that split into four diagonal lasers (bulletEnd)
        const n = L >= 5 ? 2 : 1, len = L >= 4 ? 36 : L >= 2 ? 28 : 20;
        for (let i = 0; i < n; i++) {
          const s = n === 1 ? 0 : i ? 1 : -1;
          this.shoot(s * 3, -6, s * 0.25, -7, { kind: 'diag', dmg: 2 * k, form: f, life: 24, len });
        }
        this.shots += n; Sound.sfx('spread');
        cd = L >= 3 ? 15 : 20;
        break;
      }
      case 'mortar': {  // lobbed over the planes in between, bursting where it lands (bulletEnd)
        const n = L >= 4 ? 3 : L >= 2 ? 2 : 1, blast = L >= 5 ? 32 : L >= 3 ? 26 : 20;
        const aim = this.findTarget(p.x, p.y), [fx, fy] = this.orient(0, -1);
        for (let i = 0; i < n; i++) {
          const s = n === 1 ? 0 : (i / (n - 1)) * 2 - 1, b = this.shoot(s * 4, -4, 0, 0, { kind: 'mortar', dmg: 6 * k, form: f, blast, noHit: true });
          if (this.isSide) { b.vx = 2.4 + i * 0.5; b.vy = -3.4; b.grav = true; b.life = 200; continue; }
          const ahead = aim && (aim.x - p.x) * fx + (aim.y - p.y) * fy > 30, T = 34;
          const tx = (ahead ? aim.x : p.x) + s * 24, ty = ahead ? aim.y : p.y - 110;
          b.vx = (tx - b.x) / T; b.vy = (ty - b.y) / T; b.life = T; b.T = T;
        }
        this.shots += n; Sound.sfx('missile');
        cd = 22;
        break;
      }
      case 'ring': {  // shots that circle the ship, blocking bullets, then fly off ahead
        const n = L >= 5 ? 3 : L >= 3 ? 2 : 1, r = L >= 4 ? 28 : L >= 2 ? 23 : 18;
        p.ringA = (p.ringA || 0) + 2.1;
        for (let i = 0; i < n; i++) this.pBul.push({ x: p.x, y: p.y, vx: 0, vy: 0, kind: 'orbit', dmg: 4.5 * k, form: f, orbit: { a: p.ringA + i * TAU / n, r, t: 70 } });
        this.shots += n; Sound.sfx('spread');
        break;
      }
      case 'chain': {  // lightning to the nearest target ahead, then jumping plane to plane
        const jumps = L >= 4 ? 6 : L >= 2 ? 4 : 3, [fx, fy] = this.orient(0, -1), all = this.allTargets();
        const [nx, ny] = this.orient(0, -10), pts = [[p.x + nx, p.y + ny]], hit = [];
        let d = (L >= 5 ? 7 : L >= 3 ? 5.5 : 4.5) * k;
        let cur = null, bd = 150;
        for (const t of all) {
          const dx = t.o.x - p.x, dy = t.o.y - p.y, dd = Math.hypot(dx, dy);
          if (dd < bd && dx * fx + dy * fy > 0) { bd = dd; cur = t; }
        }
        while (cur && hit.length <= jumps) {
          hit.push(cur.o); pts.push([cur.o.x, cur.o.y]);
          this.damageAny(cur, d, f);
          d *= 0.85;
          const from = cur.o; cur = null; bd = 80;
          for (const t of all) { const dd = Math.hypot(t.o.x - from.x, t.o.y - from.y); if (dd < bd && !hit.includes(t.o)) { bd = dd; cur = t; } }
        }
        if (!hit.length) pts.push([pts[0][0] + fx * 46, pts[0][1] + fy * 46]);   // nothing in reach: a short fizzle
        this.arcs = this.arcs || [];
        this.arcs.push({ pts, t: 10, cols: ['#20a080', C.mint, C.white] });
        this.shots++; Sound.sfx('spread');
        break;
      }
      // ---- BATTLOID (orange and red shots) ----
      case 'grenade': {  // thrown above and below by turns (both from LV3); each burns where it lands
        const burn = L >= 4 ? 120 : L >= 2 ? 90 : 60, big = L >= 5;
        p.gren = -(p.gren || 1);
        for (const s of L >= 3 ? [-1, 1] : [p.gren]) {
          const b = this.shoot(s * 4, -6, s * 0.6, -7.8, { kind: 'grenade', dmg: 2.2 * k, form: f, blast: 14, burn, big, life: 26 });
          if (this.isSide) { b.vx = 3; b.vy = s < 0 ? -3 : 0.8; b.grav = true; b.life = 200; }
        }
        this.shots += L >= 3 ? 2 : 1; Sound.sfx('missile');
        break;
      }
      case 'hyper': {  // see triggerHyper: heavy twin bolts while hot, one bolt on a tap
        if (p.hyper && p.hyper.mode === 'fire') {
          for (const s of [-1, 1]) this.shoot(s * 4, -8, s * 0.15, -9, { kind: 'hyper', dmg: 1.6 * k, form: f });
          this.shots += 2; if (this.t % 2) Sound.sfx('shoot');
        } else {
          this.shoot(0, -8, 0, -7, { kind: 'hyper', dmg: k, form: f });
          this.shots++; Sound.sfx('shoot');
          cd = 12;
        }
        break;
      }
      case 'sword': {  // see triggerSword: a full charge swings the blade, otherwise a small bolt
        if (p.swordT >= this.swordNeed(L)) {
          this.shoot(0, -10, 0, -7, { kind: 'sword', dmg: 36 * k, form: f, len: L >= 5 ? 90 : L >= 3 ? 64 : 44, noHit: true, noCopy: true, cut: [], life: 60 });
          this.shots++; this.punch(1.5); Sound.sfx('missile');
          cd = 24;
        } else {
          this.shoot(0, -8, 0, -7, { kind: 'hyper', dmg: 0.9 * k, form: f });
          this.shots++; Sound.sfx('shoot');
          cd = 14;
        }
        p.swordT = 0;
        break;
      }
      case 'canister': {  // a shotgun blast of pellets that don't fly far
        const n = L >= 4 ? 13 : L >= 2 ? 10 : 8, life = L >= 5 ? 24 : L >= 3 ? 20 : 16;
        for (let i = 0; i < n; i++) {
          const a = rand(-0.45, 0.45), sp = rand(5.5, 7.5);
          this.shoot(0, -8, Math.sin(a) * sp, -Math.cos(a) * sp, { kind: 'pellet', dmg: k, form: f, life });
        }
        this.shots += n; Sound.sfx('spread'); this.punch(0.5);
        break;
      }
    }
    cd *= (1 - 0.1 * this.upLevel('cooler')) * (this.hasPassive('overclock') ? 0.85 : 1) * (hyper ? 0.5 : 1);
    p.fireCd = Math.max(2, Math.round(cd));
    if (this.hasPassive('rear') && this.t - (this.rearT || -99) >= 16) {   // TAIL GUN
      this.rearT = this.t;
      this.shoot(0, 8, 0, 6, { kind: 'shot', dmg: 0.6 * k, form: -1 });
    }
    this.moduleFire(k, f);                                                  // arsenal.js: side fighters
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
        if (b.life !== undefined && --b.life <= 0 && !b.dead) {
          b.dead = true;
          this.bulletEnd(b);   // fuse ran out: bombs and shells burst in the air
        }
        if (b.zone && !b.dead) this.zoneTick(b);
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
        this.steerEnemyBullet(b);
        b.x += b.vx; b.y += b.vy;
        if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
      }
    }
    this.pBul = this.pBul.filter(b => !b.dead);
    this.eBul = this.eBul.filter(b => !b.dead);
    this.arcs = (this.arcs || []).filter(a => --a.t > 0);
  },

  // Enemy bullet kinds: split bursts into three aimed shards after 40 frames; seek turns gently toward
  // you for 90 frames, then flies straight.
  steerEnemyBullet(b) {
    const p = this.player;
    b.t = (b.t || 0) + 1;
    if (b.k === 'split' && b.t === 40) {
      b.dead = true;
      const sp = Math.hypot(b.vx, b.vy) * 1.8, a = p.alive ? Math.atan2(p.y - b.y, p.x - b.x) : Math.atan2(b.vy, b.vx);
      for (const d of [-0.3, 0, 0.3]) this.eShot(b.x, b.y, Math.cos(a + d) * sp, Math.sin(a + d) * sp);
      this.spark(b.x, b.y, C.yellow, 3);
    } else if (b.k === 'seek' && b.t < 90 && p.alive) {
      const sp = Math.hypot(b.vx, b.vy), h = Math.atan2(b.vy, b.vx);
      const nh = h + clamp(angDiff(h, Math.atan2(p.y - b.y, p.x - b.x)), -0.025, 0.025);
      b.vx = Math.cos(nh) * sp; b.vy = Math.sin(nh) * sp;
    }
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
    } else if (b.kind === 'rocket') {
      if (Math.hypot(b.vx, b.vy) < 8) { b.vx *= 1.08; b.vy *= 1.08; }
      if (this.t % 2 === 0) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 8, max: 8, cols: [C.lgray, C.gray], sz: 1 });
    } else if (b.kind === 'flame') {    // slows as it cools, weaker the farther it goes
      b.vx *= 0.96; b.vy *= 0.96;
      b.dmg = b.dmg0 * Math.max(0.4, 1.4 - b.age * 0.07);
    } else if (b.kind === 'diag') {
      b.vx *= 0.97; b.vy *= 0.97;
    } else if (b.kind === 'grenade' || b.kind === 'mortar') {
      if (b.grav) {   // side missions: an arc under gravity
        b.vy += 0.12;
        const fuse = b.kind === 'mortar' ? (b.vy > 0 && (b.y >= SIDE_GROUND - 24 || this.allTargets().some(t => Math.hypot(t.o.x - b.x, t.o.y - b.y) < 12 + t.r)))
          : b.y >= SIDE_GROUND - 3;
        if (fuse) { b.dead = true; this.bulletEnd(b); }
      } else if (b.kind === 'grenade') { b.vx *= 0.96; b.vy *= 0.96; }
    } else if (b.kind === 'burn') {     // fire on the ground, scrolling away with it
      if (this.isSide) {
        if (b.y < SIDE_GROUND - 4) b.vy = Math.min(4, b.vy + 0.2); else { b.y = SIDE_GROUND - 4; b.vy = 0; b.vx = -1.5; }
      }
      if (this.t % 3 === 0) this.parts.push({ x: b.x + rand(-b.zone.r, b.zone.r) * 0.7, y: b.y, vx: 0, vy: -0.6, life: 10, max: 10, cols: [C.yellow, C.orange, C.red], sz: 1 });
    } else if (b.kind === 'orbit' && b.orbit) {   // circle the ship, blocking bullets; then fly off ahead
      const o = b.orbit, p = this.player;
      const [fx, fy] = this.orient(0, -1), front = Math.abs(angDiff(o.a, Math.atan2(fy, fx))) < 0.2;
      if ((o.t-- > 0 || !front) && p.alive && o.t > -60) {   // done circling: let go at the front of the ring
        o.a += 0.14;
        b.x = p.x + Math.cos(o.a) * o.r; b.y = p.y + Math.sin(o.a) * o.r; b.vx = 0; b.vy = 0;
        for (const e of this.eBul) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < 5) { e.dead = true; this.spark(e.x, e.y, C.mint, 2); }
      } else { [b.vx, b.vy] = this.orient(0, -6); b.orbit = null; }
    } else if (b.kind === 'sword') {    // a blade of light: everything along it is cut once
      const s = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / s, dy = b.vy / s;
      b.cur = Math.min(b.len, 10 + b.age * 7);
      for (const t of this.allTargets()) {
        if (b.cut.includes(t.o)) continue;
        const rx = t.o.x - b.x, ry = t.o.y - b.y, along = clamp(-(rx * dx + ry * dy), 0, b.cur);
        if (Math.hypot(rx + dx * along, ry + dy * along) < 7 + t.r) { b.cut.push(t.o); this.damageAny(t, b.dmg, b.form); }
      }
    }
  },

  // A bomb bursts: everything close by takes a share of the blast.
  bombBlast(b) {
    const R = b.blast || 22, d = b.dmg * 0.6;
    this.explode(b.x, b.y, R >= 28 ? 14 : 10, [C.red, C.orange, C.yellow, C.white]);
    this.punch(R >= 28 ? 1.5 : 1, b.x, b.y);
    Sound.sfx('explode');
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < R + ENEMY[e.type].hit) this.damageEnemy(e, d, b.form);
    const B = this.boss;
    if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead && Math.hypot(pt.x - b.x, pt.y - b.y) < R + pt.r) this.damageBossPart(pt, d, b.form, pt.x, pt.y);
    for (const q of this.capitalOnScreen()) if (Math.hypot(q.x - b.x, q.y - b.y) < R + q.r) this.damageCapTarget(q, d, b.form, q.x, q.y);
  },

  // A bullet that just died on a target: bombs blast, clusters and full charge balls burst.
  bulletEnd(b) {
    if (b.kind === 'cluster' || (b.kind === 'charge' && b.burst)) this.burstCluster(b);
    else if (b.kind === 'bomb') this.bombBlast(b);
    else if (b.kind === 'rocket' || b.kind === 'grenade' || b.kind === 'mortar') {
      const full = b.kind === 'mortar';
      this.explode(b.x, b.y, full ? 12 : 7, full ? [C.mint, C.aqua, C.white] : [C.red, C.orange, C.yellow]);
      if (full) this.punch(1, b.x, b.y);
      Sound.sfx('explode');
      this.blastAt(b.x, b.y, b.blast, b.dmg * (full ? 1 : 0.6), b.form);
      if (b.kind === 'grenade') this.pBul.push({ x: b.x, y: b.y, vx: 0, vy: this.isSide ? 0 : 1, kind: 'burn', form: b.form, life: b.burn, noHit: true,
        zone: { r: b.big ? 14 : 10, every: 10, dmg: 0.3 * b.dmg } });
    } else if (b.kind === 'flak') {   // the shell becomes a cloud that hangs, hurting planes and catching missiles and shells
      const [vx, vy] = this.orient(0, 0.3);
      this.pBul.push({ x: b.x, y: b.y, vx, vy, kind: 'cloud', form: b.form, life: b.hang, max: b.hang, noHit: true,
        zone: { r: b.cloudR, every: 8, dmg: 0.4 * b.dmg, block: ['seek', 'split'] } });
      Sound.sfx('explode');
    } else if (b.kind === 'diag') {   // four diagonal lasers, each through three planes
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) this.pBul.push({ x: b.x, y: b.y, vx: dx * 5, vy: dy * 5, kind: 'dlaser',
        dmg: 0.6 * b.dmg, form: b.form, pierce: 3, hit: [], life: b.len });
    }
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

  // Effects that aren't bullets: chain lightning, lock-on beams, the hyper beam's charge and heat, and the
  // thunder sword's charge.
  drawGunFx(ctx) {
    for (const a of this.arcs || []) for (let i = 1; i < a.pts.length; i++) this.drawBolt(ctx, a.pts[i - 1], a.pts[i], a.cols, a.t > 4);
    const p = this.player;
    if (!p.alive || p.hidden || this.state !== 'play') return;
    const gun = this.fittedGun(p.form), L = this.gunLevel(gun);
    const [ox, oy] = this.orient(0, -10), nx = Math.round(p.x + ox), ny = Math.round(p.y + oy);
    if (gun === 'lock') for (const l of p.locks || []) this.drawBolt(ctx, [nx, ny], [l.t0.o.x, l.t0.o.y], ['#a04010', C.orange, l.t > 90 ? C.white : C.yellow], true);
    if (gun === 'hyper' && p.hyper) {
      const h = p.hyper, T = this.hyperTimes(L);
      if (h.mode === 'charge' && h.t > 0) {
        const r = 1 + Math.round(4 * h.t / T.full);
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(r + 3, '#a04010'), nx, ny));
        NES.disc(ctx, nx, ny, r, (this.t >> 1) & 1 ? C.yellow : C.orange);
      } else if (h.mode !== 'charge') {   // the heat gauge under the ship
        const k = h.mode === 'fire' ? h.t / T.burst : 1 - h.t / T.cool;
        this.drawBar(ctx, Math.round(p.x) - 10, Math.round(p.y) + 14, 20, 2, k, h.mode === 'fire' ? (k > 0.75 ? C.red : C.orange) : C.gray);
      }
    }
    if (gun === 'sword' && p.swordT > 0) {
      const k = p.swordT / this.swordNeed(L), r = 1 + Math.round(4 * k), full = k >= 1;
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(r + 3, full ? '#a03010' : '#602010'), nx, ny));
      NES.disc(ctx, nx, ny, r, full && (this.t >> 2) & 1 ? C.white : C.orange);
    }
  },
  // A jagged bolt of lightning from a to b: a glow, an edge color and a hot core.
  drawBolt(ctx, a, b, cols, hot) {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8)), pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, j = i && i < n ? 3 : 0;
      pts.push([Math.round(a[0] + (b[0] - a[0]) * k + rand(-j, j)), Math.round(a[1] + (b[1] - a[1]) * k + rand(-j, j))]);
    }
    const line = (w, col) => {
      ctx.fillStyle = col;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
        for (let s = 0; s <= m; s++) ctx.fillRect(Math.round(x0 + (x1 - x0) * s / m) - (w >> 1), Math.round(y0 + (y1 - y0) * s / m) - (w >> 1), w, w);
      }
    };
    SNES.add(ctx, () => line(3, cols[0]));
    line(1, hot ? cols[2] : cols[1]);
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
      case 'pod':       // a fat round: yellow halo, white core
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(3, '#907020'), bx, by));
        ctx.fillStyle = C.yellow; if (horiz) ctx.fillRect(bx - 3, by - 1, 6, 2); else ctx.fillRect(bx - 1, by - 3, 2, 6);
        ctx.fillStyle = C.white; if (horiz) ctx.fillRect(bx, by - 1, 3, 2); else ctx.fillRect(bx - 1, by - 3, 2, 3);
        break;
      case 'needle':
        SNES.add(ctx, () => { ctx.fillStyle = '#806818'; if (horiz) ctx.fillRect(bx - 7, by - 1, 14, 3); else ctx.fillRect(bx - 1, by - 7, 3, 14); });
        ctx.fillStyle = C.white; if (horiz) ctx.fillRect(bx - 6, by, 12, 1); else ctx.fillRect(bx, by - 6, 1, 12);
        break;
      case 'rocket': {  // white body, yellow flame behind it
        const s = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / s, dy = b.vy / s;
        ctx.fillStyle = (this.t >> 1) & 1 ? C.yellow : C.orange;
        ctx.fillRect(Math.round(b.x - dx * 4), Math.round(b.y - dy * 4), 2, 2);
        ctx.fillStyle = C.white;
        for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(b.x - dx * i), Math.round(b.y - dy * i), 1, 1);
        break;
      }
      case 'flame': {   // white-hot near the nose, then yellow, orange and red as it cools
        const k = b.age / ((b.age + (b.life || 0)) || 1), col = k < 0.25 ? C.white : k < 0.5 ? C.yellow : k < 0.75 ? C.orange : C.red, r = k < 0.5 ? 2 : 3;
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(r + 1, '#804010'), bx, by));
        ctx.fillStyle = col; ctx.fillRect(bx - (r >> 1), by - (r >> 1), r, r);
        break;
      }
      case 'freeway':   // a small yellow diamond
        ctx.fillStyle = C.yellow; ctx.fillRect(bx - 1, by, 3, 1); ctx.fillRect(bx, by - 1, 1, 3);
        ctx.fillStyle = C.white; ctx.fillRect(bx, by, 1, 1);
        break;
      case 'flak': NES.disc(ctx, bx, by, 2, (this.t >> 1) & 1 ? C.mint : C.aqua); break;
      case 'cloud': {   // a ring of flak bursts, thinning out as it ends
        const r = b.zone.r, n = b.life > 20 ? 14 : 8;
        SNES.half(ctx, () => NES.disc(ctx, bx, by, Math.round(r * 0.7), '#105840'), 0.4);
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + b.age * 0.05, rr = r * (0.55 + 0.45 * (((i * 7 + b.age) >> 2) % 3) / 2);
          ctx.fillStyle = (i + (this.t >> 2)) & 1 ? C.mint : C.lime;
          ctx.fillRect(Math.round(bx + Math.cos(a) * rr), Math.round(by + Math.sin(a) * rr), 2, 2);
        }
        break;
      }
      case 'diag':
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(4, '#106858'), bx, by));
        NES.disc(ctx, bx, by, 2, C.mint); ctx.fillStyle = C.white; ctx.fillRect(bx, by, 1, 1);
        break;
      case 'dlaser': {  // a short diagonal beam along its flight
        const s = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / s, dy = b.vy / s;
        for (let i = 0; i < 8; i++) { ctx.fillStyle = i < 3 ? C.white : C.lime; ctx.fillRect(Math.round(b.x - dx * i), Math.round(b.y - dy * i), 1, 1); }
        break;
      }
      case 'mortar': {  // a shell seen from above grows as it climbs and shrinks as it falls
        const k = b.T ? Math.sin(Math.PI * Math.min(1, b.age / b.T)) : 0.4;
        NES.disc(ctx, bx, by, Math.round(1 + k * 2), (this.t >> 2) & 1 ? C.mint : C.teal);
        ctx.fillStyle = C.white; ctx.fillRect(bx, by - 1, 1, 1);
        break;
      }
      case 'orbit':
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(4, '#108860'), bx, by));
        NES.disc(ctx, bx, by, 2, (this.t >> 1) & 1 ? C.aqua : C.mint);
        break;
      case 'grenade': NES.disc(ctx, bx, by, 2, (this.t >> 2) & 1 ? C.orange : C.rust); ctx.fillStyle = C.yellow; ctx.fillRect(bx, by - 1, 1, 1); break;
      case 'burn': {    // a patch of flames
        const r = b.zone.r, fade = b.life < 20 ? 0.5 : 1;
        for (let i = 0; i < 6; i++) {
          const x = bx + Math.round((i - 2.5) / 2.5 * r * 0.8), h = Math.round((2 + ((i * 5 + (this.t >> 2)) % 4)) * fade);
          ctx.fillStyle = C.red; ctx.fillRect(x - 1, by - h, 3, h + 1);
          ctx.fillStyle = (i + (this.t >> 2)) & 1 ? C.yellow : C.orange; ctx.fillRect(x, by - h + 1, 1, h);
        }
        break;
      }
      case 'hyper':
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(3, '#a04010'), bx, by));
        ctx.fillStyle = C.orange; if (horiz) ctx.fillRect(bx - 4, by - 1, 8, 2); else ctx.fillRect(bx - 1, by - 4, 2, 8);
        ctx.fillStyle = C.white; if (horiz) ctx.fillRect(bx - 1, by, 4, 1); else ctx.fillRect(bx, by - 3, 1, 4);
        break;
      case 'sword': {   // a long blade: red halo, orange edge, white core
        const s = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / s, dy = b.vy / s, len = Math.round(b.cur || 10);
        const seg = (w, col) => { ctx.fillStyle = col; for (let i = 0; i < len; i += 1) ctx.fillRect(Math.round(b.x - dx * i - w / 2), Math.round(b.y - dy * i - w / 2), w, w); };
        SNES.add(ctx, () => seg(7, '#601808'));
        seg(4, C.orange); seg(2, (this.t >> 1) & 1 ? C.white : C.yellow);
        break;
      }
      case 'pellet': ctx.fillStyle = (this.t + bx) & 1 ? C.orange : C.red; ctx.fillRect(bx - 1, by - 1, 2, 2); ctx.fillStyle = C.yellow; ctx.fillRect(bx, by, 1, 1); break;
      case 'bomb': NES.disc(ctx, bx, by, b.heavy ? 3 : 2, (this.t >> 2) & 1 ? C.lgray : C.gray); ctx.fillStyle = C.red; ctx.fillRect(bx, by - 1, 1, 1); break;
      case 'cluster': NES.disc(ctx, bx, by, 2, (this.t >> 2) & 1 ? C.orange : C.red); break;
      case 'frag': ctx.fillStyle = (this.t >> 1) & 1 ? C.yellow : C.orange; ctx.fillRect(bx - 1, by - 1, 2, 2); break;
      case 'gmissile': NES.drawRot(ctx, SPR.missile, b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI / 2); break;
      default: NES.drawRot(ctx, SPR.missile, b.x, b.y, b.hd + Math.PI / 2);
    }
  },
});
