// Renderer, frame loop and automatic quality control.
import * as THREE from 'three';

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch { return false; }
}

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
    this.t = 0; this.last = 0; this.ema = 16.7; this.lastDprChange = 0; this.frames = 0;
    this._frame = this._frame.bind(this);
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => { this.last = 0; });
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
    // quality governor: hold 60 fps by trading resolution
    if (raw < 200) this.ema += (raw - this.ema) * 0.06;
    if (this.frames > 90 && now - this.lastDprChange > 1400 && !this.lockDpr) {
      if (this.ema > 21.5 && this.dpr > this.minDpr) { this.dpr = Math.max(this.minDpr, this.dpr - 0.25); this._applyDpr(now); }
      else if (this.ema < 12.5 && this.dpr < this.maxDpr && !this.noUp) { this.dpr = Math.min(this.maxDpr, this.dpr + 0.125); this._applyDpr(now); }
    }
  }
  _applyDpr(now) { this.lastDprChange = now; this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(this.w, this.h, false); this.ema = 16.7; }
}
