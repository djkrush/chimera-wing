'use strict';
// Capital ships: the vertical boss fights. A giant warship (a Yamato-style battleship, a Star
// Destroyer wedge, a drone carrier or a twin-hulled cruiser) flies under you while you fly its length,
// knocking out its gun turrets, fighter hangars and reactor cores. If you reach the end with targets
// left, the view pulls back, the ship comes about (it turns 180 degrees) and you fly over it again.
//
// The hull is pre-rendered by the shipyard painter (shipyard.js); turrets, hangar lights and cores are
// drawn live on top, so the turrets swing to track you. Target positions are in the hull's own frame:
// lx from the centerline, ly from the bow. The ship is drawn with a transform (center, angle, scale),
// which also carries the zoom-in at the start and the turn between passes.

const CAPITALS = {
  dreadnought: { name: 'METHYL DREADNOUGHT', style: 'battleship', w: 240, len: 880, turrets: 8, hangars: 2, cores: 1, launch: 'fighter',
    pal: { hull: '#7c8494', deck: '#565c6c', metal: '#a8b0bc', trim: '#b02828' },
    intro: 'MY DREADNOUGHT. EVERY GUN ON IT IS POINTED AT YOU.' },
  replicator: { name: 'DNMT1 REPLICATOR', style: 'destroyer', w: 400, len: 800, turrets: 10, hangars: 2, cores: 1, launch: 'splitter',
    pal: { hull: '#4c8c8c', deck: '#2c5c64', metal: '#8cc4c0', trim: '#d8e0e8' },
    intro: 'MY REPLICATOR. ONE PERFECT PATTERN, COPIED A THOUSAND TIMES.' },
  ark: { name: 'HIVE ARK', style: 'carrier', w: 360, len: 800, turrets: 6, hangars: 4, cores: 1, launch: 'drone',
    pal: { hull: '#8c7c40', deck: '#5c5030', metal: '#c0ac68', trim: '#e8c030' },
    intro: 'THE ARK CARRIES MY WHOLE HIVE. MIND THE DRONES.' },
  barr: { name: 'BARR BODY', style: 'battleship', w: 260, len: 900, turrets: 8, hangars: 2, cores: 2, launch: 'fighter',
    pal: { hull: '#9c5c3c', deck: '#6c3c2c', metal: '#c89c7c', trim: '#f0d0a0' },
    intro: 'A BARR BODY IS A SILENCED X CHROMOSOME, PACKED TIGHT. SO IS THIS SHIP.' },
  imprint: { name: 'IMPRINT CRUISER', style: 'twin', w: 380, len: 820, turrets: 10, hangars: 2, cores: 2, launch: 'fighter',
    pal: { hull: '#4c64a8', deck: '#2c3c70', metal: '#98a8d8', trim: '#80d0f8' },
    intro: 'THIS CRUISER ANSWERS TO ONE PARENT ONLY. ME.' },
  // ---- Magellanic Cloud and Andromeda ----
  deacetylase: { name: 'HDAC DREADNOUGHT', style: 'battleship', w: 260, len: 900, turrets: 9, hangars: 2, cores: 1, launch: 'fighter',
    pal: { hull: '#a08038', deck: '#6c5424', metal: '#d8c080', trim: '#f0e0a0' },
    intro: 'EVERY ACETYL MARK IT PASSES, IT STRIPS. EVERY GENE GOES QUIET.' },
  writer: { name: 'DNMT3 WRITER', style: 'destroyer', w: 400, len: 860, turrets: 10, hangars: 2, cores: 2, launch: 'splitter',
    pal: { hull: '#3c7c9c', deck: '#24506c', metal: '#88c0d8', trim: '#f8f0c0' },
    intro: 'A WRITER, NOT A COPIER. IT PUTS DOWN MARKS NOBODY HAS SEEN BEFORE.' },
  prc2: { name: 'PRC2 CARRIER', style: 'carrier', w: 380, len: 860, turrets: 8, hangars: 4, cores: 1, launch: 'drone',
    pal: { hull: '#4c8c4c', deck: '#2c5c34', metal: '#98c890', trim: '#d8f080' },
    intro: 'POLYCOMB KEEPS A CELL IN ITS VALLEY. THIS CARRIER KEEPS YOU IN YOURS.' },
  loop: { name: 'COHESIN LOOPER', style: 'twin', w: 400, len: 880, turrets: 10, hangars: 2, cores: 2, launch: 'fighter',
    pal: { hull: '#5c6cb0', deck: '#384478', metal: '#a8b4e0', trim: '#f8d878' },
    intro: 'COHESIN PULLS DNA INTO LOOPS. MY LOOPER WILL LOOP YOU TOO.' },
  lamina: { name: 'LAMINA ARK', style: 'carrier', w: 380, len: 900, turrets: 8, hangars: 4, cores: 2, launch: 'drone',
    pal: { hull: '#7c6c5c', deck: '#4c4038', metal: '#c0b098', trim: '#e84830' },
    intro: 'SILENT DNA HUGS THE NUCLEAR LAMINA. MY ARK HUGS THIS PLANET.' },
  silencer: { name: 'SIRTUIN CRUISER', style: 'twin', w: 380, len: 900, turrets: 10, hangars: 2, cores: 2, launch: 'splitter',
    pal: { hull: '#a0506c', deck: '#6c3048', metal: '#e098b0', trim: '#fce0a8' },
    intro: 'A DEACETYLASE WITH GUNS. IT SILENCES WHATEVER IT FLIES OVER.' },
  nucleosome: { name: 'NUCLEOSOME DREADNOUGHT', style: 'destroyer', w: 420, len: 960, turrets: 12, hangars: 3, cores: 2, launch: 'splitter',
    pal: { hull: '#6c58a0', deck: '#403468', metal: '#a898d0', trim: '#e070d0' },
    intro: 'MY DREADNOUGHT RUNS ON HISTONE CORES. WRAPPED TIGHT, KEPT QUIET.' },
};
const CAPITAL_PTS = { turret: 500, hangar: 1000, core: 3000 };
const CAP_ZOOM = 110, CAP_SPIN = 70;   // frames: zoom in to the stern, spin around (seen from far away)
const capitalArt = {};                 // baked once per ship type

