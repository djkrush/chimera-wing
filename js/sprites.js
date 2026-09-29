'use strict';
// All pixel art. Sprites point UP; the game rotates them to face their heading.
const SPR = (() => {
  const C = NES.C;
  const S = NES.sprite;

  // ---- Player: VX-3 Chimera in its three forms --------------------------------
  const FIGHTER = [
    '.......W.......',
    '.......W.......',
    '......WGW......',
    '......WBW......',
    '......WBW......',
    '.....WWGWW.....',
    '.....WWWWW.....',
    '....GWWRWWG....',
    '...GWWWWWWWG...',
    '..GWWWWWWWWWG..',
    '.GWWWWWWWWWWWG.',
    'GRRWW.WWW.WWRRG',
    '.....WWWWW.....',
    '....RWW.WWR....',
    '.....K...K.....',
  ];
  const GUARDIAN = [
    '.......W.......',
    '......WGW......',
    '......WBW......',
    '.....WWBWW.....',
    '..G..WWWWW..G..',
    '.GWWWWWRWWWWWG.',
    'GWWWWWWWWWWWWWG',
    'GRR.KWWWWWK.RRG',
    '....KWWWWWK....',
    '.....GWWWG.....',
    '....GWG.GWG....',
    '....WW...WW....',
    '...GWW...WWG...',
    '...WWW...WWW...',
    '...KK.....KK...',
  ];
  const BATTLOID = [
    '......GWG......',
    '.....WBBBW.....',
    '.....WWRWW.....',
    '..RR..WWW..RR..',
    '.GWWGWWWWWGWWG.',
    '.GWWGWWRWWGWWG.',
    '.WWG.WWWWW.GWW.',
    '.WW..WWWWW..WWK',
    '.GG..GWWWG..GKK',
    '.....GW.WG...K.',
    '.....WW.WW.....',
    '....GWW.WWG....',
    '....WW...WW....',
    '....WW...WW....',
    '...GWW...WWG...',
    '...KKK...KKK...',
  ];
  const FORMS = [FIGHTER, GUARDIAN, BATTLOID];
  const playerMap = { W: C.white, G: C.lgray, B: C.sky, R: C.red, K: C.gray };
  // How a form looks once Dr. Voss has methylated (silenced) it.
  const silencedMap = { W: C.pink, G: C.purple, B: C.lime, R: C.magenta, K: C.purple };

  // ---- Enemy aircraft --------------------------------------------------------
  const MIG = [
    '......R......',
    '......L......',
    '.....LDL.....',
    '.....DCD.....',
    '.....DDD.....',
    '....LDDDL....',
    '...LDDRDDL...',
    '..LDDDDDDDL..',
    '.LDDDDDDDDDL.',
    'LDDD.DDD.DDDL',
    '.....DDD.....',
    '....LDEDL....',
    '......E......',
  ];
  const BOMBER = [
    '.......LL.......',
    '.......DD.......',
    '......DCCD......',
    '.......DD.......',
    '.......DD.......',
    'LLLLLLLDDLLLLLLL',
    'DDDDDDDDDDDDDDDD',
    '.RR..RRDDRR..RR.',
    '.EE..EEDDEE..EE.',
    '.......DD.......',
    '.....LLDDLL.....',
    '.....DDDDDD.....',
  ];
  const METHYLATOR = [
    '........L........',
    '.......LDL.......',
    '......LDCDL......',
    '.....LDDDDDL.....',
    '....LDDDDDDDL....',
    '...LDDGDDDGDDL...',
    '..LDDDDDDDDDDDL..',
    '.LDDDDDDDDDDDDDL.',
    'LDDDDDDDDDDDDDDDL',
    'DDDDD.DDEDD.DDDDD',
    '.DDD...DDD...DDD.',
  ];

  // Ground-based missile launcher for side-scrolling missions (drawn unrotated).
  const SAM = [
    '.R..........',
    '..LL........',
    '...LL.......',
    '....LLDD....',
    '..DDDDDDDD..',
    'DDDDDDDDDDDD',
    'KDKDKDKDKDKD',
    '.K.K.K.K.K..',
  ];

  const gold = { D: C.gold, L: C.cream };   // acetylated (aggressive) palette swap
  const ENEMY_DEFS = {
    fighter: { rows: MIG, normal: { D: C.periwinkle, L: C.ice, R: C.red, C: C.gold } },
    bomber: { rows: BOMBER, normal: { D: C.green, L: C.chartreuse, R: C.darkred, C: C.sky } },
    methyl: { rows: METHYLATOR, normal: { D: C.purple, L: C.pink, C: C.aqua, G: C.lime },
      dmg: { D: C.blue, L: C.sky, C: C.aqua, G: C.lime } },
    sam: { rows: SAM, normal: { D: C.olive, L: C.lgray, K: C.gray, R: C.red } },
  };
  // Two frames each: engine exhaust alternates orange/yellow.
  const frames = (rows, pal) => [S(rows, { ...pal, E: C.orange }), S(rows, { ...pal, E: C.yellow })];
  const enemy = {};
  for (const [type, d] of Object.entries(ENEMY_DEFS)) {
    enemy[type] = {
      normal: frames(d.rows, d.normal),
      acetyl: frames(d.rows, { ...d.normal, ...gold }),
      dmg: frames(d.rows, d.dmg || d.normal),
      white: S(d.rows, null, C.white),
    };
  }

  // ---- Small stuff -----------------------------------------------------------
  const ebullet = S(['.W.', 'WRW', 'WRW', '.R.'], { W: C.white, R: C.red });
  const missile = S(['.W.', 'WWW', 'WRW', 'WWW', 'G.G'], { W: C.white, R: C.red, G: C.gray });
  const life = S(['...W...', '..WBW..', '.WWWWW.', 'WWWRWWW', 'W.WWW.W', '..R.R..'],
    { W: C.white, B: C.sky, R: C.red });

  // ---- Dr. Helena Voss, rogue epigeneticist ---------------------------------
  const portrait = S([
    '.......KKKKKKKKK........',
    '.....KKKKKKKKKKKKK......',
    '....KKKKHHKKKKKKKKK.....',
    '...KKKKSSSSSSSSSKKKK....',
    '...KKKSSSSSSSSSSSKKK....',
    '...KKSSSSSSSSSSSSSKK....',
    '...KGGGGGGSSSGGGGGGK....',
    '...KGCCCCGGGGGCCCCGK....',
    '...KGCWCCGSSSGCWCCGK....',
    '...KGGGGGGSSSGGGGGGK....',
    '...KKSSSSSSNSSSSSSKK....',
    '....KSSSSSSSSSSSSSK.....',
    '....KSSSSRRRRRSSSSK.....',
    '.....SSSSSSSSSSSSS......',
    '......SSSSSSSSSSS.......',
    '........SSSSSSS.........',
    '....WWWWWSSSSSWWWWW.....',
    '..WWWWWWWPSSSPWWWWWWW...',
    '.WWWWWWWWPPPPPWWWWWWWW..',
    '.WWLWWWWWPPEPPWWWWWLWW..',
    '.WWLWWWWWPPPPPWWWWWLWW..',
    '.WWLWWWWWWPPPWWWWWWLWW..',
    '.WWLWWWWWWPPPWWWWWWLWW..',
    '.WWLWWWWWWWPWWWWWWWLWW..',
  ], {
    K: C.maroon, H: C.rust, S: C.skin, N: C.orange, G: C.gray, C: C.lime,
    W: C.white, L: C.lgray, P: C.purple, E: C.lime, R: C.rose,
  });

  // ---- Dr. Mira Kato, Chimera Project lead (the player's ally) ---------------
  const mira = S([
    '.......KKKKKKKKKK.......',
    '.....KKKKKKKKKKKKKK.....',
    '....KKKKKKKKKKKKKKKK....',
    '...KKKKKKKKKKKKKKKKKK...',
    '...KKKKSSSSSSSSSSKKKK...',
    '..GKKKSSSSSSSSSSSSKKKG..',
    '..GKKSSSSSSSSSSSSSSKKG..',
    '..GKSSKKKSSSSSSKKKSSKG..',
    '..GKSSWBWSSSSSSWBWSSKG..',
    '..GKSSSSSSSSSSSSSSSSKG..',
    '..HKSSSSSSSDDSSSSSSSK...',
    '..H.KSSSSSSSSSSSSSSK....',
    '..HH.SSSSSMMMMSSSSS.....',
    '....HHSSSSSSSSSSSS......',
    '......SSSSSSSSSSS.......',
    '........DSSSSSD.........',
    '....CCCCCLSSSSLCCCCC....',
    '..CCCCCCCLLSSLLCCCCCCC..',
    '.CCCCCCCCLLLLLLCCCCCCCC.',
    '.CCECCCCCLLLLLLCCCCCECC.',
    '.CCECCCCCCLLLLCCCCCCECC.',
    '.CCECCCCCCLLLLCCCCCCECC.',
    '.CCECCCCCCCLLCCCCCCCECC.',
    '.CCECCCCCCCLLCCCCCCCECC.',
  ], {
    K: C.brown, S: C.orange, D: C.rust, W: C.white, B: C.black, G: C.lgray, H: C.gray,
    M: C.rose, C: C.white, E: C.lgray, L: C.blue,
  });

  // ---- Pilots (same order as PILOTS in pilots.js) ----------------------------
  const pilots = [
    S([   // Maverick: aviator shades, leather jacket with a fur collar
      '........KKKKKKKK........',
      '......KKKKKKKKKKKK......',
      '.....KKKKKKKKKKKKKK.....',
      '....KKKKKKKKKKKKKKKK....',
      '....KKSSSSSSSSSSSSKK....',
      '....KSSSSSSSSSSSSSSK....',
      '....KSBBBBBSSBBBBBSK....',
      '....SSBWBBBBBBWBBBSS....',
      '....SSSBBBSSSSBBBSSS....',
      '.....SSSSSSNNSSSSSS.....',
      '.....SSSSSSSSSSSSSS.....',
      '.....SSSSRRRRRRSSSS.....',
      '......SSSSSSSSSSSS......',
      '.......SSSSSSSSSS.......',
      '.........SSSSSS.........',
      '....FFFFFFSSSSFFFFFF....',
      '..FFFFFFFFTSSTFFFFFFFF..',
      '.JJJJJJJJJTTTTJJJJJJJJJ.',
      '.JJJJJJJJJTTTTJJJJJJJJJ.',
      '.JJJEJJJJJJTTJJJJJJEJJJ.',
      '.JJJEJJJJJJTTJJJJJJEJJJ.',
      '.JJJJJJJJJJTTJJJJJJJJJJ.',
      '.JJJJJJJJJJTTJJJJJJJJJJ.',
      '.JJJJJJJJJJJJJJJJJJJJJJ.',
    ], { K: C.brown, S: C.skin, B: C.black, W: C.white, N: C.orange, R: C.rust,
      F: C.cream, T: C.white, J: C.olive, E: C.brown }),
    S([   // Turtle: pigtails with ribbons, green flight suit
      '.......YYYYYYYYYY.......',
      '.....YYYYYYYYYYYYYY.....',
      '....YYYYYYYYYYYYYYYY....',
      '...YYYYYYYYYYYYYYYYYY...',
      '..RYYYSSYYYYYYYYSSYYYR..',
      '.RRYYSSSSSSSSSSSSSSYYRR.',
      '..YYSSSSSSSSSSSSSSSSYY..',
      '..YYSKKKSSSSSSSSKKKSYY..',
      '.YYYSWBKSSSSSSSSWBKSYYY.',
      '.YYYSWBBSSSSSSSSWBBSYYY.',
      '.YY.SSSSSSSSSSSSSSSS.YY.',
      '.YY.SPPSSSSSSSSSSPPS.YY.',
      '.YY..SSSSSSMMSSSSSS..YY.',
      '..Y...SSSSSSSSSSSS...Y..',
      '.......SSSSSSSSSS.......',
      '.........SSSSSS.........',
      '....LLLLLGSSSSGLLLLL....',
      '..GGGGGGGLGSSGLGGGGGGG..',
      '.GGGGGGGGGLLLLGGGGGGGGG.',
      '.GGWGGGGGGGLLGGGGGGGWGG.',
      '.GGWGGGGGGGLLGGGGGGGWGG.',
      '.GGGGGGGGGGLLGGGGGGGGGG.',
      '.GGGGGGGGGGLLGGGGGGGGGG.',
      '.GGGGGGGGGGGGGGGGGGGGGG.',
    ], { Y: C.gold, R: C.rose, S: C.skin, K: C.black, W: C.white, B: C.blue, P: C.pink,
      M: C.rose, L: C.lime, G: C.green }),
    S([   // Drac: antennae, big black eyes, grey uniform
      '..A..................A..',
      '...A................A...',
      '....A..............A....',
      '.....A..VVVVVVVV..A.....',
      '......AVVVVVVVVVVA......',
      '.....VVVVDVVVVDVVVV.....',
      '....VVVVVVDVVDVVVVVV....',
      '....VVVVVVVVVVVVVVVV....',
      '...VVBBBBBVVVVBBBBBVV...',
      '...VBBWBBBBVVBBBBWBBV...',
      '...VBBBBBBBVVBBBBBBBV...',
      '...VVBBBBBVVVVBBBBBVV...',
      '....VVVVVVVVVVVVVVVV....',
      '....VVVVVVVDDVVVVVVV....',
      '.....VVVVVVVVVVVVVV.....',
      '......VVVMMMMMMVVV......',
      '........VVVVVVVV........',
      '.........VVVVVV.........',
      '....HHHHHGVVVVGHHHHH....',
      '..HHHHHHHGGVVGGHHHHHHH..',
      '.HHHHHHHHHGGGGHHHHHHHHH.',
      '.HHCHHHHHHHGGHHHHHHHCHH.',
      '.HHCHHHHHHHGGHHHHHHHCHH.',
      '.HHHHHHHHHHGGHHHHHHHHHH.',
    ], { A: C.pink, V: C.lime, D: C.green, B: C.black, W: C.white, M: C.dgreen,
      H: C.gray, G: C.magenta, C: C.lgray }),
  ];

  // HUD shield pips: full and spent
  const PIP = ['WWWWW', 'WBBBW', 'WBBBW', '.WBW.', '..W..'];
  const shieldPip = S(PIP, { W: C.white, B: C.sky });
  const shieldPipOff = S(PIP, { W: C.gray, B: C.black });

  // TET enzyme capsule (demethylates a silenced form)
  const tet = S(['.LLLWW.', 'LLLLWWW', 'LGLLWWW', 'LLLLWWW', '.LLLWW.'], { L: C.lime, G: C.green, W: C.white });

  // ---- Special weapon icons (same order as SPECIALS in specials.js) ----------
  const specialIcons = [
    S(['.......', 'CCCCCCC', 'WWWWWWW', 'CCCCCCC', '.......'], { C: C.aqua, W: C.white }),
    S(['..O..', '.OYO.', 'OYWYO', '.OYO.', '..O..'], { O: C.red, Y: C.orange, W: C.yellow }),
    S(['W.W.W', '.WYW.', 'WYRYW', '.WYW.', 'W.W.W'], { W: C.white, Y: C.yellow, R: C.red }),
    S(['.CCC.', 'C...C', 'C.W.C', 'C...C', '.CCC.'], { C: C.lime, W: C.aqua }),
  ];

  // ---- Bosses: hulls drawn procedurally ---------------------------------------
  // Fortress (vertical stages) is purple; the Histone Gunship (side missions) is military green.
  const FORTRESS_PAL = { top: C.gray, body: C.violet, lines: C.navy, edge: C.lgray, under: C.lavender };
  const GUNSHIP_PAL = { top: C.gray, body: C.green, lines: C.dgreen, edge: C.lgray, under: C.chartreuse };
  function buildBossHull(pal) {
    const w = 128, h = 48;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dx = Math.abs(px - 63.5);
        const notch = dx > 18 && Math.floor(dx / 10) % 2 ? 3 : 0;   // stepped trailing edge
        const top = 4 + dx * 0.22 + notch;
        const bot = 44 - dx * 0.42;
        if (py < top || py > bot) continue;
        let col;
        if (py < top + 1 || py > bot - 1) col = pal.edge;
        else if (py > bot - 3) col = pal.under;
        else if (Math.round(dx) % 12 === 0 || py % 9 === 0) col = pal.lines;
        else col = py < 18 ? pal.top : pal.body;
        x.fillStyle = col;
        x.fillRect(px, py, 1, 1);
      }
    }
    // cockpit windows along the nose
    x.fillStyle = C.yellow;
    for (let i = -4; i <= 4; i++) if (i !== 0) x.fillRect(63 + i * 5, 34 - Math.abs(i), 2, 1);
    // engine nozzles on the trailing edge
    for (const ox of [-46, -30, 30, 46]) {
      const dx = Math.abs(ox);
      const top = Math.floor(4 + dx * 0.22 + (Math.floor(dx / 10) % 2 ? 3 : 0));
      x.fillStyle = C.gray; x.fillRect(63 + ox - 2, top - 2, 5, 3);
      x.fillStyle = C.black; x.fillRect(63 + ox - 1, top - 2, 3, 1);
    }
    return c;
  }

  return {
    player: FORMS.map(r => S(r, playerMap)),
    playerWhite: FORMS.map(r => S(r, null, C.white)),
    silenced: FORMS.map(r => S(r, silencedMap)),
    enemy, ebullet, missile, life, portrait, mira, pilots, shieldPip, shieldPipOff, tet, specialIcons,
    bossHull: buildBossHull(FORTRESS_PAL),
    gunshipHull: buildBossHull(GUNSHIP_PAL),
  };
})();
