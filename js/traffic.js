'use strict';
// Traffic in vertical stages (1942): groups of planes that fly through the whole leg around the Galaga
// squadrons, and leave instead of forming up. Every traffic plane carries transit: true and a beh that
// updateTraffic() drives; a leg ends when its squadrons are gone, whatever traffic is still about.
// buildTraffic() lays a timeline of groups over the leg; the clock only runs while no squadron is flying
// in (their paths are busy). Between squadrons comes an intermission, and in some legs the HEAVY
// mini-boss arrives in it (kavros 1942's big plane, theonlyrao's boss band).
// Set pieces: the red squadron (shoot all five for a shield cell) and rear attacks, warned at the edge.

// Group kinds a leg can draw. count = [min, max], gap = spacing between planes, band = first difficulty
// band (vband) that sends it, weight = how often it's picked (0: placed by hand, see buildTraffic).
const VTRAFFIC = [
  { kind: 'pair', types: ['fighter'], count: [2, 2], gap: 20, from: 'side', beh: 'cross', band: 0, weight: 4 },
  { kind: 'vee', types: ['fighter', 'drone'], count: [3, 5], gap: 0, from: 'top', beh: 'vee', band: 0, weight: 3 },
  { kind: 'redline', types: ['fighter'], count: [5, 5], gap: 48, from: 'side', beh: 'red', band: 0, weight: 0 },
  { kind: 'gunship', types: ['gunship'], count: [1, 2], gap: 50, from: 'top', beh: 'cross', band: 1, weight: 3 },
  { kind: 'snipers', types: ['sniper'], count: [2, 3], gap: 24, from: 'top', beh: 'park', band: 1, weight: 2 },
  { kind: 'rear', types: ['fighter'], count: [2, 3], gap: 34, from: 'bottom', beh: 'climb', band: 1, weight: 2 },
];
// Difficulty bands by stage: A 1-4, B 5-9, C 10-14, D 15+. Seconds between groups for each.
const VBANDS = [{ gap: [6, 10] }, { gap: [5, 9] }, { gap: [5, 9] }, { gap: [4, 7] }];
const HEAVY_HOLD = 720;   // the heavy leaves after 12 seconds in its band

