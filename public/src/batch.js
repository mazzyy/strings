// Draw-call batching for the marionettes. A puppet is ~60 small parts that each
// move on their own (limbs, tail segments, wings), so they can't simply be
// merged. Instead every part becomes a "bone" of one skinned mesh per material:
// the skin code keeps moving the (now hidden) parts exactly as before, and each
// frame their transforms are copied into the bone matrices. The GPU does the
// rest, so ~60 draw calls per puppet become a handful, at no extra CPU cost.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const IDENTITY = new THREE.Matrix4();
const noRaycast = () => {};

export function batchParts(root, exclude = null) {
  const skip = new Set();
  for (const ex of [].concat(exclude || [])) ex?.traverse?.((o) => skip.add(o));
  const parts = [];
  root.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !skip.has(o) && !Array.isArray(o.material)) parts.push(o); });
  if (parts.length < 4) return null;

  const buckets = new Map();
  parts.forEach((o, i) => {
    o.geometry.computeBoundingSphere();
    // tiny parts (eyes, claws) cast no visible shadow, so they skip the shadow pass
    const cast = o.castShadow && o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) >= 0.01;
    const key = `${o.material.uuid}|${cast}|${o.receiveShadow}|${o.renderOrder}`;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, cast, receive: o.receiveShadow, order: o.renderOrder, items: [] });
    buckets.get(key).items.push(i);
  });

  // bones live outside the scene graph; their matrixWorld is written by hand
  const bones = parts.map(() => new THREE.Bone());
  const skeleton = new THREE.Skeleton(bones, parts.map(() => new THREE.Matrix4()));
  const meshes = [];
  for (const b of buckets.values()) {
    const geos = b.items.map((i) => {
      const src = parts[i].geometry;
      const g = src.index ? src.toNonIndexed() : src.clone();
      for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      g.morphAttributes = {};
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      const n = g.attributes.position.count;
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let v = 0; v < n; v++) { si[v * 4] = i; sw[v * 4] = 1; }
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.SkinnedMesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.order;
    mesh.frustumCulled = false;
    mesh.bindMode = THREE.DetachedBindMode;
    mesh.bind(skeleton, IDENTITY);
    mesh.raycast = noRaycast; // clicks hit the hidden original parts instead (they stay posed)
    root.add(mesh);
    meshes.push(mesh);
  }
  for (const o of parts) o.visible = false;

  const rootInv = new THREE.Matrix4();
  return {
    meshes,
    drawCallsSaved: parts.length - meshes.length,
    update() {
      root.updateMatrixWorld(true);
      rootInv.copy(root.matrixWorld).invert();
      for (let i = 0; i < parts.length; i++) bones[i].matrixWorld.multiplyMatrices(rootInv, parts[i].matrixWorld);
    },
  };
}
