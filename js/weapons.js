'use strict';
// Primary guns. Every hull mounts one gun per form (HULLS[h].guns in pilots.js), so switching form
// switches weapon, and a new hull can change all three. Guns are written in vertical-stage terms
// (up = forward) through shoot(), which turns them to face right in side missions.
// Borrowed from the classics: Raiden's Vulcan, Gradius's Laser and Ripple Laser, R-Type's wave-like
// helix shots, U.N. Squadron's falling bombs.
//   short = name on menus   cd = frames between shots   cap = most bullets of that form on screen at once

const GUNS = {
  twin: { name: 'TWIN CANNON', short: 'TWIN', cd: 9, cap: 5 },
  spread: { name: '3-WAY SPREAD', short: 'SPREAD', cd: 15, cap: 10 },
  homing: { name: 'HOMING MISSILES', short: 'HOMING', cd: 26, cap: 5 },
  laser: { name: 'PIERCING LASER', short: 'LASER', cd: 14, cap: 4 },
  bomb: { name: 'BOMB SHOT', short: 'BOMB', cd: 24, cap: 3 },
  vulcan: { name: 'VULCAN', short: 'VULCAN', cd: 4, cap: 14 },
  wave: { name: 'HELIX WAVE', short: 'WAVE', cd: 12, cap: 8 },
  ripple: { name: 'RIPPLE LASER', short: 'RIPPLE', cd: 16, cap: 6 },
};

Object.assign(Game, {
  fireWeapon() {
    const p = this.player, f = p.form, gun = this.hullDef().guns[f], G = GUNS[gun], hyper = this.hyperT > 0;
    const k = this.gunPower() * (hyper ? 1.5 : 1);
    if (this.pBul.filter(b => b.form === f).length >= G.cap * (hyper ? 2 : 1)) return;
    switch (gun) {
      case 'twin':
        for (const ox of [-3, 3]) this.shoot(ox, -6, 0, -6, { kind: 'shot', dmg: k, form: f });
        this.shots += 2; Sound.sfx('shoot');
        break;
      case 'spread':
        for (const a of [-0.22, 0, 0.22]) this.shoot(0, -6, Math.sin(a) * 5, -Math.cos(a) * 5, { kind: 'spread', dmg: k, form: f });
        this.shots += 3; Sound.sfx('spread');
        break;
      case 'homing':
        for (const s of [-1, 1]) {
          const hd = -Math.PI / 2 + s * 0.9;
          this.shoot(s * 6, -4, Math.cos(hd) * 1.2, Math.sin(hd) * 1.2, { hd, spd: 1.2, kind: 'missile', dmg: 2 * k, form: f, life: 150, target: null });
        }
        this.shots += 2; Sound.sfx('missile');
        break;
      case 'laser':   // pierces up to three planes
        this.shoot(0, -8, 0, -9, { kind: 'laser', dmg: 1.2 * k, form: f, pierce: 3, hit: [] });
        this.shots++; Sound.sfx('spread');
        break;
      case 'bomb': {  // forward in vertical stages; in side missions it drops in an arc onto the ground
        const b = this.shoot(0, -6, 0, this.isSide ? -3 : -3.2, { kind: 'bomb', dmg: 2 * k, form: f, life: 70 });
        if (this.isSide) { b.vy = 0.6; b.grav = true; b.life = 200; }
        this.shots++; Sound.sfx('missile');
        break;
      }
      case 'vulcan': {
        const a = rand(-0.07, 0.07);
        this.shoot(randi(-2, 2), -6, Math.sin(a) * 7, -Math.cos(a) * 7, { kind: 'vulcan', dmg: 0.45 * k, form: f });
        this.shots++; if (this.t % 2) Sound.sfx('shoot');
        break;
      }
      case 'wave':    // two shots twisting round each other, like a double helix
        for (const ph of [0, Math.PI]) this.shoot(0, -6, 0, -4.5, { kind: 'wave', dmg: 0.8 * k, form: f, ph, rad: 3 });
        this.shots += 2; Sound.sfx('spread');
        break;
      case 'ripple':  // a ring that widens as it flies
        this.shoot(0, -8, 0, -4, { kind: 'ripple', dmg: 1.1 * k, form: f, rad: 3, pierce: 2, hit: [], life: 70 });
        this.shots++; Sound.sfx('spread');
        break;
    }
    const cd = G.cd * (1 - 0.1 * this.upLevel('cooler')) * (this.hasPassive('overclock') ? 0.85 : 1) * (hyper ? 0.5 : 1);
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
        if (b.target) b.hd += clamp(angDiff(b.hd, Math.atan2(b.target.y - b.y, b.target.x - b.x)), -0.12, 0.12);
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
        const s = Math.hypot(b.vx, b.vy) || 1, sway = Math.cos(b.age * 0.3 + b.ph) * 2.2;
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
    if (b.kind === 'ripple') b.rad = Math.min(14, 3 + b.age * 0.3);
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
    }
  },

  // A bomb bursts: everything close by takes a share of the blast.
  bombBlast(b) {
    const R = 22, d = b.dmg * 0.6;
    this.explode(b.x, b.y, 10, [C.red, C.orange, C.yellow, C.white]);
    Sound.sfx('explode');
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < R + ENEMY[e.type].hit) this.damageEnemy(e, d, b.form);
    const B = this.boss;
    if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead && Math.hypot(pt.x - b.x, pt.y - b.y) < R + pt.r) this.damageBossPart(pt, d, b.form, pt.x, pt.y);
    for (const q of this.capitalOnScreen()) if (Math.hypot(q.x - b.x, q.y - b.y) < R + q.r) this.damageCapTarget(q, d, b.form, q.x, q.y);
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
    if (b.kind === 'cluster') this.burstCluster(b);
    if (b.kind === 'bomb') this.bombBlast(b);
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
      case 'spread': ctx.fillStyle = C.aqua; ctx.fillRect(bx - 1, by - 1, 2, 2); break;
      case 'vulcan':
        ctx.fillStyle = C.orange;
        if (horiz) ctx.fillRect(bx - 2, by, 4, 1); else ctx.fillRect(bx, by - 2, 1, 4);
        break;
      case 'laser':
        SNES.add(ctx, () => { ctx.fillStyle = '#2060c0'; if (horiz) ctx.fillRect(bx - 8, by - 1, 16, 3); else ctx.fillRect(bx - 1, by - 8, 3, 16); });
        ctx.fillStyle = C.ice;
        if (horiz) ctx.fillRect(bx - 7, by, 14, 1); else ctx.fillRect(bx, by - 7, 1, 14);
        break;
      case 'wave':
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(3, '#a02890'), bx, by));
        ctx.fillStyle = C.pink; ctx.fillRect(bx - 1, by - 1, 2, 2);
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
