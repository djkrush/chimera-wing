'use strict';
// Special weapons. The pilot learns one at every even level (skills.js) and equips one learned special
// before each mission. Every takeoff rearms it with as many uses as the SPECIAL stat (pilots.js).
// The later ones come from the classics: Macross's missile swarms (BARRAGE), R-Type's Force (FORCE
// POD), DoDonPachi's hyper mode (HYPER), and the bullet-cancelling and time-slowing bombs of many
// modern shooters.

const SPECIALS = [
  { id: 'laser', name: 'THUNDER LASER', short: 'LSR', color: C.aqua,
    desc: ['A ONE-SECOND BEAM THAT', 'PIERCES EVERYTHING AHEAD.'] },
  { id: 'cluster', name: 'CLUSTER BOMB', short: 'CLU', color: C.orange,
    desc: ['3 BOMBS. EACH BURSTS INTO', '8 FRAGMENTS ON IMPACT.'] },
  { id: 'crush', name: 'MEGA CRUSH', short: 'MGC', color: C.white,
    desc: ['HITS EVERY ENEMY ON SCREEN', 'AND ERASES ENEMY BULLETS.'] },
  { id: 'shield', name: 'GENE SHIELD', short: 'SHD', color: C.lime,
    desc: ['5-SECOND BARRIER. BLOCKS', 'BULLETS AND METHYL BEAMS.'] },
  { id: 'tet', name: 'TET BURST', short: 'TET', color: C.mint,
    desc: ['RESTORES EVERY SILENCED', 'FORM AND STOPS BEAMS.'] },
  { id: 'wingman', name: 'WINGMAN', short: 'WNG', color: C.sky,
    desc: ['A DRONE FLIES WITH YOU FOR', '10 SECONDS AND COPIES SHOTS.'] },
  { id: 'barrage', name: 'MISSILE BARRAGE', short: 'BRG', color: C.lgray,
    desc: ['12 HOMING MISSILES FAN OUT', 'AND HUNT DOWN TARGETS.'] },
  { id: 'chrono', name: 'CHRONO FIELD', short: 'CHR', color: C.periwinkle,
    desc: ['FOR 5 SECONDS THE ENEMY', 'MOVES AT HALF SPEED.'] },
  { id: 'emp', name: 'EMP BLAST', short: 'EMP', color: C.ice,
    desc: ['ERASES BULLETS. NO ENEMY', 'GUN FIRES FOR 5 SECONDS.'] },
  { id: 'reflect', name: 'REFLECT FIELD', short: 'RFL', color: C.white,
    desc: ['4 SECONDS: BULLETS THAT', 'COME CLOSE BOUNCE BACK.'] },
  { id: 'gravity', name: 'GRAVITY BOMB', short: 'GRV', color: C.violet,
    desc: ['A SMALL BLACK HOLE PULLS', 'IN PLANES AND BULLETS.'] },
  { id: 'pod', name: 'FORCE POD', short: 'POD', color: C.orange,
    desc: ['12 SECONDS: A POD AHEAD OF', 'YOU BLOCKS AND SHOOTS.'] },
  { id: 'hyper', name: 'HYPER MODE', short: 'HYP', color: C.gold,
    desc: ['6 SECONDS: DOUBLE FIRE', 'RATE, +50% DAMAGE.'] },
];

