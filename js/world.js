'use strict';
// The open world: 3 galaxies, each with 4 star systems, each system with 5 to 10 planets. The carrier
// can fly to any planet in an unlocked system. Every planet has 2 to 4 missions; its last one is
// the STRONGHOLD (the old two-leg mission that ends in a boss), which opens once the others are flown.
//   planet cleared  = every mission on it flown
//   system secured  = half its planets cleared (rounded up): opens the systems linked to it
//   galaxy open     = the first one, or every system in the galaxy before it secured
// Story planets (the ones with a PLANET_STORY briefing in story.js) are written out by hand. The rest
// are generated from a name and a terrain, with colors, missions and market picked by a seeded roll,
// so every planet is the same on every run.

// Seeded random numbers from a string (planet id), so generated planets never change.
function seededRand(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Side-mission sky [far, near, ground, stripes] and map disc [body, band] per terrain.
const TERRAIN_PAL = {
  ocean: [[[C.navy, C.dgreen, C.brown, C.olive], [C.blue, C.green]], [[C.teal, C.dgreen, C.olive, C.cyan], [C.teal, C.cyan]],
    [[C.navy, C.blue, C.teal, C.sky], [C.blue, C.sky]]],
  desert: [[[C.maroon, C.rust, C.darkred, C.orange], [C.rust, C.orange]], [[C.darkred, C.maroon, C.brown, C.red], [C.red, C.orange]],
    [[C.brown, C.gold, C.olive, C.cream], [C.gold, C.brown]]],
  clouds: [[[C.olive, C.gold, C.brown, C.yellow], [C.gold, C.cream]], [[C.navy, C.sky, C.blue, C.ice], [C.sky, C.white]]],
  hive: [[[C.brown, C.olive, C.maroon, C.gold], [C.olive, C.gold]], [[C.olive, C.gold, C.brown, C.cream], [C.gold, C.yellow]]],
  fields: [[[C.brown, C.olive, C.maroon, C.gold], [C.gold, C.brown]], [[C.gray, C.rust, C.brown, C.orange], [C.orange, C.lgray]],
    [[C.dgreen, C.green, C.olive, C.lime], [C.green, C.olive]]],
  ice: [[[C.navy, C.blue, C.gray, C.lgray], [C.lgray, C.sky]], [[C.navy, C.violet, C.purple, C.lavender], [C.violet, C.lavender]],
    [[C.teal, C.ice, C.gray, C.white], [C.ice, C.white]]],
  tech: [[[C.maroon, C.purple, C.black, C.magenta], [C.magenta, C.purple]], [[C.navy, C.teal, C.black, C.cyan], [C.teal, C.cyan]]],
};
const TERRAIN_CODE = { O: 'ocean', D: 'desert', C: 'clouds', H: 'hive', F: 'fields', I: 'ice', T: 'tech' };

// Mission kinds. legs: the stage types flown in order ('boss' = the stronghold's two legs, set by
// the planet's order). pay/xp multiply the base reward.
const MISSION_KINDS = {
  patrol: { name: 'PATROL', legs: ['normal'], pay: 0.8, desc: 'VERTICAL. BREAK HER SQUADRON.' },
  intercept: { name: 'INTERCEPT', legs: ['side'], pay: 0.8, desc: 'SIDE-SCROLLING. CUT OFF HER FIGHTERS.' },
  raid: { name: 'GROUND RAID', legs: ['raid'], pay: 0.9, desc: 'SIDE-SCROLLING. TANKS AND MISSILE SITES.' },
  bonus: { name: 'CONTROL GROUP', legs: ['challenge'], pay: 0.7, desc: 'BONUS STAGE. THEY WILL NOT FIRE.' },
  strike: { name: 'STRONGHOLD', legs: ['boss'], pay: 1.5, desc: 'TWO LEGS AND A BOSS. CLEARS THE PLANET.' },
};

// Shop stock every market can draw from (prices and effects in starbase.js).
const MARKET_POOL = ['weapons', 'shields', 'special', 'engine', 'ftr', 'grd', 'btl', 'cooler', 'armor', 'scanner', 'broker'];

// Galaxies hold systems; systems keep the old sector fields (see CLAUDE.md): boss/capital ids, enemy
// swaps, extra side patterns, acetylation bonus and the securing bonus. x/y place a galaxy on the
// universe map and a system on its galaxy map. planets: [name, terrain code, extras] or a full object.
// ring: the planet's orbit, counted out from the star (default: its place in the list, which also sets
// its difficulty and its number for ?stage=N).
const GALAXIES = [
  { id: 'milky', name: 'MILKY WAY', x: 84, y: 112, col: C.gold, arms: ['#f8d878', '#3cbcfc'], bar: true,
    systems: [
      { id: 'sol', name: 'SOL', base: 'LUNA STATION', x: 60, y: 104, col: C.gold, links: ['acen', 'barn'],
        boss: 'bunker', capital: 'dreadnought', acetyl: 0, swap: {}, sideKinds: [], bonus: { money: 1000, xp: 150 },
        planets: [
          { id: 'earth', name: 'EARTH', terrain: 'ocean', sky: [C.navy, C.dgreen, C.brown, C.olive], disc: [C.blue, C.green], ring: 2,
            missions: ['patrol', 'strike'], market: ['weapons', 'shields', 'special'] },
          { id: 'mars', name: 'MARS', terrain: 'desert', sky: [C.maroon, C.rust, C.darkred, C.orange], disc: [C.rust, C.orange], order: 'sv', ring: 3 },
          { id: 'venus', name: 'VENUS', terrain: 'clouds', sky: [C.olive, C.gold, C.brown, C.yellow], disc: [C.gold, C.cream], ring: 1,
            missions: ['bonus', 'strike'] },
          ['MERCURY', 'D', { ring: 0 }], ['EUROPA', 'I'], ['TITAN', 'C'], ['TRITON', 'I'],
        ] },
      { id: 'acen', name: 'ALPHA CENTAURI', base: 'CENTAURI GATE', x: 180, y: 58, col: C.orange, links: ['sol', 'sirius'],
        boss: 'copier', capital: 'replicator', acetyl: 0, swap: { fighter: [['splitter', 0.35]] },
        sideKinds: ['splitterLine', 'splitterLine'], bonus: { money: 1500, xp: 200 },
        planets: [
          { id: 'proxima', name: 'PROXIMA B', terrain: 'desert', sky: [C.darkred, C.maroon, C.brown, C.red], disc: [C.red, C.orange],
            order: 'sv', hulls: [1] },
          { id: 'toliman', name: 'TOLIMAN', terrain: 'ocean', sky: [C.teal, C.dgreen, C.olive, C.cyan], disc: [C.teal, C.cyan],
            missions: ['patrol', 'bonus', 'strike'] },
          ['PROXIMA D', 'D'], ['KENTAURUS', 'F'], ['CHIRON', 'I'],
        ] },
      { id: 'barn', name: "BARNARD'S STAR", base: 'HIVEWATCH', x: 180, y: 150, col: C.red, links: ['sol', 'sirius'],
        boss: 'queen', capital: 'ark', acetyl: 0.1, swap: { fighter: [['drone', 0.5]] },
        sideKinds: ['droneSwarm', 'droneSwarm'], bonus: { money: 1500, xp: 200 },
        planets: [
          { id: 'hive', name: 'BARNARD B', terrain: 'hive', sky: [C.brown, C.olive, C.maroon, C.gold], disc: [C.olive, C.gold], hulls: [2] },
          { id: 'nectar', name: 'NECTAR', terrain: 'hive', sky: [C.olive, C.gold, C.brown, C.cream], disc: [C.gold, C.yellow], order: 'sv' },
          ['APIARY', 'H'], ['COMB', 'H'], ['PROPOLIS', 'D'], ['DRONEFALL', 'F'],
        ] },
      { id: 'sirius', name: 'SIRIUS', base: 'DOG STAR DOCK', x: 330, y: 104, col: C.ice, links: ['acen', 'barn'],
        boss: 'xinact', capital: 'barr', acetyl: 0.2, swap: {}, sideKinds: ['bomber', 'bomber'], bonus: { money: 2000, xp: 250 },
        planets: [
          { id: 'agouti', name: 'AGOUTI PRIME', terrain: 'fields', sky: [C.brown, C.olive, C.maroon, C.gold], disc: [C.gold, C.brown], order: 'sv' },
          { id: 'calico', name: 'CALICO', terrain: 'fields', sky: [C.gray, C.rust, C.brown, C.orange], disc: [C.orange, C.lgray],
            missions: ['raid', 'bonus', 'strike'], hulls: [3] },
          ['THE PUP', 'I'], ['TORTIE', 'F'], ['BRINDLE', 'D'], ['CANIS', 'O'],
        ] },
    ] },
  { id: 'lmc', name: 'MAGELLANIC CLOUD', x: 216, y: 66, col: C.sky, arms: ['#a4e4fc', '#f878f8'], bar: false,
    systems: [
      { id: 'tarantula', name: 'TARANTULA', base: 'WEBWORKS', x: 60, y: 60, col: C.pink, links: ['sdor', 'sn87'],
        boss: 'twins', capital: 'imprint', acetyl: 0.05, swap: { bomber: [['armored', 0.4]] }, sideKinds: ['armoredPair', 'tankCol'],
        bonus: { money: 2500, xp: 300 },
        planets: [
          { id: 'taue', name: 'HONGERWINTER', terrain: 'ice', sky: [C.navy, C.blue, C.gray, C.lgray], disc: [C.lgray, C.sky] },
          { id: 'tauf', name: 'IMPRINT', terrain: 'ice', sky: [C.navy, C.violet, C.purple, C.lavender], disc: [C.violet, C.lavender],
            order: 'sv', hulls: [4] },
          ['R136', 'T'], ['DORADO', 'O'], ['SPINDLE', 'F'], ['WEBFALL', 'H'], ['NEBULA RIDGE', 'C'], ['CRADLE', 'O'],
        ] },
      { id: 'sdor', name: 'S DORADUS', base: 'FLARE HAVEN', x: 190, y: 44, col: C.yellow, links: ['tarantula', 'n44'],
        boss: 'hdac', capital: 'deacetylase', acetyl: 0.25, swap: { fighter: [['splitter', 0.2]] }, sideKinds: ['bomber', 'splitterLine'],
        bonus: { money: 2500, xp: 300 },
        planets: [['FLARE', 'D'], ['CINDER', 'D'], ['LUMINA', 'C'], ['BLAZE', 'D'], ['CORONA', 'C'], ['EMBER', 'F'], ['SOLSTICE', 'I']] },
      { id: 'sn87', name: 'SN 1987A', base: 'RING STATION', x: 190, y: 150, col: C.aqua, links: ['tarantula', 'n44'],
        boss: 'dnmt3', capital: 'writer', acetyl: 0.1, swap: { fighter: [['drone', 0.3]] }, sideKinds: ['droneSwarm', 'tankCol'],
        bonus: { money: 2500, xp: 300 },
        planets: [['REMNANT', 'T'], ['SHOCKFRONT', 'D'], ['NEUTRINO', 'I'], ['HALO', 'C'], ['CINDERS', 'D'], ['AFTERGLOW', 'O']] },
      { id: 'n44', name: 'N44 BUBBLE', base: 'FOAM DOCK', x: 340, y: 96, col: C.lime, links: ['sdor', 'sn87'],
        boss: 'remodeler', capital: 'prc2', acetyl: 0.15, swap: { fighter: [['drone', 0.3]], bomber: [['armored', 0.3]] },
        sideKinds: ['droneSwarm', 'armoredPair', 'tankCol'], bonus: { money: 3000, xp: 350 },
        planets: [['SHELL', 'O'], ['CAVITY', 'T'], ['BLISTER', 'D'], ['FOAM', 'C'], ['HOLLOW', 'I'], ['VESICLE', 'H'], ['CAPSID', 'T']] },
    ] },
  { id: 'andromeda', name: 'ANDROMEDA', x: 340, y: 130, col: C.pink, arms: ['#f878f8', '#fce0a8'], bar: false,
    systems: [
      { id: 'ngc206', name: 'NGC 206', base: 'BLUE HARBOR', x: 56, y: 100, col: C.periwinkle, links: ['mayall', 'm32'],
        boss: 'ctcf', capital: 'loop', acetyl: 0.2, swap: { fighter: [['splitter', 0.25]], bomber: [['armored', 0.3]] },
        sideKinds: ['splitterLine', 'armoredPair', 'tankCol'], bonus: { money: 3500, xp: 400 },
        planets: [['SAPPHIRE', 'O'], ['COBALT', 'I'], ['AZURE', 'C'], ['INDIGO', 'T'], ['CERULEAN', 'O'], ['LAPIS', 'D'], ['TEAL REACH', 'F'],
          ['BLUEGRASS', 'F']] },
      { id: 'mayall', name: 'MAYALL II', base: 'CLUSTER KEEP', x: 180, y: 50, col: C.cream, links: ['ngc206', 'nucleus'],
        boss: 'hp1', capital: 'lamina', acetyl: 0.2, swap: { fighter: [['drone', 0.3], ['splitter', 0.2]] },
        sideKinds: ['droneSwarm', 'splitterLine', 'tankCol'], bonus: { money: 3500, xp: 400 },
        planets: [['OLD GLORY', 'D'], ['GRANITE', 'D'], ['RELIC', 'T'], ['FOSSIL', 'I'], ['AMBER', 'H'], ['MEMORY', 'C'], ['ARCHIVE', 'T'],
          ['KEEPSAKE', 'F'], ['HEIRLOOM', 'O']] },
      { id: 'm32', name: 'M32', base: 'SATELLITE NINE', x: 180, y: 152, col: C.rose, links: ['ngc206', 'nucleus'],
        boss: 'sirtuin', capital: 'silencer', acetyl: 0.3, swap: { bomber: [['armored', 0.4]] },
        sideKinds: ['armoredPair', 'bomber', 'tankCol'], bonus: { money: 3500, xp: 400 },
        planets: [['DWARF', 'I'], ['SPARROW', 'F'], ['ROSEWATER', 'O'], ['THORN', 'D'], ['BRIAR', 'H'], ['PETAL', 'C'], ['SEPAL', 'F']] },
      { id: 'nucleus', name: 'M31 NUCLEUS', base: 'LAST LIGHT', x: 340, y: 100, col: C.magenta, links: ['mayall', 'm32'],
        boss: 'citadel', capital: 'nucleosome', acetyl: 0.1,
        swap: { fighter: [['splitter', 0.2], ['drone', 0.2]], bomber: [['armored', 0.3]] },
        sideKinds: ['splitterLine', 'droneSwarm', 'armoredPair', 'tankCol'], bonus: { money: 5000, xp: 500 },
        planets: [
          { id: 'aegir', name: 'AEGIR', terrain: 'ocean', sky: [C.purple, C.violet, C.navy, C.lavender], disc: [C.violet, C.pink],
            order: 'sv', hulls: [6] },
          ['P1', 'T'], ['P2', 'T'], ['EVENT HORIZON', 'I'], ['ACCRETION', 'D'], ['SPIRAL', 'C'], ['MARROW', 'H'],
          { id: 'citadel', name: 'THE CITADEL', terrain: 'tech', sky: [C.maroon, C.purple, C.black, C.magenta], disc: [C.magenta, C.purple],
            missions: ['raid', 'patrol', 'strike'] },
        ] },
    ] },
];

// Hulls sold at a generated planet: a few markets carry one (the rest come from the story planets).
const EXTRA_HULLS = { sdor: 5, sn87: 3, ngc206: 5, mayall: 6, m32: 4 };

// ---- Build the tables ---------------------------------------------------------------
const SYSTEMS = [], PLANETS = [];
GALAXIES.forEach((G, gi) => {
  G.index = gi;
  G.systems.forEach(S => {
    S.gal = G.id; S.galIndex = gi; S.tier = SYSTEMS.length; S.short = S.name.length > 10 ? S.name.slice(0, 10) : S.name;
    SYSTEMS.push(S);
    S.planets = S.planets.map((src, i) => {
      const P = Array.isArray(src) ? { name: src[0], terrain: TERRAIN_CODE[src[1]], ...(src[2] || {}) } : { ...src };
      P.id = P.id || S.id + '-' + P.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const r = seededRand(P.id);
      if (!P.sky) { const [sky, disc] = TERRAIN_PAL[P.terrain][Math.floor(r() * TERRAIN_PAL[P.terrain].length)]; P.sky = sky; P.disc = disc; }
      if (!P.order) P.order = r() < 0.4 ? 'sv' : 'vs';
      if (!P.missions) {                                  // 1 to 3 missions before the stronghold, more in later galaxies
        const pool = ['patrol', 'intercept', 'raid', 'patrol', 'intercept', 'raid', 'bonus'];
        const n = 1 + Math.floor(r() * (gi + 1.6)), list = [];
        while (list.length < Math.min(3, n)) { const k = pool[Math.floor(r() * pool.length)]; if (!list.includes(k)) list.push(k); }
        P.missions = [...list, 'strike'];
      }
      if (!P.market) {
        const pool = MARKET_POOL.slice(), n = 3 + Math.floor(r() * 2);
        P.market = [];
        while (P.market.length < n) P.market.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      }
      if (!P.hulls) P.hulls = i === 2 && EXTRA_HULLS[S.id] !== undefined ? [EXTRA_HULLS[S.id]] : [];
      P.orbit = { a: r() * TAU, size: 3 + Math.floor(r() * 3) };
      P.index = i; P.sys = S.id; P.ring = P.ring ?? i;
      PLANETS.push(P);
      return P;
    });
  });
});
const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map(S => [S.id, S]));
const PLANET_BY_ID = Object.fromEntries(PLANETS.map(P => [P.id, P]));
const GALAXY_BY_ID = Object.fromEntries(GALAXIES.map(G => [G.id, G]));
