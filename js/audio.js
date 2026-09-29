'use strict';
// Tiny chiptune engine: NES-like pulse / triangle / noise voices built on WebAudio.
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, noiseBuf = null;
  let song = null, wanted = null, muted = false;
  const waves = {};
  const lastPlayed = {};

  // Band-limited pulse wave with the given duty cycle (NES has 12.5/25/50%).
  function pulseWave(duty) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
      im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
    }
    return ctx.createPeriodicWave(re, im);
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.6;
    sfxBus.connect(master);
    waves.pulse12 = pulseWave(0.125);
    waves.pulse25 = pulseWave(0.25);
    waves.pulse50 = pulseWave(0.5);
    // 15-bit LFSR noise like the NES noise channel.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 1;
    for (let i = 0; i < d.length; i++) {
      if (i % 4 === 0) { const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); }
      d[i] = lfsr & 1 ? 0.8 : -0.8;
    }
  }

  // Browsers only allow audio after a user gesture; call this from input handlers.
  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!song && wanted) playSong(wanted);
  }

  function tone(freq, dur, o = {}) {
    if (!ctx) return;
    const t0 = Math.max(o.at || 0, ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    const type = o.type || 'pulse25';
    if (waves[type]) osc.setPeriodicWave(waves[type]); else osc.type = type;
    // bend: start that many semitones off and glide in (rave "hoover" stabs).
    osc.frequency.setValueAtTime(o.bend ? freq * Math.pow(2, o.bend / 12) : freq, t0);
    if (o.bend) osc.frequency.exponentialRampToValueAtTime(freq, t0 + Math.min(dur, 0.07));
    if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
    const g = ctx.createGain();
    const v = o.vol ?? 0.3;
    if (o.attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + Math.min(o.attack, dur * 0.5)); }
    else g.gain.setValueAtTime(v, t0);
    if (o.hold) { g.gain.setValueAtTime(v, t0 + dur * 0.7); g.gain.linearRampToValueAtTime(0, t0 + dur); }
    else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.dest || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, o = {}) {
    if (!ctx) return;
    const t0 = Math.max(o.at || 0, ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.setValueAtTime(o.rate || 1, t0);
    if (o.rateTo) src.playbackRate.linearRampToValueAtTime(o.rateTo, t0 + dur);
    const g = ctx.createGain();
    if (o.swell) { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.vol ?? 0.3, t0 + dur); }
    else { g.gain.setValueAtTime(o.vol ?? 0.3, t0); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); }
    src.connect(g);
    g.connect(o.dest || sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  const SFX = {
    shoot: () => tone(1400, 0.06, { type: 'pulse12', vol: 0.12, slide: 500 }),
    spread: () => tone(900, 0.08, { type: 'pulse25', vol: 0.12, slide: 300 }),
    missile: () => { noise(0.18, { vol: 0.12, rate: 0.6, rateTo: 1.2 }); tone(180, 0.15, { type: 'triangle', vol: 0.25, slide: 700 }); },
    hit: () => tone(1600, 0.04, { type: 'pulse25', vol: 0.12, slide: 900 }),
    tink: () => tone(2400, 0.03, { type: 'pulse12', vol: 0.1 }),
    explode: () => noise(0.3, { vol: 0.35, rate: 0.5, rateTo: 0.15 }),
    boom: () => { noise(0.9, { vol: 0.5, rate: 0.35, rateTo: 0.08 }); tone(140, 0.7, { type: 'triangle', vol: 0.4, slide: 30 }); },
    die: () => {
      noise(1.2, { vol: 0.5, rate: 0.4, rateTo: 0.05 });
      [660, 520, 400, 300, 220].forEach((f, i) => tone(f, 0.12, { type: 'pulse50', vol: 0.15, delay: i * 0.1 }));
    },
    transform: () => {
      noise(0.05, { vol: 0.25, rate: 1.5 });
      [330, 494, 659].forEach((f, i) => tone(f, 0.05, { type: 'pulse25', vol: 0.15, delay: 0.03 + i * 0.05 }));
      noise(0.04, { vol: 0.2, rate: 0.8, delay: 0.2 });
    },
    denied: () => tone(110, 0.12, { type: 'pulse50', vol: 0.18 }),
    armor: () => { noise(0.2, { vol: 0.3, rate: 1.2 }); tone(900, 0.2, { type: 'pulse12', vol: 0.15, slide: 200 }); },
    beam: () => tone(420 + Math.random() * 200, 0.1, { type: 'triangle', vol: 0.2, slide: 900 }),
    charge: () => tone(200, 0.6, { type: 'pulse25', vol: 0.15, slide: 1200 }),
    silence: () => { tone(880, 0.6, { type: 'pulse25', vol: 0.2, slide: 110 }); tone(440, 0.6, { type: 'triangle', vol: 0.2, slide: 55 }); },
    restore: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.08, { type: 'pulse25', vol: 0.15, delay: i * 0.06 })),
    oneup: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(f, 0.07, { type: 'pulse25', vol: 0.15, delay: i * 0.07 })),
    dive: () => tone(300, 0.35, { type: 'triangle', vol: 0.1, slide: 900 }),
    select: () => tone(988, 0.08, { type: 'pulse25', vol: 0.15 }),
    move: () => tone(660, 0.03, { type: 'pulse12', vol: 0.12 }),
    blip: () => tone(1200, 0.02, { type: 'pulse12', vol: 0.05 }),
    bossHit: () => tone(220, 0.03, { type: 'pulse50', vol: 0.12 }),
    takeoff: () => { noise(0.9, { vol: 0.25, rate: 0.3, rateTo: 1.6 }); tone(120, 0.8, { type: 'triangle', vol: 0.3, slide: 480 }); },
    land: () => { noise(0.15, { vol: 0.35, rate: 0.4 }); tone(160, 0.2, { type: 'triangle', vol: 0.35, slide: 60 }); },
    cash: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.06, { type: 'pulse12', vol: 0.12, delay: i * 0.05 })),
    levelup: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.08, { type: 'pulse25', vol: 0.15, delay: i * 0.08 })),
  };

  function sfx(name) {
    if (!ctx || !SFX[name]) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] !== undefined && now - lastPlayed[name] < 0.03) return;
    lastPlayed[name] = now;
    SFX[name]();
  }

  // ---- Music sequencer ------------------------------------------------------
  // Notes are "NAME:LEN" tokens, LEN in sixteenths. R = rest. "A4+C5+E5:2" plays a chord.
  // Drums: K kick, S snare, G ghost snare, H hat, C crash, Z noise riser (swells over LEN).
  // Track options: attack (s, pads), detune (cents), bend (semitones glided in), pluck (decays), gate.
  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freqOf(name) {
    const m = /^([A-G]#?)(\d)$/.exec(name);
    const midi = (parseInt(m[2], 10) + 1) * 12 + SEMI[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const parse = str => str.trim().split(/\s+/).map(tok => {
    const [n, l] = tok.split(':');
    return { n, len: parseInt(l, 10) || 1 };
  });

  const rep = (s, n) => Array(n).fill(s).join(' ');
  // ---- Trip II The Moon arrangements ----------------------------------------------------------
  // Built from an analysis of Acen's "Trip II The Moon" (1992): 104 BPM breakbeat, key of F# over an
  // F# drone, an offbeat arp riff on D -> C#, the epic F# -> E -> D -> E climb of the breakdowns,
  // the F#7 -> A -> Dmaj7/D+ -> E "kaleidoscope" section and the F# -> C# -> B -> E drop.
  // The harmony, tempo and grooves follow the record; the melodies are our own.
  const TRIP_STEP = 0.1443;   // one sixteenth at 104 BPM, measured from the record
  const CH = {
    D:     { b: 'D2',  pad: 'D4+F#4+A4',   stab: 'D4+F#4+A4',   arp: ['D5', 'F#5', 'A5', 'D6'] },
    Cs:    { b: 'C#2', pad: 'C#4+F4+G#4',  stab: 'C#4+F4+G#4',  arp: ['C#5', 'F5', 'G#5', 'C#6'] },
    Fs:    { b: 'F#2', pad: 'F#3+A#3+C#4', stab: 'F#4+A#4+C#5', arp: ['F#5', 'A#5', 'C#6', 'F#6'] },
    E:     { b: 'E2',  pad: 'E3+G#3+B3',   stab: 'E4+G#4+B4',   arp: ['E5', 'G#5', 'B5', 'E6'] },
    B:     { b: 'B1',  pad: 'B3+D#4+F#4',  stab: 'F#4+B4+D#5',  arp: ['B4', 'D#5', 'F#5', 'B5'] },
    A:     { b: 'A1',  pad: 'A3+C#4+E4',   stab: 'A4+C#5+E5',   arp: ['A4', 'C#5', 'E5', 'A5'] },
    Fs7:   { b: 'F#2', pad: 'F#3+C#4+E4',  stab: 'F#4+C#5+E5',  arp: ['F#5', 'C#6', 'E6', 'F#6'] },
    Dmaj7: { b: 'D2',  pad: 'D4+F#4+C#5',  stab: 'D4+F#4+C#5',  arp: ['D5', 'F#5', 'C#6', 'D6'] },
    Daug:  { b: 'D2',  pad: 'D4+F#4+A#4',  stab: 'D4+F#4+A#4',  arp: ['D5', 'F#5', 'A#5', 'D6'] },
  };
  const REST = 'R:16';
  const up = n => n.replace(/\d/, d => +d + 1);   // same note, one octave up
  // A song from a list of [section, chords] pairs; each part maps (bar, chord) to one bar (16 sixteenths).
  function arrange(sections, parts) {
    const bars = [];
    for (const [sec, chords] of sections) chords.forEach((c, i) => bars.push({ sec, i, c: CH[c] }));
    return { step: TRIP_STEP, loop: true,
      tracks: parts.map(([o, f]) => ({ ...o, notes: bars.map(b => f(b, b.c) || REST).join(' ') })) };
  }
  // Shared parts.
  const drone = secs => [{ type: 'pulse12', vol: 0.028 }, b => secs.includes(b.sec) && 'F#3:16'];   // the record's F# pedal
  const padP = (secs, vol = 0.03) => [{ type: 'pulse50', vol, attack: 0.6 }, (b, c) => secs.includes(b.sec) && c.pad + ':16'];
  const riffP = secs => [{ type: 'pulse12', vol: 0.055, pluck: true },   // the offbeat arp riff
    (b, c) => secs.includes(b.sec) && [0, 2, 1, 2, 3, 2, 1, 2].map(k => `R:1 ${c.arp[k]}:1`).join(' ')];
  const shimmer = (secs, vol) => [{ type: 'pulse12', vol, pluck: true },   // 16th arp: the kaleidoscope sparkle
    (b, c) => secs.includes(b.sec) && [0, 1, 2, 3, 2, 1, 2, 3, 1, 2, 3, 2, 3, 2, 1, 2].map(k => up(c.arp[k]) + ':1').join(' ')];
  const leadP = (vol, mel) => [{ type: 'pulse25', vol }, b => mel[b.sec] && mel[b.sec][b.i]];

  // Title screen: the ambient intro riff, then the breakdown climb. No drums.
  const title = arrange([
    ['riff', ['D', 'Cs', 'D', 'Cs']], ['climb', ['Fs', 'E', 'D', 'E']],
    ['riff2', ['D', 'Cs', 'D', 'Cs']], ['climb2', ['Fs', 'E', 'Daug', 'E']],
  ], [
    drone(['riff', 'riff2', 'climb', 'climb2']),
    padP(['riff', 'riff2', 'climb', 'climb2']),
    riffP(['riff', 'riff2']),
    shimmer(['climb', 'climb2'], 0.035),
    [{ type: 'triangle', vol: 0.3 }, (b, c) => `${c.b}:12 ${up(c.b)}:4`],
    leadP(0.1, {
      riff2: ['A5:6 F#5:2 D5:8', 'G#5:6 F5:2 C#5:8', 'A5:4 D6:4 C#6:4 A5:4', 'G#5:8 F5:8'],
      climb2: ['C#6:8 A#5:8', 'B5:8 G#5:8', 'A#5:8 F#5:8', 'G#5:12 B5:4'],
    }),
  ]);

  // Starbase and galaxy map: the calm kaleidoscope section, then the same over the F# pedal. No drums.
  const base = arrange([
    ['glow', ['Fs7', 'A', 'Dmaj7', 'E']], ['glow2', ['Fs7', 'A', 'Daug', 'E']],
    ['pedal', ['Fs7', 'A', 'Dmaj7', 'E']], ['pedal2', ['Fs7', 'A', 'Daug', 'E']],
  ], [
    padP(['glow', 'glow2', 'pedal', 'pedal2'], 0.035),
    [{ type: 'pulse12', vol: 0.04, pluck: true },   // slow 8th-note arp
      (b, c) => [0, 1, 2, 3, 2, 1, 2, 3].map(k => c.arp[k] + ':2').join(' ')],
    [{ type: 'triangle', vol: 0.26 }, (b, c) => b.sec.startsWith('pedal') ? 'F#2:16' : `${c.b}:8 ${up(c.b)}:8`],
    leadP(0.06, {   // distant bells
      glow2: ['C#6:4 R:4 E6:4 R:4', 'E6:4 R:4 C#6:4 R:4', 'F#6:6 R:2 C#6:8', 'B5:8 G#5:8'],
      pedal2: ['F#6:4 R:4 E6:4 C#6:4', 'E6:8 C#6:8', 'A#5:4 R:4 F#5:8', 'G#5:12 R:4'],
    }),
  ]);

  // Missions: the riff over breakbeats, the climb on a lighter groove with a riser, then the full drop.
  const BREAK = ['K:1 H:1 R:1 H:1 S:1 H:1 K:1 G:1 H:1 K:1 H:1 R:1 S:1 H:1 G:1 H:1',
                 'H:1 R:1 K:1 H:1 S:1 H:1 K:1 G:1 H:1 K:1 H:1 G:1 S:1 H:1 R:1 S:1'];
  const FILL = 'K:1 H:1 R:1 H:1 S:1 H:1 K:1 G:1 S:1 G:1 S:1 S:1 S:1 S:1 S:1 S:1';
  const LIGHT = 'K:1 R:1 H:1 R:1 S:1 R:1 H:1 R:1 K:1 R:1 H:1 K:1 S:1 R:1 H:1 R:1';
  const mission = arrange([
    ['riff', ['D', 'Cs', 'D', 'Cs', 'D', 'Cs', 'D', 'Cs']],
    ['climb', ['Fs', 'E', 'D', 'E', 'Fs', 'E', 'Daug', 'E']],
    ['drop', ['Fs', 'Cs', 'B', 'E', 'Fs', 'Cs', 'B', 'E']],
  ], [
    [{ type: 'drums', vol: 0.15 }, b => {
      if (b.sec === 'climb') return b.i === 0 ? 'C' + LIGHT.slice(1) : b.i === 7 ? 'Z:12 S:1 S:1 S:1 S:1' : LIGHT;
      const beat = b.i % 4 === 3 ? FILL : BREAK[b.i % 2];
      return b.i === 0 ? 'C+' + beat : beat;   // crash on each new section
    }],
    [{ type: 'triangle', vol: 0.34 }, (b, c) => {   // rolling sub bass
      const r = c.b, o = up(r);
      return b.sec === 'climb' ? `${r}:6 ${r}:2 ${o}:4 ${r}:4` : `${r}:3 ${r}:1 R:2 ${o}:2 ${r}:2 R:1 ${r}:1 ${o}:2 ${r}:2`;
    }],
    drone(['riff', 'climb']),
    riffP(['riff']),
    padP(['climb', 'drop'], 0.028),
    shimmer(['climb'], 0.035),
    // Hoover stabs in the drop: two detuned layers that glide up into each chord.
    ...[-14, 14].map(d => [{ type: d < 0 ? 'pulse50' : 'pulse25', vol: 0.035, detune: d, bend: -5, gate: 0.8 },
      (b, c) => b.sec === 'drop' && `R:2 ${c.stab}:2 R:2 ${c.stab}:1 R:1 R:2 ${c.stab}:3 R:1 ${c.stab}:2`]),
    leadP(0.1, {
      riff: [null, null, null, null, 'A5:6 F#5:2 D6:8', 'C#6:6 G#5:2 F5:8', 'F#5:4 A5:4 D6:4 F#6:4', 'F6:8 C#6:8'],
      drop: ['C#6:3 A#5:3 F#5:2 G#5:2 A#5:2 C#6:4', 'F5:3 G#5:3 C#6:4 D#6:2 F6:4',
             'D#6:3 C#6:3 B5:2 A#5:2 B5:2 F#5:4', 'G#5:6 B5:2 E6:4 D#6:2 B5:2',
             'A#5:3 C#6:3 F#6:4 F6:2 C#6:4', 'G#5:3 F5:3 C#5:4 F5:2 G#5:4',
             'F#5:3 B5:3 D#6:4 C#6:2 B5:4', 'B5:4 G#5:2 E5:2 G#5:4 A#5:4'],
    }),
  ]);

  const SONGS = {
    title,   // main menu
    stage: { step: 0.08, loop: false, tracks: [
      { type: 'pulse25', vol: 0.18, notes: 'E5:2 G5:2 A5:2 E5:2 G5:2 A5:2 C6:4 B5:2 A5:2 G5:2 A5:8' },
      { type: 'triangle', vol: 0.3, notes: 'A2:4 A3:4 C3:4 C4:4 D3:4 E3:4 A2:6' },
    ] },
    boss: { step: 0.085, loop: true, tracks: [
      { type: 'pulse25', vol: 0.15, notes:
        'E5:1 R:1 E5:1 F5:1 E5:2 B4:2 C5:1 R:1 C5:1 D5:1 C5:2 A4:2 ' +
        'B4:1 R:1 B4:1 C5:1 D5:2 E5:2 F5:2 E5:2 D5:2 B4:2' },
      { type: 'triangle', vol: 0.3, notes:
        rep('E2:2 E3:2', 2) + ' ' + rep('A2:2 A3:2', 2) + ' ' + rep('G2:2 G3:2', 2) + ' ' + rep('B2:2 B3:2', 2) },
      { type: 'drums', vol: 0.12, notes: rep('K:2 H:1 H:1 S:2 H:2', 4) },
    ] },
    mission,
    base,   // starbase and galaxy map
    gameover: { step: 0.12, loop: false, tracks: [
      { type: 'pulse25', vol: 0.16, notes: 'A4:3 G4:3 F4:3 E4:3 D4:3 C4:3 B3:3 A3:9' },
      { type: 'triangle', vol: 0.3, notes: 'A2:12 F2:12 A2:6' },
    ] },
    victory: { step: 0.09, loop: false, tracks: [
      { type: 'pulse25', vol: 0.18, notes: 'C5:2 E5:2 G5:2 C6:6 G5:2 C6:8' },
      { type: 'triangle', vol: 0.3, notes: 'C3:4 G3:4 C3:4 C4:10' },
    ] },
  };

  function playNote(tr, nt, t, dur, bus) {
    if (nt.n === 'R') return;
    for (const n of nt.n.split('+')) {
      if (tr.type !== 'drums') {
        tone(freqOf(n), dur * (tr.gate || 0.92), { at: t, type: tr.type, vol: tr.vol, hold: !tr.pluck, dest: bus,
          attack: tr.attack, detune: tr.detune, bend: tr.bend });
      } else if (n === 'K') {
        noise(0.07, { at: t, vol: tr.vol, rate: 0.3, dest: bus });
        tone(110, 0.08, { at: t, type: 'triangle', vol: tr.vol * 1.5, slide: 40, dest: bus });
      } else if (n === 'S') noise(0.1, { at: t, vol: tr.vol, rate: 1, dest: bus });
      else if (n === 'G') noise(0.05, { at: t, vol: tr.vol * 0.45, rate: 1.2, dest: bus });
      else if (n === 'C') noise(1.4, { at: t, vol: tr.vol * 0.7, rate: 2.6, dest: bus });
      else if (n === 'Z') noise(dur, { at: t, vol: tr.vol * 0.8, rate: 0.2, rateTo: 3, swell: true, dest: bus });
      else noise(0.03, { at: t, vol: tr.vol * 0.6, rate: 3, dest: bus });
    }
  }

  function stopSong() {
    wanted = null;
    if (!song) return;
    const bus = song.bus;
    bus.gain.setValueAtTime(0, ctx.currentTime);
    setTimeout(() => bus.disconnect(), 500);
    song = null;
  }

  function playSong(def) {
    stopSong();
    wanted = def.loop ? def : null;   // remember looping music until audio is unlocked
    if (!ctx) return;
    const bus = ctx.createGain();
    bus.gain.value = 0.55;
    bus.connect(master);
    const t = ctx.currentTime + 0.05;
    song = { def, bus, tracks: def.tracks.map(tr => ({ ...tr, seq: parse(tr.notes), i: 0, time: t })) };
  }

  function update() {
    if (!song) return;
    const ahead = ctx.currentTime + 0.2;
    let alive = false;
    for (const tr of song.tracks) {
      while (tr.time < ahead) {
        if (tr.i >= tr.seq.length) { if (song.def.loop) tr.i = 0; else break; }
        const nt = tr.seq[tr.i++];
        const dur = nt.len * song.def.step;
        playNote(tr, nt, tr.time, dur, song.bus);
        tr.time += dur;
      }
      if (song.def.loop || tr.i < tr.seq.length || tr.time > ctx.currentTime) alive = true;
    }
    if (!alive) song = null;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }

  return {
    unlock, sfx, playSong, stopSong, update, toggleMute, SONGS,
    get current() { return song ? song.def : null; },
    get locked() { return !ctx || ctx.state !== 'running'; },
    get muted() { return muted; },
  };
})();
