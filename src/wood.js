// Carved wood, and Twig, the wooden boy.
//
// woodMat(): real wood grain on any part. It uses the CC0 walnut veneer photo
// (pores, figure and a normal map) as a grey "grain" layer, tinted to any wood
// (pine, beech, walnut stain) or to paint laid over wood, where the grain still
// shows faintly through. Each part's UVs are re-laid by grainUV() so the grain
// runs along the length of a limb, the nose, the bench top, as a carver's would.
// A standard material with a small shader patch, so it looks the same in the
// headset (the XR quality switch only swaps physical materials).
//
// twigSkin(): a jointed marionette carved from pine: dowel joints, painted
// clothes, painted eyes and cheeks, a sugarloaf cap, and a nose that grows when
// he fibs (extra.fib / extra.truth), sprouting a leafy twig when it gets long.
import * as THREE from "three";
import { humanoidSkin } from "./cast.js";

const TILE = 0.3; // metres of real wood across one tile of the grain texture
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// lay a geometry's UVs so the grain (the texture's x) runs along its length (v),
// at real-world scale: lenM is the part's length, aroundM its girth
export function grainUV(geo, lenM, aroundM, { flip = false } = {}) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  const ox = rnd() * 4, oy = rnd() * 4;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (flip) uv.setXY(i, ox + u * lenM / TILE, oy + v * aroundM / TILE);
    else uv.setXY(i, ox + v * lenM / TILE, oy + u * aroundM / TILE);
  }
  uv.needsUpdate = true;
  return geo;
}

// UVs for a box, so the grain runs along one axis ("x", "y" or "z") on every side
export function boxGrain(geo, axis = "x") {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  const ox = rnd() * 4, oy = rnd() * 4, A = "xyz".indexOf(axis);
  const get = [(i) => pos.getX(i), (i) => pos.getY(i), (i) => pos.getZ(i)];
  for (let i = 0; i < uv.count; i++) {
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const face = n.indexOf(Math.max(...n));
    // along the grain on the face's own plane; the other in-plane axis across it
    const along = face === A ? (A + 1) % 3 : A, across = [0, 1, 2].find((k) => k !== face && k !== along);
    uv.setXY(i, ox + get[along](i) / TILE, oy + get[across](i) / TILE);
  }
  uv.needsUpdate = true;
  return geo;
}

// the end of a log: growth rings, a little wobbly and off-centre, bark, and drying cracks
let ringTex = null;
export function endGrainTexture() {
  if (ringTex) return ringTex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const g = cv.getContext("2d"), R = 128;
  g.fillStyle = "#5a3a22"; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#e2b47a"; g.beginPath(); g.arc(R, R, R * 0.9, 0, Math.PI * 2); g.fill();
  for (let r = R * 0.86; r > 3; r -= 4.5 + Math.sin(r * 0.37) * 1.6) {
    g.strokeStyle = `rgba(120,70,30,${0.28 + 0.2 * Math.abs(Math.sin(r))})`; g.lineWidth = 1.2 + Math.abs(Math.sin(r * 0.2)) * 1.4;
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) { const rr = r * (1 + 0.035 * Math.sin(a * 3 + r * 0.05)); const x = R + 6 + Math.cos(a) * rr * (1 - (r / R) * 0.04), y = R - 4 + Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = "rgba(60,30,10,0.5)"; g.lineWidth = 1.5;
  for (const a of [0.4, 2.2, 4.1]) { g.beginPath(); g.moveTo(R + 6, R - 4); g.lineTo(R + Math.cos(a) * R * 0.75, R + Math.sin(a) * R * 0.75); g.stroke(); }
  ringTex = new THREE.CanvasTexture(cv); ringTex.colorSpace = THREE.SRGBColorSpace; ringTex.anisotropy = 4;
  return ringTex;
}

// a wood (or paint-over-wood) material. contrast: how strongly the grain shows
// (natural wood ~1.6, a coat of paint ~0.4); normal: how deep the pores feel
const mats = new Map();
export function woodMat(assets, { color = 0xd9a066, contrast = 1.6, rough = 0.5, normal = 0.6, side = THREE.FrontSide } = {}) {
  const key = `${color}|${contrast}|${rough}|${normal}|${side}`;
  if (mats.has(key)) return mats.get(key);
  const t = assets?.tex?.walnut || {};
  const m = new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: 0, side,
    map: t.map || null, normalMap: t.normalMap || null, roughnessMap: t.roughnessMap || null,
    normalScale: new THREE.Vector2(normal, -normal),
  });
  m.userData.wood = true;
  // the photo is a grey veneer: use its lights and darks as the grain, around the tint
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGrain = { value: contrast };
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", "uniform float uGrain;\nvoid main() {")
      .replace("#include <map_fragment>", `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  float wl = dot( sampledDiffuseColor.rgb, vec3( 0.3333 ) );
  diffuseColor.rgb *= clamp( 1.0 + ( wl - 0.2 ) * uGrain * 4.5, 0.2, 2.2 );
#endif`);
  };
  mats.set(key, m);
  return m;
}