// Hull shapes. Each paints the ship bow-up on a shipyard sheet and returns its target slots (in the
// order they are used; `cores2` replaces `cores` for ships with two) and its engine nozzles. n = how
// many turrets the ship mounts (only those get barbettes).
const CAP_STYLES = {
  // Space Battleship Yamato: long pointed hull with a red rim, the bow wave-motion gun, triple turrets
  // on the centerline, the pagoda bridge tower and funnel amidships, hangars aft.
  battleship(S, w, L, M, n) {
    const cx = w >> 1, hw = w / 2 - 2, sym = f => { f(-1); f(1); };
    const prof = [[0, 0], [0.3, 0.05], [0.6, 0.12], [0.86, 0.2], [1, 0.3], [1, 0.78], [0.9, 0.9], [0.7, 0.97], [0.55, 1]]
      .map(([x, y]) => [x * hw, y * (L - 1)]);
    const shape = k => [...prof.map(([x, y]) => [cx - x * k, y]), ...prof.slice().reverse().map(([x, y]) => [cx + 1 + x * k, y])];
    S.poly(shape(1), M.trim, 1);
    S.poly(shape(0.95).map(([x, y]) => [x, y + 2]), M.hull, 1);
    S.poly(shape(0.85).map(([x, y]) => [x, Math.max(L * 0.03, Math.min(L * 0.98, y))]), M.deck, 2);
    S.disc(cx, L * 0.035, 12, M.metal, 3); S.disc(cx, L * 0.035, 8, M.black);             // wave-motion gun muzzle
    for (let y = L * 0.3; y < L * 0.78; y += 14) sym(s => S.disc(cx + s * (hw - 7), y, 2, M.metal, 3));   // AA guns
    const tower = [[0.36, 0.37, 0.58, 3], [0.27, 0.39, 0.55, 4], [0.18, 0.41, 0.51, 5], [0.1, 0.425, 0.475, 6]];
    tower.forEach(([k, y0, y1, l], i) => {                                                  // the pagoda bridge
      S.rect(cx - hw * k, L * y0, hw * k * 2 + 1, L * (y1 - y0), i % 2 ? M.hullL : M.metal, l);
      YARD.windows(S, cx - hw * k + 3, L * y0 + 1, hw * k * 2 - 5, 4, i === 2 ? M.glass : M.black, 2, 1);
      sym(s => S.rect(cx + s * hw * k - (s > 0 ? 2 : 0), L * y0 + 4, 3, L * (y1 - y0) - 8, M.dark, l));
    });
    YARD.modules(S, cx - hw * 0.36, L * 0.37, hw * 0.72, L * 0.21, M.metal, M.mod, 6, 23, 8, 0.6);
    YARD.modules(S, cx - hw * 0.36, L * 0.37, hw * 0.72, L * 0.21, M.hullL, M.mod, 6, 24, 8, 0.6);
    S.rect(cx - hw * 0.24, L * 0.44, hw * 0.48, 3, M.metal, 7);                                // rangefinder arms
    sym(s => S.disc(cx + s * hw * 0.24, L * 0.44 + 1, 3, M.metal, 7));
    S.rect(cx - 1, L * 0.47, 3, L * 0.06, M.dark, 7);                                          // mast
    S.ellipse(cx, L * 0.6, hw * 0.13, L * 0.03, M.metal, 5); S.ellipse(cx, L * 0.593, hw * 0.08, L * 0.016, M.black);   // funnel
    const barb = (x, y, r) => { S.disc(x, y, r, M.metal, 3); S.disc(x, y, r - 3, M.hull, 3); };
    const main = [[0, 0.17], [0, 0.26], [0, 0.71]], sec = [[0.5, 0.36], [0.5, 0.64], [0.55, 0.3]];
    const slots = [...main.map(([x, y]) => [x * hw, y * L, 1]), ...sec.flatMap(([x, y]) => [[-x * hw, y * L, 0], [x * hw, y * L, 0]])];
    for (const [x, y, big] of slots.slice(0, n)) barb(cx + x, y, big ? 12 : 8);
    sym(s => { S.rect(cx + s * hw * 0.45 - 11, L * 0.83, 22, 28, M.metal, 3); S.rect(cx + s * hw * 0.45 - 9, L * 0.83 + 2, 18, 24, M.black); });
    S.rect(cx - 8, L * 0.86, 17, 40, M.hullL, 3); S.rect(cx - 1, L * 0.86, 3, 40, M.dark);    // catapult rail aft
    for (const [x, rx] of [[0, 12], [-0.4, 7], [0.4, 7]]) S.ellipse(cx + x * hw, L - 6, rx, 4, M.noz, 3);
    YARD.modules(S, 0, L * 0.06, w, L * 0.9, M.deck, M.mod, 3, 3, 14, 0.4);
    YARD.plates(S, 0, 0, w, L, M.deck, M.deckL, M.seam, 20, 14, 3);
    return { turrets: slots, hangars: [[-hw * 0.45, L * 0.83 + 14], [hw * 0.45, L * 0.83 + 14]], cores: [[0, L * 0.035], [0, L * 0.93]],
      jets: [[0, L - 2, 6], [-hw * 0.4, L - 3, 4], [hw * 0.4, L - 3, 4]] };
  },

  // Star Destroyer: a triangular wedge with a raised spine, a stepped superstructure and the bridge
  // tower with its twin domes at the stern.
  destroyer(S, w, L, M, n) {
    const cx = w >> 1, hw = w / 2 - 2, sym = f => { f(-1); f(1); };
    const half = y => (y < L * 0.86 ? Math.max(3, hw * y / (L * 0.86)) : hw);
    S.poly([[cx, 0], [cx + hw + 1, L * 0.86], [cx + hw + 1, L * 0.97], [cx + hw * 0.9, L - 1], [cx - hw * 0.9, L - 1], [cx - hw, L * 0.97], [cx - hw, L * 0.86]], M.hull, 1);
    for (let y = 8; y < L * 0.86; y++) { S.px(cx - half(y) + 1, y, M.trim); S.px(cx + half(y), y, M.trim); }
    for (let y = L * 0.2; y < L * 0.84; y++) sym(s => S.px(cx + s * (half(y) - 14), y, M.dark));    // edge trenches
    S.poly([[cx - 3, L * 0.1], [cx + 4, L * 0.1], [cx + hw * 0.18, L * 0.7], [cx - hw * 0.18, L * 0.7]], M.deck, 2);   // spine
    [[0.8, 0.62, 0.97, 2], [0.55, 0.68, 0.95, 3], [0.32, 0.74, 0.93, 4]].forEach(([k, y0, y1, l], i) => {   // stepped decks
      S.rect(cx - hw * k, L * y0, hw * k * 2 + 1, L * (y1 - y0), i === 1 ? M.metal : M.hullL, l);
      YARD.windows(S, cx - hw * k + 4, L * y0 + 2, hw * k * 2 - 8, 5, M.black, 2, 1);
    });
    S.rect(cx - 7, L * 0.78, 15, L * 0.08, M.metal, 5);                                   // bridge neck
    S.rect(cx - hw * 0.26, L * 0.775, hw * 0.52, 11, M.metal, 6);                          // bridge
    YARD.windows(S, cx - hw * 0.24, L * 0.775 + 2, hw * 0.48, 4, M.glass, 3, 1);
    sym(s => { for (let y = L * 0.3; y < L * 0.6; y += 40) YARD.vent(S, cx + s * hw * 0.3 - 5, y, 10, 12, M.dark, M.black, 2); });
    const turrets = [];
    for (const t of [0.34, 0.44, 0.54, 0.64, 0.74, 0.24]) sym(s => turrets.push([s * (half(L * t) - 26), L * t, t < 0.6 ? 1 : 0]));
    for (const [x, y, big] of turrets.slice(0, n)) { S.disc(cx + x, y, big ? 12 : 8, M.metal, 2); S.disc(cx + x, y, big ? 9 : 5, M.hull, 2); }
    const hangars = [[0, L * 0.45], [-hw * 0.5, L * 0.66], [hw * 0.5, L * 0.66]];
    for (const [x, y] of hangars) { S.rect(cx + x - 12, y - 10, 24, 20, M.metal, 3); S.rect(cx + x - 10, y - 8, 20, 16, M.black); }
    const cores = [[0, L * 0.6], [-hw * 0.12, L * 0.755], [hw * 0.12, L * 0.755]];
    for (const [x, y] of cores) S.disc(cx + x, y, 11, M.metal, 5);
    for (const x of [-0.35, 0, 0.35]) S.ellipse(cx + x * hw, L - 5, 14, 5, M.noz, 3);
    for (const x of [-0.7, -0.17, 0.17, 0.7]) S.ellipse(cx + x * hw, L - 4, 6, 3, M.noz, 3);
    YARD.modules(S, 0, L * 0.1, w, L * 0.88, M.hull, M.mod, 2, 5, 16, 0.5);
    YARD.modules(S, 0, L * 0.6, w, L * 0.38, M.hullL, M.mod, 3, 6, 12, 0.5);
    YARD.modules(S, 0, L * 0.1, w, L * 0.6, M.deck, M.mod, 3, 7, 10, 0.5);
    YARD.modules(S, 0, L * 0.6, w, L * 0.4, M.metal, M.mod, 4, 8, 10, 0.5);
    YARD.plates(S, 0, 0, w, L, M.hull, M.hullL, M.seam, 22, 12, 5);
    YARD.plates(S, 0, 0, w, L, M.deck, M.deckL, M.seam, 12, 10, 6);
    return { turrets, hangars, cores: [cores[0]], cores2: cores.slice(1),   // one core on the spine, or the twin bridge domes
      jets: [[0, L - 2, 7], [-hw * 0.35, L - 2, 7], [hw * 0.35, L - 2, 7], [-hw * 0.7, L - 2, 4], [hw * 0.7, L - 2, 4]] };
  },

  // Drone carrier: a blunt armored box with twin flight decks, islands on the center spine and hangar
  // bays at both ends of each runway.
  carrier(S, w, L, M, n) {
    const cx = w >> 1, hw = w / 2 - 2, sym = f => { f(-1); f(1); };
    S.poly([[cx - hw * 0.6, 0], [cx + hw * 0.6 + 1, 0], [cx + hw + 1, L * 0.06], [cx + hw + 1, L * 0.94], [cx + hw * 0.8, L - 1],
      [cx - hw * 0.8, L - 1], [cx - hw, L * 0.94], [cx - hw, L * 0.06]], M.hull, 1);
    sym(s => {
      const x0 = cx + s * hw * 0.45 - 22;
      S.rect(x0, L * 0.06, 45, L * 0.86, M.deck, 2);
      for (let y = L * 0.08; y < L * 0.9; y++) { S.px(x0 + 2, y, M.lamp); S.px(x0 + 42, y, M.lamp); }
      for (let y = L * 0.2; y < L * 0.86; y += 18) S.rect(x0 + 21, y, 2, 9, M.white);
      S.rect(cx + s * hw * 0.88 - 5, L * 0.1, 10, L * 0.8, M.metal, 2);
    });
    S.rect(cx - hw * 0.14, L * 0.04, hw * 0.28, L * 0.9, M.metal, 3);                      // center spine
    for (const y of [0.28, 0.62]) {                                                          // islands
      S.rect(cx - hw * 0.12, L * y, hw * 0.24, L * 0.1, M.hullL, 4);
      S.rect(cx - hw * 0.07, L * y + 6, hw * 0.14, L * 0.05, M.metal, 5);
      YARD.windows(S, cx - hw * 0.1, L * y + 2, hw * 0.2, 4, M.glass, 2, 1);
    }
    const hangars = [[-hw * 0.45, L * 0.1], [hw * 0.45, L * 0.1], [-hw * 0.45, L * 0.5], [hw * 0.45, L * 0.5]];
    for (const [x, y] of hangars) { S.rect(cx + x - 16, y - 10, 32, 20, M.metal, 3); S.rect(cx + x - 14, y - 8, 28, 16, M.black); }
    const turrets = [];
    for (const t of [0.2, 0.36, 0.52, 0.68, 0.84]) sym(s => turrets.push([s * hw * 0.88, L * t, t === 0.52 ? 1 : 0]));
    for (const [x, y, big] of turrets.slice(0, n)) S.disc(cx + x, y, big ? 12 : 8, M.metal, 3);
    S.disc(cx, L * 0.45, 13, M.metal, 4); S.disc(cx, L * 0.8, 13, M.metal, 4);
    for (const x of [-0.65, -0.22, 0.22, 0.65]) S.ellipse(cx + x * hw, L - 5, 10, 4, M.noz, 2);
    YARD.modules(S, 0, 0, w, L, M.hull, M.mod, 2, 15, 12, 0.55);
    YARD.modules(S, 0, 0, w, L, M.metal, M.mod, 4, 17, 10, 0.4);
    YARD.plates(S, 0, 0, w, L, M.hull, M.hullL, M.seam, 18, 12, 8);
    return { turrets, hangars, cores: [[0, L * 0.45], [0, L * 0.8]],
      jets: [-0.65, -0.22, 0.22, 0.65].map(x => [x * hw, L - 2, 5]) };
  },

  // Twin-hulled cruiser: two battleship hulls joined by a broad wing with the bridge on it.
  twin(S, w, L, M, n) {
    const cx = w >> 1, hw = w / 2 - 2, sym = f => { f(-1); f(1); };
    const sub = hw * 0.3, prof = [[0, 0], [0.5, 0.06], [0.9, 0.16], [1, 0.26], [1, 0.9], [0.7, 1]].map(([x, y]) => [x * sub, y * (L - 1)]);
    S.poly([[cx - hw * 0.6, L * 0.34], [cx + hw * 0.6, L * 0.34], [cx + hw * 0.7, L * 0.74], [cx - hw * 0.7, L * 0.74]], M.deck, 1);   // wing
    sym(s => {
      const hx = cx + s * hw * 0.62;
      S.poly([...prof.map(([x, y]) => [hx - x, y]), ...prof.slice().reverse().map(([x, y]) => [hx + 1 + x, y])], M.trim, 2);
      S.poly([...prof.map(([x, y]) => [hx - x * 0.85, y + 3]), ...prof.slice().reverse().map(([x, y]) => [hx + 1 + x * 0.85, y + 3])], M.hull, 2);
      for (let y = L * 0.26; y < L * 0.88; y += 14) S.disc(hx + s * (sub - 6), y, 2, M.metal, 3);
    });
    [[0.22, 0.44, 0.64, 3], [0.14, 0.47, 0.6, 4], [0.07, 0.5, 0.56, 5]].forEach(([k, y0, y1, l], i) => {
      S.rect(cx - hw * k, L * y0, hw * k * 2 + 1, L * (y1 - y0), i % 2 ? M.hullL : M.metal, l);
      YARD.windows(S, cx - hw * k + 3, L * y0 + 1, hw * k * 2 - 5, 4, i === 1 ? M.glass : M.black, 2, 1);
    });
    const turrets = [];
    for (const t of [0.14, 0.24, 0.62, 0.72, 0.82]) sym(s => turrets.push([s * hw * 0.62, L * t, t < 0.3 ? 1 : 0]));
    for (const [x, y, big] of turrets.slice(0, n)) S.disc(cx + x, y, big ? 12 : 8, M.metal, 3);
    const hangars = [[-hw * 0.3, L * 0.68], [hw * 0.3, L * 0.68]];
    for (const [x, y] of hangars) { S.rect(cx + x - 12, y - 9, 24, 18, M.metal, 2); S.rect(cx + x - 10, y - 7, 20, 14, M.black); }
    const cores = [[0, L * 0.4], [0, L * 0.68]];
    for (const [x, y] of cores) S.disc(cx + x, y, 12, M.metal, 3);
    sym(s => S.ellipse(cx + s * hw * 0.62, L - 5, 12, 4, M.noz, 3));
    YARD.modules(S, 0, 0, w, L, M.hull, M.mod, 3, 19, 12, 0.5);
    YARD.modules(S, 0, 0, w, L, M.deck, M.mod, 2, 20, 14, 0.5);
    YARD.modules(S, 0, L * 0.4, w, L * 0.3, M.metal, M.mod, 4, 21, 8, 0.6);
    YARD.modules(S, 0, L * 0.4, w, L * 0.3, M.hullL, M.mod, 5, 22, 8, 0.6);
    YARD.plates(S, 0, 0, w, L, M.deck, M.deckL, M.seam, 16, 12, 9);
    YARD.plates(S, 0, 0, w, L, M.hull, M.hullL, M.seam, 18, 12, 10);
    return { turrets, hangars, cores, jets: [[-hw * 0.62, L - 2, 6], [hw * 0.62, L - 2, 6]] };
  },
};

