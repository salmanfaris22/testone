// Turns Microsoft Rocketbox avatars (FBX, MIT licence) into the small binary files the site loads.
// Runs in a browser page driven by tools/avatars/run.mjs, which serves the raw files at /rbraw/ and saves the results.
//   avatar  → <id>.bin : welded, quantised skinned mesh (53 body bones, face bones folded into the head) with UVs
//                        re-laid into one 1536 × 1024 atlas (body left, head top right, hair / helmet / scarf bottom right)
//   clips   → anims.bin: body-bone rotations sampled at a fixed rate, 16-bit, made to loop
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const loader = new FBXLoader();
const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const FACIAL = /Eye|Jaw|Tongue|Lip|lip|Mouth|Masseter|Caninus|Cheek|Eyebrow|Nose|Nub|Footsteps/;
const FINGER = /Finger/;
const short = (n) => n.replace(/^Bip0\d_?/, '') || 'Root';   // children are rigged as Bip02
export const ATLAS = [1536, 1024];

function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
/** JSON header + 4-byte aligned typed sections */
function pack(head, sections) {
  let off = 0; const lay = {};
  for (const [k, a] of Object.entries(sections)) { off = (off + 3) & ~3; lay[k] = [a.constructor.name, off, a.length]; off += a.byteLength; }
  const json = new TextEncoder().encode(JSON.stringify({ ...head, sections: lay })), hl = (json.length + 3) & ~3;
  const out = new Uint8Array(8 + hl + off); new DataView(out.buffer).setUint32(0, 0x31425641, true); new DataView(out.buffer).setUint32(4, hl, true);
  out.set(json, 8); for (let i = json.length; i < hl; i++) out[8 + i] = 32;
  for (const [k, a] of Object.entries(sections)) out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), 8 + hl + lay[k][1]);
  return out.buffer;
}

function regions(names) {
  const out = {}, extra = names.filter((n) => !/_body$|_head$/.test(n));
  for (const n of names) { if (/_body$/.test(n)) out[n] = [0, 0, 1024, 1024]; else if (/_head$/.test(n)) out[n] = [1024, 0, 512, 512]; }
  const h = Math.floor(512 / Math.max(1, extra.length)); extra.forEach((n, i) => { out[n] = [1024, 512 + i * h, 512, h]; });
  return out;
}

