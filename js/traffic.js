'use strict';
// Traffic in vertical stages (1942): groups of planes that fly through the whole leg around the Galaga
// squadrons, and leave instead of forming up. Every traffic plane carries transit: true and a beh that
// updateTraffic() drives; a leg ends when its squadrons are gone, whatever traffic is still about.
// buildTraffic() lays a timeline of groups over the leg; the clock only runs while no squadron is flying
// in (their paths are busy). Between squadrons comes an intermission.

// Group kinds a leg can draw. count = [min, max], gap = frames between planes, band = first difficulty
// band (vband) that sends it, weight = how often it's picked.
const VTRAFFIC = [
  { kind: 'pair', types: ['fighter'], count: [2, 2], gap: 20, from: 'side', beh: 'cross', band: 0, weight: 4 },
  { kind: 'vee', types: ['fighter', 'drone'], count: [3, 5], gap: 0, from: 'top', beh: 'vee', band: 0, weight: 3 },
  { kind: 'gunship', types: ['gunship'], count: [1, 2], gap: 50, from: 'top', beh: 'cross', band: 1, weight: 3 },
  { kind: 'snipers', types: ['sniper'], count: [2, 3], gap: 24, from: 'top', beh: 'park', band: 1, weight: 2 },
];
// Difficulty bands by stage: A 1-4, B 5-9, C 10-14, D 15+. Seconds between groups for each.
const VBANDS = [{ gap: [8, 14] }, { gap: [6, 11] }, { gap: [5, 9] }, { gap: [4, 7] }];

Object.assign(Game, {
  traffic: null, inter: null,

  vband(stage = this.stage) { return stage < 5 ? 0 : stage < 10 ? 1 : stage < 15 ? 2 : 3; },

  // A timeline of groups for a vertical leg: kinds drawn by weight from those the band allows.
  buildTraffic(stage, squads) {
    const b = this.vband(stage), [g0, g1] = VBANDS[b].gap, pool = VTRAFFIC.filter(k => k.band <= b);
    const total = pool.reduce((n, k) => n + k.weight, 0), list = [];
    for (let i = 0; i < 12 * squads; i++) {
      let r = rand(0, total), k = pool[0];
      for (const q of pool) if ((r -= q.weight) < 0) { k = q; break; }
      list.push({ gap: randi(g0 * 60, g1 * 60), kind: k.kind });
    }
    list[0].gap = Math.min(list[0].gap, 240);   // the first group comes soon after the formation is set
    return { list, i: 0, t: 0 };
  },

  // Is a squadron flying in? Traffic waits for it: its paths are busy.
  squadFlyingIn() { return this.stageType === 'normal' && !this.formationReady && !this.inter; },
  trafficCap() { return 4 + Math.floor(this.stage / 3); },

  // Every frame of a vertical leg: count down to the next group and send it when there's room.
  trafficTick() {
    const T = this.traffic;
    if (!T || this.squadFlyingIn()) return;
    const next = T.list[T.i];
    if (!next || ++T.t < next.gap) return;
    const def = VTRAFFIC.find(k => k.kind === next.kind);
    const onScreen = this.enemies.filter(e => e.transit).length;
    if (onScreen + def.count[0] > this.trafficCap() || this.eBul.length >= 30) return;   // keep it fair: try again next frame
    this.spawnTraffic(def);
    T.i++; T.t = 0;
  },

  // A traffic plane: an ordinary enemy with transit set, its own beh and a fire budget.
  trafficPlane(type, x, y, beh, extra = {}) {
    type = this.mixType(type);   // a system's own machines stand in, as in the squadrons
    const hp = Math.round((ENEMY[type].hp + (type === 'heavy' ? this.stage / 2 : 0)) * this.hpMul());
    const acetyl = type !== 'heavy' && this.stage >= 2 && Math.random() < (type === 'gunship' && this.vband() >= 2 ? 0.4 : this.acetylChance());
    const e = { type, hp, maxHp: hp, x, y, vx: 0, vy: 0, ang: Math.PI, state: 'traffic', transit: true, beh, st: 0,
      slot: null, wave: -1, acetyl, holding: -1, flash: 0, fireYs: [], fireTs: [], t: randi(0, 60), dead: false, ...extra };
    e.ammo = this.ammoFor(e);
    this.enemies.push(e);
    return e;
  },

  spawnTraffic(def) {
    const p = this.player, d = this.vband() >= 3 ? 1 : 0;   // band D sends larger groups
    const n = randi(def.count[0], def.count[1] + d), type = pick(def.types);
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
    }
  },

  // Flight of one traffic plane (called by updateEnemies). Once the leg is over they all break off.
  updateTraffic(e) {
    const p = this.player;
    e.st++;
    if (this.state !== 'play' && this.state !== 'gameover') e.beh = 'flee';
    switch (e.beh) {
      case 'cross':
        if (e.drag) e.vy = Math.max(0, e.vy - e.drag);   // gunships level out after the dive in
        if (e.fireTs.length && e.st >= e.fireTs[0]) { e.fireTs.shift(); this.enemyFire(e, 'aim', e.type === 'gunship' ? 2 : undefined, 0.14); }
        break;
      case 'vee':
        if (e.fireYs.length && e.y >= e.fireYs[0]) { e.fireYs.shift(); this.enemyFire(e); }
        if (e.y >= e.turnY) { e.beh = 'climb'; e.hd = Math.PI / 2; }
        break;
      case 'climb': {  // bank outward and climb back up and away
        e.hd += clamp(angDiff(e.hd, e.out < 0 ? -Math.PI * 0.85 : -Math.PI * 0.15), -0.05, 0.05);
        const sp = 1.9;
        e.vx = Math.cos(e.hd) * sp; e.vy = Math.sin(e.hd) * sp;
        break;
      }
      case 'park':
        if (e.phase === 'out') { e.vx = 0; e.vy = Math.max(-1.6, e.vy - 0.05); e.face = Math.PI; break; }
        e.vx = 0; e.vy = clamp((e.py - e.y) * 0.06, 0, 2);
        e.face = Math.PI;
        if (e.vy < 0.1) this.parkFire(e);   // side.js: bursts, then phase 'out'
        break;
      case 'flee':     // the leg is over: everyone heads home
        e.face = undefined;
        e.vy = Math.max(-3, (e.vy || 0) - 0.08);
        break;
    }
    e.x += e.vx; e.y += e.vy;
    if (e.st > 20 && (e.x < -40 || e.x > W + 40 || e.y < -50 || e.y > H + 30)) { e.dead = true; e.left = true; }   // flew off: missed
  },

  // Between squadrons: 6 to 8 seconds of traffic before the next squadron flies in.
  startIntermission() {
    this.inter = { t: randi(360, 480) };
  },
});
