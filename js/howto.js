'use strict';
// HOW TO PLAY: an illustrated FAQ. A contents page lists the topics; each page is a question and its
// answer on the right, with a live picture on the left drawn from the game's own art (portraits, hulls,
// enemies, bullets, icons, the carrier and the station). Lists (guns, specials, skills, upgrades,
// hulls, enemies) are built from the game's tables, so they stay right when the tables change, and the
// picture follows the list row that is lit. D-pad left/right turns pages, up/down jumps topics, A goes
// on, B goes back to the contents. Taps: left or right half of the screen, or a contents row.

const HOW_ART = { x: 8, y: 18, w: 134, h: 198 };   // the picture pane; text runs from x = 166
const HOW_TX = 166, HOW_WRAP = 30, HOW_BOTTOM = 214;

Object.assign(Game, {
  how: null,

  openHowto() {
    this.how = { page: -1, sel: 0 };
    this.setState('howto');
  },

  // ---- Pages -----------------------------------------------------------------------------
  // A page: { ch (topic index), q (question), a (paragraphs) or items ([name, text, col]), art(ctx, x, y, hi) }.
  howPages() {
    if (this.howCache) return this.howCache;
    const P = [], topics = [];
    const topic = name => topics.push(name);
    const page = (q, a, art) => P.push({ ch: topics.length - 1, q, a, art });
    // A list split over as many pages as its lines need.
    const list = (q, items, art) => {
      const room = HOW_BOTTOM - this.howTextTop(q), split = cap => {
        const out = [];
        let cur = [], used = 0;
        for (const it of items) {
          const n = this.howRowH(it[1]);
          if (used + n > cap && cur.length) { out.push(cur); cur = []; used = 0; }
          cur.push(it); used += n;
        }
        if (cur.length) out.push(cur);
        return out;
      };
      let chunks = split(room);   // then even the pages out, so the last isn't a lone row
      const even = split(Math.ceil(items.reduce((n, it) => n + this.howRowH(it[1]), 0) / chunks.length) + 20);
      if (even.length === chunks.length && even.every(c => c.reduce((n, it) => n + this.howRowH(it[1]), 0) <= room)) chunks = even;
      chunks.forEach((items, i) => P.push({ ch: topics.length - 1, q: chunks.length > 1 ? q + ' ' + (i + 1) + '/' + chunks.length : q, items, art }));
    };

    topic('THE STORY');
    page('WHAT IS GOING ON?', [
      "DR. HELENA VOSS, A ROGUE EPIGENETICIST, HAS TAKEN OVER THE GALAXY'S PILOTS.",
      'SHE NEVER CHANGED A LETTER OF THEIR DNA. SHE CHANGED WHICH GENES THEY USE, SWITCHING THEM ON AND OFF.',
      'HER FLEETS HOLD THREE GALAXIES. HER CITADEL WAITS IN THE HEART OF ANDROMEDA.'], (ctx, x, y) => this.howArtFace(ctx, x, y, 'voss', true));
    page('WHO IS ON MY SIDE?', [
      "DR. MIRA KATO, VOSS'S OLD LAB PARTNER. SHE BUILT THE VX-3 CHIMERA, A TRANSFORMING FIGHTER, TO STOP HER.",
      'YOU FLY IT OFF THE DECK OF A SPACE CARRIER. BEFORE EVERY MISSION MIRA BRIEFS YOU ON THE PLANET, ITS BOSS AND A REAL PIECE OF EPIGENETICS, AND VOSS ANSWERS.'],
    (ctx, x, y) => { this.howArtFace(ctx, x, y - 30, 'mira'); this.drawCarrierSide(ctx, x - 58, y + 58, true, 0.2); });
    page('WHY IS SHE DOING IT?', [
      'THAT IS HER STORY TO TELL. EACH TIME YOU SECURE A STAR SYSTEM, VOSS REVEALS MORE OF IT BEFORE THE NEXT BRIEFING.',
      'IT PLAYS IN THE SAME ORDER WHICHEVER ROUTE YOU FLY.'], (ctx, x, y) => this.howArtFace(ctx, x, y, 'voss'));
    page('WHAT HAPPENS AT THE END?', [
      "DESTROY VOSS'S BASE AT THE CITADEL TO SEE THE EPILOGUE.",
      'THEN THE ECHO CAMPAIGN BEGINS: EVERY SYSTEM OPENS AGAIN, HARDER, AGAINST THE VOSS ECHO, WITH NEW SCIENCE. YOU KEEP YOUR MONEY, LEVEL, SKILLS AND SHIP.'],
    (ctx, x, y) => this.howArtFace(ctx, x, y, 'echo'));

    topic('CONTROLS');
    list('HOW DO I FLY?', [
      ['MOVE', 'PAD: D-PAD OR STICK. KEYS: ARROWS OR WASD.', C.white],
      ['FIRE', 'PAD: A. KEYS: Z, SPACE OR J. HOLD IT.', C.white],
      ['SPECIAL WEAPON', 'PAD: B. KEYS: C OR L.', C.white],
      ['TRANSFORM', 'PAD: SELECT, X, Y OR RB. KEYS: X OR K.', C.white],
      ['PREVIOUS FORM', 'PAD: LB. KEYS: Q OR SHIFT.', C.white],
      ['PICK A FORM', 'KEYS: 1, 2 AND 3.', C.white],
      ['GAME MENU', 'PAD: START. KEYS: ENTER, P OR ESC.', C.white],
      ['MUTE, FULLSCREEN', 'KEYS: M AND F.', C.white],
    ], (ctx, x, y, hi) => this.howArtPad(ctx, x, y, hi));
    page('CAN I PLAY ON A PHONE OR PAD?', [
      'YES. ON A PHONE THE TOUCH CONTROLS SWITCH ON BY THEMSELVES. LEFT THUMB ANYWHERE ON THE LEFT HALF: A FLOATING JOYSTICK. A FIRES, B FIRES THE SPECIAL, X TRANSFORMS.',
      'IN MENUS, TAP A ROW TO PICK IT AND TAP AGAIN TO USE IT. PADS WITH ODD BUTTONS: USE CONTROLLER SETUP ON THE TITLE SCREEN.'],
    (ctx, x, y) => this.howArtPhone(ctx, x, y));

    topic('PILOTS');
    list('WHICH PILOT SHOULD I PICK?', PILOTS.map(pl => [pl.name + ': ' + pl.tag, 'WPN ' + pl.weapons + ' SHD ' + pl.shields + ' SPC ' + pl.special + '. ' + pl.perk, pl.col]),
      (ctx, x, y, hi) => {
        const pl = PILOTS[hi];
        this.drawFace(ctx, SPR.pilots[hi], x - 30, y - 70, pl.col);
        NES.text(ctx, pl.name, x, y + 4, pl.col, { align: 'center' });
        [['WPN', 'weapons', C.red], ['SHD', 'shields', C.sky], ['SPC', 'special', C.gold]].forEach(([l, k, col], i) => {
          NES.text(ctx, l, x - 64, y + 20 + i * 12, C.white);
          this.drawStatPips(ctx, x - 36, y + 20 + i * 12, pl[k], STAT_MAX, col);
        });
      });
    page('WHAT DO THE STATS DO?', [
      'WEAPONS: HOW HARD SHOTS HIT. 4 IS NORMAL, 8 IS DOUBLE.',
      'SHIELDS: HITS YOU CAN TAKE. REPAIRED AT EVERY TAKEOFF.',
      'SPECIAL: USES OF YOUR SPECIAL WEAPON ON EACH LEG.',
      'HULLS, MARKET UPGRADES AND LEVEL-UPS ADD TO THEM, UP TO ' + STAT_CAP + '.'],
    (ctx, x, y) => {
      const n = 4 + ((this.t >> 5) % 13);
      [['WEAPONS', C.red], ['SHIELDS', C.sky], ['SPECIAL', C.gold]].forEach(([l, col], i) => {
        NES.text(ctx, l, x - 64, y - 40 + i * 28, C.white);
        this.drawStatPips(ctx, x - 64, y - 28 + i * 28, Math.min(8, Math.ceil(n / 2)), 8, col);
      });
      NES.text(ctx, 'UP TO ' + STAT_CAP, x, y + 50, C.lime, { align: 'center' });
    });

    topic('FORMS');
    list('WHAT ARE THE THREE FORMS?', [
      ['FIGHTER', 'THE FASTEST FORM, WITH THE SMALLEST HITBOX.', C.aqua],
      ['GUARDIAN', 'A MIDDLE SPEED AND A BIGGER TARGET.', C.aqua],
      ['BATTLOID', 'THE SLOWEST. ITS ARMOR SOAKS ONE HIT, THEN REBOOTS FOR 10 SECONDS.', C.aqua],
      ['TRANSFORM ANY TIME', 'EVERY FORM FLIES IN ALL FOUR DIRECTIONS AND FIRES ITS OWN GUN, SO A TRANSFORM IS ALSO A WEAPON CHANGE.', C.gold],
    ], (ctx, x, y, hi) => {
      for (let f = 0; f < 3; f++) {
        const sy = y - 60 + f * 50, lit = hi === f || hi === 3;
        this.drawShip(ctx, f, x - 40, sy, 0, true, false, 0);
        NES.text(ctx, FORMS[f].name, x - 12, sy - 4, lit ? C.aqua : C.gray);
      }
    });
    page('WHAT IF A FORM IS SILENCED?', [
      "A METHYLATOR'S BEAM SILENCES THE FORM YOU ARE IN AND CARRIES IT AWAY. SHOOT THAT PLANE DOWN TO GET IT BACK (+1000). A TET CAPSULE ALSO RESTORES ONE.",
      'LEAN ON ONE FORM FOR 60% OF A STAGE AND THE NEXT SQUADRON RESISTS IT. KEEP TRANSFORMING.'],
    (ctx, x, y) => this.howArtBeam(ctx, x, y));

    topic('GUNS');
    page('HOW DO GUNS WORK?', [
      'GUNS ARE PARTS. YOU OWN THE GUNS OF EVERY HULL YOU OWN, AND MARKETS SELL MORE.',
      'THE HANGAR OPENS BEFORE EVERY MISSION: FIT ONE GUN TO EACH FORM. A LIGHT MOUNT TAKES LIGHT GUNS. A HEAVY MOUNT TAKES ANY.'],
    (ctx, x, y) => this.howArtGun(ctx, GUN_IDS[(this.t / 150 | 0) % 8], x, y + 60));
    page('HOW DO GUNS LEVEL UP?', [
      'EVERY POINT A FORM SCORES TRAINS THE GUN FITTED IN IT: LV2 AT ' + GUN_LEVELS[1] + ', LV3 AT ' + GUN_LEVELS[2] + ', LV4 AT ' +
        GUN_LEVELS[3] + ' AND LV5 AT ' + GUN_LEVELS[4] + '.',
      'EVERY LEVEL CHANGES THE SHOT. THE HANGAR SHOWS WHAT THE NEXT ONE DOES.'],
    (ctx, x, y) => {
      const L = 1 + ((this.t / 120 | 0) % 5);
      this.howArtGun(ctx, 'twin', x, y + 60, L, 'TWIN CANNON LV' + L);
    });
    list('WHICH GUNS ARE THERE?', GUN_IDS.map(id => { const G = GUNS[id]; return [G.name, (G.mount === 'heavy' ? 'HEAVY, ' : 'LIGHT, ') + G.price + ' CR. ' + G.desc.join(' '), C.aqua]; }),
      (ctx, x, y, hi, items) => this.howArtGun(ctx, GUN_IDS.find(id => GUNS[id].name === items[hi][0]), x, y + 60));

    topic('SPECIAL WEAPONS');
    page('WHAT ARE SPECIAL WEAPONS?', [
      'BIG ONE-SHOT ATTACKS. YOU LEARN ONE AT EVERY EVEN LEVEL AND CARRY ONE PER MISSION, PICKED IN THE HANGAR.',
      'FIRE IT WITH B (OR C). YOUR SPECIAL STAT IS HOW MANY USES YOU GET, REFILLED AT EVERY TAKEOFF.'],
    (ctx, x, y) => {
      const k = (this.t / 30 | 0) % SPECIALS.length;
      SPECIALS.forEach((s, i) => NES.draw(ctx, SPR.specialIcons[i], x - 48 + (i % 4) * 32, y - 60 + (i >> 2) * 26));
      NES.hilite(ctx, x - 58 + (k % 4) * 32, y - 70 + (k >> 2) * 26, 20, 20);
      NES.draw(ctx, SPR.specialIcons[k], x - 48 + (k % 4) * 32, y - 60 + (k >> 2) * 26);
      NES.text(ctx, SPECIALS[k].name, x, y + 60, SPECIALS[k].color, { align: 'center' });
    });
    list('WHICH SPECIALS ARE THERE?', SPECIALS.map(s => [s.name, s.desc.join(' '), s.color]),
      (ctx, x, y, hi, items) => this.howArtIcon(ctx, SPECIALS.findIndex(s => s.name === items[hi][0]), x, y));

    topic('PASSIVE SKILLS');
    page('WHAT ARE PASSIVE SKILLS?', [
      'SKILLS THAT ARE ALWAYS ON. YOU LEARN ONE AT EVERY ODD LEVEL.',
      'A NEW PILOT STARTS WITH ONE: DRONE ESCORT, REINFORCED HULL OR GROUND MISSILES.'],
    (ctx, x, y) => {
      this.drawShip(ctx, 0, x, y, 0, true, false, 0);
      NES.draw(ctx, SPR.escort, x + 22, y + 8 + Math.round(Math.sin(this.t * 0.08)));
      this.howArtGun(ctx, 'twin', x, y);
    });
    list('WHICH SKILLS ARE THERE?', PASSIVES.map(s => [s.name, s.desc.join(' '), s.col]),
      (ctx, x, y, hi, items) => {
        const s = PASSIVES.find(q => q.name === items[hi][0]);
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(20 + ((this.t >> 3) & 1) * 2, SNES.mix(s.col, '#000000', 0.5)), x, y - 20));
        NES.draw(ctx, SNES.sphere(8, s.col), x, y - 20);
        NES.wrap(s.name, 14).forEach((l, i) => NES.text(ctx, l, x, y + 20 + i * 10, s.col, { align: 'center' }));
      });

    topic('MISSIONS');
    list('WHAT KINDS OF MISSION ARE THERE?', Object.values(MISSION_KINDS).map(K => [K.name, K.desc, C.gold]),
      (ctx, x, y, hi) => this.howArtStage(ctx, x, y, ['v', 's', 'raid', 'bonus', (this.t >> 7) & 1 ? 'v' : 's'][hi]));
    page('WHAT IS A STRONGHOLD?', [
      'EACH PLANET\'S LAST MISSION. IT OPENS ONCE THE OTHERS ARE FLOWN, AND ENDS IN A BOSS:',
      'A GROUNDED WARSHIP (DESTROY EVERY TURRET, LAUNCHER, HANGAR, RADAR AND CORE) OR A CAPITAL SHIP THAT FLIES UNDER YOU (HIT ITS TARGETS AS IT PASSES).'],
    (ctx, x, y) => {
      const hull = (this.t >> 8) & 1 ? this.capitalArt(this.systemDef().capital).hull : this.bossArt(this.systemDef().boss).hull;
      const s = Math.min(140 / hull.width, 180 / hull.height);
      ctx.drawImage(hull, Math.round(x - hull.width * s / 2), Math.round(y - hull.height * s / 2), Math.round(hull.width * s), Math.round(hull.height * s));
    });
    page('WHAT IF I GET SHOT DOWN?', [
      'THERE ARE NO LIVES. SHIELDS SOAK HITS. AT ZERO THE HUD FLASHES DANGER, AND ONE MORE HIT FAILS THE MISSION.',
      'THE CARRIER BRINGS YOU HOME. YOU KEEP YOUR MONEY, XP, GUN LEVELS AND UPGRADES. TRY AGAIN.'],
    (ctx, x, y) => {
      const n = Math.max(0, 4 - ((this.t >> 5) % 6));
      for (let i = 0; i < 4; i++) NES.draw(ctx, i < n ? SPR.shieldPip : SPR.shieldPipOff, x - 12 + i * 8, y + 30);
      this.drawShip(ctx, 0, x, y - 10, 0, true, false, 0);
      if (!n && (this.t >> 3) & 1) NES.text(ctx, 'DANGER', x, y + 44, C.red, { align: 'center' });
    });

    topic('THE STAR MAP');
    page('HOW DO I GET AROUND?', [
      '3 GALAXIES, 12 STAR SYSTEMS, 84 PLANETS. THE CARRIER FLIES ANYWHERE THE STAR MAP ALLOWS.',
      'CLEAR HALF THE PLANETS OF A SYSTEM TO SECURE IT: THAT OPENS ITS NEIGHBORS. SECURE A WHOLE GALAXY TO OPEN THE NEXT. FARTHER OUT IS HARDER.'],
    (ctx, x, y) => this.howArtMap(ctx, x, y));
    page('WHEN DOES THE GAME SAVE?', [
      'EVERY TIME THE CARRIER DOCKS, WHEN YOU BUY SOMETHING AND WHEN YOU LAUNCH FROM THE HANGAR.',
      'PICK CONTINUE ON THE TITLE SCREEN TO CARRY ON.'],
    (ctx, x, y) => this.howArtStation(ctx, x, y));

    topic('THE MARKET');
    page('WHAT CAN I BUY?', [
      'EVERY PLANET HAS A STATION WITH A MARKET, AND EACH ONE STOCKS DIFFERENT THINGS: UPGRADES, GUNS AND SOMETIMES A HULL.',
      'UPGRADE PRICES RISE WITH EACH ONE YOU BUY. NEWER GALAXIES SELL NEWER GUNS.'],
    (ctx, x, y) => this.howArtStation(ctx, x, y));
    list('WHICH UPGRADES ARE THERE?', Object.values(UPGRADES).map(u => [u.label, u.desc + (u.max ? ' ' + u.max + ' LEVELS.' : ''), C.white]),
      (ctx, x, y, hi, items) => {
        const u = Object.values(UPGRADES).find(q => q.label === items[hi][0]);
        NES.box(ctx, x - 40, y - 30, 80, 44, '#203890', C.gold);
        NES.text(ctx, u.short, x, y - 16, C.gold, { align: 'center', scale: 2 });
        NES.text(ctx, u.base + ' CR', x, y + 30, C.white, { align: 'center' });
      });
    list('WHICH HULLS ARE THERE?', HULLS.map(h => [h.name, (h.price ? h.price + ' CR. ' : 'YOUR FIRST SHIP. ') + h.desc, C.aqua]),
      (ctx, x, y, hi, items) => {
        const h = HULLS.findIndex(q => q.name === items[hi][0]);
        for (let f = 0; f < 3; f++) {
          this.drawShip(ctx, f, x - 44 + f * 44, y - 20, 0, true, false, h);
          NES.text(ctx, HULLS[h].mounts[f] === 'heavy' ? 'H' : 'L', x - 44 + f * 44, y + 8, C.gray, { align: 'center' });
        }
        NES.text(ctx, 'MOUNTS', x, y + 22, C.gray, { align: 'center' });
      });

    topic('LEVELS AND CREDITS');
    page('HOW DO I LEVEL UP?', [
      'MISSIONS PAY XP. EVERY LEVEL, UP TO ' + LEVELS.length + ', TRAINS ONE STAT BY 1, THEN TEACHES A SPECIAL (EVEN LEVELS) OR A PASSIVE SKILL (ODD LEVELS).',
      'EACH TIME YOU PICK ONE OF THREE OFFERS.'],
    (ctx, x, y) => {
      const f = (this.t % 180) / 150;
      this.drawBar(ctx, x - 60, y, 120, 6, Math.min(1, f), C.lime, '#082008');
      NES.text(ctx, 'XP', x - 60, y - 12, C.lime);
      if (f >= 1 && (this.t >> 3) & 1) NES.text(ctx, 'LEVEL UP!', x, y + 20, C.lime, { align: 'center' });
    });
    page('HOW DO I EARN CREDITS?', [
      'EVERY MISSION PAYS MISSION PAY PLUS COMBAT PAY FROM YOUR SCORE. A REPLAY PAYS HALF.',
      'CLEARING A PLANET, SECURING A SYSTEM AND LIBERATING ONE (EVERY PLANET CLEARED) EACH PAY A BONUS.'],
    (ctx, x, y) => {
      const n = Math.min(9999, (this.t * 37) % 12000 | 0);
      NES.text(ctx, n + ' CR', x, y - 8, C.gold, { align: 'center', scale: 2 });
    });

    topic('THE ENEMY');
    list('WHO AM I FIGHTING?', Object.keys(ENEMY).map(k => [ENEMY[k].name, ENEMY[k].pts[0] + ' POINTS' + (ENEMY[k].pts[1] !== ENEMY[k].pts[0] ? ', ' + ENEMY[k].pts[1] + ' DIVING OR GOLD.' : '.'), C.pink]),
      (ctx, x, y, hi, items) => {
        const k = Object.keys(ENEMY).find(q => ENEMY[q].name === items[hi][0]), set = SPR.enemy[k], f = (this.t >> 3) & 1;
        this.howBig(ctx, set.normal[f], x, y - 44, Math.PI);
        this.howBig(ctx, set.side.normal[f], x, y + 26, 0);
        NES.text(ctx, 'TOP', x, y - 12, C.gray, { align: 'center' });
        NES.text(ctx, 'SIDE', x, y + 52, C.gray, { align: 'center' });
      });
    page('WHAT ARE THE GOLD PLANES?', [
      'ACETYLATED PLANES. THEY FLY FASTER, FIRE DOUBLE SHOTS AND ARE WORTH DOUBLE POINTS.',
      'SOME DROP A TET CAPSULE. FLY INTO IT TO RESTORE A SILENCED FORM, OR FOR 1000 POINTS.'],
    (ctx, x, y) => {
      this.howBig(ctx, SPR.enemy.fighter.acetyl[(this.t >> 3) & 1], x, y - 30, Math.PI);
      NES.draw(ctx, SPR.tet, x, y + 20 + Math.round(Math.sin(this.t * 0.1) * 3));
    });

    topic('THE SCIENCE');
    list('WHAT DO THE WORDS MEAN?', [
      ['GENOME', 'ALL YOUR DNA. ALMOST EVERY CELL CARRIES THE SAME COPY.', C.aqua],
      ['EPIGENOME', 'MARKS ON DNA AND HISTONES THAT SET WHICH GENES A CELL USES.', C.aqua],
      ['METHYLATION', 'METHYL GROUPS ON DNA. NEAR A PROMOTER THEY SILENCE A GENE.', C.magenta],
      ['ACETYLATION', 'ACETYL GROUPS ON HISTONES LOOSEN DNA SO GENES CAN SWITCH ON.', C.gold],
      ['HISTONES', 'PROTEIN SPOOLS. DNA WRAPPED ROUND THEM FORMS NUCLEOSOMES.', C.aqua],
      ['TET ENZYMES', 'THEY START REMOVING METHYL MARKS. THE MARKS CAN BE UNDONE.', C.lime],
    ], (ctx, x, y) => { this.drawHelix(ctx, x - 30, this.t * 0.5); this.drawHelix(ctx, x + 30, this.t * 0.5 + 40); });

    for (const p of P) {   // text that doesn't fit is cut off without warning, so check it here
      if (p.a && this.howTextTop(p.q) + p.a.reduce((n, s) => n + NES.wrap(s, HOW_WRAP).length + 1, -1) * 10 > HOW_BOTTOM) console.warn('HOWTO page too long:', p.q);
    }
    return (this.howCache = { pages: P, topics });
  },

  howRowH(text) { return 12 + NES.wrap(text, HOW_WRAP - 1).length * 9; },   // a list row: name, text, gap
  howTextTop(q) { return 22 + NES.wrap(q, HOW_WRAP).length * 10 + 8; },
  howFirst(ch) { return this.howPages().pages.findIndex(p => p.ch === ch); },

  // ---- Input -----------------------------------------------------------------------------
  updateHowto() {
    this.stateT++;
    const U = this.how, { pages, topics } = this.howPages();
    if (U.page < 0) {
      const n = topics.length;
      if (Input.just('up')) { U.sel = (U.sel + n - 1) % n; Sound.sfx('move'); }
      if (Input.just('down')) { U.sel = (U.sel + 1) % n; Sound.sfx('move'); }
      if (Input.just('back') || Input.just('special')) { Sound.sfx('move'); this.setState('title'); return; }
      if (this.stateT > 10 && (Input.just('fire') || Input.just('start') || Input.just('right'))) this.howGo(this.howFirst(U.sel));
      return;
    }
    const ch = pages[U.page].ch;
    if (Input.just('back') || Input.just('special')) { this.howGo(-1); return; }
    if (Input.just('right') || (this.stateT > 10 && (Input.just('fire') || Input.just('start')))) this.howGo(U.page + 1 < pages.length ? U.page + 1 : -1);
    else if (Input.just('left')) this.howGo(U.page - 1);
    else if (Input.just('down')) this.howGo(ch + 1 < topics.length ? this.howFirst(ch + 1) : -1);
    else if (Input.just('up')) this.howGo(ch > 0 ? this.howFirst(ch - 1) : -1);
  },

  // Turn to page i (-1 = the contents, with the topic we came from lit).
  howGo(i) {
    const U = this.how, { pages } = this.howPages();
    if (i < 0 && U.page >= 0) U.sel = pages[U.page].ch;
    U.page = i;
    this.stateT = 0;
    Sound.sfx('move');
  },

  // Taps in screen pixels: a contents row, or the left or right half of a page.
  tapHowto(x, y) {
    const U = this.how, n = this.howPages().topics.length;
    if (U.page < 0) {
      const i = Math.floor((y - 37) / 12);
      if (x < HOW_TX - 8 || i < 0 || i >= n) return;
      if (i === U.sel) this.howGo(this.howFirst(i)); else { U.sel = i; Sound.sfx('move'); }
      return;
    }
    if (y < 16) { this.howGo(-1); return; }   // the top bar: back to the contents
    this.howGo(x < W / 2 ? U.page - 1 : (U.page + 1 < this.howPages().pages.length ? U.page + 1 : -1));
  },

  // ---- Drawing ---------------------------------------------------------------------------
  drawHowto(ctx) {
    const U = this.how, { pages, topics } = this.howPages(), A = HOW_ART;
    const cx = A.x + (A.w >> 1), cy = A.y + (A.h >> 1);
    NES.box(ctx, 0, 0, W, H, C.black, C.gold);
    NES.box(ctx, A.x, A.y, A.w, A.h, '#081030', C.sky);
    const art = (fn, hi, items) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(A.x + 3, A.y + 3, A.w - 6, A.h - 6); ctx.clip();
      fn(ctx, cx, cy, hi, items);
      ctx.restore();
    };
    const touch = Touch.on;
    if (U.page < 0) {
      NES.text(ctx, 'HOW TO PLAY', 10, 6, C.gold);
      NES.text(ctx, 'THE CHIMERA WING FAQ', W - 10, 6, C.aqua, { align: 'right' });
      art((g, x, y) => {   // the Chimera turning through its forms
        const f = (this.t / 90 | 0) % 3, m = this.t % 90;
        this.drawShip(g, f, x, y - 10, m < 14 ? 14 - m : 0, true, false, 0);
        NES.text(g, FORMS[f].name, x, y + 40, C.aqua, { align: 'center' });
      });
      NES.text(ctx, 'CONTENTS', HOW_TX, 22, C.gold);
      topics.forEach((t, i) => {
        const y = 38 + i * 12, sel = i === U.sel;
        if (sel) NES.hilite(ctx, HOW_TX - 4, y - 2, W - HOW_TX - 6, 11);
        if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', HOW_TX - 2, y, C.gold);
        NES.text(ctx, (i + 1) + '. ' + t, HOW_TX + 8, y, sel ? C.white : C.lgray);
      });
      NES.text(ctx, touch ? 'TAP A TOPIC, TAP AGAIN TO READ' : 'UP/DOWN: TOPIC  A: READ  B: BACK', CX, 226, C.gray, { align: 'center' });
      return;
    }
    const p = pages[U.page];
    NES.text(ctx, (p.ch + 1) + '. ' + topics[p.ch], 10, 6, C.aqua);
    NES.text(ctx, (U.page + 1) + '/' + pages.length, W - 10, 6, C.gray, { align: 'right' });
    NES.wrap(p.q, HOW_WRAP).forEach((l, i) => NES.text(ctx, (i ? '   ' : 'Q. ') + l, HOW_TX - 20, 22 + i * 10, C.gold));
    let y = this.howTextTop(p.q);
    ctx.fillStyle = SNES.mix(C.gold, C.black, 0.6); ctx.fillRect(HOW_TX, y - 5, W - HOW_TX - 10, 1);
    if (p.a) {
      NES.text(ctx, 'A.', HOW_TX - 20, y, C.white);
      for (const para of p.a) {
        for (const l of NES.wrap(para, HOW_WRAP)) { NES.text(ctx, l, HOW_TX, y, C.white); y += 10; }
        y += 10;
      }
      art(p.art, 0);
    } else {
      const hi = (this.t / 100 | 0) % p.items.length;   // the lit row, which the picture shows
      p.items.forEach(([name, text, col], i) => {
        const lines = NES.wrap(text, HOW_WRAP - 1);
        if (i === hi) NES.hilite(ctx, HOW_TX - 4, y - 2, W - HOW_TX - 6, 11 + lines.length * 9, SNES.mix(col, '#000000', 0.7));
        NES.text(ctx, name, HOW_TX, y, col);
        lines.forEach((l, k) => NES.text(ctx, l, HOW_TX + 8, y + 9 + k * 9, i === hi ? C.white : C.lgray));
        y += this.howRowH(text);
      });
      art(p.art, hi, p.items);
    }
    NES.text(ctx, touch ? 'TAP LEFT OR RIGHT: PAGE   TOP: CONTENTS' : 'LEFT/RIGHT: PAGE  UP/DOWN: TOPIC  B: CONTENTS', CX, 226, C.gray, { align: 'center' });
  },

  // ---- Pictures (each is drawn centered on x, y inside the picture pane) --------------------
  howArtFace(ctx, x, y, who, helix) {
    if (helix) { this.drawHelix(ctx, x - 50, this.t * 0.5); this.drawHelix(ctx, x + 50, this.t * 0.5 + 60); }
    this.drawPortrait(ctx, x - 30, y - 44, who);
    NES.text(ctx, CAST[who].name, x, y + 32, CAST[who].col, { align: 'center' });
  },

  // An NES-style pad: the D-pad, SELECT/START and B/A, with the button of the lit row glowing.
  howArtPad(ctx, x, y, hi) {
    const lit = ['dpad', 'a', 'b', 'sel', 'b2', 'num', 'start', 'none'][hi], on = (this.t >> 3) & 1;
    NES.box(ctx, x - 60, y - 26, 120, 52, '#b8b8c0', '#585868');
    ctx.fillStyle = '#202028'; ctx.fillRect(x - 54, y - 18, 108, 36);
    ctx.fillStyle = lit === 'dpad' && on ? C.gold : '#404048';
    ctx.fillRect(x - 50, y - 4, 24, 8); ctx.fillRect(x - 42, y - 12, 8, 24);
    for (const [k, bx] of [['sel', x - 14], ['start', x + 6]]) { ctx.fillStyle = lit === k && on ? C.gold : '#606068'; ctx.fillRect(bx, y + 2, 10, 4); }
    NES.text(ctx, 'SELECT START', x, y + 30, C.gray, { align: 'center' });
    for (const [k, bx, lab] of [['b', x + 30, 'B'], ['a', x + 48, 'A']]) {
      NES.disc(ctx, bx, y, 6, lit === k && on ? C.gold : '#c02828');
      NES.text(ctx, lab, bx, y + 10, C.white, { align: 'center' });
    }
    if (lit === 'num' || lit === 'none') NES.text(ctx, 'KEYBOARD ONLY', x, y - 50, C.aqua, { align: 'center' });
    if (lit === 'b2') NES.text(ctx, 'SHOULDER BUTTON', x, y - 50, C.aqua, { align: 'center' });
  },

  howArtPhone(ctx, x, y) {
    NES.box(ctx, x - 60, y - 34, 120, 68, '#101018', C.lgray);
    const jx = x - 34 + Math.round(Math.cos(this.t * 0.05) * 6), jy = y + Math.round(Math.sin(this.t * 0.05) * 6);
    NES.disc(ctx, x - 34, y, 12, '#303848'); NES.disc(ctx, jx, jy, 6, C.lgray);
    for (const [bx, by, lab] of [[x + 40, y + 8, 'A'], [x + 24, y + 16, 'B'], [x + 40, y - 10, 'X']]) {
      NES.disc(ctx, bx, by, 6, '#2850c8'); NES.text(ctx, lab, bx, by - 3, C.white, { align: 'center' });
    }
    this.drawShip(ctx, 0, x, y - 14, 0, true, false, 0);
  },

  // A methylator beaming a Chimera: the beam's cone runs down onto the ship, which goes gray.
  howArtBeam(ctx, x, y) {
    const T = this.t % 160, f = (this.t >> 3) & 1, ext = Math.min(1, T / 50);
    NES.drawRot(ctx, SPR.enemy.methyl.normal[f], x, y - 60, Math.PI);
    const cols = [C.lime, C.green, C.aqua], len = Math.floor(90 * ext);
    for (let d = 0; d < len; d += 2) {
      const hw = Math.floor(3 + d * 0.2);
      ctx.fillStyle = cols[((d >> 1) + (this.t >> 2)) % 3];
      ctx.fillRect(x - hw, y - 48 + d, hw * 2 + 1, 1);
    }
    if (T > 60) NES.drawRot(ctx, SPR.hulls[0].top.silenced[0], x, y + 44, 0); else this.drawShip(ctx, 0, x, y + 44, 0, true, false, 0);
    if (T > 60 && (this.t >> 3) & 1) NES.text(ctx, 'SILENCED', x, y + 64, C.pink, { align: 'center' });
  },

  // A gun firing up from the ship at (x, y), with fake bullets placed by age so it loops forever.
  howArtGun(ctx, id, x, y, L = 3, label = GUNS[id].name) {
    const t = this.t, B = [], add = b => B.push(b);
    if (id === 'rail') y -= 120;   // it fires backward: leave room below
    const ages = (gap, life) => { const a = []; for (let k = 0; k * gap < life; k++) a.push((t + k * gap) % life); return a; };
    switch (id) {
      case 'twin':
        for (const a of ages(9, 36)) {
          const vy = L >= 2 ? 7.5 : 6, ox = L >= 4 ? 5 : 3;
          for (const s of [-1, 1]) add({ kind: 'shot', x: x + s * (ox + (L >= 4 ? a * 0.4 : 0)), y: y - 8 - a * vy, vx: 0, vy: -1 });
          if (L >= 3) add({ kind: 'shot', x, y: y - 10 - a * vy, vx: 0, vy: -1 });
        }
        break;
      case 'spread': for (const a of ages(15, 45)) for (const q of [-0.22, 0, 0.22]) add({ kind: 'spread', x: x + Math.sin(q) * a * 5, y: y - 6 - Math.cos(q) * a * 5, vx: 0, vy: -1 }); break;
      case 'vulcan': for (const a of ages(4, 32)) add({ kind: 'vulcan', x: x + ((a * 7) % 5) - 2, y: y - 6 - a * 7, vx: 0, vy: -1 }); break;
      case 'homing':
        for (const a of ages(26, 52)) for (const s of [-1, 1]) {
          const k = Math.min(1, a / 24), hd = -Math.PI / 2 + s * 0.9 * (1 - k);
          add({ kind: 'missile', x: x + s * (6 + 22 * Math.sin(k * Math.PI / 2)), y: y - 4 - a * a * 0.06, hd, vx: 0, vy: -1 });
        }
        break;
      case 'laser': for (const a of ages(14, 28)) add({ kind: 'laser', x, y: y - 8 - a * 9, vx: 0, vy: -1 }); break;
      case 'bomb': for (const a of ages(24, 48)) add({ kind: 'bomb', x, y: y - 6 - a * 3.4, vx: 0, vy: -1 }); break;
      case 'wave': for (const a of ages(12, 48)) for (const ph of [0, Math.PI]) add({ kind: 'wave', x: x + Math.cos(a * 0.3 + ph) * 6, y: y - 6 - a * 4.5, vx: 0, vy: -1 }); break;
      case 'ripple': for (const a of ages(16, 48)) add({ kind: 'ripple', x, y: y - 8 - a * 4, rad: Math.min(14, 3 + a * 0.3), vx: 0, vy: -1 }); break;
      case 'swivel': {
        const q0 = (1 - (Math.sin(t * 0.03) + 1) / 2) * 1.4;
        for (const a of ages(5, 35)) for (const q of [-q0, q0]) add({ kind: 'swivel', x: x + Math.sin(q) * (5 + a * 5), y: y - Math.cos(q) * (5 + a * 5), vx: Math.sin(q), vy: -Math.cos(q) });
        break;
      }
      case 'charge': {
        const T = t % 110;
        if (T < 60) {
          const r = 2 + Math.floor(T / 20) * 2 + ((t >> 1) & 1);
          SNES.add(ctx, () => NES.draw(ctx, SNES.glow(r + 3, T >= 40 ? '#a06018' : '#2050a0'), x, y - 10));
          NES.disc(ctx, x, y - 10, Math.max(1, r - 2), C.ice);
        } else add({ kind: 'charge', step: 3, rad: 8, x, y: y - 10 - (T - 60) * 4, vx: 0, vy: -1 });
        break;
      }
      case 'rail': for (const a of ages(22, 22)) add({ kind: 'rail', x, y: y + 8 + a * 10, vx: 0, vy: 1 }); break;
    }
    this.drawShip(ctx, 0, x, y, 0, true, false, 0);
    for (const b of B) this.drawPlayerBullet(ctx, b);
    NES.text(ctx, label, x, HOW_ART.y + 10, C.aqua, { align: 'center' });
  },

  // A sprite at twice its size (whole-pixel scaling, like the SNES's scaled sprites).
  howBig(ctx, img, x, y, ang) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang); ctx.scale(2, 2);
    ctx.drawImage(img, -(img.width >> 1), -(img.height >> 1));
    ctx.restore();
  },

  howArtIcon(ctx, i, x, y) {
    const img = SPR.specialIcons[i], s = SPECIALS[i];
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow(26, SNES.mix(s.color, '#000000', 0.55)), x, y - 16));
    ctx.drawImage(img, Math.round(x - img.width * 2), Math.round(y - 16 - img.height * 2), img.width * 4, img.height * 4);
    NES.wrap(s.name, 14).forEach((l, k) => NES.text(ctx, l, x, y + 30 + k * 10, s.color, { align: 'center' }));
  },

  // A little stage: v = vertical (a formation above, the Chimera below), s = side-scrolling,
  // raid = side-scrolling over tanks and missile sites, bonus = a formation that doesn't fire.
  howArtStage(ctx, x, y, kind) {
    const f = (this.t >> 3) & 1;
    if (kind === 'v' || kind === 'bonus') {
      const type = kind === 'bonus' ? 'drone' : 'fighter';
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        NES.drawRot(ctx, SPR.enemy[r && kind === 'v' ? 'bomber' : type].normal[f], x - 45 + c * 30 + Math.round(Math.sin(this.t * 0.04) * 6), y - 70 + r * 22, Math.PI);
      }
      this.howArtGun(ctx, 'twin', x, y + 70, 1);
      NES.text(ctx, kind === 'bonus' ? 'NO RETURN FIRE' : 'VERTICAL', x, HOW_ART.y + 20, C.gold, { align: 'center' });
      return;
    }
    const gy = y + 70;
    ctx.fillStyle = C.dgreen; ctx.fillRect(x - 75, gy, 150, 30);
    ctx.fillStyle = C.olive; for (let k = 0; k < 150; k += 8) ctx.fillRect(x - 75 + ((k - this.t) % 150 + 150) % 150, gy, 4, 2);
    this.drawShip(ctx, 0, x - 44, y - 10, 0, true, true, 0);
    for (let k = 0; k < 4; k++) { const bx = x - 30 + ((this.t * 5 + k * 30) % 120); this.drawPlayerBullet(ctx, { kind: 'shot', x: bx, y: y - 10, vx: 1, vy: 0 }); }
    if (kind === 'raid') {
      NES.draw(ctx, SPR.enemy.tank.side.normal[f], x + 30, gy - 6);
      NES.draw(ctx, SPR.enemy.sam.side.normal[f], x + 58, gy - 7);
    } else for (let k = 0; k < 2; k++) NES.draw(ctx, SPR.enemy.fighter.side.normal[f], x + 36 + k * 24, y - 30 + k * 30 + Math.round(Math.sin(this.t * 0.06 + k) * 5));
    NES.text(ctx, kind === 'raid' ? 'GROUND TARGETS' : 'SIDE-SCROLLING', x, HOW_ART.y + 20, C.gold, { align: 'center' });
  },

  // The three galaxies as glows, with the carrier's path running between them.
  howArtMap(ctx, x, y) {
    const pts = GALAXIES.map((G, i) => [x + (i % 2 ? 20 : -20), y - 64 + i * 60, G]);
    ctx.fillStyle = C.gray;
    for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 16; k += 2) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      ctx.fillRect(Math.round(ax + (bx - ax) * k / 16), Math.round(ay + (by - ay) * k / 16), 1, 1);
    }
    for (const [gx, gy, G] of pts) {
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(14, SNES.mix(G.col, '#000000', 0.5)), gx, gy));
      NES.draw(ctx, SNES.sphere(3, G.col), gx, gy);
      NES.wrap(G.name, 9).forEach((l, k) => NES.text(ctx, l, gx, gy + 12 + k * 9, G.col, { align: 'center' }));
    }
    const q = (this.t % 240) / 120, i = Math.min(1, Math.floor(q)), e = q - i, [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    ctx.fillStyle = C.white; ctx.fillRect(Math.round(ax + (bx - ax) * e), Math.round(ay + (by - ay) * e) - 1, 2, 2);
  },

  howArtStation(ctx, x, y) {
    const frames = this.stationArt(), art = frames[Math.floor(this.t / 16) % frames.length];
    ctx.drawImage(art, Math.round(x - (art.width >> 1)), Math.round(y - 60));
    this.drawCarrierSide(ctx, x - 58, y + 56, true, 0.2);
  },
});