window.convertAvatar = async (url) => {
  const o = await load(url); o.updateMatrixWorld(true);
  const meshes = [], all = []; o.traverse((n) => { if (n.isSkinnedMesh) meshes.push(n); if (n.isBone) all.push(n); });
  const keep = all.filter((b) => !FACIAL.test(b.name)), idxOf = new Map(keep.map((b, i) => [b, i]));
  const nearest = (b) => { while (b && !idxOf.has(b)) b = b.parent; return b ? idxOf.get(b) : 0; };
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const bones = keep.map((b) => {
    const p = idxOf.has(b.parent) ? idxOf.get(b.parent) : -1;
    if (p < 0) { b.matrixWorld.decompose(_p, _q, _s); return { n: short(b.name), p, t: _p.toArray().map((v) => +(v * 0.01).toFixed(5)), q: _q.toArray().map((v) => +v.toFixed(6)) }; }
    return { n: short(b.name), p, t: b.position.toArray().map((v) => +(v * 0.01).toFixed(5)), q: b.quaternion.toArray().map((v) => +v.toFixed(6)) };
  });
  // every vertex in its rest place in the world (metres), with its material slot
  const SKIP = /stetoskop/;                                   // our lab staff are scientists, not doctors: no stethoscope
  const names = []; for (const m of meshes) for (const mt of Array.isArray(m.material) ? m.material : [m.material]) if (!names.includes(mt.name) && !SKIP.test(mt.name)) names.push(mt.name);
  const reg = regions(names), V = []; let wrapped = 0;
  const M = new THREE.Matrix4(), T = new THREE.Matrix4(), v = new THREE.Vector3(), n = new THREE.Vector3(), N3 = new THREE.Matrix3();
  for (const m of meshes) {
    const g = m.geometry, P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, sk = m.skeleton;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const BM = sk.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
    const post = new THREE.Matrix4().multiplyMatrices(m.matrixWorld, m.bindMatrixInverse), remap = sk.bones.map((b) => nearest(b));
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : P.count, materialIndex: 0 }];
    for (const gr of groups) {
      const r = reg[mats[gr.materialIndex].name]; if (!r) continue;
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        const i = g.index ? g.index.getX(k) : k;
        M.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); const w4 = [SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)], i4 = [SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)]; let ws = 0;
        for (let j = 0; j < 4; j++) { if (w4[j] <= 0) continue; ws += w4[j]; const e = BM[i4[j]].elements; for (let q = 0; q < 16; q++) M.elements[q] += e[q] * w4[j]; }
        if (ws > 0) for (let q = 0; q < 16; q++) M.elements[q] /= ws; else M.identity();
        T.multiplyMatrices(post, M).multiply(m.bindMatrix);
        v.fromBufferAttribute(P, i).applyMatrix4(T).multiplyScalar(0.01); N3.setFromMatrix4(T); n.fromBufferAttribute(Nn, i).applyMatrix3(N3).normalize();
        let u = U.getX(i), vv = U.getY(i); if (u < 0 || u > 1 || vv < 0 || vv > 1) { wrapped++; u -= Math.floor(u); vv -= Math.floor(vv); }
        u = Math.min(0.997, Math.max(0.003, u)); vv = Math.min(0.997, Math.max(0.003, vv));
        const au = (r[0] + u * r[2]) / ATLAS[0], av = 1 - (r[1] + (1 - vv) * r[3]) / ATLAS[1];
        // fold bones, keep the four strongest, weights as bytes that add up to 255
        const acc = new Map(); for (let j = 0; j < 4; j++) if (w4[j] > 0) { const b = remap[i4[j]]; acc.set(b, (acc.get(b) || 0) + w4[j] / ws); }
        const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((s, e) => s + e[1], 0) || 1; while (top.length < 4) top.push([0, 0]);
        const wb = top.map((e) => Math.round((e[1] / tot) * 255)); wb[0] += 255 - wb.reduce((s, x) => s + x, 0);
        V.push({ p: [v.x, v.y, v.z], n: [n.x, n.y, n.z], uv: [au, av], si: top.map((e) => e[0]), sw: wb });
      }
    }
  }
  // quantise and weld
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]; for (const a of V) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.p[k]); max[k] = Math.max(max[k], a.p[k]); }
  const seen = new Map(), pos = [], nor = [], uv = [], si = [], sw = [], idx = [];
  for (const a of V) {
    const qp = a.p.map((x, k) => Math.round(((x - min[k]) / (max[k] - min[k])) * 65535)), qn = a.n.map((x) => Math.max(-127, Math.min(127, Math.round(x * 127)))), qu = a.uv.map((x) => Math.round(x * 65535));
    const key = `${qp}|${qn}|${qu}|${a.si}|${a.sw}`; let id = seen.get(key);
    if (id === undefined) { id = pos.length / 3; seen.set(key, id); pos.push(...qp); nor.push(...qn, 0); uv.push(...qu); si.push(...a.si); sw.push(...a.sw); }
    idx.push(id);
  }
  const nv = pos.length / 3;
  const head = { kind: 'avatar', verts: nv, tris: idx.length / 3, min: min.map((x) => +x.toFixed(5)), max: max.map((x) => +x.toFixed(5)), bones, slots: names.map((nm) => ({ name: nm, region: reg[nm] })), atlas: ATLAS };
  const bin = pack(head, { pos: new Uint16Array(pos), nor: new Int8Array(nor), uv: new Uint16Array(uv), si: new Uint8Array(si), sw: new Uint8Array(sw), idx: nv > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) });
  return { b64: b64(bin), bytes: bin.byteLength, verts: nv, tris: idx.length / 3, raw: V.length, wrapped, height: +(max[1] - min[1]).toFixed(3), slots: head.slots, bones: bones.length, meshes: meshes.map((m) => m.name) };
};

