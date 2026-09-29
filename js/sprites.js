'use strict';
// All pixel art. Top-down sprites point UP and the game rotates them to face their heading.
// Side-mission sprites are side profiles, drawn unrotated (player facing right, enemies facing left).
const SPR = (() => {
  const C = NES.C;
  const S = NES.sprite;

  // ---- Player: VX-3 Chimera in its three forms --------------------------------
  // Top-down art is written as the left half ending on the center column, then mirrored.
  const FIGHTER = SNES.mirror([
    '.............W',
    '.............W',
    '............WW',
    '............WW',
    '............WW',
    '...........WWB',
    '...........WBB',
    '...........WBB',
    '...........WBB',
    '..........WWBB',
    '..........WWWB',
    '..........GWWW',
    '.........KGWWW',
    '.........KGWWW',
    '........GKGWWW',
    '.......GWKGWWW',
    '......GWWKGWWR',
    '.....GWWWKGWWR',
    '....GWWWWKGWWR',
    '...GWWWWWKGWWR',
    '..GWWWWWWKGWWR',
    '.GRRWWWWWKGWWR',
    'GRRWWWWWWKGWWW',
    'Gggggggg.KGWWW',
    '.........KGGWW',
    '......G..KKGWW',
    '.....GWG.KKGWW',
    '....GWWG.KKGWW',
    '....GWG..KK.GW',
    '..........K...',
  ]);
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
    '..GG..............................',
    '..GWG.............................',
    '..GWWG............BBB.............',
    '..GWWWG.........BBBBBB............',
    '.KKWWWWWWWWWWWWWWBBBBBWWW.........',
    'KKKWWWWWWWWWWWWWWWWWWWWWWWWWWW....',
    'KKKRRRRRRRRRRRRRRRRRRRRWWWWWWWWWWW',
    '.KKWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    '...GGGGWWWWWWWWWWWGGGG............',
    '......gGGGGGGGGGGg................',
    '........KKK.......................',
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
  // SNES shading: every palette color becomes a 5-shade ramp (pure white is ramped from a cool gray,
  // or it would have no room for highlights). E (engine glow) stays flat.
  const ramps = pal => Object.fromEntries(Object.entries(pal).map(([k, col]) =>
    [k, k === 'E' ? col : SNES.ramp(col === C.white ? '#c0c8d8' : col)]));
  const B = (rows, pal) => SNES.bake(rows, ramps(pal));
  const flash = rows => SNES.bake(rows, {}, { solid: C.white });
  const bakeForms = (list, pal) => ({
    normal: list.map(r => B(r, pal)),
    white: list.map(flash),
    silenced: list.map(r => B(r, silencedMap)),
  });
  const hulls = HULL_ART.map(h => ({ top: bakeForms(h.top, h.pal), side: bakeForms(h.side, h.pal) }));

  // ---- Enemy aircraft --------------------------------------------------------
  const MIG = SNES.mirror([
    '..........R',
    '..........L',
    '.........LL',
    '.........LC',
    '.........LC',
    '........DLL',
    '........DLL',
    '.......DDLL',
    '......DLDLL',
    '.....DLLDLL',
    '....DLLLDLL',
    '...DLLLLDLL',
    '..DLLLLLDLL',
    '.DLLLLLRDLL',
    'DdddddddDLL',
    '.......DDLL',
    '.....D.DDDL',
    '....DLD.DD.',
    '....DD..EE.',
    '........E..',
  ]);
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
    '...................DD.....',
    '..................DLD.....',
    '.......CC........DLLD.....',
    '.....CCCCC......DLLLD.....',
    '..LLLLLLLLLLLLLLLLLLLLLLDE',
    'RLLLLLLLLLLLLLLLLLLLLLLLDE',
    '..DDDLLLLLLLLLLLLLLLLLLLDE',
    '......DDDDDDRRDDDDDDDDD...',
    '..........dddd............',
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
  const frames = (rows, pal) => [B(rows, { ...pal, E: C.orange }), B(rows, { ...pal, E: C.yellow })];
  const bakeEnemy = (rows, d) => ({
    normal: frames(rows, d.normal),
    acetyl: frames(rows, { ...d.normal, ...gold }),
    dmg: frames(rows, d.dmg || d.normal),
    white: flash(rows),
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

  // ---- Side-mission boss bases, drawn procedurally --------------------------------
  // Keyed by the `pal` field of BOSSES in bosses.js.
  const BOSS_PALS = {
    bunker: { top: C.gray, body: C.green, lines: C.dgreen, edge: C.lgray, under: C.chartreuse },
    copier: { top: C.gray, body: C.teal, lines: C.navy, edge: C.ice, under: C.cyan },
    queen: { top: C.olive, body: C.gold, lines: C.brown, edge: C.cream, under: C.yellow },
    xinact: { top: C.gray, body: C.rust, lines: C.maroon, edge: C.cream, under: C.orange },
    twins: { top: C.gray, body: C.blue, lines: C.navy, edge: C.lgray, under: C.periwinkle },
    citadel: { top: C.lgray, body: C.purple, lines: C.black, edge: C.pink, under: C.magenta },
  };

  // Fortified ground base for side-mission bosses (bosses.js), 176 x 112, bottom row on the ground.
  // A long bunker, a wall, a gun tower and the tall command tower (target spots in bosses.js).
  function buildBaseHull(pal) {
    const w = 176, h = 112;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const put = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
    const block = (bx, by, bw, bh) => {
      put(pal.body, bx, by, bw, bh);
      put(pal.top, bx, by, bw, 4);
      for (let yy = by + 8; yy < by + bh; yy += 8) put(pal.lines, bx, yy, bw, 1);   // seams
      put(pal.edge, bx, by, bw, 1); put(pal.edge, bx, by, 1, bh);                    // lit edges
      put(pal.lines, bx + bw - 1, by, 1, bh);                                         // shaded edge
      for (let yy = by + 5; yy < by + bh - 4; yy += 12) {                             // windows
        for (let xx = bx + 5; xx < bx + bw - 4; xx += 8) put(C.yellow, xx, yy, 2, 2);
      }
    };
    block(0, 72, 176, 40);
    block(70, 56, 50, 16);
    block(40, 36, 30, 36);
    block(120, 2, 30, 70);
    for (let xx = 2; xx < 174; xx += 12) put(pal.top, xx, 69, 5, 3);                // bunker battlements
    for (let xx = 0; xx < 176; xx += 8) put(pal.under, xx, 108, 4, 4);             // hazard stripes
    put(C.gray, 146, 0, 1, 2);                                                       // antenna
    return c;
  }

  return {
    hulls,
    enemy, ebullet, missile, life, wing, wingSide, portrait, mira, pilots, shieldPip, shieldPipOff, tet, specialIcons,
    baseHulls: Object.fromEntries(Object.entries(BOSS_PALS).map(([k, pal]) => [k, buildBaseHull(pal)])),
  };
})();
