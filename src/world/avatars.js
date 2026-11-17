// Real people: rigged, textured figures from the Microsoft Rocketbox library (MIT licence, see public/people/).
// Each kind is one small binary (mesh + skeleton) and one atlas picture; all share one file of animation clips.
// Files are fetched the first time someone of that kind comes close to the camera.
import * as THREE from 'three';

const BASE = `${import.meta.env.BASE_URL}people/`;
const FEMALE = new Set(['lab_f', 'coat_f', 'hivis_f', 'office_f', 'visitor_f', 'abaya', 'child_f']);
/** figures made from another one's files: the library's Gulf figure wears a red shemagh, an Emirati wears a white ghutra */
const ALIAS = { kandura_ae: { file: 'kandura', ghutra: true } };
/** what someone wears → the figures that may play them */
export const CAST = {
  gown: ['gown_m', 'scrub_m', 'gown_m', 'lab_f'], lab: ['coat_f', 'coat_m', 'lab_f'], overall: ['overall_m'], hivis: ['hivis_m', 'hivis_f', 'hivis_m'],
  office: ['office_m', 'office_f'], kandura: ['kandura_ae'], emirati: ['kandura_ae'], abaya: ['abaya'], host: ['kandura_ae'],
  visitor: ['visitor_m', 'visitor_f'], child: ['child_m', 'child_f'], guard: ['guard'],
};
/** the shemagh in the kandura atlas (lower right) turned into a plain white ghutra; the folds keep their shading */
function whiten(img) {
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const x0 = Math.floor((1030 / 1536) * img.width), y0 = Math.floor((546 / 1024) * img.height), w = img.width - x0, h = img.height - y0;
  const d = g.getImageData(x0, y0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; const m = Math.max(p[i], p[i + 1], p[i + 2]) * 0.97 + 4; p[i] = Math.min(255, m * 0.985); p[i + 1] = Math.min(255, m * 0.99); p[i + 2] = Math.min(255, m); }
  g.putImageData(d, x0, y0); return cv;
}
/** what they are doing → clips to choose from (without the m_ / f_ prefix) */
const DO = {
  walk: ['walk_neutral'], stroll: ['walk_stroll_01'], work: ['work_mid', 'work_table', 'documents_check', 'work_mid'], idle: ['idle_neutral_01', 'idle_look_around_01', 'cell_phone_textmessage', 'idle_neutral_01'],
  talk: ['gestic_talk_neutral_01'], sit: ['sit_chair_idle_neutral_01'], desk: ['sit_table_idle_neutral_01'], present: ['gestic_presentation_right_01'], check: ['documents_check'], watch: ['idle_look_around_01', 'idle_neutral_01'],
};

function unpack(buf) {
  const dv = new DataView(buf), hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl))), base = 8 + hl, out = { head };
  for (const [k, [type, off, len]] of Object.entries(head.sections)) out[k] = new globalThis[type](buf, base + off, len);
  return out;
}

