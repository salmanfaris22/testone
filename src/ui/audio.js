// Sound made in the browser, no audio files. Each place has its own bed: sea and gulls outside, running water
// and bubbles in the tank halls, a quiet hum in the labs, pumps in the plant room, and a muffled deep under water.
export function createAudio() {
  let ctx = null, master, L = {}, on = false, scene = 'outside', timers = {};
  const noise = (seconds, brown) => {
    const n = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w * 0.5; } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
  };
  const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const ramp = (p, v, t = 1.2) => { p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t / 3); };
  const lfo = (f, depth, target) => { const o = ctx.createOscillator(); o.frequency.value = f; const g = gain(depth); o.connect(g); g.connect(target); o.start(); };

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = gain(0);
    // everything passes one low-pass, which closes when you go under water
    L.tone = filt('lowpass', 18000, 0.3); master.connect(L.tone); L.tone.connect(ctx.destination);
    // sea: brown noise through a slowly breathing low-pass
    { const src = noise(6, true), lp = filt('lowpass', 520), g = gain(0); lfo(0.09, 300, lp.frequency); lfo(0.13, 0.2, g.gain); src.connect(lp); lp.connect(g); g.connect(master); src.start(); L.sea = g; }
    // air: thin high noise (wind outside, ventilation inside)
    { const src = noise(4, false), bp = filt('bandpass', 3200, 0.4), g = gain(0); src.connect(bp); bp.connect(g); g.connect(master); src.start(); L.air = g; L.airF = bp; }
    // hum of plant: mains tones plus a band of rumble
    { const g = gain(0); for (const [f, v] of [[50, 0.5], [100, 0.22], [150.3, 0.08]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = gain(v); o.connect(og); og.connect(g); o.start(); }
      const src = noise(3, true), bp = filt('bandpass', 240), ng = gain(0.5); src.connect(bp); bp.connect(ng); ng.connect(g); src.start(); g.connect(master); L.hum = g; }
    // running water: band-passed noise that flutters
    { const src = noise(5, false), bp = filt('bandpass', 1500, 0.8), hp = filt('highpass', 700), g = gain(0); lfo(0.31, 420, bp.frequency); lfo(7.3, 0.012, g.gain); src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(master); src.start(); L.water = g; }
    // pump: a slow throb
    { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 43; const g = gain(0), am = gain(0.5); lfo(3.1, 0.5, am.gain); o.connect(am); am.connect(g); g.connect(master); o.start(); L.pump = g; }
    // pad: soft chord tones that fade in and out, with a long echo
    { const g = gain(0), lp = filt('lowpass', 900), dly = ctx.createDelay(1.2), fb = gain(0.42); dly.delayTime.value = 0.61; lp.connect(g); lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(g); g.connect(master); L.pad = g; L.padIn = lp; }
    // drone: four rotors a few hertz apart (they beat against each other) with their overtones, and the air they move
    { const g = gain(0), lp = filt('lowpass', 1500, 0.6), wob = gain(1); L.droneO = [];
      for (const [mul, det, v] of [[1, -14, 0.34], [1, 9, 0.34], [1, 23, 0.3], [1, -31, 0.3], [2, 6, 0.2], [2, -11, 0.2], [3, 4, 0.1], [4, -7, 0.06]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 98 * mul; o.detune.value = det; const og = gain(v); o.connect(og); og.connect(lp); o.start(); L.droneO.push([o, mul]); }
      const src = noise(2, false), nb = filt('bandpass', 2600, 0.6), ng = gain(0.5); src.connect(nb); nb.connect(ng); ng.connect(wob); src.start(); L.droneN = ng; L.droneF = lp;
      lp.connect(wob); lfo(11.5, 0.1, wob.gain); wob.connect(g); g.connect(master); L.drone = g; }
    L.bubble = gain(0); L.bubble.connect(master);
    L.fx = gain(0.9); L.fx.connect(master);
  }
  const CHORDS = { day: [[146.83, 220, 293.66, 369.99, 440], [123.47, 185, 246.94, 293.66, 369.99], [98, 146.83, 196, 246.94, 293.66], [110, 164.81, 220, 277.18, 329.63]], deep: [[73.42, 110, 146.83, 174.61, 220], [65.41, 98, 130.81, 155.56, 196], [82.41, 123.47, 164.81, 196, 246.94]] };
  let ci = 0;
  function padNote() {
    if (!on) return; const set = scene === 'under' ? CHORDS.deep : CHORDS.day, ch = set[ci % set.length], t = ctx.currentTime;
    for (let k = 0; k < 2; k++) { const f = ch[Math.floor(Math.random() * ch.length)] * (Math.random() < 0.25 ? 2 : 1);
      for (const det of [-3, 4]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det; const g = gain(0); o.connect(g); g.connect(L.padIn);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 2.6); g.gain.linearRampToValueAtTime(0, t + 8.5); o.start(t); o.stop(t + 9); } }
    if (Math.random() < 0.3) ci++;
    timers.pad = setTimeout(padNote, 3200 + Math.random() * 2600);
  }
  function bubble() {
    if (!on) return;
    if (scene === 'hall' || scene === 'under' || scene === 'lab') { const t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0), f = (scene === 'under' ? 260 : 500) + Math.random() * 900; o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.09); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.13); o.connect(g); g.connect(L.bubble); o.start(t); o.stop(t + 0.16); }
    timers.bubble = setTimeout(bubble, 90 + Math.random() * (scene === 'under' ? 420 : scene === 'lab' ? 1400 : 340));
  }
  function gull() {
    if (!on) return;
    if (scene === 'outside' || scene === 'sea') { const t = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(1); if (pan.pan) pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(L.fx);
      for (let k = 0; k < n; k++) { const s = t + k * 0.34, o = ctx.createOscillator(), g = gain(0), f = 1500 + Math.random() * 500; o.type = 'sawtooth'; const bp = filt('bandpass', 2400, 3); o.frequency.setValueAtTime(f, s); o.frequency.linearRampToValueAtTime(f * 1.45, s + 0.08); o.frequency.exponentialRampToValueAtTime(f * 0.72, s + 0.3);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.012 * (scene === 'sea' ? 1.5 : 1), s + 0.04); g.gain.exponentialRampToValueAtTime(0.0004, s + 0.31); o.connect(bp); bp.connect(g); g.connect(pan); o.start(s); o.stop(s + 0.34); } }
    timers.gull = setTimeout(gull, 5000 + Math.random() * 11000);
  }
  // [sea, air, hum, water, pump, pad, bubble, tone]
  const MIX = { outside: [0.5, 0.03, 0, 0, 0, 0.5, 0, 18000], night: [0.42, 0.015, 0, 0, 0, 0.6, 0, 18000], sea: [0.78, 0.05, 0, 0, 0, 0.42, 0, 18000],
    hall: [0.04, 0.012, 0.05, 0.06, 0.015, 0.3, 0.5, 14000], lab: [0.02, 0.022, 0.03, 0, 0, 0.42, 0.14, 12000], visitor: [0.03, 0.014, 0.012, 0.012, 0, 0.6, 0.2, 14000],
    machines: [0.02, 0.02, 0.11, 0.02, 0.06, 0.2, 0, 10000], under: [0.3, 0, 0.03, 0, 0, 0.7, 0.8, 620] };
  function apply() {
    if (!ctx) return; const s = MIX[scene] || MIX.outside;
    ramp(L.sea.gain, s[0]); ramp(L.air.gain, s[1]); ramp(L.hum.gain, s[2]); ramp(L.water.gain, s[3]); ramp(L.pump.gain, s[4]); ramp(L.pad.gain, s[5]); ramp(L.bubble.gain, s[6]); ramp(L.tone.frequency, s[7], 0.9);
    L.airF.frequency.value = scene === 'lab' || scene === 'visitor' || scene === 'machines' ? 900 : 3200;
  }
  const burst = (dur, f0, f1, q, vol, type = 'bandpass') => { const t = ctx.currentTime, n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const src = ctx.createBufferSource(); src.buffer = buf; const bp = filt(type, f0, q), g = gain(0); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0006, t + dur); src.connect(bp); bp.connect(g); g.connect(L.fx); src.start(t); src.stop(t + dur + 0.02); };
  const tone = (f0, f1, dur, vol, type = 'sine', at = 0) => { const t = ctx.currentTime + at, o = ctx.createOscillator(), g = gain(0); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); o.connect(g); g.connect(L.fx); o.start(t); o.stop(t + dur + 0.02); };
  return {
    get on() { return on; },
    async toggle(v = !on) {
      if (v && !ctx) { try { build(); } catch { return false; } }
      if (!ctx) return false;
      on = v;
      for (const k in timers) clearTimeout(timers[k]);
      if (on) { await ctx.resume(); ramp(master.gain, 0.55, 1.5); apply(); padNote(); bubble(); timers.gull = setTimeout(gull, 2500); }
      else { ramp(master.gain, 0, 0.6); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 900); }
      return on;
    },
    scene(s) { scene = s; if (on) apply(); },
    /** any button: a soft wooden tap */
    click() { if (!on) return; burst(0.035, 2400, 1300, 1.4, 0.07); tone(540, 360, 0.07, 0.05, 'triangle'); },
    /** choosing a tank, a machine or a fish: two glassy notes */
    select() { if (!on) return; tone(784, 784, 0.16, 0.035); tone(1174.7, 1174.7, 0.22, 0.03, 'sine', 0.07); burst(0.02, 3200, 2600, 2, 0.03); },
    /** going in through a door or lifting a roof */
    whoosh() { if (!on) return; burst(0.7, 300, 1900, 0.9, 0.06); },
    /** going under water */
    splash() { if (!on) return; burst(0.5, 2600, 300, 0.6, 0.13, 'lowpass'); for (let k = 0; k < 7; k++) { const f = 300 + Math.random() * 700; tone(f, f * 2, 0.11, 0.035, 'sine', 0.12 + k * 0.07); } },
    blip() { this.click(); },
    /** the drone's rotors: on or off */
    drone(v) { if (!ctx) return; ramp(L.drone.gain, v ? 0.085 : 0, v ? 0.5 : 0.35); },
    /** how hard the rotors are working, 0 to 1: the note rises and the air gets louder */
    droneSet(k) { if (!ctx || !on) return; const t = ctx.currentTime, f = 92 + 96 * k; for (const [o, mul] of L.droneO) o.frequency.setTargetAtTime(f * mul, t, 0.09); L.droneN.gain.setTargetAtTime(0.35 + 0.9 * k, t, 0.12); L.droneF.frequency.setTargetAtTime(1200 + 1500 * k, t, 0.12); },
  };
}