Object.assign(Game, {
  traffic: null, inter: null,

  vband(stage = this.stage) { return stage < 5 ? 0 : stage < 10 ? 1 : stage < 15 ? 2 : 3; },

  // A timeline of groups for a vertical leg: kinds drawn by weight from those the band allows, plus the
  // red squadrons (one in band A, up to two later) and which intermissions bring a heavy (from stage 3:
  // once a leg, twice from band C).
  buildTraffic(stage, squads) {
    const b = this.vband(stage), [g0, g1] = VBANDS[b].gap, pool = VTRAFFIC.filter(k => k.band <= b && k.weight);
    const total = pool.reduce((n, k) => n + k.weight, 0), list = [];
    for (let i = 0; i < 12 * squads; i++) {
      let r = rand(0, total), k = pool[0];
      for (const q of pool) if ((r -= q.weight) < 0) { k = q; break; }
      list.push({ gap: randi(g0 * 60, g1 * 60), kind: k.kind });
    }
    const reds = b === 0 ? 1 : randi(1, 2);
    for (let k = 0; k < reds; k++) list.splice(k ? randi(3, 6) : randi(0, 1), 0, { gap: randi(g0 * 60, g1 * 60), kind: 'redline' });
    list[0].gap = Math.min(list[0].gap, 240);   // the first group comes soon after the formation is set
    const slots = Array.from({ length: squads - 1 }, (_, i) => i).sort(() => Math.random() - 0.5);
    const heavies = stage < 3 ? [] : slots.slice(0, b >= 2 ? 2 : 1);
    return { list, i: 0, t: 0, heavies };
  },

  // Is a squadron flying in? Traffic waits for it: its paths are busy.
  squadFlyingIn() { return this.stageType === 'normal' && !this.formationReady && !this.inter; },
  trafficCap() { return 4 + Math.floor(this.stage / 3); },

  // Every frame of a vertical leg: bring in a called heavy, count down to the next group and send it
  // when there's room.
  trafficTick() {
    const T = this.traffic, I = this.inter;
    if (!T) return;
    if (I && I.heavy && --I.heavy.t === 0) this.spawnHeavy(I.heavy.x);
    if (this.squadFlyingIn()) return;
    const next = T.list[T.i];
    if (!next || ++T.t < next.gap) return;
    const def = VTRAFFIC.find(k => k.kind === next.kind);
    const onScreen = this.enemies.filter(e => e.transit).length, need = def.kind === 'redline' ? 1 : def.count[0];
    if (onScreen + need > this.trafficCap() || this.eBul.length >= 30) return;   // keep it fair: try again next frame
    this.spawnTraffic(def);
    T.i++; T.t = 0;
  },

  // A traffic plane: an ordinary enemy with transit set, its own beh and a fire budget.
  trafficPlane(type, x, y, beh, extra = {}) {
    type = extra.red ? type : this.mixType(type);   // a system's own machines stand in, as in the squadrons
    const hp = Math.round((ENEMY[type].hp + (type === 'heavy' ? this.stage / 2 : 0)) * this.hpMul());
    const acetyl = type !== 'heavy' && !extra.red && this.stage >= 2 && Math.random() < (type === 'gunship' && this.vband() >= 2 ? 0.4 : this.acetylChance());
    const e = { type, hp, maxHp: hp, x, y, vx: 0, vy: 0, ang: Math.PI, state: 'traffic', transit: true, beh, st: 0,
      slot: null, wave: -1, acetyl, holding: -1, flash: 0, fireYs: [], fireTs: [], t: randi(0, 60), dead: false, ...extra };
    e.ammo = this.ammoFor(e);
    this.tally.n++;
    this.enemies.push(e);
    return e;
  },

  spawnTraffic(def) {
    const p = this.player, b = this.vband(), d = b >= 3 ? 1 : 0;   // band D sends larger groups
    const n = randi(def.count[0], def.count[1] + (def.kind === 'redline' ? 0 : d)), type = pick(def.types);
    switch (def.kind) {
      case 'pair': {   // two MiGs crossing from one side, a little behind each other
        const s = pick([-1, 1]), y = randi(30, 96);
        for (let i = 0; i < n; i++) {
          this.trafficPlane(type, s < 0 ? -16 - i * def.gap : W + 16 + i * def.gap, y + i * 16, 'cross',
            { vx: -s * 2.1, vy: 0.15, fireTs: [randi(40, 150)] });
        }
        break;
      }
      case 'vee': {    // a V dropping in from the top; it breaks outward and climbs away above you
        const x0 = randi(90, W - 90), turn = randi(96, 128);
        for (let i = 0; i < n; i++) {
          const k = Math.ceil(i / 2), s = i % 2 ? -1 : 1;
          this.trafficPlane(type, x0 + s * k * 18, -14 - k * 14, 'vee',
            { vy: 1.5, turnY: turn + k * 14, out: i ? s : pick([-1, 1]), fireYs: [randi(40, 90)] });
        }
        break;
      }
      case 'redline': {   // the red squadron: five in a line, following the leader across (1942)
        const s = pick([-1, 1]), x0 = s < 0 ? -16 : W + 16, g = { n, hit: 0 };
        const y0 = randi(44, 76);
        for (let i = 0; i < n; i++) this.trafficPlane(type, x0 + s * i * def.gap, y0, 'red', { red: g, x0, y0, vx: -s * 2 });
        this.hint('redline');
        break;
      }
      case 'gunship': {   // a diagonal entry from the top that levels out and crosses, firing aimed pairs
        for (let i = 0; i < n; i++) {
          const s = pick([-1, 1]);
          this.trafficPlane(type, s < 0 ? randi(30, 120) : randi(W - 120, W - 30), -20 - i * def.gap, 'cross',
            { vx: -s * 1.0, vy: 1.3, drag: 0.009, fireTs: [70, 150, 230] });
        }
        break;
      }
      case 'snipers': {   // slide down to staggered spots in the top band, snipe until dry, then leave
        for (let i = 0; i < n; i++) {
          const px = clamp(Math.round(W * (i + 1) / (n + 1) + rand(-30, 30)), 30, W - 30);
          this.trafficPlane(type, px, -16 - i * def.gap, 'park', { px, py: randi(26, 58) + (i % 2) * 14 });
        }
        break;
      }
      case 'rear': {      // from behind: an arrow at the bottom edge under each entry, then they climb past you
        const base = clamp(p.x, 40, W - 40), t = b >= 2 ? pick(['fighter', 'gunship']) : 'fighter';
        for (let i = 0; i < n; i++) {
          const x = clamp(Math.round(base + (i - (n - 1) / 2) * def.gap), 16, W - 16);
          this.warns.push({ x, y: H - 16, dir: -Math.PI / 2, t: 50 });
          this.trafficPlane(t, x, H + 20, 'climb', { wait: 50 });
        }
        this.hint('rear');
        break;
      }
    }
  },

  // The mini-boss comes down from the top into its band.
  spawnHeavy(x) {
    const e = this.trafficPlane('heavy', x, -30, 'hold', { phase: 'in', ht: 0, vol: 0 });
    e.face = Math.PI;
    Sound.sfx('dive');
    return e;
  },

  // Flight of one traffic plane (called by updateEnemies). Once the leg is over they all break off.
  updateTraffic(e) {
    const p = this.player;
    e.st++;
    if (this.state !== 'play' && this.state !== 'gameover') e.beh = 'flee';
    switch (e.beh) {
      case 'cross':
        if (e.drag) e.vy = Math.max(0, e.vy - e.drag);   // gunships level out after the dive in
        if (e.fireTs.length && e.st >= e.fireTs[0]) { e.fireTs.shift(); if (e.type === 'gunship') this.enemyFire(e, this.gunshipKind(e), 2, 0.14); else this.enemyFire(e); }
        break;
      case 'vee':
        if (e.fireYs.length && e.y >= e.fireYs[0]) { e.fireYs.shift(); this.enemyFire(e); }
        if (!e.hd && e.y >= e.turnY) e.hd = Math.PI / 2;
        if (e.hd) {   // break outward and climb back up and away
          e.hd += clamp(angDiff(e.hd, e.out < 0 ? -Math.PI * 0.85 : -Math.PI * 0.15), -0.05, 0.05);
          e.vx = Math.cos(e.hd) * 1.9; e.vy = Math.sin(e.hd) * 1.9;
        }
        break;
      case 'red': {    // everyone flies the leader's wave, so the line keeps its shape
        const nx = e.x + e.vx;
        e.vy = e.y0 + Math.sin((nx - e.x0) * 0.025) * 22 - e.y;
        break;
      }
      case 'climb':    // rear attack: waits under its warning, then climbs past and fires once, 40 px above you
        if (e.wait > 0) { e.wait--; e.st = 0; e.vx = 0; e.vy = 0; break; }
        e.vy = e.type === 'gunship' ? -2.1 : -2.7; e.vx = 0;
        if (!e.fired && p.alive && e.y < p.y - 40) { e.fired = true; this.enemyFire(e); }
        break;
      case 'park':
        if (e.phase === 'out') { e.vx = 0; e.vy = Math.max(-1.6, e.vy - 0.05); e.face = Math.PI; break; }
        e.vx = 0; e.vy = clamp((e.py - e.y) * 0.06, 0, 2);
        e.face = Math.PI;
        if (e.vy < 0.1) this.parkFire(e);   // side.js: bursts, then phase 'out'
        break;
      case 'hold': this.updateHeavy(e); break;
      case 'flee':     // the leg is over: everyone heads home
        e.face = undefined;
        e.vy = Math.max(-3, (e.vy || 0) - 0.08);
        break;
    }
    e.x += e.vx; e.y += e.vy;
    const off = e.x < -40 || e.x > W + 40 || e.y < -50 || e.y > H + 30;
    if (!off && e.x > 0 && e.x < W && e.y > 0 && e.y < H) e.seen = true;   // a line queues off screen until it arrives
    if (off && (e.seen || e.st > 900)) { e.dead = true; e.left = true; }   // flew off: missed
    if (e.left && e.type === 'heavy') this.heavyEscaped(e);
  },

  // The heavy: holds a band at the top, picking a new heading every 75 frames inside it, and fires fans,
  // drop curtains and (later) splitting or seeking shells. It leaves after 12 seconds.
  updateHeavy(e) {
    const b = this.vband();
    if (e.phase === 'in') {
      e.vx = 0; e.vy = Math.max(0.4, (52 - e.y) * 0.03);
      if (e.y >= 50) { e.phase = 'hold'; e.vy = 0; }
      return;
    }
    if (e.phase === 'out') { e.face = Math.PI; e.vx *= 0.95; e.vy = Math.max(-1.8, e.vy - 0.04); return; }
    if (e.ht++ % 75 === 0) { e.tx = randi(60, W - 60); e.ty = randi(30, 74); }
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(0.7, d * 0.05);
    e.vx = dx / d * sp; e.vy = dy / d * sp;
    e.face = Math.PI;
    if (e.ht % (b >= 3 ? 50 : 70) === 35) this.heavyFire(e, b);
    if (e.ht >= HEAVY_HOLD) e.phase = 'out';
  },

  heavyFire(e, b) {
    switch (e.vol++ % 3) {
      case 0: this.enemyFire(e, 'aim', b >= 3 ? 7 : 5, 0.22); break;   // a fan
      case 1:                                                           // a drop curtain across its wings
        if (this.state === 'play' && this.eBulRoom('drop') && this.player.alive && !(this.empT > 0) && this.spendAmmo(e, 5)) {
          const v = Math.min(2 + this.stage * 0.08, 3.4) * 0.8;
          for (let i = -2; i <= 2; i++) this.eShot(e.x + i * 9, e.y + 12, 0, v, 'drop');
        }
        break;
      default:                                                          // seekers from band C, splitters from B
        if (b >= 2) this.enemyFire(e, 'seek', 2, 0.7);
        else if (b >= 1) this.enemyFire(e, 'split', 1);
        else this.enemyFire(e, 'aim', 3, 0.3);
    }
  },

  // Shot down: a big blast. Escaped: only the bonus is lost.
  heavyDown(e) {
    this.punch(3, e.x, e.y);
    for (let i = 0; i < 4; i++) this.booms.push({ x: e.x + rand(-18, 18), y: e.y + rand(-12, 12), n: 12, delay: i * 7 });
    this.say('HEAVY DOWN. NICE SHOOTING.', 'mira', true);
  },
  heavyEscaped(e) {
    this.popup(clamp(e.x, 40, W - 40), 24, 'ESCAPED', C.gray);
    Sound.sfx('denied');
  },

  // A red squadron plane down: the fifth drops a shield cell.
  redKill(e) {
    const g = e.red;
    if (++g.hit < g.n) return;
    this.dropCell(e.x, e.y);   // tet.js
    this.addScore(1000);
    this.popup(clamp(e.x, 60, W - 60), e.y - 14, 'SQUADRON BONUS 1000', C.gold);
    Sound.sfx('oneup');
  },

  // Between squadrons: 7 to 9 seconds of traffic before the next squadron flies in. In some legs the heavy
  // is called in first: Mira warns you, an arrow flashes at the top, and the next squadron waits for it.
  startIntermission() {
    const T = this.traffic, I = { t: randi(420, 540) };
    if (T && T.heavies.includes(this.squad)) {
      const x = randi(100, W - 100);
      I.heavy = { t: 50, x };
      this.warns.push({ x, y: 16, dir: Math.PI / 2, t: 50 });
      this.say('HEAVY GUNSHIP INBOUND. BRING IT DOWN BEFORE IT RUNS!', 'mira');
    }
    this.inter = I;
  },
});