/** clips: [{ name, url }] → one file. Body bones only; fingers get one resting pose per clip. */
window.convertAnims = async (list) => {
  const clips = [], order = null; let names = null, fingers = null; const Q = [], R = [], F = [];
  const q = new THREE.Quaternion(), q0 = new THREE.Quaternion();
  for (const { name, url, fps: wantFps } of list) {
    const o = await load(url), src = o.animations.slice().sort((a, b) => b.duration - a.duration)[0], clip = { tracks: src.tracks, duration: Math.min(src.duration, 12) };   // long takes: the first 12 s are enough
    const bones = []; o.traverse((n) => { if (n.isBone && !FACIAL.test(n.name)) bones.push(n); });
    const body = bones.filter((b) => !FINGER.test(b.name)), fing = bones.filter((b) => FINGER.test(b.name));
    if (!names) { names = body.map((b) => short(b.name)); fingers = fing.map((b) => short(b.name)); }
    const track = (b, prop) => clip.tracks.find((t) => t.name === `${b.name}.${prop}`);
    const fps = wantFps || (/walk/.test(name) ? 30 : 15), n = Math.max(2, Math.round(clip.duration * fps)), dur = n / fps;
    const frames = [], roots = []; const rootT = track(bones.find((b) => short(b.name) === 'Root'), 'position');
    const ip = names.map((nm) => { const b = body.find((x) => short(x.name) === nm), t = b && track(b, 'quaternion'); return t ? t.createInterpolant() : null; }), rest = names.map((nm) => { const b = body.find((x) => short(x.name) === nm); return b ? b.quaternion.toArray() : [0, 0, 0, 1]; });
    const rip = rootT ? rootT.createInterpolant() : null;
    for (let k = 0; k < n; k++) {
      const t = Math.min(clip.duration, (k / n) * clip.duration), fr = [];
      for (let j = 0; j < names.length; j++) { const r = ip[j] ? ip[j].evaluate(t) : rest[j]; fr.push(r[0], r[1], r[2], r[3]); }
      frames.push(fr); const rp = rip ? rip.evaluate(t) : [0, 90, 0]; roots.push([rp[0], rp[1], rp[2]]);
    }
    // a walk carries the body forward: take that steady travel out (it comes back as `stride`, so feet never slide)
    let stride = 0;
    if (/walk/.test(name)) { const dx = ((roots[n - 1][0] - roots[0][0]) * n) / (n - 1), dz = ((roots[n - 1][2] - roots[0][2]) * n) / (n - 1); stride = dz; for (let k = 0; k < n; k++) { roots[k][0] -= (dx * k) / n; roots[k][2] -= (dz * k) / n; } }
    // make it loop: ease the last frames into the first one
    const blend = Math.min(Math.floor(n / 4), Math.round(fps * 0.5));
    for (let k = 0; k < blend; k++) {
      const w = (k + 1) / (blend + 1), fr = frames[n - blend + k], f0 = frames[0];
      for (let j = 0; j < names.length; j++) { q.fromArray(fr, j * 4); q0.fromArray(f0, j * 4); q.slerp(q0, w * w * (3 - 2 * w)); q.toArray(fr, j * 4); }
      const rp = roots[n - blend + k]; for (let c = 0; c < 3; c++) rp[c] += (roots[0][c] - rp[c]) * w * w * (3 - 2 * w);
    }
    // root: height as a share of the standing height, sideways drift about its mean
    const ref = name.startsWith('f_') ? 91.9 : 89.5; /* standing hip height of the female and male animation rigs, cm */ let mx = 0, mz = 0; for (const r of roots) { mx += r[0] / n; mz += r[2] / n; }
    let ymin = 1e9, ymax = -1e9, xr = 0, zr = 0; for (const r of roots) { ymin = Math.min(ymin, r[1]); ymax = Math.max(ymax, r[1]); xr = Math.max(xr, Math.abs(r[0] - mx)); zr = Math.max(zr, Math.abs(r[2] - mz)); }
    const off = Q.length;
    for (const fr of frames) { for (let j = 0; j < names.length; j++) { q.fromArray(fr, j * 4).normalize(); Q.push(Math.round(q.x * 32767), Math.round(q.y * 32767), Math.round(q.z * 32767), Math.round(q.w * 32767)); } }
    const roff = R.length; for (const r of roots) R.push((r[0] - mx) / ref, r[1] / ref, (r[2] - mz) / ref);
    const foff = F.length; for (const nm of fingers) { const b = fing.find((x) => short(x.name) === nm), t = b && track(b, 'quaternion'), r = t ? t.createInterpolant().evaluate(Math.min(clip.duration, 0.5)) : b ? b.quaternion.toArray() : [0, 0, 0, 1]; q.fromArray(r).normalize(); F.push(Math.round(q.x * 32767), Math.round(q.y * 32767), Math.round(q.z * 32767), Math.round(q.w * 32767)); }
    clips.push({ name, dur: +dur.toFixed(4), fps, n, off, roff, foff, stride: +(stride / ref).toFixed(4), src: +clip.duration.toFixed(3), y: [+(ymin).toFixed(1), +(ymax).toFixed(1)], drift: [+xr.toFixed(1), +zr.toFixed(1)] });
  }
  const bin = pack({ kind: 'anims', bones: names, fingers, clips }, { q: new Int16Array(Q), root: new Float32Array(R), fq: new Int16Array(F) });
  return { b64: b64(bin), bytes: bin.byteLength, clips, bones: names.length, fingers: fingers.length };
};