Object.assign(Game, {
  capitalArt(id) {
    if (capitalArt[id]) return capitalArt[id];
    const def = CAPITALS[id], { w, len, pal } = def, S = YARD.sheet(w, len);
    const M = {
      hull: S.mat(pal.hull), hullL: S.mat(SNES.mix(pal.hull, '#ffffff', 0.12)), seam: S.mat(pal.hull, { base: 1 }),
      deck: S.mat(pal.deck), deckL: S.mat(SNES.mix(pal.deck, '#ffffff', 0.1)), metal: S.mat(pal.metal), trim: S.mat(pal.trim),
      dark: S.mat(SNES.mix(pal.deck, '#000000', 0.4)), noz: S.mat('#303440'),
      glass: S.mat('#f8d858', { flat: true }), black: S.mat('#080810', { flat: true }), lamp: S.mat(pal.trim, { flat: true }),
      white: S.mat('#e0e4ec', { flat: true }),
    };
    M.mod = { metal: S.mat(SNES.mix(pal.metal, pal.hull, 0.4)), light: S.mat(pal.metal), dark: M.dark, black: M.black };   // machinery
    const lay = CAP_STYLES[def.style](S, w, len, M, def.turrets);
    const hull = S.bake({ shadow: 4 });
    const ramp = SNES.ramp(pal.metal);
    const turret = big => {   // a live turret top, pointing up, pivoting on its center
      const T = YARD.sheet(big ? 25 : 17, big ? 37 : 25), m = T.mat(pal.metal), d = T.mat(SNES.mix(pal.deck, '#000000', 0.3));
      const c = big ? 12 : 8, cy = big ? 18 : 12, r = big ? 9 : 6, n = big ? 3 : 2;
      for (let b = 0; b < n; b++) T.rect(c - (n - 1) * 2 + b * 4 - 1 + (b > 0 ? 1 : 0), cy - r - (big ? 11 : 7), 2, r + 4, d, 1);
      T.poly([[c - r, cy - r + 3], [c - r + 3, cy - r], [c + r - 2, cy - r], [c + r + 1, cy - r + 3], [c + r + 1, cy + r - 1], [c + r - 2, cy + r + 2], [c - r + 3, cy + r + 2], [c - r, cy + r - 1]], m, 2);
      T.rect(c - r + 3, cy - 2, r * 2 - 5, 2, d);
      return T.bake({ shadow: 2 });
    };
    return (capitalArt[id] = { hull, shadow: this.silhouette(hull), lay, ramp, turretBig: turret(true), turretSmall: turret(false) });
  },

  makeCapital(id) {
    const def = CAPITALS[id], art = this.capitalArt(id), k = (1 + this.stage * 0.06) * this.hpMul(), L = art.lay;
    this.lastBossName = def.name;
    const T = [
      ...L.turrets.slice(0, def.turrets).map(([lx, ly, big]) => ({ kind: 'turret', lx, ly, big, r: big ? 9 : 7, hp: big ? 7 : 4 })),
      ...L.hangars.slice(0, def.hangars).map(([lx, ly]) => ({ kind: 'hangar', lx, ly, r: 10, hp: 10 })),
      ...((def.cores > 1 && L.cores2) || L.cores).slice(0, def.cores).map(([lx, ly]) => ({ kind: 'core', lx, ly, r: 11, hp: 22 })),
    ];
    const targets = T.map(q => ({ ...q, hp: Math.round(q.hp * k), max: Math.round(q.hp * k),
      dead: false, x: 0, y: -99, cd: randi(60, 160), flash: 0, aim: Math.PI / 2 }));
    Sound.playSong(Sound.SONGS.boss);
    return { id, def, art, y: 0, speed: 0.85, pass: 1, flip: false, phase: 'zoom', pt: 0, dying: 0, t: 0, targets,
      cy: 0, ang: 0, s: 1 };
  },

  capitalLeft() { return this.capital.targets.filter(q => !q.dead).length; },

  // Targets that can be hit right now (only while flying over the ship, not while it turns).
  capitalOnScreen() {
    const K = this.capital;
    if (!K || K.phase !== 'pass') return [];
    return K.targets.filter(q => !q.dead && q.y > -8 && q.y < H + 8);
  },

  // Where the ship is drawn: center (CX, cy), rotation and scale, by phase. The zoom ends exactly
  // where a pass starts: scale 1, the trailing end just above the top of the screen.
  placeCapital() {
    const K = this.capital, len = K.def.len, base = K.flip ? Math.PI : 0;
    if (K.phase === 'pass') { K.s = 1; K.ang = base; K.cy = K.y - len / 2; return; }
    if (K.phase === 'spin') {
      const k = K.pt / CAP_SPIN, e = k * k * (3 - 2 * k);
      K.s = 0.16; K.ang = base + Math.PI * e; K.cy = 150 - 0.08 * len;
      return;
    }
    const k = K.pt / CAP_ZOOM, e = k * k;
    K.s = 0.16 + 0.84 * e; K.ang = base;
    K.cy = 150 * (1 - e) - K.s * len / 2;
  },

  // A point in the hull's frame (lx from the centerline, ly from the bow) on screen.
  capitalToScreen(lx, ly) {
    const K = this.capital, c = Math.cos(K.ang), s = Math.sin(K.ang), y = ly - K.def.len / 2;
    return [CX + K.s * (c * lx - s * y), K.cy + K.s * (s * lx + c * y)];
  },

  updateCapital() {
    const K = this.capital, def = K.def, p = this.player;
    K.t++; K.pt++;
    if (K.phase === 'spin' && K.pt >= CAP_SPIN) { K.phase = 'zoom'; K.pt = 0; K.flip = !K.flip; K.pass++; }
    else if (K.phase === 'zoom' && K.pt >= CAP_ZOOM) { K.phase = 'pass'; K.pt = 0; K.y = 0; }
    if (K.phase === 'pass') K.y += K.speed;
    this.placeCapital();
    for (const q of K.targets) {
      [q.x, q.y] = this.capitalToScreen(q.lx, q.ly);
      if (q.flash > 0) q.flash--;
      if (q.kind === 'turret' && p.alive) q.aim += clamp(angDiff(q.aim, Math.atan2(p.y - q.y, p.x - q.x)), -0.03, 0.03);
    }
    if (K.phase !== 'pass') return;
    if (K.pass === 1 && K.pt === 60) { this.say(def.intro); this.hint('capital'); }
    if (K.dying > 0) {
      if (K.dying % 5 === 0) {
        const [x, y] = this.capitalToScreen(rand(-def.w / 2, def.w / 2) * 0.8, rand(0, def.len));
        if (y > 0 && y < H) { this.explode(x, y, 14); Sound.sfx('explode'); }
      }
      if (--K.dying === 0) this.capitalDefeated();
      return;
    }
    const lvl = Math.min(this.stage / 5, 3);
    for (const q of K.targets) {
      if (q.dead || q.y < 4 || q.y > H - 50) continue;
      if (q.kind === 'turret' && --q.cd <= 0) {
        q.cd = Math.max(70, (q.big ? 150 : 120) - lvl * 15) + randi(0, 40);
        const a = q.aim, sp = 1.6 + lvl * 0.15;
        if (p.alive && q.y < p.y - 24 && Math.abs(angDiff(a, Math.atan2(p.y - q.y, p.x - q.x))) < 0.4) {   // only guns ahead of you that are on target fire
          const n = q.big ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const b = a + (i - (n - 1) / 2) * 0.12;
            if (!(this.empT > 0)) this.eBul.push({ x: q.x + Math.cos(a) * 14, y: q.y + Math.sin(a) * 14, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp });
          }
          this.spark(q.x + Math.cos(a) * 16, q.y + Math.sin(a) * 16, C.yellow, 3);
        }
      } else if (q.kind === 'hangar' && q.y < 150 && --q.cd <= 0) {
        q.cd = 210;
        if (this.enemies.length < 8) {
          const type = def.launch === 'fighter' ? this.mixType('fighter') : def.launch;
          this.spawnKamikaze(q.x, q.y, q.lx < 0 ? -1 : 1, type);
        }
      } else if (q.kind === 'core' && --q.cd <= 0) {
        q.cd = 230;
        this.ringShot(q.x, q.y, 8, 1.2 + lvl * 0.1, K.t * 0.05);
      }
    }
    if (K.y - def.len > H + 20) {   // flown the whole length with targets left: come about
      K.phase = 'spin'; K.pt = 0;
      this.eBul = [];
      this.say(this.capitalLeft() + ' TARGETS LEFT. COMING ABOUT FOR ANOTHER PASS.', 'mira');
    }
  },

  capitalHitTest(b) {
    for (const q of this.capitalOnScreen()) {
      if (Math.hypot(b.x - q.x, b.y - q.y) >= q.r + 2) continue;
      b.dead = true;
      this.damageCapTarget(q, b.dmg, b.form, b.x, b.y);
      return;
    }
  },

  damageCapTarget(q, d, form, hx, hy) {
    const K = this.capital;
    if (q.dead || K.dying) return;
    if (form >= 0 && this.adapt === form) { d *= 0.5; this.spark(hx, hy, C.lgray); }
    this.hitsTotal++;
    q.hp -= d;
    q.flash = 4;
    Sound.sfx('bossHit');
    if (q.hp > 0) return;
    q.dead = true;
    this.explode(q.x, q.y, q.kind === 'core' ? 24 : 14);
    Sound.sfx(q.kind === 'core' ? 'boom' : 'explode');
    const pts = CAPITAL_PTS[q.kind];
    this.addScore(pts);
    this.popup(q.x, q.y - 8, String(pts), C.gold);
    if (!this.capitalLeft()) { K.dying = 150; this.eBul = []; Sound.sfx('boom'); }
  },

  capitalDefeated() {
    const p = this.player;
    this.addScore(20000);
    this.popup(CX, 100, '20000', C.gold);
    for (const e of this.enemies) { e.dead = true; this.explode(e.x, e.y, 8); }
    this.enemies = [];
    this.eBul = [];
    this.capital = null;
    this.say(VOSS.bossDown);
    p.silenced = [false, false, false];
    p.silenceT = [0, 0, 0];
    this.nextAdapt = this.computeAdapt();
    this.bossWin = true;
    this.clearDelay = 240;
    this.setState('clear');
    Sound.playSong(Sound.SONGS.victory);
  },

  // ---- Drawing ------------------------------------------------------------------------
  drawCapital(ctx) {
    const K = this.capital, def = K.def, A = K.art, len = def.len, w = def.w;
    const inHull = (fn, dx = 0, dy = 0) => {   // draw in the hull's own frame (canvas coordinates)
      ctx.save();
      ctx.translate(Math.round(CX + dx * K.s), Math.round(K.cy + dy * K.s));
      ctx.rotate(K.ang);
      ctx.scale(K.s, K.s);
      ctx.translate(-(w >> 1), -(len >> 1));
      fn();
      ctx.restore();
    };
    if (K.cy - len * K.s / 2 > H || K.cy + len * K.s / 2 < 0) return;
    SNES.half(ctx, () => inHull(() => ctx.drawImage(A.shadow, 0, 0), 34, 52), 0.35);   // shadow on the planet below
    inHull(() => {
      ctx.drawImage(A.hull, 0, 0);
      const r = 4 + ((this.t >> 2) & 1);
      SNES.add(ctx, () => {   // engines
        for (const [lx, ly, k] of A.lay.jets) {
          NES.draw(ctx, SNES.glow(k + r + 3, '#1840a0'), (w >> 1) + lx, ly + k);
          NES.draw(ctx, SNES.glow(k + r - 1, '#60c8f8'), (w >> 1) + lx, ly + k);
        }
      });
      for (const q of K.targets) this.drawCapTarget(ctx, K, q, (w >> 1) + q.lx, q.ly);
    });
  },

  drawCapTarget(ctx, K, q, x, y) {
    x = Math.round(x); y = Math.round(y);
    const A = K.art, t = this.t;
    if (q.dead) {   // a scorched wreck, still burning
      NES.disc(ctx, x, y, q.kind === 'core' ? 9 : 6, '#181010');
      NES.disc(ctx, x - 1, y - 1, q.kind === 'core' ? 5 : 3, '#302018');
      if ((t >> 2) & 1) SNES.add(ctx, () => NES.draw(ctx, SNES.glow(3, '#c04010'), x + ((t >> 3) % 3) - 1, y));
      return;
    }
    if (q.kind === 'turret') {
      const img = q.big ? A.turretBig : A.turretSmall;
      SNES.drawRot(ctx, img, x, y, q.aim - K.ang + Math.PI / 2);
      if (q.flash) SNES.add(ctx, () => NES.draw(ctx, SNES.glow(q.big ? 10 : 7, '#a0a0a0'), x, y));
    } else if (q.kind === 'hangar') {
      ctx.fillStyle = (t >> 3) & 1 ? C.yellow : C.orange;
      for (let k = -8; k <= 8; k += 4) { ctx.fillRect(x + k, y - 9, 1, 1); ctx.fillRect(x + k, y + 8, 1, 1); }
      if (q.flash) SNES.half(ctx, () => { ctx.fillStyle = C.white; ctx.fillRect(x - 10, y - 8, 20, 16); }, 0.6);
    } else {   // a histone core: a glowing reactor dome with DNA wrapped around it
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(14 + ((t >> 3) & 1), '#501070'), x, y));
      NES.draw(ctx, SNES.sphere(9, q.flash ? '#ffffff' : '#b040c0'), x, y);
      for (let i = -12; i <= 12; i++) {
        const s = Math.sin(i * 0.45 + t * 0.12) * 6;
        ctx.fillStyle = C.aqua; ctx.fillRect(x + i, Math.round(y + s), 1, 1);
        ctx.fillStyle = C.lime; ctx.fillRect(x + i, Math.round(y - s), 1, 1);
      }
    }
  },

  drawCapitalText(ctx) {
    const K = this.capital;
    if (!K || K.phase === 'pass') return;
    const center = { align: 'center' };
    if (K.pass === 1 && K.phase === 'zoom') {
      if ((this.t >> 4) & 1) NES.text(ctx, 'WARNING', 128, 168, C.red, { align: 'center', scale: 2, shadow: C.darkred });
      NES.text(ctx, K.def.name, 128, 190, C.gold, center);
      return;
    }
    NES.text(ctx, 'COMING ABOUT', 128, 168, C.gold, { align: 'center', scale: 2, shadow: C.navy });
    NES.text(ctx, 'PASS ' + (K.pass + (K.phase === 'spin' ? 1 : 0)), 128, 190, C.white, center);
    NES.text(ctx, this.capitalLeft() + ' TARGETS LEFT', 128, 202, C.aqua, center);
  },
});