export const avatars = {
  cam: null, env: null, on: true, budget: 40, range: 150, shown: 0, anims: null, types: new Map(), _want: new Set(), _loading: false,
  init(world) {
    this.cam = world.camera; this.env = world.env; this.engine = world.engine;
    const low = world.engine.tier === 'low'; this.budget = low ? 16 : 44; this.rangeMax = low ? 70 : 150; this.range = this.rangeMax;
    world.updaters.unshift(() => { // keep the number of skinned figures inside the budget by pulling the swap distance in or out
      if (this.shown > this.budget) this.range = Math.max(18, this.range * 0.93); else if (this.shown < this.budget * 0.8) this.range = Math.min(this.rangeMax, this.range * 1.03);
      this.shown = 0;
    });
  },
  /** ask for a kind; returns it once it is ready (null until then) */
  type(id) {
    const t = this.types.get(id); if (t) return t.ready ? t : null;
    this.types.set(id, { ready: false }); this._load(id); return null;
  },
  async _load(id) {
    try {
      if (!this.anims) this.anims = this._anims || (this._anims = fetch(`${BASE}anims.bin`).then((r) => r.arrayBuffer()).then((b) => { const a = unpack(b); a.by = {}; a.head.clips.forEach((c) => { a.by[c.name] = c; }); return a; }));
      const al = ALIAS[id] || {}, file = al.file || id;
      const [A, buf] = await Promise.all([this.anims, fetch(`${BASE}${file}.bin`).then((r) => r.arrayBuffer())]); this.anims = A;
      const d = unpack(buf), h = d.head, n = h.verts, pos = new Float32Array(n * 3), nor = new Int8Array(n * 3);
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = h.min[k] + (d.pos[i * 3 + k] / 65535) * (h.max[k] - h.min[k]); nor[i * 3 + k] = d.nor[i * 4 + k]; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true)); geo.setAttribute('uv', new THREE.BufferAttribute(d.uv.slice(), 2, true));
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(d.si), 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(d.sw.slice(), 4, true)); geo.setIndex(new THREE.BufferAttribute(d.idx.slice(), 1));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.3);
      const map = al.ghutra ? new THREE.CanvasTexture(whiten(await new THREE.ImageLoader().loadAsync(`${BASE}${file}.webp`))) : await new THREE.TextureLoader().loadAsync(`${BASE}${file}.webp`);
      map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.86, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.55 });
      // rest pose in model space → inverse bind matrices, shared by everyone of this kind
      const bones = h.bones, world = [], inv = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      bones.forEach((b, i) => { m.compose(p.fromArray(b.t), q.fromArray(b.q), one); world[i] = b.p >= 0 ? world[b.p].clone().multiply(m) : m.clone(); inv[i] = world[i].clone().invert(); });
      const A2 = A.head, map2 = A2.bones.map((nm) => bones.findIndex((b) => b.n === nm)), fmap = A2.fingers.map((nm) => bones.findIndex((b) => b.n === nm));
      Object.assign(this.types.get(id), { id, ready: true, geo, mat, bones, inv, map: map2, fmap, rootY: bones[0].t[1], female: FEMALE.has(id), height: h.max[1] - h.min[1] });
    } catch (e) { console.warn('avatar', id, e); this.types.delete(id); }
  },
  /** a speck-sized rigged figure with the same kind of surface as every person, never shown: the page compiles its shader under the
   *  loader and world.warm draws it once, so the first real person to walk into view does not stall the frame while that is done */
  standIn(scene) {
    const geo = new THREE.BoxGeometry(0.01, 0.01, 0.01), n = geo.attributes.position.count, sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) sw[i * 4] = 1;
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    const tex = new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.55 });
    const bone = new THREE.Bone(), mesh = new THREE.SkinnedMesh(geo, mat); mesh.add(bone); mesh.bind(new THREE.Skeleton([bone]), new THREE.Matrix4());
    mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = false; mesh.visible = false; mesh.name = 'avatar-stand-in'; mesh.position.set(-40, -3, 60);
    scene.add(mesh); return mesh;
  },
  /** one person: their own bones, the shared mesh */
  spawn(T, cast = true) {
    const bones = T.bones.map((b) => { const o = new THREE.Bone(); o.name = b.n; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); return o; });
    T.bones.forEach((b, i) => { if (b.p >= 0) bones[b.p].add(bones[i]); });
    const root = new THREE.Group(), mesh = new THREE.SkinnedMesh(T.geo, T.mat); mesh.layers.set(1); root.add(bones[0], mesh);      // (layer 1: the main camera sees them, the wheel bath's mirror does not, so it never has to prepare them mid-film)
    mesh.bind(new THREE.Skeleton(bones, T.inv), new THREE.Matrix4()); mesh.frustumCulled = false; mesh.castShadow = cast; mesh.receiveShadow = false;
    return { T, root, mesh, bones, cur: new Float32Array(T.map.length * 4), from: new Float32Array(T.map.length * 4), fade: 1, clip: null, ph: 0, rx: 0, ry: 1, rz: 0, fy: 1 };
  },
  clipFor(T, act, k = 0) { const list = DO[act] || DO.idle, A = this.anims; return A.by[`${T.female ? 'f' : 'm'}_${list[Math.floor(k * list.length) % list.length]}`] || A.by[`m_${list[0]}`]; },
  /**
   * move one person's bones. `clip` plays at `rate` (walks: metres travelled this frame instead, so feet stay planted).
   * A change of clip is eased in over a third of a second from wherever the body was.
   */
  pose(a, clip, dt, travel = -1, scale = 1) {
    const A = this.anims, T = a.T, nb = T.map.length, Q = A.q, cur = a.cur;
    if (clip !== a.clip) { a.from.set(cur); a.fade = a.clip ? 0 : 1; a.clip = clip; if (!clip.stride) a.ph = (a.seed || 0) % 1; const F = A.fq, fo = clip.foff; T.fmap.forEach((bi, j) => { if (bi >= 0) a.bones[bi].quaternion.set(F[fo + j * 4], F[fo + j * 4 + 1], F[fo + j * 4 + 2], F[fo + j * 4 + 3]).normalize(); }); }
    a.ph += clip.stride && travel >= 0 ? travel / (clip.stride * T.rootY * scale) : dt / clip.dur; a.ph -= Math.floor(a.ph);
    const f = a.ph * clip.n, i0 = Math.floor(f) % clip.n, i1 = (i0 + 1) % clip.n, k = f - Math.floor(f), o0 = clip.off + i0 * nb * 4, o1 = clip.off + i1 * nb * 4;
    if (a.fade < 1) a.fade = Math.min(1, a.fade + dt / 0.35); const w = a.fade * a.fade * (3 - 2 * a.fade), fr = a.from;
    for (let j = 0; j < nb; j++) {
      const p = j * 4; let x0 = Q[o0 + p], y0 = Q[o0 + p + 1], z0 = Q[o0 + p + 2], w0 = Q[o0 + p + 3]; const x1 = Q[o1 + p], y1 = Q[o1 + p + 1], z1 = Q[o1 + p + 2], w1 = Q[o1 + p + 3];
      const s = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1 < 0 ? -k : k, ik = 1 - k; x0 = x0 * ik + x1 * s; y0 = y0 * ik + y1 * s; z0 = z0 * ik + z1 * s; w0 = w0 * ik + w1 * s;
      let l = 1 / Math.hypot(x0, y0, z0, w0); x0 *= l; y0 *= l; z0 *= l; w0 *= l;
      if (w < 1) { const fx = fr[p], fyy = fr[p + 1], fz = fr[p + 2], fw = fr[p + 3], sg = fx * x0 + fyy * y0 + fz * z0 + fw * w0 < 0 ? -1 : 1, iw = (1 - w) * sg; x0 = fx * iw + x0 * w; y0 = fyy * iw + y0 * w; z0 = fz * iw + z0 * w; w0 = fw * iw + w0 * w; l = 1 / Math.hypot(x0, y0, z0, w0); x0 *= l; y0 *= l; z0 *= l; w0 *= l; }
      cur[p] = x0; cur[p + 1] = y0; cur[p + 2] = z0; cur[p + 3] = w0; const bi = T.map[j]; if (bi >= 0) a.bones[bi].quaternion.set(x0, y0, z0, w0);
    }
    const R = A.root, r0 = clip.roff + i0 * 3, r1 = clip.roff + i1 * 3, H = T.rootY;
    const rx = R[r0] + (R[r1] - R[r0]) * k, ry = R[r0 + 1] + (R[r1 + 1] - R[r0 + 1]) * k, rz = R[r0 + 2] + (R[r1 + 2] - R[r0 + 2]) * k, e = Math.min(1, dt * 9);
    a.rx += (rx - a.rx) * e; a.ry += (ry - a.ry) * e; a.rz += (rz - a.rz) * e;
    a.bones[0].position.set(a.rx * H, a.ry * H, a.rz * H);
  },
};
