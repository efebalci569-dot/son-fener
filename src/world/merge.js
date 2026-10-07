// Statik meshleri malzeme + x-parçası bazında birleştirerek çizim çağrılarını azaltır.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const wp = new THREE.Vector3();
const inv = new THREE.Matrix4();

export function mergeStatic(root, skip = new Set(), chunk = 40) {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.transparent && o.renderOrder) return;
    for (let p = o; p && p !== root; p = p.parent) if (skip.has(p) || !p.visible) return;
    const g = o.geometry;
    const attrs = Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '|n');
    o.getWorldPosition(wp);
    const key = `${o.material.uuid}|${attrs}|${Math.floor(wp.x / chunk)}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, b = { mat: o.material, geos: [], meshes: [], cast: o.castShadow, recv: o.receiveShadow });
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    b.geos.push(g.clone().applyMatrix4(m));
    b.meshes.push(o);
  });
  let before = 0, after = 0;
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;
    const merged = mergeGeometries(b.geos, false);
    if (!merged) continue;
    for (const o of b.meshes) remove.push(o);
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    root.add(mesh);
    before += b.meshes.length; after++;
  }
  for (const o of remove) o.parent?.remove(o);
  return { before, after };
}
