// Ambient sound made in the browser, no audio files: sea wash, a slow pad, hall hum and bubbles.
export function createAudio() {
  let ctx = null, master, layers = {}, on = false, scene = 'outside', bubbleTimer = null, padTimer = null;
  const noise = (seconds, brown) => {
    const n = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w * 0.5; } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
  };
  const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const ramp = (p, v, t = 1.2) => { p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t / 3); };
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = gain(0); master.connect(ctx.destination);
    // sea: brown noise through a slowly breathing low-pass
    { const src = noise(6, true), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; const g = gain(0.5);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = gain(300); lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.13; const lg2 = gain(0.22); lfo2.connect(lg2); lg2.connect(g.gain); lfo2.start();
      src.connect(lp); lp.connect(g); g.connect(master); src.start(); layers.sea = g; layers.seaBase = 0.5; }
    // air: thin high noise
    { const src = noise(4, false), hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.4; const g = gain(0.03); src.connect(hp); hp.connect(g); g.connect(master); src.start(); layers.air = g; }
    // hall hum
    { const g = gain(0); for (const [f, v] of [[50, 0.5], [100, 0.22], [150.3, 0.08]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = gain(v); o.connect(og); og.connect(g); o.start(); }
      const src = noise(3, true), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240; bp.Q.value = 0.7; const ng = gain(0.5); src.connect(bp); bp.connect(ng); ng.connect(g); src.start();
      g.connect(master); layers.hum = g; }
    // pad: soft chord tones that fade in and out
    { const g = gain(0.5), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const dly = ctx.createDelay(1.2); dly.delayTime.value = 0.61; const fb = gain(0.42); lp.connect(g); lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(g); g.connect(master); layers.pad = g; layers.padIn = lp; }
    layers.bubble = gain(0); layers.bubble.connect(master);
  }
  const CHORDS = [[146.83, 220, 293.66, 369.99, 440], [123.47, 185, 246.94, 293.66, 369.99], [98, 146.83, 196, 246.94, 293.66], [110, 164.81, 220, 277.18, 329.63]];
  let ci = 0;
  function padNote() {
    if (!on) return; const ch = CHORDS[ci % CHORDS.length], t = ctx.currentTime;
    for (let k = 0; k < 2; k++) { const f = ch[Math.floor(Math.random() * ch.length)] * (Math.random() < 0.25 ? 2 : 1);
      for (const det of [-3, 4]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det; const g = gain(0); o.connect(g); g.connect(layers.padIn);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 2.6); g.gain.linearRampToValueAtTime(0, t + 8.5); o.start(t); o.stop(t + 9); } }
    if (Math.random() < 0.3) ci++;
    padTimer = setTimeout(padNote, 3200 + Math.random() * 2600);
  }
  function bubble() {
    if (!on) return;
    if (scene === 'hall' || scene === 'under') { const t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0), f = 500 + Math.random() * 900; o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.09); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.13); o.connect(g); g.connect(layers.bubble); o.start(t); o.stop(t + 0.16); }
    bubbleTimer = setTimeout(bubble, 90 + Math.random() * (scene === 'under' ? 500 : 340));
  }
  function apply() {
    if (!ctx) return;
    const s = { outside: [0.5, 0.03, 0, 0.5, 0], hall: [0.1, 0.01, 0.07, 0.32, 0.5], sea: [0.75, 0.05, 0, 0.45, 0], under: [0.16, 0, 0.02, 0.6, 0.8], night: [0.42, 0.015, 0, 0.6, 0] }[scene] || [0.5, 0.03, 0, 0.5, 0];
    ramp(layers.sea.gain, s[0]); ramp(layers.air.gain, s[1]); ramp(layers.hum.gain, s[2]); ramp(layers.pad.gain, s[3]); ramp(layers.bubble.gain, s[4]);
  }
  return {
    get on() { return on; },
    async toggle(v = !on) {
      if (v && !ctx) { try { build(); } catch { return false; } }
      if (!ctx) return false;
      on = v;
      if (on) { await ctx.resume(); ramp(master.gain, 0.55, 1.5); apply(); clearTimeout(padTimer); clearTimeout(bubbleTimer); padNote(); bubble(); }
      else { ramp(master.gain, 0, 0.6); clearTimeout(padTimer); clearTimeout(bubbleTimer); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 900); }
      return on;
    },
    scene(s) { scene = s; if (on) apply(); },
    blip() { if (!on) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0); o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.06); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.18); },
  };
}