Object.assign(Game, {
  hangarSel: 0, hangarRow: 0,

  // Timers and objects of the specials that last a while. Cleared at every takeoff and docking.
  clearSpecialFx() {
    this.chronoT = 0; this.empT = 0; this.reflectT = 0; this.podT = 0; this.hyperT = 0; this.grav = null;
  },

  // The hangar opens before every sortie: one row per form to fit a gun, the special row (specials and
  // ordnance) and the module row (arsenal.js).
  openHangar() {
    this.setState('hangar');
    this.hangarRow = 0;
    const o = this.specialOptions(), last = this.camp.ordLast;
    this.hangarSel = Math.max(0, o.findIndex(q => (last ? q.ord === last : q.idx === this.lastSpecial)));
  },

  // What the SPECIAL row offers: learned specials, then stocked ordnance this hull can carry.
  specialOptions() {
    const c = this.camp;
    return [...c.learned.map(idx => ({ idx })), ...ORDNANCE.filter(o => this.ordStock(o.id) > 0 && this.ordAllowed(o.id)).map(o => ({ ord: o.id }))];
  },
  // What the MODULE row offers: nothing, or a module you own.
  moduleOptions() { return [null, ...MODULES.filter(m => (this.camp.mods || []).includes(m.id)).map(m => m.id)]; },

  // Rows shown: 0-2 = the forms' guns, 3 = SPECIAL (once there's something for it), 4 = MODULE (once you own one).
  hangarRowIds() {
    const r = [0, 1, 2];
    if (this.specialOptions().length) r.push(3);
    if (this.moduleOptions().length > 1) r.push(4);
    return r;
  },
  hangarRows() { return this.hangarRowIds().length; },

  updateHangar() {
    this.stateT++;
    const n = this.hangarRows();
    if (Input.just('up')) { this.hangarRow = (this.hangarRow + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.hangarRow = (this.hangarRow + 1) % n; Sound.sfx('move'); }
    if (Input.just('left')) this.hangarChange(-1);
    if (Input.just('right')) this.hangarChange(1);
    if (this.stateT > 12 && Input.just('fire')) this.launchHangar();
  },

  // Guns form f can take: the hull's start gun and its upgrade, once owned (weapons.js: hullGuns).
  hangarGuns(f) { return this.hullGuns(this.camp.hull, f); },
  // Why form f's gun can't change: no upgrade on this hull, not built yet, or not bought.
  hangarLocked(f) {
    const up = HULLS[this.camp.hull].fit[f][1];
    return !up ? 'THE CHIMERA HAS ONE GUN PER FORM' : GUNS[up].wip ? GUNS[up].short + ' IS COMING SOON' : 'BUY THE ' + GUNS[up].short + ' AT A MARKET';
  },

  // Step the picked row's gun (or the special) by dir.
  hangarChange(dir) {
    const c = this.camp, r = this.hangarRowIds()[this.hangarRow];
    if (r === 3) {
      const n = this.specialOptions().length;
      if (n < 2) { Sound.sfx('denied'); return; }
      this.hangarSel = (this.hangarSel + dir + n) % n;
    } else if (r === 4) {
      const list = this.moduleOptions(), i = list.indexOf(this.fittedModule() ? c.mod : null);
      c.mod = list[(i + dir + list.length) % list.length];
    } else {
      const list = this.hangarGuns(r);
      if (list.length < 2) { Sound.sfx('denied'); this.toast(this.hangarLocked(r)); return; }
      const fit = [0, 1, 2].map(f => this.fittedGun(f));
      fit[r] = list[(list.indexOf(fit[r]) + dir + list.length) % list.length];
      c.fit[c.hull] = fit;
    }
    Sound.sfx('move');
  },

  // Ordnance is loaded here: up to its carry limit comes out of stock, and it isn't rearmed between legs.
  launchHangar() {
    const c = this.camp, sel = this.specialOptions()[this.hangarSel];
    if (!sel) this.special = null;
    else if (sel.ord) {
      const n = Math.min(this.ordStock(sel.ord), ORD_BY_ID[sel.ord].carry);
      c.ord[sel.ord] -= n;
      c.ordLast = sel.ord;
      this.special = { ord: sel.ord, ammo: n, cd: 0 };
    } else {
      this.lastSpecial = sel.idx;
      c.ordLast = null;
      this.special = { idx: sel.idx, ammo: this.specialAmmo(), cd: 0 };
    }
    Sound.sfx('select');
    this.saveCampaign();
    this.startSortie();
  },

  useSpecial() {
    const sp = this.special, p = this.player;
    if (!sp || !p.alive || sp.cd > 0) return;
    if (sp.ammo <= 0) {
      Sound.sfx('denied');
      this.popup(p.x, p.y - 14, 'NO AMMO', C.gray);
      sp.cd = 20;
      return;
    }
    sp.ammo--;
    if (sp.ord) { if (!this.useOrdnance(sp)) sp.ammo++; return; }   // arsenal.js
    this.shots++;
    switch (SPECIALS[sp.idx].id) {
      case 'laser':
        this.laser = { t: 60 };
        sp.cd = 60;
        Sound.sfx('charge');
        break;
      case 'cluster':
        for (const vx of [-1, 0, 1]) this.shoot(0, -8, vx, -3.5, { kind: 'cluster', dmg: 3, form: -1, life: 34 });
        this.shots += 2;   // three bombs per use
        sp.cd = 15;
        Sound.sfx('missile');
        break;
      case 'crush':
        this.megaCrush();
        sp.cd = 45;
        break;
      case 'shield':
        p.shieldT = 300;
        sp.cd = 30;
        Sound.sfx('restore');
        break;
      case 'tet':
        this.tetBurst();
        sp.cd = 60;
        break;
      case 'wingman':
        this.wingT = 600;
        sp.cd = 30;
        Sound.sfx('oneup');
        break;
      case 'barrage':
        for (let i = 0; i < 12; i++) {
          const hd = -Math.PI / 2 + (i - 5.5) * 0.26;
          this.shoot(0, -4, Math.cos(hd) * 1.5, Math.sin(hd) * 1.5,
            { hd, spd: 1.5, kind: 'missile', dmg: 2 * this.gunPower(), form: -1, life: 160, target: null });
        }
        sp.cd = 40;
        Sound.sfx('missile');
        break;
      case 'chrono':
        this.chronoT = 300;
        sp.cd = 40;
        Sound.sfx('charge');
        break;
      case 'emp':
        this.empT = 300;
        for (const b of this.eBul) this.spark(b.x, b.y, C.ice, 1);
        this.eBul = [];
        for (const e of this.enemies) {   // jammed beams shut off too
          if (e.state === 'beam') e.beamT = Math.max(e.beamT, 160);
          if (e.phase === 'beam') e.beamT = Math.max(e.beamT, 150);
        }
        if (this.boss && this.boss.beamT > 0) { this.boss.beamT = 0; this.boss.beamCd = 200; }
        this.crushT = 6;
        sp.cd = 45;
        Sound.sfx('boom');
        break;
      case 'reflect':
        this.reflectT = 240;
        sp.cd = 30;
        Sound.sfx('restore');
        break;
      case 'gravity': {
        const [ox, oy] = this.orient(0, -80);
        this.grav = { x: clamp(p.x + ox, 20, W - 20), y: clamp(p.y + oy, 20, H - 30), t: 180 };
        sp.cd = 45;
        Sound.sfx('charge');
        break;
      }
      case 'pod':
        this.podT = 720;
        sp.cd = 30;
        Sound.sfx('transform');
        break;
      case 'hyper':
        this.hyperT = 360;
        sp.cd = 30;
        Sound.sfx('levelup');
        break;
    }
  },

  // TET enzymes strip methyl marks: every silenced form comes back and beams on screen stop.
  tetBurst() {
    const p = this.player;
    this.tetT = 20;
    for (let f = 0; f < 3; f++) if (p.silenced[f]) this.restoreForm(f);
    for (const e of this.enemies) {
      e.holding = -1;
      if (e.state === 'beam') e.beamT = Math.max(e.beamT, 160);
      if (e.phase === 'beam') e.beamT = Math.max(e.beamT, 150);
    }
    if (this.boss && this.boss.beamT > 0) { this.boss.beamT = 0; this.boss.beamCd = 200; }
    Sound.sfx('restore');
  },

  // Where the Wingman drone flies: behind and to one side of the ship.
  wingOffset() { return this.orient(-26, 10); },
  // The Force Pod rides just ahead of the nose.
  podOffset() { return this.orient(0, -22); },

  // The lasting specials that touch bullets and planes (called from collide()).
  specialCollide() {
    const p = this.player;
    if (!p.alive) return;
    if (this.reflectT > 0) {   // REFLECT FIELD: close bullets turn round and become ours
      for (const b of this.eBul) {
        if (b.dead || Math.hypot(b.x - p.x, b.y - p.y) > 26) continue;
        b.dead = true;
        this.pBul.push({ x: b.x, y: b.y, vx: -b.vx * 1.6, vy: -b.vy * 1.6, kind: 'spread', dmg: this.gunPower(), form: -1 });
      }
    }
    if (this.podT > 0) {       // FORCE POD: blocks bullets, grinds planes it touches
      const [ox, oy] = this.podOffset(), x = p.x + ox, y = p.y + oy;
      for (const b of this.eBul) if (!b.dead && Math.hypot(b.x - x, b.y - y) < 8) { b.dead = true; this.spark(b.x, b.y, C.orange, 2); }
      if (this.t % 4 === 0) for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 14) this.damageEnemy(e, 0.5 * this.gunPower(), -1);
    }
    const G = this.grav;
    if (G) {                    // GRAVITY BOMB: pulls in flying planes and bullets, crushes what reaches the middle
      for (const b of this.eBul) {
        const dx = G.x - b.x, dy = G.y - b.y, d = Math.hypot(dx, dy);
        if (d < 10) b.dead = true; else if (d < 110) { b.x += dx / d * 2; b.y += dy / d * 2; }
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = G.x - e.x, dy = G.y - e.y, d = Math.hypot(dx, dy);
        if (e.state !== 'form' && e.beh !== 'ground' && e.beh !== 'tank' && d < 100 && d > 2) { e.x += dx / d * 1.2; e.y += dy / d * 1.2; }
        if (d < 20 && this.t % 4 === 0) this.damageEnemy(e, 0.6 * this.gunPower(), -1);
      }
      if (this.t % 6 === 0) {
        const B = this.boss;
        if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead && Math.hypot(pt.x - G.x, pt.y - G.y) < 40 + pt.r) this.damageBossPart(pt, 1, -1, pt.x, pt.y);
        for (const q of this.capitalOnScreen()) if (Math.hypot(q.x - G.x, q.y - G.y) < 40 + q.r) this.damageCapTarget(q, 1, -1, q.x, q.y);
      }
    }
  },

  drawWingman(ctx) {
    const p = this.player, [wx, wy] = this.wingOffset();
    NES.draw(ctx, this.isSide ? SPR.wingSide : SPR.wing, p.x + wx, p.y + wy);
  },

  burstCluster(b) {
    this.explode(b.x, b.y, 8, [C.red, C.orange, C.yellow]);
    Sound.sfx('explode');
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      this.pBul.push({ x: b.x, y: b.y, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, kind: 'frag', dmg: 2, form: -1, life: 18 });
    }
  },

  megaCrush() {
    this.crushT = 16;
    this.punch(3);
    Sound.sfx('boom');
    for (const b of this.eBul) this.spark(b.x, b.y, C.white, 1);
    this.eBul = [];
    for (const e of this.enemies) {
      if (!e.dead && e.x > -8 && e.x < W + 8 && e.y > -8 && e.y < H + 8) this.damageEnemy(e, 6, -1);
    }
    const B = this.boss;
    if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead) this.damageBossPart(pt, 20, -1, pt.x, pt.y);
    for (const q of this.capitalOnScreen()) this.damageCapTarget(q, 8, -1, q.x, q.y);
  },

  // Is (x, y) inside the Thunder Laser beam? r = target radius.
  inLaser(x, y, r) {
    const p = this.player;
    if (this.isSide) return x > p.x && Math.abs(y - p.y) < 4 + r;
    return y < p.y && Math.abs(x - p.x) < 4 + r;
  },

  updateSpecial() {
    const sp = this.special, p = this.player;
    if (sp && sp.cd > 0) sp.cd--;
    if (p.shieldT > 0) p.shieldT--;
    if (this.crushT > 0) this.crushT--;
    if (this.wingT > 0) this.wingT--;
    if (this.tetT > 0) this.tetT--;
    for (const k of ['chronoT', 'empT', 'reflectT', 'podT', 'hyperT']) if (this[k] > 0) this[k]--;
    if (this.grav && --this.grav.t <= 0) { this.explode(this.grav.x, this.grav.y, 16, [C.violet, C.purple, C.white]); this.grav = null; }
    const L = this.laser;
    if (!L) return;
    if (--L.t <= 0 || !p.alive) { this.laser = null; return; }
    if (L.t % 3 !== 0) return;
    for (const e of this.enemies) {
      if (!e.dead && this.inLaser(e.x, e.y, ENEMY[e.type].hit)) this.damageEnemy(e, 1, -1);
    }
    const B = this.boss;
    if (B && !B.dying && !B.entering) {
      for (const pt of B.parts) if (!pt.dead && this.inLaser(pt.x, pt.y, pt.r)) this.damageBossPart(pt, 1, -1, pt.x, pt.y);
    }
    for (const q of this.capitalOnScreen()) if (this.inLaser(q.x, q.y, q.r)) this.damageCapTarget(q, 1, -1, q.x, q.y);
  },

  drawSpecialFx(ctx, layer) {
    const p = this.player;
    if (layer === 'under') {
      if (!this.laser || !p.alive) return;
      const x = Math.round(p.x), y = Math.round(p.y);
      const w = 5 + ((this.t >> 1) & 1) * 2;
      ctx.fillStyle = C.aqua;
      if (this.isSide) ctx.fillRect(x + 8, y - (w >> 1), W, w); else ctx.fillRect(x - (w >> 1), 0, w, y - 8);
      ctx.fillStyle = C.white;
      if (this.isSide) ctx.fillRect(x + 8, y - 1, W, 3); else ctx.fillRect(x - 1, 0, 3, y - 8);
      return;
    }
    if (this.chronoT > 0 && (this.chronoT > 60 || (this.t >> 2) & 1)) {   // a blue cast over the world
      SNES.half(ctx, () => { ctx.fillStyle = '#1830a0'; ctx.fillRect(0, 0, W, H); }, 0.18);
    }
    if (this.empT > 0 && this.t % 3 === 0) for (const e of this.enemies) if (Math.random() < 0.2) this.spark(e.x, e.y, C.ice, 1);
    if (p.alive && this.reflectT > 0 && (this.reflectT > 60 || (this.t >> 2) & 1)) {
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * TAU - this.t * 0.1;
        ctx.fillStyle = k % 3 ? C.white : C.lgray;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * 22), Math.round(p.y + Math.sin(a) * 22), 1, 1);
      }
    }
    if (p.alive && this.podT > 0 && (this.podT > 90 || (this.t >> 2) & 1)) {
      const [ox, oy] = this.podOffset(), x = p.x + ox, y = p.y + oy;
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(6 + ((this.t >> 2) & 1), '#a04810'), x, y));
      NES.draw(ctx, SNES.sphere(4, C.orange), x, y);
      ctx.fillStyle = C.white; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 1);
    }
    if (p.alive && this.hyperT > 0 && this.t % 3 === 0) this.spark(p.x + rand(-6, 6), p.y + rand(-6, 6), C.gold, 1);
    const G = this.grav;
    if (G) {                                     // a black core in a swirl of violet
      for (let k = 0; k < 30; k++) {
        const a = k / 30 * TAU + this.t * 0.15, r = 8 + ((k * 7 + this.t) % 24);
        ctx.fillStyle = k % 2 ? C.violet : C.purple;
        ctx.fillRect(Math.round(G.x + Math.cos(a) * r), Math.round(G.y + Math.sin(a) * r), 1, 1);
      }
      NES.disc(ctx, G.x, G.y, 6, C.black);
      NES.disc(ctx, G.x, G.y, 3, '#100020');
    }
    if (p.alive && p.shieldT > 0 && (p.shieldT > 60 || (this.t >> 2) & 1)) {
      for (let k = 0; k < 20; k++) {
        const a = k / 20 * TAU + this.t * 0.08;
        ctx.fillStyle = k % 2 ? C.aqua : C.lime;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * 12), Math.round(p.y + Math.sin(a) * 12), 2, 2);
      }
    }
    if (this.tetT > 0) {
      const r = (20 - this.tetT) * 12;
      ctx.fillStyle = (this.t >> 1) & 1 ? C.lime : C.mint;
      for (let k = 0; k < 40; k++) {
        const a = k / 40 * TAU;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 2, 2);
      }
    }
    if (this.crushT > 12) {
      ctx.fillStyle = C.white;
      ctx.fillRect(0, 0, W, H);
    } else if (this.crushT > 0) {
      const r = (16 - this.crushT) * 20;
      ctx.fillStyle = C.yellow;
      for (let k = 0; k < 48; k++) {
        const a = k / 48 * TAU;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 3, 3);
      }
    }
  },

  drawHangar(ctx) {
    const center = { align: 'center' }, H = this.hullDef(), ids = this.hangarRowIds(), row = ids[this.hangarRow], blink = (this.t >> 3) & 1;
    const opts = this.specialOptions(), pick = opts[this.hangarSel] || opts[0], mods = this.moduleOptions(), M = this.fittedModule();
    NES.box(ctx, 8, 20, 240, 206, C.black, C.gold);
    NES.text(ctx, 'HANGAR: MISSION LOADOUT', 128, 26, C.gold, center);
    NES.text(ctx, H.name, 128, 36, C.lgray, center);
    ids.forEach((r, k) => {
      const y = 48 + k * 22, sel = r === row;
      if (sel) NES.hilite(ctx, 14, y - 3, 228, 20);
      if (sel && blink) NES.text(ctx, '>', 13, y, C.gold);
      const arrows = sel && (r < 3 ? this.hangarGuns(r).length : r === 3 ? opts.length : mods.length) > 1;
      if (arrows) { NES.text(ctx, '<', 90, y, C.gold); NES.text(ctx, '>', 232, y, C.gold); }
      if (r < 3) {   // line 1: form and gun; line 2: start or upgrade, the other gun, and the level bought
        const g = this.fittedGun(r), G = GUNS[g], lv = this.gunLevel(g), [st, up] = H.fit[r], other = g === st ? up : st;
        NES.text(ctx, FORMS[r].name, 22, y, H.form[r] > 1 ? C.lime : H.form[r] < 1 ? C.orange : C.white);
        NES.text(ctx, G.name, 100, y, sel ? C.white : C.lgray);
        NES.text(ctx, g === st ? 'START' : 'UPGRADE', 22, y + 9, C.gray);
        const alt = !other ? ['NO UPGRADE', C.gray] : this.hangarGuns(r).includes(other) ? ['OR ' + GUNS[other].short, C.lime]
          : [GUNS[other].wip ? GUNS[other].short + ' SOON' : 'BUY ' + GUNS[other].short, C.gray];
        NES.text(ctx, alt[0], 100, y + 9, alt[1]);
        NES.text(ctx, 'LV' + lv, 240, y + 9, lv >= 5 ? C.gold : C.aqua, { align: 'right' });
      } else if (r === 3) {   // a special (uses per leg) or ordnance (loaded now / in stock)
        NES.text(ctx, 'SPECIAL', 22, y, C.white);
        NES.text(ctx, (opts.indexOf(pick) + 1) + '/' + opts.length, 22, y + 9, C.gray);
        if (pick.ord) {
          const o = ORD_BY_ID[pick.ord], st = this.ordStock(o.id);
          NES.text(ctx, o.name, 100, y, sel ? C.white : C.lgray);
          NES.draw(ctx, SPR.ordIcons[o.family], 104, y + 12);
          NES.text(ctx, 'X' + Math.min(st, o.carry) + '/' + st, 240, y + 9, C.orange, { align: 'right' });
        } else {
          const S = SPECIALS[pick.idx];
          NES.text(ctx, S.name, 100, y, sel ? C.white : C.lgray);
          NES.draw(ctx, SPR.specialIcons[pick.idx], 104, y + 12);
          NES.text(ctx, 'X' + this.specialAmmo(), 240, y + 9, S.color, { align: 'right' });
        }
      } else {
        NES.text(ctx, 'MODULE', 22, y, C.white);
        NES.text(ctx, M ? M.name : 'NONE', 100, y, sel ? C.white : C.lgray);
        if (M) NES.text(ctx, M.kind === 'barrier' ? M.hits + (M.hits > 1 ? ' HITS' : ' HIT') : 'ESCORT', 240, y + 9, C.sky, { align: 'right' });
      }
    });
    let lines, extra, col = C.lgray;
    if (row < 3) {
      const g = this.fittedGun(row), G = GUNS[g], lv = this.gunLevel(g);
      lines = G.desc; extra = G.wip ? 'NOT BUILT YET: FIRES AS ' + GUNS[this.gunAct(g)].short : lv >= 5 ? 'MAX LEVEL' : 'LV' + (lv + 1) + ' AT MARKETS: ' + G.lv[lv - 1];
      col = G.wip ? C.orange : lv >= 5 ? C.gold : C.lime;
    } else if (row === 3 && pick.ord) {
      lines = NES.wrap(ORD_BY_ID[pick.ord].desc, 26).slice(0, 2); extra = 'UNUSED ONES COME BACK';
    } else if (row === 3) {
      lines = SPECIALS[pick.idx].desc; extra = 'FIRE IT WITH: C KEY / PAD B';
    } else {
      lines = M ? NES.wrap(M.desc, 26).slice(0, 2) : ['NO MODULE FITTED.']; extra = 'BUY MODULES AT MARKETS';
    }
    lines.forEach((l, i) => NES.text(ctx, l, 128, 162 + i * 9, C.aqua, center));
    NES.text(ctx, extra, 128, 182, col, center);
    NES.text(ctx, 'D-PAD: PICK AND CHANGE', 128, 196, C.gray, center);
    if ((this.t >> 4) & 1) NES.text(ctx, 'SPACE / A: LAUNCH', 128, 210, C.white, center);
  },

  // Tap a row to pick it; tap the picked row's left or right half to change it; tap LAUNCH to go.
  tapHangar(x, y) {
    if (y >= 204 && y < 222) { this.launchHangar(); return; }
    const r = Math.floor((y - 45) / 22);
    if (y < 45 || r < 0 || r >= this.hangarRows()) return;
    if (r !== this.hangarRow) { this.hangarRow = r; Sound.sfx('move'); } else this.hangarChange(x < 128 ? -1 : 1);
  },

  // First visible row of a scrolling list of n rows showing vis at a time, keeping sel in view.
  listTop(n, sel, vis) { return clamp(sel - (vis >> 1), 0, Math.max(0, n - vis)); },
});
