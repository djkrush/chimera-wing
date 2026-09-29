'use strict';
// All pixel art. Top-down sprites point UP and the game rotates them to face their heading.
// Side-mission sprites are side profiles, drawn unrotated (player facing right, enemies facing left).
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
  // Side profiles (side-scrolling missions). These point RIGHT and are drawn unrotated.
  const FIGHTER_SIDE = [
    '..K.............',
    '..KW............',
    '..KWW.....BB....',
    '.KWWWWWWWWBBWW..',
    'KRWWWWWWWWWWWWWW',
    '.KGGWWWWWWWWGG..',
    '....GWWG........',
    '.....GG.........',
  ];
  const GUARDIAN_SIDE = [
    '..K.............',
    '..KW......BB....',
    '.KWWWWWWWWBBWW..',
    'KRWWWWWWWWWWWWWW',
    '.KGGWWWWWWWWGG..',
    '...GWWWG........',
    '....GWG.........',
    '....GWW.........',
    '....WWG.........',
    '...GWW..........',
    '...KKK..........',
  ];
  const BATTLOID_SIDE = [
    '....GWWG.....',
    '....WWBB.....',
    '....GWWG.....',
    '..RRWWWWR....',
    '.GWWWWWWGKKKK',
    '.GWWWRWWG....',
    '.KWWWWWW.....',
    '.KKWWWWW.....',
    '..GWWWWG.....',
    '..GWW.WW.....',
    '..WW...WW....',
    '..WW...GWG...',
    '.GWW....WW...',
    '.WWW....WW...',
    '.KKK....KKK..',
  ];

  // ---- Other hulls (sold at starbases). Each has its own Fighter shape and colors. ----
  const MANTICORE_FIGHTER = [   // forward-swept wings
    '.......W.......',
    '......WBW......',
    '.R....WBW....R.',
    '.GR...WWW...RG.',
    '..GW.WWWWW.WG..',
    '...GWWWRWWWG...',
    '....GWWWWWG....',
    '.....WWWWW.....',
    '.....WWWWW.....',
    '....GWWWWWG....',
    '...GWWWRWWWG...',
    '..RWW.WWW.WWR..',
    '.....RW.WR.....',
    '......K.K......',
  ];
  const MANTICORE_FIGHTER_SIDE = [
    '.K...............',
    '.KW..............',
    '.KWW.......BB....',
    'KWWWWWWWWWWBBWWR.',
    'RWWWWWWWWWWWWWWWW',
    '.KGGWWWWWWWWWWG..',
    '..........GWWG...',
    '...........GG....',
  ];
  const GRIFFIN_FIGHTER = [   // heavy, three engines
    '.......W.......',
    '......WBW......',
    '.....WWBWW.....',
    '....GWWWWWG....',
    '...GWWWWWWWG...',
    '..GWWWWRWWWWG..',
    '.GWWWWWWWWWWWG.',
    'GWWWWWWWWWWWWWG',
    'GWWWWWWWWWWWWWG',
    'GRRWWWWWWWWWRRG',
    '.GG.WWWWWWW.GG.',
    '....GWWWWWG....',
    '...RWWW.WWWR...',
    '....K..K..K....',
  ];
  const GRIFFIN_FIGHTER_SIDE = [
    '..KK............',
    '..KWW...........',
    '..KWWW....BBB...',
    '.KWWWWWWWWBBBWW.',
    'KRWWWWWWWWWWWWWW',
    'KRWWWWWWWWWWWWW.',
    '.KGGWWWWWWWWGG..',
    '...GWWWWG.......',
    '....GGGG........',
  ];
  const HYDRA_FIGHTER = [   // canards and a triple tail
    '.......W.......',
    '.......W.......',
    '......WBW......',
    '....G.WBW.G....',
    '....GWWWWWG....',
    '......WWW......',
    '.....WWRWW.....',
    '...GWWWWWWWG...',
    '.GWWWWWWWWWWWG.',
    'GWWWWWWWWWWWWWG',
    '.R...WWWWW...R.',
    '.....WWWWW.....',
    '...G.WWWWW.G...',
    '...WG.WWW.GW...',
    '.......K.......',
  ];
  const HYDRA_FIGHTER_SIDE = [
    '.K...............',
    '.KW..K...........',
    '.KWW.KW....BB....',
    '.KWWWWWWWWWBBWW..',
    'KRWWWWWWWWWWWWWWW',
    '.KGGWWWWWWWWWGG..',
    '.....GWWG...GG...',
    '......GG.........',
  ];
  // Same order as HULLS in pilots.js.
  const HULL_ART = [
    { top: [FIGHTER, GUARDIAN, BATTLOID], side: [FIGHTER_SIDE, GUARDIAN_SIDE, BATTLOID_SIDE],
      pal: { W: C.white, G: C.lgray, B: C.sky, R: C.red, K: C.gray } },
    { top: [MANTICORE_FIGHTER, GUARDIAN, BATTLOID], side: [MANTICORE_FIGHTER_SIDE, GUARDIAN_SIDE, BATTLOID_SIDE],
      pal: { W: C.orange, G: C.rust, B: C.yellow, R: C.darkred, K: C.brown } },
    { top: [GRIFFIN_FIGHTER, GUARDIAN, BATTLOID], side: [GRIFFIN_FIGHTER_SIDE, GUARDIAN_SIDE, BATTLOID_SIDE],
      pal: { W: C.cream, G: C.olive, B: C.aqua, R: C.green, K: C.gray } },
    { top: [HYDRA_FIGHTER, GUARDIAN, BATTLOID], side: [HYDRA_FIGHTER_SIDE, GUARDIAN_SIDE, BATTLOID_SIDE],
      pal: { W: C.ice, G: C.teal, B: C.gold, R: C.cyan, K: C.teal } },
  ];
  // How a form looks once Dr. Voss has methylated (silenced) it.
  const silencedMap = { W: C.pink, G: C.purple, B: C.lime, R: C.magenta, K: C.purple };
  const bakeForms = (list, pal) => ({
    normal: list.map(r => S(r, pal)),
    white: list.map(r => S(r, null, C.white)),
    silenced: list.map(r => S(r, silencedMap)),
  });
  const hulls = HULL_ART.map(h => ({ top: bakeForms(h.top, h.pal), side: bakeForms(h.side, h.pal) }));

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

  // Splitter (Alpha Centauri): a twin-hulled MiG that breaks in two when shot down.
  const SPLITTER = [
    '..R.......R..',
    '..L.......L..',
    '.LDL.....LDL.',
    '.DCD.....DCD.',
    '.DDD..L..DDD.',
    'LDDDLLDLLDDDL',
    'DDDDDDDDDDDDD',
    'LDDDLDDDLDDDL',
    '.DDD..D..DDD.',
    '.LEL.....LEL.',
    '..E.......E..',
  ];
  // Drone (Barnard's Star): tiny swarm craft.
  const DRONE = [
    'L.....L',
    '.LDDDL.',
    '.DCCCD.',
    '.DCRCD.',
    '.DDDDD.',
    'L..E..L',
  ];
  // Armored gunship (Tau Ceti): slow and tough.
  const ARMORED = [
    '......RRR......',
    '.....LDDDL.....',
    '....LDDCDDL....',
    '.LLLDDDDDDDLLL.',
    'LDDDDDDDDDDDDDL',
    'DDKDDDDDDDDDKDD',
    'DDKDDDDDDDDDKDD',
    'LDDDDDDDDDDDDDL',
    '.LLDDDDDDDDDLL.',
    '....DDDDDDD....',
    '....LEDDDEL....',
    '.....E...E.....',
  ];

  // Side profiles for side-scrolling missions. These point LEFT (toward the player).
  const MIG_SIDE = [
    '...........DL',
    '...CC.....DDL',
    '.LDCCDDDDDDD.',
    'RDDDDDDDDDDDE',
    '..LDDDDDDLL..',
    '....DDD......',
  ];
  const BOMBER_SIDE = [
    '..............D.',
    '.............DD.',
    '...CC........DDL',
    '.LDCCDDDDDDDDDDL',
    'LDDDDDDDDDDDDDDE',
    '.DDDDDDDDDDDDDD.',
    '...RR..RR.......',
    '...EE..EE.......',
  ];
  const METHYLATOR_SIDE = [
    '......LLLL.......',
    '....LDDCCDDL.....',
    '.LLDDDDDDDDDDLL..',
    'LDDDGDDDDDGDDDDE.',
    '.DDDDDDDDDDDDDD..',
    '...DDD.DED.DDD...',
  ];
  const SPLITTER_SIDE = [
    '..........DL',
    '..CC.....DDL',
    'LDCCDDDDDDD.',
    'RDDDDDDDDDDE',
    'LDDDDDDDDDD.',
    'RDDDDDDDDDDE',
    '...DD.......',
  ];
  const DRONE_SIDE = [
    '..LLL...',
    '.DCCDD.L',
    'RDDDDDDE',
    '.DDDDD.L',
    '..LLL...',
  ];
  const ARMORED_SIDE = [
    '...........LLL..',
    '..KKKK....DDDL..',
    '.LDDCCDDDDDDDDL.',
    'RDDDDDDDDDDDDDDE',
    'RDDDDDDDDDDDDDDE',
    '.LDDDDDDDDDDDDL.',
    '...KKK..KKK.....',
  ];

  const gold = { D: C.gold, L: C.cream };   // acetylated (aggressive) palette swap
  const ENEMY_DEFS = {
    fighter: { rows: MIG, side: MIG_SIDE, normal: { D: C.periwinkle, L: C.ice, R: C.red, C: C.gold } },
    bomber: { rows: BOMBER, side: BOMBER_SIDE, normal: { D: C.green, L: C.chartreuse, R: C.darkred, C: C.sky } },
    methyl: { rows: METHYLATOR, side: METHYLATOR_SIDE, normal: { D: C.purple, L: C.pink, C: C.aqua, G: C.lime },
      dmg: { D: C.blue, L: C.sky, C: C.aqua, G: C.lime } },
    sam: { rows: SAM, side: SAM, normal: { D: C.olive, L: C.lgray, K: C.gray, R: C.red } },
    splitter: { rows: SPLITTER, side: SPLITTER_SIDE, normal: { D: C.cyan, L: C.white, R: C.red, C: C.gold } },
    drone: { rows: DRONE, side: DRONE_SIDE, normal: { D: C.olive, L: C.yellow, C: C.orange, R: C.red } },
    armored: { rows: ARMORED, side: ARMORED_SIDE, normal: { D: C.rust, L: C.cream, K: C.gray, C: C.sky, R: C.red } },
  };
  // Two frames each: engine exhaust alternates orange/yellow.
  const frames = (rows, pal) => [S(rows, { ...pal, E: C.orange }), S(rows, { ...pal, E: C.yellow })];
  const bakeEnemy = (rows, d) => ({
    normal: frames(rows, d.normal),
    acetyl: frames(rows, { ...d.normal, ...gold }),
    dmg: frames(rows, d.dmg || d.normal),
    white: S(rows, null, C.white),
  });
  const enemy = {};
  for (const [type, d] of Object.entries(ENEMY_DEFS)) {
    enemy[type] = { ...bakeEnemy(d.rows, d), side: bakeEnemy(d.side, d) };
  }

  // ---- Small stuff -----------------------------------------------------------
  const ebullet = S(['.W.', 'WRW', 'WRW', '.R.'], { W: C.white, R: C.red });
  const missile = S(['.W.', 'WWW', 'WRW', 'WWW', 'G.G'], { W: C.white, R: C.red, G: C.gray });
  const life = S(['...W...', '..WBW..', '.WWWWW.', 'WWWRWWW', 'W.WWW.W', '..R.R..'],
    { W: C.white, B: C.sky, R: C.red });
  // WINGMAN special's drone, top-down and side profile
  const wing = S(['...W...', '..WBW..', '.WWWWW.', 'W.WRW.W', '..R.R..'], { W: C.sky, B: C.white, R: C.red });
  const wingSide = S(['.W.....', 'WWWWBW.', '.RWWWWW'], { W: C.sky, B: C.white, R: C.red });

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
    S(['.LLL.', 'L.W.L', 'LWWWL', 'L.W.L', '.LLL.'], { L: C.lime, W: C.white }),
    S(['..W..', '.WBW.', 'WWWWW', '..W..', '.W.W.'], { W: C.sky, B: C.white }),
  ];

  // ---- Bosses: hulls drawn procedurally ---------------------------------------
  // Fortress (vertical stages) is purple; the Histone Gunship (side missions) is military green.
  const FORTRESS_PAL = { top: C.gray, body: C.violet, lines: C.navy, edge: C.lgray, under: C.lavender };
  const GUNSHIP_PAL = { top: C.gray, body: C.green, lines: C.dgreen, edge: C.lgray, under: C.chartreuse };
  // Keyed by the `pal` field of BOSSES in bosses.js.
  const BOSS_PALS = {
    fortress: FORTRESS_PAL,
    gunship: GUNSHIP_PAL,
    copier: { top: C.gray, body: C.teal, lines: C.navy, edge: C.ice, under: C.cyan },
    queen: { top: C.olive, body: C.gold, lines: C.brown, edge: C.cream, under: C.yellow },
    xinact: { top: C.gray, body: C.rust, lines: C.maroon, edge: C.cream, under: C.orange },
    twins: { top: C.gray, body: C.blue, lines: C.navy, edge: C.lgray, under: C.periwinkle },
    flagship: { top: C.lgray, body: C.purple, lines: C.black, edge: C.pink, under: C.magenta },
  };
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

  // Side profile of a boss hull for side-scrolling missions: a flying battleship, nose LEFT.
  // 128x56, centered like the top-down hull so part offsets stay simple.
  function buildBossSideHull(pal) {
    const w = 128, h = 56, cy = 28;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const half = px => px < 30 ? 2 + px * 0.4 : px < 110 ? 14 : 14 - (px - 110) * 0.25;
    const put = (px, py, col) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); };
    for (let px = 0; px < w; px++) {
      let top = Math.round(cy - half(px)), bot = Math.round(cy + half(px));
      if (px >= 60 && px <= 96) top = 6;                    // bridge tower
      if (px >= 36 && px <= 84) bot = Math.max(bot, 48 - Math.max(0, Math.abs(px - 60) - 18));   // keel pod
      if (px >= 104 && px <= 124) {                          // tail fins
        top = Math.min(top, 2 + Math.round((124 - px) * 0.4));
        bot = Math.max(bot, 54 - Math.round((124 - px) * 0.4));
      }
      for (let py = top; py <= bot; py++) {
        let col;
        if (py === top || py === bot) col = pal.edge;
        else if (py > bot - 3) col = pal.under;
        else if (px % 12 === 0 || py === cy) col = pal.lines;
        else col = py < cy - 6 ? pal.top : pal.body;
        put(px, py, col);
      }
    }
    for (let px = 64; px <= 92; px += 4) put(px, 10, C.yellow);   // bridge windows
    for (let px = 8; px <= 28; px += 5) put(px, cy - 2, C.yellow);   // nose windows
    for (const ny of [cy - 7, cy + 6]) {                             // engine nozzles
      x.fillStyle = C.gray; x.fillRect(124, ny - 1, 4, 3);
      x.fillStyle = C.black; x.fillRect(127, ny, 1, 1);
    }
    return c;
  }

  return {
    hulls,
    enemy, ebullet, missile, life, wing, wingSide, portrait, mira, pilots, shieldPip, shieldPipOff, tet, specialIcons,
    bossHulls: Object.fromEntries(Object.entries(BOSS_PALS).map(([k, pal]) => [k, buildBossHull(pal)])),
    bossSideHulls: Object.fromEntries(Object.entries(BOSS_PALS).map(([k, pal]) => [k, buildBossSideHull(pal)])),
  };
})();
