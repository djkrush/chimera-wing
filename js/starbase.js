'use strict';
// Starbase: the orbital station over each planet, where the carrier docks. Fly the planet's missions,
// shop at its market (every planet stocks different upgrades, and some have a shipyard), check the
// pilot's status and skills, or open the star map to travel.
// Menus follow the NES pad: D-pad to choose, A to pick, B to go back. Rows can also be tapped.

// Everything a market can sell. stat: raises a pilot stat (capped at STAT_CAP). max: how many times
// it can be bought. Prices rise with each purchase of the same thing.
const UPGRADES = {
  weapons: { label: 'WEAPONS +1', short: 'WPN', desc: 'SHOTS HIT HARDER.', stat: true, base: 600 },
  shields: { label: 'SHIELDS +1', short: 'SHD', desc: 'TAKE ONE MORE HIT.', stat: true, base: 600 },
  special: { label: 'SPECIAL +1', short: 'SPC', desc: 'ONE MORE SPECIAL PER LEG.', stat: true, base: 600 },
  engine: { label: 'ENGINE TUNE', short: 'ENG', desc: '+5% SPEED IN EVERY FORM.', max: 4, base: 900 },
  ftr: { label: 'FIGHTER GUNS', short: 'FTR', desc: '+20% FIGHTER DAMAGE.', max: 3, base: 800 },
  grd: { label: 'GUARDIAN GUNS', short: 'GRD', desc: '+20% GUARDIAN DAMAGE.', max: 3, base: 800 },
  btl: { label: 'BATTLOID GUNS', short: 'BTL', desc: '+20% BATTLOID DAMAGE.', max: 3, base: 800 },
  cooler: { label: 'GUN COOLERS', short: 'COOL', desc: 'EVERY GUN FIRES 10% FASTER.', max: 3, base: 1200 },
  armor: { label: 'ARMOR WEAVE', short: 'ARM', desc: 'BATTLOID ARMOR REBOOTS 25% FASTER.', max: 2, base: 1000 },
  scanner: { label: 'TET SCANNER', short: 'TET', desc: 'GOLD PLANES DROP MORE TET CAPSULES.', max: 2, base: 700 },
  broker: { label: 'TRADE LICENSE', short: 'PAY', desc: '+10% PAY FROM EVERY MISSION.', max: 3, base: 1500 },
};
const upgradePrice = (key, n) => UPGRADES[key].base * (n + 1);
const MENU_ROWS = 7;   // visible rows in a starbase list; longer lists scroll

