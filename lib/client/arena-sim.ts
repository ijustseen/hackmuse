import type { Reaction } from "../feed";

// The arena, seen from above: five sharks circle the idea from the left, a school of 30 fish
// (the feed) swims on the right. Each fish is one simulated person, and where it swims is its
// reaction: shares crowd the idea, likes hang close, objectors face it, scrollers drift off.
// Plain canvas 2D, no React; the component owns the loop and the DOM overlay.

export interface SharkSpec {
  color: string;
  label: string;
}

export interface ArenaColors {
  ink: string;
  cream: string;
  paper: string;
  waterTop: string;
  waterBottom: string;
  reaction: Record<Reaction | "pending", string>;
}

type Vec = { x: number; y: number };

interface Shark {
  spec: SharkSpec;
  pos: Vec;
  vel: Vec;
  phase: number;
  /** Orbit radii as fractions of the shark zone. */
  rx: number;
  ry: number;
  speed: number;
  present: number; // 0 → 1 fade-in as the shark joins
  joined: boolean;
  lunge: number; // seconds left in a lunge
  tail: number;
}

interface Fish {
  pos: Vec;
  vel: Vec;
  reaction: Reaction | null;
  /** 0 → 1 while the colour changes to the reaction. */
  tint: number;
  prev: Reaction | null;
  cast: boolean;
  seed: number;
  tail: number;
  pop: number; // seconds left in the reaction pop
}

