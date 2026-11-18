// Renderer, frame loop and automatic quality control.
import * as THREE from 'three';

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch { return false; }
}

const median = (a, tmp) => { tmp.length = 0; for (const v of a) tmp.push(v); tmp.sort((x, y) => x - y); return tmp[tmp.length >> 1] || 0; };

export class Engine {
  constructor(parent) {
    const coarse = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 820;
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    this.coarse = coarse;
    this.tier = coarse || mem <= 4 || cores <= 4 ? 'low' : 'high';
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0xd6e9f5, 1);
    // reading a shader's compile log makes the page wait for the graphics driver: only worth it while developing
    renderer.debug.checkShaderErrors = !!import.meta.env.DEV;
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.canvas.className = 'gl';
    parent.appendChild(this.canvas);
    this.parent = parent;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 2, 12000);
    this.view = { scene: this.scene, camera: this.camera };

    this.maxDpr = Math.min(window.devicePixelRatio || 1, this.tier === 'low' ? 1.5 : 1.75);   // above this the gain is invisible and the cost is not
    this.minDpr = this.tier === 'low' ? 0.8 : 1;
    this.dpr = this.maxDpr;
    this.w = 1; this.h = 1;
    this.tasks = [];
    this.running = false; this.active = true; this.shadowDirty = true;
    this.t = 0; this.last = 0; this.lastDprChange = 0; this.frames = 0;
    // the governor's memory: recent frame intervals, a spell of work it should not judge by, and how sharp it may go
    this.win = []; this._tmp = []; this.holdUntil = 0; this.calmSince = 0; this.ceil = this.maxDpr; this.ceilUntil = 0; this.probe = 0; this.lastUp = -1e9;
    this._frame = this._frame.bind(this);
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => { this.last = 0; this.win.length = 0; });
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    this.canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.shadowDirty = true; });
  }
  onFrame(fn) { this.tasks.push(fn); return () => { const i = this.tasks.indexOf(fn); if (i >= 0) this.tasks.splice(i, 1); }; }
  resize() {
    const w = this.parent.clientWidth || innerWidth, h = this.parent.clientHeight || innerHeight;
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    for (const cam of [this.camera, this.altCamera]) if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    this.shadowDirty = true;
    this.onResize && this.onResize(w, h);
  }
  setActive(v) { if (this.active === v) return; this.active = v; this.last = 0; if (v && this.running) requestAnimationFrame(this._frame); }
  start() { if (this.running) return; this.running = true; this.last = 0; requestAnimationFrame(this._frame); }
  stop() { this.running = false; }
  /** may the resolution go up now? (world.js: only when the camera is at rest and nobody is scrolling) */
  mayChange() { return true; }
  /** known heavy work is coming (building an inside, a first upload): the governor does not judge the next `ms` by it */
  hold(ms = 400) { this.holdUntil = Math.max(this.holdUntil, performance.now() + ms); }
  _frame(now) {
    if (!this.running || !this.active) return;
    requestAnimationFrame(this._frame);
    if (document.hidden || this.lost) { this.last = 0; return; }
    const raw = this.last ? now - this.last : 16.7; this.last = now;
    const dt = Math.min(0.05, raw / 1000);
    this.t += dt; this.frames++;
    for (let i = 0; i < this.tasks.length; i++) this.tasks[i](dt, this.t);
    if (this.shadowDirty) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    this.renderer.render(this.view.scene, this.view.camera);
    this._govern(now, raw);
  }
  /**
   * The quality governor: hold 60 frames a second by trading resolution, and win the sharpness back when there is room again.
   * It goes by the median of the last 40 frames, so a single slow frame (an inside being built, a picture uploaded) never
   * costs resolution; only a steady slowdown does. A change of resolution is itself a stall (the browser makes the canvas
   * anew: 60 to 150 ms at 2.5k), so it is done seldom and never in the first seconds. A step up waits for a calm moment
   * (mayChange: the camera at rest, nobody scrolling) after 12 calm seconds, at most one every 30 seconds, and if it proves
   * one step too many the governor steps back and stays there for five minutes. (The graphics card's own timer is no guide:
   * on Apple chips it reads double.) A 120 Hz screen is not chased: 60 sharp frames a second look better than 120 soft ones.
   */
  _govern(now, raw) {
    const W = this.win;
    if (now < this.holdUntil || raw > 250) { W.length = 0; this.calmSince = 0; return; }
    W.push(raw); if (W.length > 40) W.shift();
    if (W.length < 40 || this.frames < 200 || this.lockDpr || now - this.lastDprChange < 2500) return;
    const med = median(W, this._tmp);
    if (med > 21.5) {
      this.calmSince = 0;
      if (this.dpr <= this.minDpr) return;
      if (this.probe && now - this.probe < 5000) { this.ceil = this.dpr - 0.125; this.ceilUntil = now + 300000; }      // the last step up was one too many
      this.probe = 0; this._setDpr(this.dpr - (med > 30 ? 0.25 : 0.125), now); return;
    }
    if (!this.calmSince) this.calmSince = now;
    if (this.noUp || this.dpr >= this.maxDpr || now - this.calmSince < 12000 || now - this.lastUp < 30000 || !this.mayChange()) return;
    const up = Math.min(this.maxDpr, this.dpr + 0.125);
    if (up <= this.ceil || now > this.ceilUntil) { this.probe = this.lastUp = now; this._setDpr(up, now); }
  }
  _setDpr(v, now) { this.dpr = Math.min(this.maxDpr, Math.max(this.minDpr, Math.round(v * 8) / 8)); this._applyDpr(now); }
  _applyDpr(now) {
    this.lastDprChange = now; this.calmSince = 0; this.win.length = 0;
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(this.w, this.h, false); this.shadowDirty = true;
    this.onResize && this.onResize(this.w, this.h);                      // sprites sized in metres follow the new pixel count
  }
}