// ---------------------------------------------------------------------------
// Twig: a jointed pine marionette with painted clothes
export function twigSkin(assets, opts = {}) {
  return humanoidSkin(assets, (api) => {
    const { add, head, pin, at, span, anim } = api;
    const W = (o) => woodMat(assets, o);
    const pine = W({ color: 0xe7b277, contrast: 1.7, rough: 0.46, normal: 0.75 });      // honey pine, waxed
    const stain = W({ color: 0x7a4626, contrast: 1.4, rough: 0.4, normal: 0.6 });       // walnut-stained joints and hair
    const vestP = W({ color: 0x3f7f4c, contrast: 0.45, rough: 0.55, normal: 0.35, side: THREE.DoubleSide }); // green paint
    const shortsP = W({ color: 0xc58b2e, contrast: 0.5, rough: 0.55, normal: 0.35 });   // ochre paint
    const capP = W({ color: 0xb8352b, contrast: 0.45, rough: 0.5, normal: 0.35 });      // brick-red paint
    const cream = W({ color: 0xf2e7cf, contrast: 0.32, rough: 0.6, normal: 0.25 });     // the painted collar
    const clogP = W({ color: 0x40271a, contrast: 0.9, rough: 0.38, normal: 0.45 });     // dark varnished clogs
    const enamel = new THREE.MeshStandardMaterial({ color: 0xf8f2e6, roughness: 0.28 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x3f72b0, roughness: 0.3 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.3 });
    const blush = new THREE.MeshStandardMaterial({ color: 0xe78b74, roughness: 0.55 });
    const lips = new THREE.MeshStandardMaterial({ color: 0xa8382c, roughness: 0.45 });
    const leafM = new THREE.MeshStandardMaterial({ color: 0x5aa83a, roughness: 0.55, side: THREE.DoubleSide });
    const twigM = W({ color: 0x8a5a32, contrast: 1.2, rough: 0.6, normal: 0.5 });

    const cyl = (r1, r2, len, seg = 14) => grainUV(new THREE.CylinderGeometry(r1, r2, 1, seg), len, Math.PI * (r1 + r2));
    const ball = (r, ws = 14, hs = 10) => grainUV(new THREE.SphereGeometry(r, ws, hs), Math.PI * r, Math.PI * 2 * r);

    // torso: a carved pine barrel (shoulders rounded, waist a little narrower), a green
    // waistcoat open at the front that follows the same carving, and a scalloped collar
    const TORSO = [[0.0001, -0.037], [0.012, -0.037], [0.0163, -0.0335], [0.0182, -0.025], [0.0192, -0.013], [0.0203, 0], [0.021, 0.01], [0.0207, 0.0165], [0.0186, 0.0215], [0.0135, 0.0252], [0.0062, 0.0272], [0.0001, 0.0276]];
    const torsoR = (y) => { for (let i = 1; i < TORSO.length; i++) { const [r0, y0] = TORSO[i - 1], [r1, y1] = TORSO[i]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / Math.max(1e-6, y1 - y0); } return 0; };
    const torsoG = grainUV(new THREE.LatheGeometry(TORSO.map(([r, y]) => new THREE.Vector2(r, y)), 24), 0.065, 0.12);
    torsoG.scale(1.1, 1, 0.82);
    pin(add(torsoG, pine), "mid", "upper", [0, 0.004, 0]);
    const vestPts = [];
    for (let i = 0; i <= 14; i++) { const y = -0.027 + i * (0.0495 / 14); vestPts.push(new THREE.Vector2(torsoR(y) + 0.0011, y)); }
    const vestG = grainUV(new THREE.LatheGeometry(vestPts, 24, 0.36, Math.PI * 2 - 0.72), 0.05, 0.12);
    vestG.scale(1.1, 1, 0.82);
    pin(add(vestG, vestP), "mid", "upper", [0, 0.004, 0]);
    const buttonG = ball(0.0018, 10, 8); buttonG.scale(1, 1, 0.55);
    for (const y of [0.008, -0.006]) { const b = add(buttonG, stain); pin(b, "mid", "upper", [0.0084, 0.004 + y, 0.0172]); }
    const collarG = grainUV(new THREE.CylinderGeometry(0.0085, 0.0172, 0.005, 40, 1), 0.02, 0.1);
    { const p = collarG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < 0) { const a = Math.atan2(z, x), k = 1 + 0.085 * Math.cos(a * 12); p.setX(i, x * k); p.setZ(i, z * k); } } collarG.computeVertexNormals(); }
    collarG.scale(1.08, 1, 0.86);
    pin(add(collarG, cream), "neck", "upper", [0, -0.0035, 0]);

    // hips: ochre short trousers, a rounded block the legs swing from
    const SHORTS = [[0.0001, 0.0145], [0.0158, 0.0145], [0.0192, 0.008], [0.0208, -0.002], [0.021, -0.01], [0.0196, -0.0145], [0.0001, -0.0158]];
    const shortsG = grainUV(new THREE.LatheGeometry(SHORTS.map(([r, y]) => new THREE.Vector2(r, y)), 24), 0.03, 0.13);
    shortsG.scale(1.1, 1, 0.84);
    pin(add(shortsG, shortsP), "pelvis", "lower", [0, 0.004, 0]);
    const hemG = new THREE.TorusGeometry(0.0205, 0.0011, 6, 28); hemG.rotateX(Math.PI / 2); hemG.scale(1.1, 1, 0.84);
    pin(add(hemG, stain), "pelvis", "lower", [0, 0.017, 0]); // a stained belt line where trousers meet the body

    // limbs: slim pine dowels, joined by darker turned balls (the joints a carver pegs)
    span("lS", "lE", add(cyl(0.0053, 0.0047, 0.045), pine)); span("rS", "rE", add(cyl(0.0053, 0.0047, 0.045), pine));
    span("lE", "lW", add(cyl(0.0046, 0.004, 0.045), pine)); span("rE", "rW", add(cyl(0.0046, 0.004, 0.045), pine));
    span("lH", "lK", add(cyl(0.0068, 0.0058, 0.05), pine)); span("rH", "rK", add(cyl(0.0068, 0.0058, 0.05), pine));
    span("lK", "lF", add(cyl(0.0057, 0.0048, 0.05), pine)); span("rK", "rF", add(cyl(0.0057, 0.0048, 0.05), pine));
    span("neck", "head", add(cyl(0.0042, 0.0046, 0.02), pine));
    for (const [n, r] of [["lS", 0.0072], ["rS", 0.0072], ["lE", 0.006], ["rE", 0.006], ["lK", 0.0072], ["rK", 0.0072]]) at(add(ball(r), stain), n);
    // the pegs through the elbows and knees
    const pegG = grainUV(new THREE.CylinderGeometry(0.0012, 0.0012, 0.0152, 6), 0.015, 0.008); pegG.rotateZ(Math.PI / 2);
    for (const n of ["lE", "rE", "lK", "rK"]) pin(add(pegG, pine), n, n.endsWith("K") ? "lower" : "upper", [0, 0, 0]);

    // mitten hands with a thumb
    const handG = ball(0.0058, 14, 10); handG.scale(0.82, 1.18, 0.62);
    const thumbG = new THREE.CapsuleGeometry(0.0017, 0.004, 3, 8); grainUV(thumbG, 0.008, 0.01);
    for (const [n, s] of [["lW", -1], ["rW", 1]]) {
      pin(add(handG, pine), n, "upper", [0, -0.0045, 0.001]);
      const th = add(thumbG, pine); pin(th, n, "upper", [s * -0.0045, -0.002, 0.0035]);
    }
    // carved clogs with a turned-up toe
    const clogG = new THREE.CapsuleGeometry(0.0068, 0.02, 4, 12);
    clogG.rotateX(Math.PI / 2);
    { const p = clogG.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0.006) p.setY(i, p.getY(i) + (z - 0.006) * (z - 0.006) * 28); } clogG.computeVertexNormals(); }
    clogG.scale(1, 0.7, 1); clogG.translate(0, 0.0005, 0.0075);
    grainUV(clogG, 0.03, 0.04);
    for (const n of ["lF", "rF"]) pin(add(clogG, clogP), n, "yaw", [0, 0.002, 0]);

    // ---- the head: an egg of pine, painted face, carved hair, a sugarloaf cap ----
    const skullG = ball(0.0185, 24, 18); skullG.scale(0.95, 1.08, 0.98);
    const skull = new THREE.Mesh(skullG, pine);
    // carved hair: a stained cap of wood over the back of the head, with three curls at the brow
    const hairG = grainUV(new THREE.SphereGeometry(0.0193, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), 0.03, 0.12);
    hairG.scale(0.97, 1.08, 1);
    const hair = new THREE.Mesh(hairG, stain); hair.rotation.x = -0.42; hair.position.set(0, 0.0012, -0.0012);
    const curls = [-1, 0, 1].map((k) => { const c = new THREE.Mesh(new THREE.TorusGeometry(0.0026, 0.0011, 6, 12, Math.PI * 1.4), stain); c.position.set(k * 0.0055, 0.0158 - Math.abs(k) * 0.0016, 0.0098 - Math.abs(k) * 0.001); c.rotation.set(-0.5, k * 0.4, 0.5 + k * 0.3); return c; });
    const ears = [-1, 1].map((s) => { const e = new THREE.Mesh(ball(0.0048, 12, 8), pine); e.scale.set(0.42, 1, 0.78); e.position.set(s * 0.0178, -0.001, -0.001); return e; });
    // the sugarloaf cap, worn at an angle, with a turned bead on the tip
    const capG = grainUV(new THREE.ConeGeometry(0.0156, 0.042, 24, 1), 0.042, 0.1);
    const cap = new THREE.Mesh(capG, capP);
    cap.position.set(0.0022, 0.0315, -0.0035); cap.rotation.set(-0.24, 0, -0.2);
    const capBand = new THREE.Mesh(new THREE.TorusGeometry(0.0154, 0.0012, 8, 28), capP);
    capBand.position.set(-0.0019, 0.0115, 0.0012); capBand.rotation.set(Math.PI / 2 - 0.24, 0.2, 0);
    const bead = new THREE.Mesh(ball(0.0032), stain); bead.position.set(0.0063, 0.0513, -0.0085);
    // painted eyes: enamel whites, blue irises, black pupils, a white catchlight
    const eyes = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.0041, 16, 12), enamel); w.scale.set(0.95, 1.22, 0.42); w.position.set(s * 0.0067, 0.0032, 0.0158); w.rotation.y = s * 0.38;
      const ir = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 14, 10), iris); ir.scale.set(1, 1.1, 0.42); ir.position.set(s * 0.0063, 0.0026, 0.0174); ir.rotation.y = s * 0.36;
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 10, 8), ink); pu.scale.set(1, 1.1, 0.5); pu.position.set(s * 0.0062, 0.0026, 0.01815); pu.rotation.y = s * 0.36;
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.00055, 6, 5), enamel); gl.position.set(s * 0.0062 + 0.0008, 0.0036, 0.0186);
      const brow = new THREE.Mesh(new THREE.TorusGeometry(0.0042, 0.00055, 4, 12, Math.PI * 0.7), ink); brow.position.set(s * 0.0066, 0.0071, 0.0158); brow.rotation.set(-0.1, s * 0.38, Math.PI * 0.15 + s * 0.12);
      eyes.push(w, ir, pu, gl, brow);
    }
    // rosy painted cheeks and a red smile
    const cheeks = [-1, 1].map((s) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 12, 8), blush); c.scale.set(1, 0.85, 0.3); c.position.set(s * 0.0108, -0.0042, 0.0138); c.rotation.y = s * 0.66; return c; });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.0038, 0.0007, 6, 14, Math.PI * 0.82), lips);
    smile.position.set(0, -0.0072, 0.0172); smile.rotation.set(0.12, 0, Math.PI + Math.PI * 0.09);
    head.add(skull, hair, ...curls, ...ears, cap, capBand, bead, ...eyes, ...cheeks, smile);

    // the nose: a whittled dowel that grows when he fibs (kept apart from the merged head)
    const NOSE0 = 0.014;
    const noseG = grainUV(new THREE.CylinderGeometry(0.00125, 0.0027, 1, 12, 1, true), 1, 0.012);
    noseG.rotateX(Math.PI / 2); noseG.translate(0, 0, 0.5);
    const nose = new THREE.Mesh(noseG, pine);
    nose.position.set(0, 0.0004, 0.0155);
    const tip = new THREE.Mesh(ball(0.00135, 10, 8), pine);
    // the leafy sprig a long fib grows: a little twig with two leaves
    const sprig = new THREE.Group();
    const stalk = new THREE.Mesh(grainUV(new THREE.CylinderGeometry(0.0004, 0.0006, 0.009, 6), 0.009, 0.003), twigM); stalk.position.y = 0.0045; stalk.rotation.z = -0.25;
    const leafG = new THREE.SphereGeometry(0.0034, 10, 6); leafG.scale(0.5, 0.12, 1);
    const leafA = new THREE.Mesh(leafG, leafM); leafA.position.set(0.0028, 0.0085, 0.001); leafA.rotation.set(0.3, 0.6, -0.5);
    const leafB = new THREE.Mesh(leafG, leafM); leafB.position.set(-0.002, 0.0062, -0.0015); leafB.rotation.set(-0.4, -0.5, 0.6); leafB.scale.setScalar(0.8);
    sprig.add(stalk, leafA, leafB);
    head.add(nose, tip, sprig);
    api.headSkip = [nose, tip, sprig];

    let L = NOSE0, LT = NOSE0, vel = 0, leaf = 0, lastFib = -99, now = 0;
    const setNose = () => {
      nose.scale.set(1, 1, L);
      tip.position.set(0, nose.position.y, nose.position.z + L);
      const k = THREE.MathUtils.clamp((L - 0.03) / 0.012, 0, 1) * leaf;
      sprig.scale.setScalar(Math.max(1e-4, k));
      sprig.position.set(0, nose.position.y + 0.0011, nose.position.z + L * 0.62);
    };
    setNose();
    anim((t, f, P) => {
      const dt = Math.min(0.05, t - now); now = t;
      // a fib wears off slowly if nobody calls him on it
      if (LT > NOSE0 && t - lastFib > 30) LT = NOSE0;
      // a springy "boing": the nose overshoots and wobbles as it grows or shrinks
      vel += (LT - L) * 220 * dt; vel *= Math.exp(-7 * dt); L = Math.max(0.008, L + vel * dt);
      leaf += ((LT > 0.032 ? 1 : 0) - leaf) * Math.min(1, dt * 3);
      nose.rotation.x = -vel * 0.9;
      setNose();
    });
    api.extra = {
      fib() { LT = Math.min(0.068, Math.max(LT, L) + 0.014); lastFib = now; return LT; },
      truth() { LT = NOSE0; return LT; },
      nose: () => L,
    };
  }, opts);
}
