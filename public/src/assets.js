// Loads the CC0 assets (Poly Haven): one HDRI for image-based lighting and
// three wood texture sets. Everything degrades gracefully if a file is missing.
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const BASE = new URL("../assets/", import.meta.url).href;

function loadTex(loader, url, srgb) {
  return new Promise((resolve) => {
    loader.load(url, (t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      resolve(t);
    }, undefined, () => resolve(null));
  });
}

async function woodSet(loader, name) {
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTex(loader, `${BASE}tex/${name}_diff.jpg`, true),
    loadTex(loader, `${BASE}tex/${name}_nor.jpg`, false),
    loadTex(loader, `${BASE}tex/${name}_rough.jpg`, false),
  ]);
  return { map, normalMap, roughnessMap };
}

// clone a texture set with its own repeat (textures share the image)
export function withRepeat(set, rx, ry, rot = 0) {
  const out = {};
  for (const [k, t] of Object.entries(set || {})) {
    if (!t) continue;
    const c = t.clone();
    c.repeat.set(rx, ry);
    c.rotation = rot;
    c.needsUpdate = true;
    out[k] = c;
  }
  return out;
}

export async function loadAssets(renderer, onProgress = () => {}) {
  const loader = new THREE.TextureLoader();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envP = new Promise((resolve) => {
    new RGBELoader().load(`${BASE}hdri/reading_room_1k.hdr`, (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      resolve(env);
    }, undefined, () => resolve(null));
  });
  let done = 0;
  const tick = (p) => p.then((v) => { onProgress(++done / 4); return v; });
  const [env, stagefloor, desk, walnut] = await Promise.all([
    tick(envP), tick(woodSet(loader, "stagefloor")), tick(woodSet(loader, "desk")), tick(woodSet(loader, "walnut")),
  ]);
  pmrem.dispose();
  return { env, tex: { stagefloor, desk, walnut } };
}
