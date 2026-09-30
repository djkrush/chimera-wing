'use strict';
// All pixel art. Top-down sprites point UP and the game rotates them to face their heading.
// Side-mission sprites are side profiles, drawn unrotated (player facing right, enemies facing left).
const SPR = (() => {
  const C = NES.C;

  // ---- Player: VX-3 Chimera in its three forms --------------------------------
  // Top-down art is written as the left half ending on the center column, then mirrored.
  const FIGHTER = SNES.mirror([   // fighter mode: swept wings, twin canted tails on the leg nacelles
    '...............W',
    '...............W',
    '..............WW',
    '..............WW',
    '..............WW',
    '.............WWB',
    '.............WBB',
    '.............WBB',
    '.............WBB',
    '............WWWB',
    '............GWWW',
    '...........KGWWW',
    '..........RKGWWW',
    '.........WRKGWWW',
    '........WWWKGWWW',
    '.......WWWWKGWWW',
    '......WWWWWKGWWW',
    '.....WWWWWWKGWWR',
    '....WWWWWWWKGWWR',
    '...WWWWWWWWKGWWR',
    '..RWWWWWWWWKGWWR',
    '.RRWWWWWWWWKGWWW',
    'RRggggggggWKGWWW',
    '..........WWGKWW',
    '.........GWWGKWW',
    '........GGWWGKWW',
    '.......GG.WWGKKW',
    '......GG..WWGKKW',
    '....WWWG..WWGK.K',
    '...WWWWG..WWGK..',
    '..........KKK...',
  ]);
  const GUARDIAN = SNES.mirror([   // GERWALK: wings out, arms holding gun pods forward, legs down with feet
    '...............W',
    '...............W',
    '..............WW',
    '..............WW',
    '..........K...WW',
    '..........K..WWB',
    '..........K..WBB',
    '..........K..WBB',
    '.........KKK.WBB',
    '.........KKK.WWB',
    '.........KKKGWWW',
    '..........GKGWWW',
    '.........WRKGWWW',
    '.......WWWRKGWWW',
    '.....WWWWWWKGWWW',
    '...WWWWWWWWKGWWW',
    '.RRWWWWWWWWKGWWR',
    'RRWWWWWWWWWKGWWR',
    'RgggggggggWKGWWR',
    '..........WWGKWW',
    '........GWWWWGKW',
    '.......GGWWWWGKW',
    '.......G.WWWWG.K',
    '.........WWWW...',
    '........WWWWW...',
    '........WRRWW...',
    '........WWWWW...',
    '........GWWWG...',
    '.......KKKKKKK..',
    '.......KKKKKKK..',
  ]);
  const BATTLOID = [   // Battloid: twin head lasers, visor, intake shoulders, folded wings, gun pod up
    '..........K...K......K.....',
    '..........K...K......K.....',
    '..........GWWWG......K.....',
    '.........GWBBBWG....KKK....',
    '...W......GWWWG.....KKK....',
    '...WW...GGGGWGGGG...KKK....',
    '...WWWGWWWWWWWWWWWGWKKK....',
    '..GWWWGWWWKKWKKWWWGWWWG....',
    '..GWWWGWWWKKWKKWWWGWWWG....',
    '..GRRWG.WWWWWWWWW.GWRRG....',
    '..GWWWG.WWWRRRWWW.GWWWG....',
    '..GWWWG.GWWWWWWWG.GWWWG....',
    '..KWWK...GWWWWWG...KWWK....',
    '..KKKK...KKKKKKK...KKKK....',
    '........GWWWKWWWG..........',
    '.......GWWWG.GWWWG.........',
    '.......GWWWG.GWWWG.........',
    '.......GWWG...GWWG.........',
    '......GWWWG...GWWWG........',
    '......GRRWG...GWRRG........',
    '......GWWWG...GWWWG........',
    '.....GWWWWG...GWWWWG.......',
    '.....GWWWWG...GWWWWG.......',
    '.....GWWWWG...GWWWWG.......',
    '.....GKKKKG...GKKKKG.......',
    '....KKKKKKK...KKKKKKK......',
  ];
  // Side profiles (side-scrolling missions). These point RIGHT and are drawn unrotated.
  const FIGHTER_SIDE = [   // fighter mode, nose right
    '.GG.................................',
    '.GWG................................',
    '.GWWG...............................',
    '.GWWWG..............BBB.............',
    '.GWWWWG...........BBBBBW............',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWW.........',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    'KKRRRRRRRRRRRRRRRRRRRRRWWWWWWWWWWWWW',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    '.KKGGGKKKKKKWWWWWWWWWWW.............',
    '...GGGGGGG..gGGGGGGg................',
  ];
  const GUARDIAN_SIDE = [   // GERWALK: both legs down, the arm holding the gun pod under the nose
    '.GG.................................',
    '.GWG................................',
    '.GWWG...............................',
    '.GWWWG..............BBB.............',
    '.GWWWWG...........BBBBBW............',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWW.........',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    'KKRRRRRRRRRRRRRRRRRRRRRWWWWWWWWWWWWW',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    '.KKGGGKKKKWWWWWWWWWWWW..............',
    '...GGGGWWWG..GWG..KKKKKKKKKKKKK.....',
    '.....GWWWWG..GWWGKKKKKKKK...........',
    '......GWWWG...GWWG..................',
    '......GWWG.....GWG..................',
    '.....GWWWG....GWWWG.................',
    '.....GRRWG....GRRWG.................',
    '....GWWWWWG..GWWWWWG................',
    '....KKKKKKK..KKKKKKK................',
  ];
  const BATTLOID_SIDE = [   // Battloid, facing right: backpack wings, gun pod held forward, leg nacelles
    '.......GWWG.........',
    '......GWWBBB........',
    '..G...GWWBBB........',
    '.GWG...GWWG.........',
    '.GWWGRRWWWWG........',
    '.GWWWWWWWWWWG.......',
    '..GWWWWWWWWWWG......',
    '..GWWWRWWWWWWGKKKKKK',
    '..GWWWWWWWWWGKKKKKKK',
    '..KWWWWWWWWWG....K..',
    '..KKWWWWWWWG........',
    '...GWWWWWWWG........',
    '...GWWKKKWWG........',
    '....GWW..GWWG.......',
    '....GWW...GWWG......',
    '...GWWWG...GWW......',
    '...GWWWG...GWWG.....',
    '...GRRWG...GRRWG....',
    '..GWWWWG...GWWWWG...',
    '..GWWWWG...GWWWWG...',
    '.KKKKKKK...KKKKKKK..',
  ];

  // ---- Other hulls (sold at starbases). Each has its own Fighter shape and colors. ----
  const MANTICORE_FIGHTER = SNES.mirror([   // forward-swept wings and canards (after the VF-19)
    '...............W',
    '...............W',
    '..............WW',
    '..............WW',
    '..............WB',
    '.............WBB',
    '..........G..WBB',
    '.........GWG.WBB',
    '...........GWWWB',
    '............GWWW',
    '...........KGWWW',
    '..R........KGWWW',
    '..GR......RKGWWW',
    '..GWR....WWKGWWW',
    '...GWR..WWWKGWWW',
    '....GWRWWWWKGWWW',
    '.....GWWWWWKGWWR',
    '......GWWWWKGWWR',
    '.......GWWWKGWWR',
    '........GWWKGWWW',
    '.........GWKGWWW',
    '..........WWGKWW',
    '.........GWWGKWW',
    '........GGWWGKWW',
    '.......GG.WWGKKW',
    '......GG..WWGKKW',
    '....WWWG..WWGK.K',
    '...WWWWG..WWGK..',
    '..........KKK...',
  ]);
  const MANTICORE_FIGHTER_SIDE = [
    '.KK................................',
    '.KWK...............................',
    '.KWWK.............BBB..............',
    '.KWWWK..........BBBBBB.......R.....',
    'KKWWWWWWWWWWWWWWWBBBBBWWWWWWRR.....',
    'KKWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW...',
    'KKRRRRRRRRRRRRRRRRRRRRRRWWWWWWWWWWW',
    '.KWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    '..GGGWWWWWWWWWWWWWWWWWGGGG.........',
    '.................gGGGGGGGGg........',
    '...........KKK.....................',
  ];
  const GRIFFIN_FIGHTER = SNES.mirror([   // armored heavy: armor packs along the fuselage, a third engine between the legs
    '...............W',
    '..............WW',
    '..............WW',
    '.............WWB',
    '.............WBB',
    '.............WBB',
    '............GWBB',
    '...........GKWWB',
    '..........GKKWWW',
    '..........GKKGWW',
    '.........WRKKGWW',
    '........WWRKKGWW',
    '.......WWWWKKGWW',
    '......WWWWWKKGWR',
    '.....WWWWWWKKGWR',
    '....WWWWWWWKKGWR',
    '...WWWWWWWWKKGWR',
    '..RWWWWWWWWKKGWW',
    '.RRWWWWWWWWKKGWW',
    'RRggggggggWKKGWW',
    '..........WWKGKW',
    '.........GWWKGKW',
    '........GGWWKGKW',
    '.......GG.WWKGKW',
    '....WWWG..WWKGKW',
    '...WWWWG..WWKGKK',
    '..........KKK.KK',
  ]);
  const GRIFFIN_FIGHTER_SIDE = [
    '..GGG...............................',
    '..GWWG..............................',
    '..GWWWG...........BBBB..............',
    '..GWWWWG........BBBBBBB.............',
    '.KKWWWWWWWWWWWWWWBBBBBBWWW..........',
    'KKKWWWWWWWWWWWWWWWWWWWWWWWWWWW......',
    'KKKRRRRRRRRRRRRRRRRRRRRRWWWWWWWWW...',
    'KKKWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.',
    '.KKWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....',
    '...GGGGWWWWWWWWWWWWWGGGGG...........',
    '.....gGGGGGGGGGGGGGGg...............',
    '.......KKK......KKK.................',
  ];
  const HYDRA_FIGHTER = SNES.mirror([   // canards and a triple tail (after the VF-11)
    '...............W',
    '...............W',
    '..............WW',
    '..............WB',
    '.............WWB',
    '.........G...WBB',
    '........GWG..WBB',
    '.......GWWWG.WBB',
    '.........GGGWWWB',
    '............GWWW',
    '...........KGWWW',
    '..........RKGWWW',
    '.........WRKGWWW',
    '.......WWWWKGWWW',
    '.....WWWWWWKGWWR',
    '...WWWWWWWWKGWWR',
    '.RRWWWWWWWWKGWWR',
    'RRggggggggWKGWWW',
    '..........WWGKWW',
    '.........GWWGKWW',
    '........GGWWGKWW',
    '.......GG.WWGKWG',
    '......GG..WWGK.G',
    '....WWWG..WWGK.G',
    '...WWWWG..WWGK..',
    '..........KKK...',
  ]);
  const HYDRA_FIGHTER_SIDE = [
    '..GG......GG........................',
    '..GWG.....GWG.......................',
    '..GWWG....GWWG....BBB...............',
    '..GWWWG...GWWWG.BBBBBB.....GG.......',
    '.KKWWWWWWWWWWWWWWBBBBBWWWWWGG.......',
    'KKKWWWWWWWWWWWWWWWWWWWWWWWWWWW......',
    'KKKRRRRRRRRRRRRRRRRRRRRWWWWWWWWWWW..',
    '.KKWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
    '...GGGGWWWWWWWWWWWGGGG..............',
    '......gGGGGGGGGGGg..................',
    '........KKK.........................',
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
  const MIG = SNES.mirror([   // fighter with wing-mounted cannon pods (twin long barrels forward)
    '....K.....L',
    '....K.....L',
    '....K....LL',
    '....K....LC',
    '...DKD...LC',
    '...DLD..DLC',
    '...DLD..DLL',
    '...DLD.DDLL',
    '..DDLDDDLLL',
    '.DDLLLLDLLL',
    'DDLLLLLDLLL',
    'DRRLLLLDLLL',
    'ddddDDDDLLL',
    '.....DDLLLL',
    '....DLDDKKK',
    '...DLD.DKKD',
    '........EE.',
  ]);
  const BOMBER = SNES.mirror([
    '..........LL',
    '..........LD',
    '.........LDC',
    '.........LDC',
    '.........LDD',
    '........LDDD',
    '.LLLLLLLLDDD',
    'LDDDDDDDDDDD',
    'DDDRRDDRRDDD',
    'dddEEddEEdDD',
    '...EE..EE.DD',
    '.........LDD',
    '.........LDD',
    '......LLLLDD',
    '.....LDDDDDD',
    '.....dddddDD',
    '.........DDD',
  ]);
  const METHYLATOR = SNES.mirror([   // beam gunship: the emitter lens (G) is in the nose
    '..........DLL',
    '.........DLGG',
    '.........DLGG',
    '.........DLLL',
    '........DDLCC',
    '........DLLCC',
    '..K.....DLLLL',
    '..KK...DDLLLL',
    '..KDD.DDLLLLL',
    '.DKLDDDLLLDLL',
    'DDKLLLLLLLDLL',
    'DLKLLLLLLLDLL',
    'DLKLLLLLLLDLL',
    'DDKDDDDDDDDLL',
    '.DKD.....DDLL',
    '.DKD.....DDDL',
    '..E......DEED',
    '..E.......EE.',
  ]);

  // Ground-based missile launcher for side-scrolling missions (drawn unrotated).
  const SAM = [
    '..R.....................',
    '..LR....................',
    '...LL...................',
    '....LLL.................',
    '.....LLLL...............',
    '......LLLLD.............',
    '.......LLDDD............',
    '....DDDDDDDDDDDD........',
    '..DDDDDDDDDDDDDDDDDD....',
    '.DDDDDDDDDDDDDDDDDDDDD..',
    'DDLLLLLLLLLLLLLLLLLLLLDD',
    'KKKKKKKKKKKKKKKKKKKKKKKK',
    'KLKKLKKLKKLKKLKKLKKLKKLK',
    '.KKKKKKKKKKKKKKKKKKKKKK.',
  ];

  // Splitter (Alpha Centauri): breaks in two when shot down.
  const SPLITTER = SNES.mirror([   // twin-boom fighter: two gun booms and a cockpit pod on one wing
    '...R........',
    '...L........',
    '..DLD.......',
    '..DLD......L',
    '..DLD.....LD',
    '..DCD.....DC',
    '..DLD.....DC',
    '.DDLDD....DL',
    'DDDLDDDDDDDL',
    'LLLLLLLLLLLL',
    'DDDRDDDDDDDD',
    '.DDLDD....DD',
    '..DLD......D',
    '..DLD.......',
    '..DLD.......',
    '.DDLDD......',
    '.D.E.D......',
    '...E........',
  ]);
  // Drone (Barnard's Star): small, comes in swarms.
  const DRONE = SNES.mirror([   // delta interceptor drone with a red sensor eye
    '......L',
    '.....LD',
    '.....DR',
    '....LDR',
    '....DDD',
    '...LDDD',
    '..LDDDD',
    '.LDDDDD',
    'LDDKDDD',
    'DDD.DDD',
    '.....EE',
  ]);
  // Armored gunship (Tau Ceti): slow and tough.
  const ARMORED = SNES.mirror([   // armored attack jet: nose cannon, straight wings with hardpoints, twin engines and tails
    '..........KK',
    '..........KD',
    '.........DDD',
    '.........DCC',
    '.........DCC',
    '.........DDD',
    '........LDDD',
    'LLLLLLLLDDDD',
    'DDDDDDDDDDDD',
    'DKDDKDDDDDDD',
    'DKDDKDDDDDDD',
    'dddddddDDDDD',
    '......KKKDDD',
    '.....KKKKKDD',
    '.....KEEKKDD',
    '......EE.DDD',
    '.........DDD',
    '....LLLLLDDD',
    '...LDDDDDDDD',
    '...LD....DDD',
    '...DD.....DD',
  ]);

  // Side profiles for side-scrolling missions. These point LEFT (toward the player).
  const MIG_SIDE = [   // cannons forward (left), sensor dome, tail fin, thrusters
    '...................DD....',
    '...........CCC....DLD....',
    '.........CCCCCC..DLLD....',
    'KKKKKKKDLLLLLLLLLLLLLLLDE',
    'KKKKKKKDLLLLLLLLLLLLLLLDE',
    '.......DDLLLLLLLLLLLLLDD.',
    '........DDDDRRDDDDDDDD...',
    '..........dddddd.........',
  ];
  const BOMBER_SIDE = [
    '..........................DD....',
    '.........................DLD....',
    '....CCC..................DLLD...',
    '..CCCCCLLLLLLLLLLLLLLLLLLDLLLD..',
    '.LLLLLLLLLLLLLLLLLLLLLLLLLLLLLDE',
    'RLLLLLLLLLLLLLLLLLLLLLLLLLLLLLDE',
    '.DDDDDLLLLLLLLLLLLLLLLLLLLLLLDD.',
    '...DDDDDDDDDDDDDDDDDDDDDDDDDD...',
    '.........RRDDDDRR...............',
    '.........EE....EE...............',
  ];
  const METHYLATOR_SIDE = [   // emitter (G) at the nose, facing left
    '..............DDD.............',
    '.............DLLLD......DD....',
    '......CCC...DLLLLLD....DLD....',
    '....CCCCCDDDDLLLLLLDDDDDLLD...',
    'GGDDLLLLLLLLLLLLLLLLLLLLLLLLDE',
    'GGDLLLLLLLLLLLLLLLLLLLLLLLLLDE',
    '..DDDDDDDDDDDDDDDDDDDDDDDDDDD.',
    '......KKK.............KKK.....',
    '......KKK.............KKK.....',
  ];
  const SPLITTER_SIDE = [
    '....................DL..',
    '...CC..............DDL..',
    '.LDCCDDDDDDDDDDDDDDDDDE.',
    'RDDDDDDDDDDDDDDDDDDDDDE.',
    '.LLLLLLLLLLLLLLLLLLLLL..',
    '.ddddddddddddddddddddd..',
    '.LLLLLLLLLLLLLLLLLLLLL..',
    'RDDDDDDDDDDDDDDDDDDDDDE.',
    '.LDDDDDDDDDDDDDDDDDDDDE.',
    '.........DDDD...........',
  ];
  const DRONE_SIDE = [
    '.........LL....',
    '........LDD....',
    '..LLLLLLDDDDDL.',
    'RDDDDDDDDDDDDDE',
    '..DDDDDDDDDDDL.',
    '........LDD....',
  ];
  const ARMORED_SIDE = [
    '........................LLLL......',
    '.......................LDDDDL.....',
    '....KKKKK.............LDDDDDL.....',
    '...KKLKKK.....CCC.....LDDDDDDL....',
    '..LDDDDDDDDDDCCCCCDDDDDDDDDDDDL...',
    '.LDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLE.',
    'RDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDEE',
    'RDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDEE',
    '.LDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLE.',
    '..LLLDDDDDDDDDDDDDDDDDDDDDDDLLL...',
    '.....KKKKK.....KKKKK..............',
    '.....KLKKK.....KLKKK..............',
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
  // Station shuttle, side view facing right (starbase.js).
  const shuttle = B(['.....BB.....', '..WWWWBBWW..', 'KWWWWWWWWWWW', 'KWRRRRRRRWW.', '.GGGGGGGG...'],
    { W: C.white, B: C.sky, R: C.red, G: C.gray, K: C.gray });
  const ebullet = SNES.bake(['.RRR.', 'RWWWR', 'RWWWR', 'RWWWR', '.RRR.'], { R: '#f83850', W: '#fff0f0' });
  const missile = B(['..W..', '.WWW.', '.WRW.', '.WWW.', '.WWW.', 'GWWWG', 'G.K.G', '..E..'],
    { W: C.white, R: C.red, G: C.gray, K: C.gray, E: C.orange });
  const life = B(['...W...', '..WBW..', '.WWWWW.', 'WWWRWWW', 'W.WWW.W', '..R.R..'],
    { W: C.white, B: C.sky, R: C.red });
  // WINGMAN special's drone, top-down and side profile
  const wingPal = { W: C.sky, B: C.white, R: C.red, G: C.blue, K: C.navy };
  const wing = B(SNES.mirror(['.......W', '......WW', '......WB', '.....WWB', '....GWWW', '..GGWWWR',
    'GGWWWWWW', 'RRWWWWWW', '...GWWWW', '....GWWG', '....RR.K']), wingPal);
  const wingSide = B(['.GG..............', '.GWG.......BB....', 'KKWWWWWWWWWBBWW..', 'KKRRRRRRRRWWWWWWW',
    '.KWWWWWWWWWWWWW..', '...GGGGGGGGG.....'], wingPal);


  // HUD shield pips: full and spent
  const PIP = ['WWWWW', 'WBBBW', 'WBBBW', '.WBW.', '..W..'];
  const shieldPip = B(PIP, { W: C.white, B: C.sky });
  const shieldPipOff = B(PIP, { W: C.gray, B: '#202030' });

  // TET enzyme capsule (demethylates a silenced form)
  const tet = B(['..LLLLWWWW..', '.LLLLLWWWWW.', 'LLGLLLWWWWWW', 'LLLLLLWWWWWW', 'LLGLLLWWWWWW', '.LLLLLWWWWW.',
    '..LLLLWWWW..'], { L: C.lime, G: C.green, W: C.white });

  // ---- Special weapon icons (same order as SPECIALS in specials.js) ----------
  const specialIcons = [
    B(['.......', 'CCCCCCC', 'WWWWWWW', 'CCCCCCC', '.......'], { C: C.aqua, W: C.white }),
    B(['..O..', '.OYO.', 'OYWYO', '.OYO.', '..O..'], { O: C.red, Y: C.orange, W: C.yellow }),
    B(['W.W.W', '.WYW.', 'WYRYW', '.WYW.', 'W.W.W'], { W: C.white, Y: C.yellow, R: C.red }),
    B(['.CCC.', 'C...C', 'C.W.C', 'C...C', '.CCC.'], { C: C.lime, W: C.aqua }),
    B(['.LLL.', 'L.W.L', 'LWWWL', 'L.W.L', '.LLL.'], { L: C.lime, W: C.white }),
    B(['..W..', '.WBW.', 'WWWWW', '..W..', '.W.W.'], { W: C.sky, B: C.white }),
  ];

  return {
    hulls,
    enemy, ebullet, missile, life, wing, wingSide, shuttle, shieldPip, shieldPipOff, tet, specialIcons,
    // portraits come from the portrait painter (faces.js), baked on first use
    get portrait() { return FACES.voss; }, get mira() { return FACES.mira; }, get pilots() { return FACES.pilots; },
  };
})();
