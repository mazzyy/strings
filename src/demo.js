// Autopilot: drives the *simulated hands* (not the puppet directly), so the
// demo goes through exactly the same input -> grab -> strings -> physics path
// that your real hands do.
import * as THREE from "three";

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const seg = (t, a, b) => ease((t - a) / (b - a));

export function makeDemo(sim) {
  return () => {
    let t = 0;
    const start = sim.mainPos.clone();
    const otherStart = sim.otherPos.clone();
    return (dt, s) => {
      t += dt;
      const pos = start.clone();
      let pitch = 0, roll = 0, yaw = 0;
      let pinch = t > 0.5;
      let otherPinch = false;
      const other = otherStart.clone();

      // walk toward Marlo (rocking the wrist a little, like a puppeteer would)
      const w1 = seg(t, 1, 4.5);
      pos.x += 0.17 * w1;
      if (t > 1 && t < 4.5) roll = Math.sin(t * 7) * 0.25;
      // bow
      pitch = 0.85 * (seg(t, 4.8, 5.4) - seg(t, 6.2, 6.8));
      // wave with the other hand
      if (t > 7 && t < 9.5) {
        otherPinch = true;
        other.copy(pos).add(new THREE.Vector3(0.06, 0.17 * seg(t, 7, 7.5), 0.05));
        other.x += Math.sin(t * 9) * 0.02;
      }
      // jump (quick flick up)
      if (t > 10 && t < 10.5) pos.y += Math.sin(((t - 10) / 0.5) * Math.PI) * 0.075;
      // walk back, turning to the audience
      const w2 = seg(t, 11.2, 14.5);
      pos.x -= 0.22 * w2;
      if (t > 11.2 && t < 14.5) roll = Math.sin(t * 7) * 0.25;
      yaw = -0.35 * seg(t, 11, 12) + 0.35 * seg(t, 14.5, 15.2);
      // let go -> slump, then pick it back up
      if (t > 16 && t < 18) pinch = false;
      if (t > 21) { s.autopilot = null; s.mainPos.copy(pos); s.main.pinch = false; s.sticky = false; return; }

      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, -roll, "YXZ"));
      s.main.setPose(pos, q);
      s.main.pinch = pinch;
      s.main.present = true;
      s.other.setPose(other, new THREE.Quaternion());
      s.other.pinch = otherPinch;
      s.other.present = true;
      s.main.tip.copy(pos);
      s.other.tip.copy(other);
    };
  };
}