interface Ring {
  x: number;
  y: number;
  age: number;
  color: string;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
}

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export class ArenaSim {
  w = 800;
  h = 440;
  private sharks: Shark[];
  private fish: Fish[];
  private rings: Ring[] = [];
  private motes: Mote[] = [];
  private t = 0;
  private rand: () => number;
  /** 1 while waiting for the sharks, eases to 0 once the debate runs. Drives the orb's pulse. */
  private hunting = 1;
  private huntingTarget = 1;
  /** The idea glows harder as shares land. */
  private heat = 0;

  constructor(
    private readonly sharkSpecs: SharkSpec[],
    fishCount: number,
    private colors: ArenaColors,
    seed = 7,
  ) {
    this.rand = mulberry(seed);
    this.sharks = sharkSpecs.map((spec, i) => ({
      spec,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      phase: (i / sharkSpecs.length) * TAU + this.rand() * 0.4,
      rx: 0.72 + (i % 3) * 0.11,
      ry: 0.64 + ((i + 1) % 3) * 0.1,
      speed: 0.32 + this.rand() * 0.1,
      present: 0,
      joined: false,
      lunge: 0,
      tail: this.rand() * TAU,
    }));
    this.fish = Array.from({ length: fishCount }, (_, i) => ({
      pos: { x: 0, y: 0 },
      vel: { x: -10 + this.rand() * 20, y: -10 + this.rand() * 20 },
      reaction: null,
      tint: 0,
      prev: null,
      cast: false,
      seed: this.rand() * 1000 + i,
      tail: this.rand() * TAU,
      pop: 0,
    }));
    this.resize(this.w, this.h, true);
  }

  // --- geometry ----------------------------------------------------------

  /** Size of things scales with the arena so phones get a smaller, not a cramped, scene. */
  get unit() {
    return clamp(Math.min(this.w / 900, this.h / 320), 0.6, 1.25);
  }

  get orb() {
    return { x: this.w / 2, y: this.h * 0.5, r: clamp(Math.min(this.w, this.h) * 0.15, 36, 72) };
  }

  private get sharkZone() {
    return { x: this.w * 0.25, y: this.h * 0.5, rx: this.w * 0.2, ry: this.h * 0.36 };
  }

  private get fishZone() {
    return { x: this.w * 0.75, y: this.h * 0.5, rx: this.w * 0.2, ry: this.h * 0.36 };
  }

  resize(w: number, h: number, scatter = false) {
    const sx = w / this.w;
    const sy = h / this.h;
    this.w = w;
    this.h = h;
    const fz = this.fishZone;
    for (const f of this.fish) {
      if (scatter) {
        f.pos = { x: fz.x + (this.rand() - 0.5) * fz.rx * 1.6, y: fz.y + (this.rand() - 0.5) * fz.ry * 1.6 };
      } else {
        f.pos = { x: f.pos.x * sx, y: f.pos.y * sy };
      }
    }
    for (const s of this.sharks) {
      const p = this.orbitPoint(s);
      s.pos = scatter ? { x: -30, y: p.y } : { x: s.pos.x * sx, y: s.pos.y * sy };
    }
    if (!scatter && this.motes.length > 0) {
      for (const m of this.motes) {
        m.x *= sx;
        m.y *= sy;
      }
      return;
    }
    const count = Math.round(clamp((w * h) / 9000, 18, 60));
    this.motes = Array.from({ length: count }, () => ({
      x: this.rand() * w,
      y: this.rand() * h,
      r: 0.6 + this.rand() * 1.8,
      speed: 6 + this.rand() * 14,
      drift: this.rand() * TAU,
    }));
  }

  private orbitPoint(s: Shark): Vec {
    const z = this.sharkZone;
    return { x: z.x + Math.cos(s.phase) * z.rx * s.rx, y: z.y + Math.sin(s.phase) * z.ry * s.ry };
  }

  // --- events ------------------------------------------------------------

  joinShark(i: number) {
    const s = this.sharks[i];
    if (s) s.joined = true;
  }

  joinAll() {
    this.sharks.forEach((s) => (s.joined = true));
  }

  /** A shark darts at the idea (when it argues). */
  lunge(i: number) {
    const s = this.sharks[i];
    if (!s) return;
    s.joined = true;
    s.lunge = 1.1;
  }

  /** True while the sharks are still gathering; the idea pulses harder. */
  setHunting(on: boolean) {
    this.huntingTarget = on ? 1 : 0;
  }

  /** The people are cast: the anonymous school brightens. */
  castPeople() {
    this.fish.forEach((f) => (f.cast = true));
  }

  react(i: number, reaction: Reaction) {
    const f = this.fish[i];
    if (!f || f.reaction === reaction) return;
    f.prev = f.reaction;
    f.reaction = reaction;
    f.tint = 0;
    f.pop = 0.5;
    if (reaction === "share") {
      this.rings.push({ x: f.pos.x, y: f.pos.y, age: 0, color: this.colors.reaction.share });
      this.heat = Math.min(1, this.heat + 0.12);
    }
  }

  /** Jump straight to a settled state (cached verdicts, reduced motion). */
  settle(reactions: (Reaction | null)[]) {
    this.joinAll();
    this.sharks.forEach((s) => {
      s.present = 1;
      s.pos = this.orbitPoint(s);
    });
    reactions.forEach((r, i) => {
      const f = this.fish[i];
      if (!f) return;
      f.cast = true;
      f.reaction = r;
      f.tint = 1;
      if (r) f.pos = this.home(f, i);
    });
    this.heat = clamp(reactions.filter((r) => r === "share").length * 0.12, 0, 1);
  }

  fishPosition(i: number): Vec | null {
    const f = this.fish[i];
    return f ? { ...f.pos } : null;
  }

  sharkPosition(i: number): Vec | null {
    const s = this.sharks[i];
    return s ? { ...s.pos } : null;
  }

  // --- simulation --------------------------------------------------------

  /** Where a fish wants to be, given its reaction. Deterministic per fish so the school keeps a shape. */
  private home(f: Fish, i: number): Vec {
    const o = this.orb;
    const fz = this.fishZone;
    const a = ((f.seed * 137.5) % 360) * (Math.PI / 180);
    const wobble = Math.sin(this.t * 0.35 + f.seed) * 0.08;
    switch (f.reaction) {
      case "share": {
        // A tight arc hugging the right side of the idea.
        const ang = -Math.PI / 2 + ((i * 0.6180339) % 1) * Math.PI + wobble;
        const r = o.r + 18 * this.unit + ((f.seed * 7) % 14) * this.unit;
        return { x: o.x + Math.cos(ang) * r * 1.05, y: o.y + Math.sin(ang) * r };
      }
      case "like": {
        const ang = -Math.PI / 2.4 + ((i * 0.6180339) % 1) * (Math.PI / 1.2) + wobble;
        const r = o.r + 60 * this.unit + ((f.seed * 11) % 24) * this.unit;
        return { x: o.x + Math.cos(ang) * r * 1.2, y: o.y + Math.sin(ang) * r * 0.9 };
      }
      case "object": {
        // Hold off at a distance, above and below, nose to the idea.
        const top = i % 2 === 0;
        const k = (f.seed * 13) % 1;
        return {
          x: o.x + o.r + (40 + k * 70) * this.unit,
          y: o.y + (top ? -1 : 1) * (o.r + (30 + ((f.seed * 5) % 30)) * this.unit),
        };
      }
      case "scroll":
        return {
          x: this.w - 30 * this.unit - ((f.seed * 3) % 50) * this.unit,
          y: fz.y + Math.sin(a) * fz.ry * 0.95,
        };
      default:
        return { x: fz.x + Math.cos(a + this.t * 0.25) * fz.rx * 0.35, y: fz.y + Math.sin(a + this.t * 0.25) * fz.ry * 0.35 };
    }
  }

  step(dt: number) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    this.hunting = lerp(this.hunting, this.huntingTarget, 1 - Math.exp(-dt * 1.5));
    const u = this.unit;
    const o = this.orb;

    // Sharks: follow a moving point on their orbit; a lunge swaps the target for the idea's rim.
    for (const s of this.sharks) {
      if (s.joined) s.present = Math.min(1, s.present + dt * 1.6);
      s.phase += dt * s.speed * (1 + this.hunting * 0.25);
      let target = this.orbitPoint(s);
      if (s.lunge > 0) {
        s.lunge -= dt;
        const dx = o.x - s.pos.x;
        const dy = o.y - s.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        target = { x: o.x - (dx / d) * (o.r + 20 * u), y: o.y - (dy / d) * (o.r + 20 * u) };
      }
      if (!s.joined) target = { x: -80 * u, y: target.y };
      const max = (s.lunge > 0 ? 300 : 170) * u;
      const ax = (target.x - s.pos.x) * 3.4 - s.vel.x * 2.3;
      const ay = (target.y - s.pos.y) * 3.4 - s.vel.y * 2.3;
      s.vel.x += ax * dt;
      s.vel.y += ay * dt;
      const sp = Math.hypot(s.vel.x, s.vel.y);
      if (sp > max) {
        s.vel.x *= max / sp;
        s.vel.y *= max / sp;
      }
      s.pos.x += s.vel.x * dt;
      s.pos.y += s.vel.y * dt;
      s.tail += dt * (5 + sp / (18 * u));
    }

    // Fish: boids (separation, alignment, light cohesion) plus a pull to their reaction's home.
    const sepR = 15 * u;
    const nbR = 46 * u;
    this.fish.forEach((f, i) => {
      let sx = 0,
        sy = 0,
        ax = 0,
        ay = 0,
        cx = 0,
        cy = 0,
        n = 0;
      for (const g of this.fish) {
        if (g === f) continue;
        const dx = f.pos.x - g.pos.x;
        const dy = f.pos.y - g.pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nbR * nbR && g.reaction === f.reaction) {
          ax += g.vel.x;
          ay += g.vel.y;
          cx += g.pos.x;
          cy += g.pos.y;
          n += 1;
        }
        if (d2 < sepR * sepR && d2 > 0.01) {
          const d = Math.sqrt(d2);
          sx += (dx / d) * (sepR - d);
          sy += (dy / d) * (sepR - d);
        }
      }
      const home = this.home(f, i);
      const hx = home.x - f.pos.x;
      const hy = home.y - f.pos.y;
      const pull = f.reaction === null ? 0.5 : 1.3;
      let fx = hx * pull + sx * 9;
      let fy = hy * pull + sy * 9;
      if (n > 0) {
        fx += (ax / n - f.vel.x) * 0.6 + (cx / n - f.pos.x) * 0.15;
        fy += (ay / n - f.vel.y) * 0.6 + (cy / n - f.pos.y) * 0.15;
      }
      // Keep the school out of the sharks' half and away from the idea itself.
      if (f.pos.x < this.w * 0.5 + 10 * u) fx += (this.w * 0.5 + 10 * u - f.pos.x) * 6;
      const odx = f.pos.x - o.x;
      const ody = f.pos.y - o.y;
      const od = Math.hypot(odx, ody);
      if (od < o.r + 10 * u) {
        fx += (odx / (od || 1)) * 400;
        fy += (ody / (od || 1)) * 400;
      }
      // Wander so a still school never looks frozen.
      fx += Math.sin(this.t * 1.3 + f.seed) * 22 * u;
      fy += Math.cos(this.t * 1.1 + f.seed * 1.7) * 22 * u;

      f.vel.x += (fx - f.vel.x * 1.1) * dt;
      f.vel.y += (fy - f.vel.y * 1.1) * dt;
      const max = (f.reaction === "scroll" ? 55 : 95) * u;
      const sp = Math.hypot(f.vel.x, f.vel.y);
      if (sp > max) {
        f.vel.x *= max / sp;
        f.vel.y *= max / sp;
      }
      f.pos.x = clamp(f.pos.x + f.vel.x * dt, 8, this.w - 8);
      f.pos.y = clamp(f.pos.y + f.vel.y * dt, 8, this.h - 8);
      f.tail += dt * (7 + sp / (8 * u));
      f.tint = Math.min(1, f.tint + dt * 2.2);
      f.pop = Math.max(0, f.pop - dt);
    });

    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < 1.4);
    for (const m of this.motes) {
      m.y -= m.speed * dt;
      m.x += Math.sin(this.t * 0.8 + m.drift) * 4 * dt;
      if (m.y < -4) {
        m.y = this.h + 4;
        m.x = this.rand() * this.w;
      }
    }
    this.heat *= Math.exp(-dt * 0.02);
  }

  // --- drawing -----------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D) {
    const { w, h } = this;
    const c = this.colors;
    const u = this.unit;
    const o = this.orb;

    // Water.
    const water = ctx.createLinearGradient(0, 0, 0, h);
    water.addColorStop(0, c.waterTop);
    water.addColorStop(1, c.waterBottom);
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, w, h);

    // Light shafts from the surface, swaying slowly. Mirrored left and right so the scene stays balanced.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 6; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      const base = w / 2 + side * (w * (0.08 + Math.floor(k / 2) * 0.15));
      const sway = Math.sin(this.t * 0.25 + k * 1.3) * 30 * u;
      const top = base + sway;
      const spread = (40 + (k % 3) * 22) * u;
      const shaft = ctx.createLinearGradient(0, 0, 0, h);
      shaft.addColorStop(0, "rgba(241,236,223,0.075)");
      shaft.addColorStop(1, "rgba(241,236,223,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(top - spread * 0.3, 0);
      ctx.lineTo(top + spread * 0.3, 0);
      ctx.lineTo(top + spread + side * 60 * u, h);
      ctx.lineTo(top - spread + side * 60 * u, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Drifting motes.
    ctx.fillStyle = "rgba(241,236,223,0.22)";
    for (const m of this.motes) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.fill();
    }

    // The centre line, broken around the idea.
    ctx.save();
    ctx.strokeStyle = "rgba(241,236,223,0.14)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 10);
    ctx.lineTo(w / 2, o.y - o.r - 18 * u);
    ctx.moveTo(w / 2, o.y + o.r + 18 * u);
    ctx.lineTo(w / 2, h - 10);
    ctx.stroke();
    ctx.restore();

    // Share rings.
    for (const r of this.rings) {
      const k = r.age / 1.4;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, (6 + k * 34) * u, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.drawOrb(ctx);
    this.fish.forEach((f) => this.drawFish(ctx, f));
    this.sharks.forEach((s) => this.drawShark(ctx, s));
  }

  private drawOrb(ctx: CanvasRenderingContext2D) {
    const o = this.orb;
    const c = this.colors;
    const u = this.unit;
    const pulse = 1 + Math.sin(this.t * 2.2) * 0.025 * (0.4 + this.hunting);

    // Glow, warmer as shares land.
    const glow = ctx.createRadialGradient(o.x, o.y, o.r * 0.6, o.x, o.y, o.r * (2.1 + this.heat * 0.6));
    glow.addColorStop(0, `rgba(233,185,73,${0.18 + this.heat * 0.22})`);
    glow.addColorStop(1, "rgba(233,185,73,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * 2.8, 0, TAU);
    ctx.fill();

    // Ripples.
    for (let k = 0; k < 3; k++) {
      const p = (this.t * 0.32 + k / 3) % 1;
      ctx.strokeStyle = `rgba(241,236,223,${0.28 * (1 - p)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * (1.05 + p * 0.9), 0, TAU);
      ctx.stroke();
    }

    // Brutalist disc: blood offset, ink rim, paper face.
    ctx.fillStyle = "#7b1a14";
    ctx.beginPath();
    ctx.arc(o.x + 6 * u, o.y + 6 * u, o.r * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c.paper;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * pulse, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * pulse * 0.8, this.t * 0.4, this.t * 0.4 + TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawFish(ctx: CanvasRenderingContext2D, f: Fish) {
    const c = this.colors;
    const u = this.unit;
    const ang = Math.atan2(f.vel.y, f.vel.x);
    const len = 13 * u * (1 + f.pop * 0.5);
    const from = f.prev ? c.reaction[f.prev] : c.reaction.pending;
    const to = f.reaction ? c.reaction[f.reaction] : c.reaction.pending;
    const color = f.tint >= 1 ? to : mix(from, to, f.tint);
    const alpha = f.reaction === "scroll" ? 0.45 : f.cast ? 1 : 0.55;

    ctx.save();
    ctx.translate(f.pos.x, f.pos.y);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    const sway = Math.sin(f.tail) * 0.45;
    // Tail.
    ctx.fillStyle = color;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-len * 0.45, 0);
    ctx.lineTo(-len * 0.95, -len * 0.32 + sway * len * 0.25);
    ctx.lineTo(-len * 0.95, len * 0.32 + sway * len * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Body.
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.55, len * 0.27, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // Eye.
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(len * 0.28, -len * 0.06, Math.max(1, len * 0.06), 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawShark(ctx: CanvasRenderingContext2D, s: Shark) {
    if (s.present <= 0.01) return;
    const c = this.colors;
    const u = this.unit;
    const ang = Math.atan2(s.vel.y, s.vel.x || 0.001);
    const L = 54 * u;
    const W = L * 0.2;
    const sway = Math.sin(s.tail) * 0.3;

    ctx.save();
    ctx.globalAlpha = s.present;
    ctx.translate(s.pos.x, s.pos.y);

    // Shadow on the "floor", offset like the brutalist cards.
    ctx.save();
    ctx.translate(5 * u, 7 * u);
    ctx.rotate(ang);
    ctx.fillStyle = "rgba(16,32,28,0.35)";
    this.sharkPath(ctx, L, W, sway);
    ctx.fill();
    ctx.restore();

    ctx.rotate(ang);
    ctx.fillStyle = s.spec.color;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    this.sharkPath(ctx, L, W, sway);
    ctx.fill();
    ctx.stroke();
    // Spine and eyes.
    ctx.strokeStyle = "rgba(16,32,28,0.35)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(L * 0.3, 0);
    ctx.quadraticCurveTo(-L * 0.1, sway * W * 0.4, -L * 0.36, sway * W);
    ctx.stroke();
    ctx.fillStyle = c.ink;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(L * 0.36, side * W * 0.42, 1.6 * u, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Name tag, kept upright.
    if (u > 0.62) {
      ctx.save();
      ctx.globalAlpha = s.present * 0.85;
      ctx.font = `700 ${Math.round(9 * u + 1)}px ui-monospace, "Space Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = c.cream;
      ctx.fillText(s.spec.label.toUpperCase(), s.pos.x, s.pos.y - 22 * u);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Top-down shark: torpedo body, swept pectoral fins, forked tail that swings. */
  private sharkPath(ctx: CanvasRenderingContext2D, L: number, W: number, sway: number) {
    const tx = -L * 0.5;
    const ty = sway * W * 1.4;
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.quadraticCurveTo(L * 0.42, -W, L * 0.15, -W);
    // Left pectoral fin.
    ctx.lineTo(L * 0.02, -W * 2.3);
    ctx.lineTo(-L * 0.08, -W * 0.95);
    ctx.quadraticCurveTo(-L * 0.3, -W * 0.6, tx + L * 0.08, ty - W * 0.25);
    // Tail fork.
    ctx.lineTo(tx - L * 0.12, ty - W * 1.5);
    ctx.lineTo(tx + L * 0.02, ty);
    ctx.lineTo(tx - L * 0.12, ty + W * 1.5);
    ctx.lineTo(tx + L * 0.08, ty + W * 0.25);
    ctx.quadraticCurveTo(-L * 0.3, W * 0.6, -L * 0.08, W * 0.95);
    // Right pectoral fin.
    ctx.lineTo(L * 0.02, W * 2.3);
    ctx.lineTo(L * 0.15, W);
    ctx.quadraticCurveTo(L * 0.42, W, L * 0.5, 0);
    ctx.closePath();
  }
}

/** Mixes two #rrggbb colours. */
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
