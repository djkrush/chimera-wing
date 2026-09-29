'use strict';
// Starbase: where the carrier docks in each sector. Pick a planet mission, buy upgrades and hulls,
// check the pilot's status, or open the galaxy map to travel. Also the LEARN SPECIAL screen that
// follows a level-up at levels 2, 5 and 8.
// Menus follow the NES pad: D-pad to choose, A to pick, B to go back.

const UPGRADES = [
  { key: 'weapons', label: 'WEAPONS +1', desc: 'SHOTS HIT HARDER.' },
  { key: 'shields', label: 'SHIELDS +1', desc: 'TAKE ONE MORE HIT.' },
  { key: 'special', label: 'SPECIAL +1', desc: 'ONE MORE SPECIAL PER LEG.' },
];
const upgradePrice = n => 600 * (n + 1);   // each purchase of the same stat costs more

Object.assign(Game, {
  baseUI: null, learnSel: 0,

  // Rows for the current page: { label, right, col, act, info }.
  baseItems() {
    const U = this.baseUI, c = this.camp, S = this.sectorDef();
    const back = { label: 'BACK', act: () => this.basePage('main') };
    if (U.page === 'main') {
      return [
        { label: 'MISSIONS', act: () => this.basePage('missions'), info: 'FLY A MISSION IN ' + S.name + '.' },
        { label: 'SHOP', act: () => this.basePage('shop'), info: 'UPGRADES AND SHIP HULLS.' },
        { label: 'STATUS', act: () => this.basePage('status'), info: 'PILOT, SHIP AND SPECIALS.' },
        { label: 'GALAXY MAP', act: () => this.openMap(), info: 'TRAVEL TO ANOTHER SECTOR.' },
        { label: 'SAVE AND QUIT', act: () => { this.saveCampaign(); this.toTitle(); }, info: 'PROGRESS SAVES AT EVERY DOCKING.' },
      ];
    }
    if (U.page === 'missions') {
      return [...S.planets.map((P, i) => {
        const done = c.cleared[P.id];
        const flyover = P.order === 'sv';
        const boss = flyover ? CAPITALS[P.capital || S.capital].name : BOSSES[P.boss || S.boss].name;
        const how = flyover ? 'SIDE, THEN FLYOVER: ' : (P.approach === 'challenge' ? 'BONUS ' : '') + 'VERTICAL, THEN SIDE: ';
        return { label: P.name, right: done ? 'CLEAR' : 'NEW', col: done ? C.lime : C.gold,
          act: () => this.startMission(i), info: how + boss + (done ? '. HALF PAY.' : '.') };
      }), back];
    }
    if (U.page === 'shop') {
      const rows = UPGRADES.map(u => {
        const max = this.statOf(u.key) >= STAT_CAP, price = upgradePrice(c.up[u.key]);
        return { label: u.label, right: max ? 'MAX' : price + ' CR', col: max ? C.gray : c.money >= price ? C.white : C.gray,
          info: u.desc + ' NOW ' + this.statOf(u.key) + '.', act: () => this.buyUpgrade(u.key) };
      });
      HULLS.forEach((h, i) => {
        const owned = c.hulls.includes(i), sold = SECTORS.some(q => q.id === S.id && q.hull === i);
        if (!owned && !sold) return;
        const mods = ['WPN', 'SHD', 'SPC'].map((t, k) => {
          const v = h[['weapons', 'shields', 'special'][k]];
          return v ? t + (v > 0 ? '+' : '') + v : '';
        }).filter(Boolean).join(' ');
        rows.push({ label: h.name, right: i === c.hull ? 'IN USE' : owned ? 'EQUIP' : h.price + ' CR',
          col: i === c.hull ? C.lime : owned || c.money >= h.price ? C.aqua : C.gray,
          info: (mods || 'NO STAT CHANGES') + ' SPEED ' + Math.round(h.speed * 100) + '%',
          act: () => this.buyHull(i) });
      });
      return [...rows, back];
    }
    return [back];   // status
  },

  basePage(page) {
    this.baseUI = { page, sel: 0 };
    Sound.sfx('move');
  },

  updateBase() {
    this.stateT++;
    const U = this.baseUI, items = this.baseItems(), n = items.length;
    if (Input.just('up')) { U.sel = (U.sel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { U.sel = (U.sel + 1) % n; Sound.sfx('move'); }
    if (U.page !== 'main' && (Input.just('back') || Input.just('special'))) { this.basePage('main'); return; }
    if (this.stateT > 10 && (Input.just('fire') || Input.just('start'))) {
      Sound.sfx('select');
      items[U.sel].act();
    }
  },

  buyUpgrade(key) {
    const c = this.camp, price = upgradePrice(c.up[key]);
    if (this.statOf(key) >= STAT_CAP) { Sound.sfx('denied'); return; }
    if (c.money < price) { Sound.sfx('denied'); this.toast('NOT ENOUGH CREDITS'); return; }
    c.money -= price;
    c.up[key]++;
    Sound.sfx('cash');
    this.saveCampaign();
  },

  buyHull(i) {
    const c = this.camp, h = HULLS[i];
    if (c.hull === i) return;
    if (!c.hulls.includes(i)) {
      if (c.money < h.price) { Sound.sfx('denied'); this.toast('NOT ENOUGH CREDITS'); return; }
      c.money -= h.price;
      c.hulls.push(i);
      Sound.sfx('cash');
    }
    c.hull = i;
    this.toast(h.name + ' READY');
    this.saveCampaign();
  },

  // ---- Drawing ------------------------------------------------------------------------
  // The starbase with the carrier docked alongside. oy shifts it down (behind briefings).
  drawBaseScene(ctx, oy = 0) {
    const S = this.sectorDef(), t = this.t;
    ctx.save();
    ctx.translate(0, oy);
    SNES.add(ctx, () => {                              // the sector's star: layered glow and a hot core
      NES.draw(ctx, SNES.glow(28, SNES.mix(S.col, '#000000', 0.6)), W - 40, 24);
      NES.draw(ctx, SNES.glow(14, S.col), W - 40, 24);
    });
    NES.draw(ctx, SNES.sphere(6, SNES.mix(S.col, '#ffffff', 0.6)), W - 40, 24);
    const P = S.planets[0];                            // one of the sector's planets, turning slowly
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow(40, SNES.mix(this.scenery(P).haze, '#000000', 0.55)), 36, 100));
    SNES.globe(ctx, this.scenery(P).floor, 36, 100, 34, t * 0.004);
    const hx = 132, hy = 58, art = this.stationArt();
    ctx.drawImage(art.back, hx - 82, hy - 32);         // panels, truss and the far half of the ring
    NES.draw(ctx, SNES.sphere(12, '#98a0b0'), hx, hy);  // hub
    ctx.fillStyle = '#58b8f0'; ctx.fillRect(hx - 6, hy - 2, 12, 2);
    ctx.fillStyle = '#2060a0'; ctx.fillRect(hx - 6, hy, 12, 1);
    ctx.drawImage(art.front, hx - 82, hy - 32);        // the near half of the ring and the docking arm
    for (let k = 0; k < 4; k++) {                      // lights running round the near half of the ring
      const a = ((t * 0.01 + k / 4) % 0.5) * TAU;
      ctx.fillStyle = C.yellow; ctx.fillRect(Math.round(hx + Math.cos(a) * 42), Math.round(hy + Math.sin(a) * 11) - 1, 2, 1);
    }
    ctx.fillStyle = (t >> 4) & 1 ? C.red : C.darkred; ctx.fillRect(hx - 1, hy - 16, 2, 2);
    this.drawCarrierSide(ctx, 206, 56, false, 0.36);   // docked at the end of the arm
    ctx.restore();
  },

  // The station, pre-rendered with SNES shading in two layers so the hub sits inside the ring.
  stationArt() {
    if (this.stationImg) return this.stationImg;
    const steel = SNES.ramp('#8890a8'), cell = SNES.ramp('#2858c8');
    const cx = 82, cy = 32;
    const P = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const ring = (g, front) => {
      for (let k = 0; k < 512; k++) {
        const a = k / 512 * TAU, s = Math.sin(a);
        if ((s >= 0) !== front) continue;
        const x = Math.round(cx + Math.cos(a) * 42), y = Math.round(cy + s * 11);
        const r = front ? [steel[4], steel[3], steel[1]] : [steel[2], steel[1], steel[0]];
        P(g, r[0], x, y - 1); P(g, r[1], x, y); P(g, r[2], x, y + 1);
        if (front && k % 32 === 0) P(g, '#f8e070', x, y);   // windows
      }
    };
    const back = SNES.layer(164, 56, g => {
      for (const s of [-1, 1]) {
        P(g, steel[3], cx + (s < 0 ? -76 : 44), cy - 15, 32, 1); P(g, steel[1], cx + (s < 0 ? -76 : 44), cy - 14, 32, 1);   // truss
        for (let k = 0; k < 3; k++) {                   // solar panels: lit cells in a dark frame, with a glint
          const px = cx + s * (48 + k * 9) - (s < 0 ? 8 : 0), py = cy - 20;
          for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) {
            const frame = x === 0 || y === 0 || x === 7 || y === 11 || y === 6 || x === 4;
            P(g, frame ? steel[1] : (x + y) % 9 === 0 ? cell[4] : cell[y < 6 ? 3 : 2], px + x, py + y);
          }
        }
      }
      P(g, steel[1], cx - 42, cy, 84, 1); P(g, steel[1], cx, cy - 11, 1, 22);   // spokes
      ring(g, false);
      SNES.outline(g.canvas);
    });
    const front = SNES.layer(164, 56, g => {
      ring(g, true);
      P(g, steel[3], cx + 12, cy + 14, 60, 1); P(g, steel[2], cx + 12, cy + 15, 60, 1); P(g, steel[0], cx + 12, cy + 16, 60, 1);
      for (let x = 20; x < 72; x += 10) P(g, steel[1], cx + x, cy + 14, 1, 3);   // docking arm struts
      SNES.outline(g.canvas);
    });
    return (this.stationImg = { back, front });
  },

  drawBase(ctx) {
    const S = this.sectorDef(), U = this.baseUI, c = this.camp, items = this.baseItems();
    this.drawBaseScene(ctx);
    NES.text(ctx, S.base, 6, 4, C.white);
    NES.text(ctx, S.name + (c.loop ? ' ECHO ' + c.loop : ''), 6, 13, S.col);
    this.panel(ctx, () => this.drawBaseMenu(ctx));
  },

  drawBaseMenu(ctx) {
    const S = this.sectorDef(), U = this.baseUI, c = this.camp, items = this.baseItems();
    NES.box(ctx, 4, 112, 248, 124, C.black, S.col);
    NES.text(ctx, c.money + ' CR', 10, 117, C.gold);
    NES.text(ctx, 'LV ' + c.level, 128, 117, C.lime, { align: 'center' });
    NES.text(ctx, PILOTS[c.pilot].name, 246, 117, PILOTS[c.pilot].col, { align: 'right' });
    ctx.fillStyle = SNES.mix(S.col, C.black, 0.5); ctx.fillRect(7, 126, 242, 1);
    if (U.page === 'status') { this.drawStatus(ctx); return; }
    const title = { main: 'STARBASE', missions: 'MISSIONS', shop: 'SHOP' }[U.page];
    NES.text(ctx, title, 128, 130, C.gold, { align: 'center' });
    const step = items.length > 7 ? 9 : 11;
    items.forEach((it, i) => {
      const y = 142 + i * step, sel = i === U.sel;
      if (sel) NES.hilite(ctx, 10, y - 2, 236, step - 1);
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 12, y, C.gold);
      NES.text(ctx, it.label, 22, y, sel ? C.white : it.col === C.gray ? C.gray : C.lgray);
      if (it.right) NES.text(ctx, it.right, 242, y, it.col || C.white, { align: 'right' });
    });
    const info = items[U.sel].info;
    if (info) NES.wrap(info, 30).slice(0, 2).forEach((l, i) => NES.text(ctx, l, 10, 214 + i * 9, C.aqua));
  },

  drawStatus(ctx) {
    const c = this.camp, pl = PILOTS[c.pilot];
    this.drawFace(ctx, SPR.pilots[c.pilot], 8, 129, pl.col);
    NES.text(ctx, this.hullDef().name, 56, 132, C.white);
    NES.text(ctx, 'SPEED ' + Math.round(this.speedMul() * 100) + '%', 56, 142, C.lgray);
    this.drawShip(ctx, 0, 226, 140, 0, false, true);
    this.drawXpBar(ctx, 56, 153);
    const stats = [['WEAPONS', 'weapons', C.red], ['SHIELDS', 'shields', C.sky], ['SPECIAL', 'special', C.gold]];
    stats.forEach(([label, key, col], k) => {
      const y = 164 + k * 10, v = this.statOf(key);
      NES.text(ctx, label, 56, y, C.white);
      this.drawStatPips(ctx, 114, y, v, STAT_CAP, col);
      NES.text(ctx, String(v), 216, y, C.white);
    });
    NES.text(ctx, 'SPECIALS', 10, 199, C.gold);
    if (!c.learned.length) NES.text(ctx, 'NONE YET. LEARN AT LV 2.', 80, 199, C.gray);
    c.learned.forEach((idx, i) => {
      NES.draw(ctx, SPR.specialIcons[idx], 84 + i * 50, 202);
      NES.text(ctx, SPECIALS[idx].short, 92 + i * 50, 199, SPECIALS[idx].color);
    });
    if ((this.t >> 4) & 1) NES.text(ctx, 'B: BACK', 246, 224, C.gray, { align: 'right' });
  },

  // ---- Learn a special (after reaching level 2, 5 or 8) ----------------------------------
  openLearn() {
    this.setState('learn');
    this.learnSel = 0;
    Sound.sfx('levelup');
  },

  learnable() { return SPECIALS.map((s, i) => i).filter(i => !this.camp.learned.includes(i)); },

  updateLearn() {
    this.stateT++;
    const L = this.learnable(), n = L.length;
    if (Input.just('up')) { this.learnSel = (this.learnSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.learnSel = (this.learnSel + 1) % n; Sound.sfx('move'); }
    if (this.stateT < 20 || !(Input.just('fire') || Input.just('start'))) return;
    const c = this.camp;
    c.learned.push(L[this.learnSel]);
    c.learnQ--;
    this.lastSpecial = L[this.learnSel];
    Sound.sfx('restore');
    this.toast(SPECIALS[L[this.learnSel]].name + ' LEARNED');
    if (c.learnQ > 0 && this.learnable().length) this.openLearn();
    else { c.learnQ = 0; this.leaveDebrief(); }
  },

  drawLearn(ctx) {
    const center = { align: 'center' }, L = this.learnable();
    NES.box(ctx, 2, 2, 252, 236, C.black, C.lime);
    NES.text(ctx, 'LEVEL ' + this.camp.level + '!', 128, 20, C.lime, { align: 'center', scale: 2, shadow: C.dgreen });
    NES.text(ctx, 'LEARN A NEW SPECIAL ATTACK', 128, 44, C.white, center);
    NES.text(ctx, 'YOU KEEP IT FOR GOOD.', 128, 54, C.lgray, center);
    L.forEach((idx, i) => {
      const s = SPECIALS[idx], y = 74 + i * 16, sel = i === this.learnSel;
      if (sel) NES.hilite(ctx, 22, y - 4, 212, 15);
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 24, y, C.gold);
      NES.draw(ctx, SPR.specialIcons[idx], 40, y + 3);
      NES.text(ctx, s.name, 52, y, sel ? s.color : C.gray);
    });
    const s = SPECIALS[L[this.learnSel]];
    if (s) s.desc.forEach((l, i) => NES.text(ctx, l, 128, 180 + i * 10, C.aqua, center));
    if ((this.t >> 4) & 1) NES.text(ctx, 'SPACE / A: LEARN', 128, 222, C.white, center);
  },
});