Object.assign(Game, {
  baseUI: null,

  // Rows for the current page: { label, right, col, act, info }.
  baseItems() {
    const U = this.baseUI, c = this.camp, P = this.planetHere();
    const back = { label: 'BACK', act: () => this.basePage('main') };
    if (U.page === 'main') {
      return [
        { label: 'MISSIONS', act: () => this.basePage('missions'), info: 'FLY A MISSION ON ' + P.name + '.' },
        { label: 'MARKET', act: () => this.basePage('shop'), info: 'SELLS: ' + this.marketShort(P) + (P.hulls.length ? ' AND A HULL.' : '.') },
        { label: 'STATUS', act: () => this.basePage('status'), info: 'PILOT, SHIP AND STATS.' },
        { label: 'SKILLS', act: () => this.basePage('skills'), info: 'SPECIALS AND PASSIVE SKILLS.' },
        { label: 'STAR MAP', act: () => this.openMap(), info: 'FLY TO ANOTHER PLANET, SYSTEM OR GALAXY.' },
        { label: 'SAVE AND QUIT', act: () => { this.saveCampaign(); this.toTitle(); }, info: 'PROGRESS SAVES AT EVERY DOCKING.' },
      ];
    }
    if (U.page === 'missions') {
      return [...P.missions.map((kind, i) => {
        const K = MISSION_KINDS[kind], done = this.missionDone(P, i), open = this.missionOpen(P, i);
        let info = K.desc;
        if (kind === 'strike') {
          const boss = P.order === 'sv' ? CAPITALS[P.capital || this.systemDef().capital].name : BOSSES[P.boss || this.systemDef().boss].name;
          info = (open ? 'BOSS: ' : 'FLY THE OTHERS FIRST. BOSS: ') + boss + '.';
        }
        const locked = () => { Sound.sfx('denied'); this.toast('FLY THE OTHER MISSIONS FIRST'); };
        return { label: K.name, right: done ? 'CLEAR' : open ? 'NEW' : 'LOCKED', col: done ? C.lime : open ? C.gold : C.gray,
          act: () => (open ? this.startMission(i) : locked()), info: info + (done ? ' HALF PAY.' : '') };
      }), back];
    }
    if (U.page === 'shop') {
      const rows = P.market.map(key => {
        const u = UPGRADES[key], n = c.up[key] || 0, price = upgradePrice(key, n);
        const max = u.stat ? this.statOf(key) >= STAT_CAP : n >= u.max;
        const now = u.stat ? ' NOW ' + this.statOf(key) + '.' : ' OWNED ' + n + '/' + u.max + '.';
        return { label: u.label, right: max ? 'MAX' : price + ' CR', col: max ? C.gray : c.money >= price ? C.white : C.gray,
          info: u.desc + now, act: () => this.buyUpgrade(key) };
      });
      const hulls = [...new Set([...P.hulls, ...c.hulls])];   // this shipyard's hulls, plus the ones you own
      hulls.forEach(i => {
        const h = HULLS[i], owned = c.hulls.includes(i);
        rows.push({ label: h.name, right: i === c.hull ? 'IN USE' : owned ? 'EQUIP' : h.price + ' CR',
          col: i === c.hull ? C.lime : owned || c.money >= h.price ? C.aqua : C.gray,
          info: this.hullInfo(h), act: () => this.buyHull(i) });
      });
      return [...rows, back];
    }
    if (U.page === 'skills') {
      const rows = [
        ...c.passives.map(id => { const s = PASSIVE_BY_ID[id]; return { label: s.name, right: 'PASSIVE', col: s.col, info: s.desc.join(' ') }; }),
        ...c.learned.map(i => { const s = SPECIALS[i]; return { label: s.name, right: 'SPECIAL', col: s.color, info: s.desc.join(' ') }; }),
      ];
      if (!rows.length) rows.push({ label: 'NONE YET', info: 'LEVEL UP TO LEARN SKILLS.' });
      return [...rows, back];
    }
    return [back];   // status
  },

  // A hull's strengths and guns, for the two-line info box.
  hullInfo(h) {
    const best = h.form.indexOf(Math.max(...h.form)), even = h.form.every(v => v === h.form[0]);
    return (even ? 'ALL-ROUNDER' : 'BEST AS ' + FORMS[best].name) + '. SPEED ' + Math.round(h.speed * 100) + '%.' +
      ' GUNS: ' + h.guns.map(g => GUNS[g].short).join('/');
  },

  marketShort(P) { return P.market.map(k => UPGRADES[k].short).join(' '); },

  basePage(page) {
    this.baseUI = { page, sel: 0 };
    Sound.sfx('move');
  },

  updateBase() {
    this.stateT++;
    const U = this.baseUI, items = this.baseItems(), n = items.length;
    if (Input.just('up')) { U.sel = (U.sel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { U.sel = (U.sel + 1) % n; Sound.sfx('move'); }
    U.sel = Math.min(U.sel, n - 1);
    if (U.page !== 'main' && (Input.just('back') || Input.just('special'))) { this.basePage('main'); return; }
    if (this.stateT > 10 && (Input.just('fire') || Input.just('start'))) this.baseAct();
  },

  baseAct() {
    const it = this.baseItems()[this.baseUI.sel];
    if (!it.act) return;
    Sound.sfx('select');
    it.act();
  },

  // Tap a row to pick it; tap the picked row again to use it. x, y are in the menu panel.
  tapBase(x, y) {
    const U = this.baseUI, items = this.baseItems();
    if (U.page === 'status') { this.basePage('main'); return; }
    const top = this.listTop(items.length, U.sel, MENU_ROWS), i = top + Math.floor((y - 139) / 10);
    if (y < 139 || i >= Math.min(items.length, top + MENU_ROWS)) return;
    if (i === U.sel) this.baseAct(); else { U.sel = i; Sound.sfx('move'); }
  },

  buyUpgrade(key) {
    const c = this.camp, u = UPGRADES[key], n = c.up[key] || 0, price = upgradePrice(key, n);
    if (u.stat ? this.statOf(key) >= STAT_CAP : n >= u.max) { Sound.sfx('denied'); return; }
    if (c.money < price) { Sound.sfx('denied'); this.toast('NOT ENOUGH CREDITS'); return; }
    c.money -= price;
    c.up[key] = n + 1;
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
  // The starbase turning slowly, with the carrier holding station off its side (seen bow-on at an
  // angle) and a shuttle running between the station's docking bay and the carrier's hangar.
  // oy shifts the scene down (behind briefings).
  drawBaseScene(ctx, oy = 0) {
    const S = this.systemDef(), t = this.t;
    ctx.save();
    ctx.translate(0, oy);
    SNES.add(ctx, () => {                              // the system's star: layered glow and a hot core
      NES.draw(ctx, SNES.glow(28, SNES.mix(S.col, '#000000', 0.6)), W - 40, 88);
      NES.draw(ctx, SNES.glow(14, S.col), W - 40, 88);
    });
    NES.draw(ctx, SNES.sphere(6, SNES.mix(S.col, '#ffffff', 0.6)), W - 40, 88);
    const P = this.planetHere();                       // the planet below the station, turning slowly
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow(36, SNES.mix(this.scenery(P).haze, '#000000', 0.55)), 32, 86));
    SNES.globe(ctx, this.scenery(P).floor, 32, 86, 30, t * 0.004);
    const E = this.carrierEpic(), ex = 196, ey = 6;    // the carrier, holding still
    ctx.drawImage(E.img, ex, ey);
    const r = 5 + ((t >> 2) & 1);
    SNES.add(ctx, () => {                              // engine glow off the far stern
      for (const [x, y] of E.jets) { NES.draw(ctx, SNES.glow(r + 3, '#1840a0'), ex + x, ey + y); NES.draw(ctx, SNES.glow(r - 1, '#60c8f8'), ex + x, ey + y); }
    });
    for (const [x, y] of E.lights) { ctx.fillStyle = (t >> 4) & 1 ? C.red : C.darkred; ctx.fillRect(ex + x, ey + y, 1, 1); }
    const frames = this.stationArt(), k = Math.floor(t / 16) % frames.length, sx = 128, sy = 56;   // the station, turning
    const art = frames[k];
    ctx.drawImage(art, sx - (art.width >> 1), sy - 52);
    const blink = (t >> 4) & 1;
    ctx.fillStyle = blink ? C.red : C.darkred; ctx.fillRect(sx, sy - 51, 1, 2);
    // the shuttle: waits in the station's bay, flies an arc to the carrier's hangar and back
    const dock = [sx + 1, sy + 44], hangar = [ex + E.hangar[0], ey + E.hangar[1]];
    const T = t % 560, leg = T < 60 ? -1 : T < 260 ? 0 : T < 340 ? -2 : T < 540 ? 1 : -1;
    if (leg >= 0) {
      const q = ((T - (leg ? 340 : 60)) / 200), e = q * q * (3 - 2 * q);
      const [a, b] = leg ? [hangar, dock] : [dock, hangar];
      const mx = (a[0] + b[0]) / 2, my = Math.max(a[1], b[1]) + 10;   // a shallow arc below the two
      const x = (1 - e) ** 2 * a[0] + 2 * (1 - e) * e * mx + e * e * b[0], y = (1 - e) ** 2 * a[1] + 2 * (1 - e) * e * my + e * e * b[1];
      const right = leg === 0;
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(2 + (t & 1), '#60c8f8'), x + (right ? -7 : 7), y + 1));
      if (right) NES.draw(ctx, SPR.shuttle, x, y); else NES.drawFlip(ctx, SPR.shuttle, x, y);
    }
    ctx.restore();
  },

  // The carrier in a 3/4 view from ahead: the bow near us at the lower left, the hull running away to
  // the stern at the upper right and shrinking with distance. Built once from the top-down and
  // side-profile art, drawn in thin slices with an affine transform each (like Mode 7 scanlines):
  // the deck on top, the port side below it (shaded), and the island standing up from the deck.
  carrierEpic() {
    if (this.epicImg) return this.epicImg;
    const A = this.carrierArt(), { tw, th, sw, deck } = CAR;
    const B = [6, 76], L = [168, -52], Wv = [72, -40], D = [0, 24];    // bow corner, length, beam, hull depth
    const sc = t => 1 - 0.5 * t;                                       // farther is smaller
    const iw = 264 / tw;                                                // the island's place across the deck
    const pt = (t, w, h) => [B[0] + t * L[0] + sc(t) * (w * Wv[0] + h * D[0]), B[1] + t * L[1] + sc(t) * (w * Wv[1] + h * D[1])];
    const lit = SNES.layer(tw, th, g => {                               // the deck catches the light
      g.drawImage(A.top, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(200,220,255,0.22)'; g.fillRect(0, 0, tw, th);
    });
    const dim = SNES.layer(sw, CAR.sh, g => {                           // the side in shadow
      g.drawImage(A.side, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,24,0.45)'; g.fillRect(0, 0, sw, CAR.sh);
    });
    const img = SNES.layer(224, 104, g => {
      g.imageSmoothingEnabled = false;
      const N = 60;
      for (let i = 0; i < N; i++) {                                     // port side, bow to stern (the art is flipped: bow at t = 0)
        const x0 = sw - (i + 1) * sw / N, t = (i + 0.5) / N, s = sc(t);
        g.setTransform(-L[0] / sw, -L[1] / sw, s * D[0] / 72, s * D[1] / 72,
          B[0] + L[0] - s * D[0] * deck / 72, B[1] + L[1] - s * D[1] * deck / 72);
        g.drawImage(dim, x0, deck, sw / N + 1, CAR.sh - deck, x0, deck, sw / N + 1, CAR.sh - deck);
      }
      for (let i = 0; i < N; i++) {                                     // the deck, from the top view (bow at the top of the art)
        const y0 = i * th / N, t = (i + 0.5) / N, s = sc(t);
        g.setTransform(s * Wv[0] / tw, s * Wv[1] / tw, L[0] / th, L[1] / th, B[0], B[1]);
        g.drawImage(lit, 0, y0, tw, th / N + 1, 0, y0, tw, th / N + 1);
      }
      for (let i = 0; i < 12; i++) {
        const x0 = 330 + i * 7, t = (sw - x0 - 3.5) / sw, s = sc(t);
        g.setTransform(-L[0] / sw, -L[1] / sw, s * D[0] / 72, s * D[1] / 72,
          B[0] + L[0] + s * iw * Wv[0] - s * D[0] * deck / 72, B[1] + L[1] + s * iw * Wv[1] - s * D[1] * deck / 72);
        g.drawImage(A.side, x0, 0, 8, deck, x0, 0, 8, deck);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    });
    const P = (t, w, h) => pt(t, w, h).map(Math.round);
    return (this.epicImg = { img, jets: [P(1, 0.25, 0.4), P(1, 0.5, 0.35), P(1, 0.75, 0.3)], lights: [P(0.36, iw, -1.7)], hangar: P(0.3, 0, 0.45) });
  },

  // The station, painted by the shipyard (shipyard.js) in frames as it turns: a spindle with a hub
  // habitat, a habitat ring with four pods on spokes, four solar-array arms on a crossbar that swing
  // round (edge-on when they point at you), an antenna dish and a lit docking bay. The station has
  // fourfold symmetry, so a quarter turn loops.
  stationArt() {
    if (this.stationImg) return this.stationImg;
    const N = 24;
    return (this.stationImg = Array.from({ length: N }, (_, k) => this.stationFrame(k / N * Math.PI / 2)));
  },

  stationFrame(a) {
    const w = 160, h = 104, cx = 80, cy = 52, S = YARD.sheet(w, h);
    const steel = S.mat('#8890a8'), light = S.mat('#b0b8c8'), dark = S.mat('#50586c'), seam = S.mat('#8890a8', { base: 1 });
    const cell = S.mat('#2858c8'), cellL = S.mat('#4078e0'), black = S.mat('#080810', { flat: true });
    const lamp = S.mat('#f8e070', { flat: true }), glass = S.mat('#58c0f8', { flat: true }), red = S.mat('#c03028');
    const ring = (front, l) => {                       // the torus: outer ellipse minus inner, one half
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy, o = (dx / 72) ** 2 + (dy / 20) ** 2, i = (dx / 60) ** 2 + ((dy - 1) / 12) ** 2;
        if (o <= 1 && i > 1 && (dy >= 0) === front) S.px(x, y, dy < 2 && dy > -3 && front ? light : steel, l);
      }
    };
    const line = (x0, y0, x1, y1, m, l) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) S.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, m, l); };
    const arms = [0, 1, 2, 3].map(i => a + i * Math.PI / 2), pods = arms.map(q => q + Math.PI / 4);
    const arm = (q, l) => {                            // a solar array: its length foreshortens as it turns
      const x1 = cx + Math.cos(q) * 20, x2 = cx + Math.cos(q) * 62, x0 = Math.min(x1, x2), wd = Math.max(1, Math.abs(x2 - x1));
      line(cx, 13, cx + Math.cos(q) * 62, 13, dark, l);
      S.rect(x0, 3, wd, 20, dark, l);
      for (let y = 4; y < 22; y += 2) S.rect(x0 + (wd > 3 ? 1 : 0), y, Math.max(1, wd - 2), 1, (y >> 1) % 3 ? cell : cellL, l);
    };
    const pod = (q, l) => {                            // a habitat pod on the ring, on its spoke
      const x = cx + Math.cos(q) * 66, y = cy + Math.sin(q) * 17, pw = 3 + Math.round(Math.abs(Math.sin(q)) * 4);
      line(cx, cy, x, y, dark, l);
      S.rect(x - pw, y - 4, pw * 2 + 1, 8, light, l + 1);
      S.px(x, y, lamp);
    };
    for (const q of arms) if (Math.sin(q) < 0) arm(q, 1);
    for (const q of pods) if (Math.sin(q) < 0) pod(q, 2);
    ring(false, 2);
    S.rect(cx - 8, 6, 17, 92, steel, 4);                                         // spindle
    YARD.plates(S, cx - 8, 6, 17, 92, steel, light, seam, 17, 8, 3);
    S.ellipse(cx, cy, 17, 14, light, 5);                                         // hub habitat
    YARD.windows(S, cx - 12 + Math.round((a / (Math.PI / 2)) * 4), cy - 4, 20, 4, glass, 2, 1);   // windows slide as it turns
    YARD.windows(S, cx - 12 + Math.round((a / (Math.PI / 2)) * 4), cy + 3, 20, 4, lamp, 2, 1);
    S.rect(cx - 12, 22, 25, 6, steel, 5); S.rect(cx - 12, 78, 25, 6, steel, 5);  // collars
    S.rect(cx - 1, 0, 3, 7, dark, 5);                                            // antenna mast
    const dq = a * 4;                                                            // the dish turns with the station
    S.ellipse(cx + Math.round(Math.cos(dq) * 7), 4, 2 + Math.round(Math.abs(Math.sin(dq)) * 3), 2, light, 6);
    S.rect(cx - 11, 92, 23, 10, steel, 5);                                       // docking bay
    S.rect(cx - 8, 94, 17, 7, black);
    for (let x = cx - 7; x < cx + 9; x += 3) S.px(x, 95, lamp);
    S.rect(cx - 12, 100, 3, 2, red, 6); S.rect(cx + 10, 100, 3, 2, red, 6);
    ring(true, 6);
    for (let j = 0; j < 16; j++) {                                               // windows round the near side, moving with the turn
      const q = a + j * Math.PI / 8;
      if (Math.sin(q) > 0.15) S.px(cx + Math.cos(q) * 66, cy + Math.sin(q) * 17 + 1, lamp);
    }
    for (const q of pods) if (Math.sin(q) >= 0) pod(q, 7);
    for (const q of arms) if (Math.sin(q) >= 0) arm(q, 8);
    return S.bake({ shadow: 2 });
  },


  drawBase(ctx) {
    const P = this.planetHere(), S = this.systemDef(), c = this.camp;
    this.drawBaseScene(ctx);
    NES.text(ctx, P.name + ' ORBIT', 6, 4, C.white);
    NES.text(ctx, S.name + (c.loop ? ' ECHO ' + c.loop : ''), 6, 13, S.col);
    NES.text(ctx, this.galaxyDef().name, 6, 22, C.gray);
    this.panel(ctx, () => this.drawBaseMenu(ctx));
  },

  drawBaseMenu(ctx) {
    const S = this.systemDef(), U = this.baseUI, c = this.camp, items = this.baseItems();
    NES.box(ctx, 4, 112, 248, 124, C.black, S.col);
    NES.text(ctx, c.money + ' CR', 10, 117, C.gold);
    NES.text(ctx, 'LV ' + c.level, 128, 117, C.lime, { align: 'center' });
    NES.text(ctx, PILOTS[c.pilot].name, 246, 117, PILOTS[c.pilot].col, { align: 'right' });
    ctx.fillStyle = SNES.mix(S.col, C.black, 0.5); ctx.fillRect(7, 126, 242, 1);
    if (U.page === 'status') { this.drawStatus(ctx); return; }
    const title = { main: S.base, missions: 'MISSIONS', shop: 'MARKET', skills: 'SKILLS' }[U.page];
    NES.text(ctx, title, 128, 130, C.gold, { align: 'center' });
    const top = this.listTop(items.length, U.sel, MENU_ROWS);
    items.slice(top, top + MENU_ROWS).forEach((it, j) => {
      const i = top + j, y = 141 + j * 10, sel = i === U.sel;
      if (sel) NES.hilite(ctx, 10, y - 2, 236, 10);
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 12, y, C.gold);
      NES.text(ctx, it.label, 22, y, sel ? C.white : it.col === C.gray ? C.gray : C.lgray);
      if (it.right) NES.text(ctx, it.right, 242, y, it.col || C.white, { align: 'right' });
    });
    if (top > 0) NES.text(ctx, '...', 230, 130, C.gray);
    if (top + MENU_ROWS < items.length) NES.text(ctx, '...', 230, 206, C.gray);
    const info = items[U.sel].info;
    if (info) NES.wrap(info, 30).slice(0, 2).forEach((l, i) => NES.text(ctx, l, 10, 214 + i * 9, C.aqua));
  },

  drawStatus(ctx) {
    const c = this.camp, pl = PILOTS[c.pilot];
    this.drawFace(ctx, SPR.pilots[c.pilot], 8, 128, pl.col);
    NES.text(ctx, this.hullDef().name, 74, 132, C.white);
    NES.text(ctx, 'SPEED ' + Math.round(this.speedMul() * 100) + '%', 74, 142, C.lgray);
    this.drawShip(ctx, 0, 226, 140, 0, false, true);
    this.drawXpBar(ctx, 74, 153, 96);
    const stats = [['WEAPONS', 'weapons', C.red], ['SHIELDS', 'shields', C.sky], ['SPECIAL', 'special', C.gold]];
    stats.forEach(([label, key, col], k) => {
      const y = 164 + k * 10, v = this.statOf(key);
      NES.text(ctx, label, 74, y, C.white);
      this.drawStatPips(ctx, 132, y, v / 2, STAT_CAP / 2, col);   // one pip per two points
      NES.text(ctx, String(v), 242, y, C.white, { align: 'right' });
    });
    const H = this.hullDef();
    FORMS.forEach((F, f) => {
      NES.text(ctx, F.short, 10 + f * 80, 199, H.form[f] > 1 ? C.lime : H.form[f] < 1 ? C.orange : C.white);
      NES.text(ctx, GUNS[H.guns[f]].short, 36 + f * 80, 199, C.aqua);
    });
    NES.text(ctx, c.learned.length + ' SPECIALS  ' + c.passives.length + ' PASSIVES', 10, 211, C.gold);
    if ((this.t >> 4) & 1) NES.text(ctx, 'B: BACK', 246, 224, C.gray, { align: 'right' });
  },
});
