// Draw-call reduction for Quest: merge every static mesh under a group into one
// mesh per material. Animated objects are passed in `skip` and left alone.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function mergeStatic(root, skip = []) {
  root.updateMatrixWorld(true);
  const skipSet = new Set();
  for (const o of skip) o?.traverse?.((c) => skipSet.add(c));
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skipSet.has(o)) return;
    if (Array.isArray(o.material)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    buckets.get(key).geos.push(g);
    victims.push(o);
  });
  if (victims.length < 2) return 0;
  for (const o of victims) o.parent.remove(o);
  let made = 0;
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.material);
    // merged meshes never move on their own: compute their matrix once
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    root.add(mesh);
    made++;
  }
  return victims.length - made;
}
