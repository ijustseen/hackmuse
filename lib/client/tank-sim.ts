import type { Reaction } from "../feed";

// The tank, seen from the side: sky on top, water below. The idea drops in as a card, five big
// sharks toss it around, and a school of fish (the feed, one fish per simulated person) swims
// through the water, fleeing the sharks and gathering by reaction. At the end a fishing line
// hooks the idea and the view rises with it out of the water.
//
// Plain canvas 2D, no React. Positions are in "world" pixels; `pan` shifts the whole world down
// so the camera can sit above the water (intro, catch) or at the usual height (frenzy).

export interface SharkSpec {
  color: string;
  label: string;
}

export interface TankColors {
  ink: string;
  cream: string;
  paper: string;
  coral: string;
  blood: string;
  skyTop: string;
  skyBottom: string;
  waterTop: string;
  waterBottom: string;
  reaction: Record<Reaction | "pending", string>;
}

export type TankPhase = "intro" | "falling" | "frenzy" | "catch" | "hoisted";

type Vec = { x: number; y: number };

interface Shark {
  spec: SharkSpec;
  pos: Vec;
  vel: Vec;
  phase: number;
  speed: number;
  joinAt: number;
  joined: boolean;
  present: number;
  /** Seconds left in a lunge at the idea. */
  lunge: number;
  /** Seconds left turning away after a bite. */
  recoil: number;
  tail: number;
}

interface Fish {
  pos: Vec;
  vel: Vec;
  reaction: Reaction | null;
  prev: Reaction | null;
  tint: number;
  cast: boolean;
  seed: number;
  frac: number;
  tail: number;
  pop: number;
  fleeing: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  kind: "bubble" | "drop";
}

interface Wave {
  x: number;
  age: number;
  amp: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
  color: string;
}

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catch timings, in seconds from the start of the catch. */
const CATCH_HOOK = 1.0;
const CATCH_PULL = 2.0;

export class TankSim {
  w = 800;
  h = 500;
  phase: TankPhase = "intro";
  bites = 0;
  /** Called when a shark's bite lands, with the shark's index. */
  onBite: ((i: number) => void) | null = null;
  /** Called once the idea hangs above the water. */
  onCaught: (() => void) | null = null;

  private sharks: Shark[];
  private fish: Fish[];
  private particles: Particle[] = [];
  private waves: Wave[] = [];
  private rings: Ring[] = [];
  private motes: { x: number; y: number; r: number; speed: number; drift: number }[] = [];
  private t = 0;
  private rand: () => number;
  private heat = 0;
  private nextAutoBite = 2.2;

  // Camera.
  private pan = 0;
  private panFrom = 0;
  private panTo = 0;
  private panStart = 0;
  private panDur = 0;

  // The idea card.
  private idea = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, ang: 0, spin: 0, flip: 0, flipTarget: 0, inWater: false };
  private ideaVisible = false;
  private hook = { x: 0, y: 0, on: false, hooked: false, half: 0, halfTarget: 0 };
  private catchT = 0;
  private catchFrom = { hookY: 0, pan: 0 };
  private hang = { screenY: 0, half: 0, panTarget: 0 };
  private dripUntil = 0;

  constructor(
    sharkSpecs: SharkSpec[],
    fishCount: number,
    private colors: TankColors,
    seed = 7,
    private font = "sans-serif",
  ) {
    this.rand = mulberry(seed);
    this.sharks = sharkSpecs.map((spec, i) => ({
      spec,
      pos: { x: i % 2 ? this.w + 200 : -200, y: this.h * 0.6 },
      vel: { x: 0, y: 0 },
      phase: (i / sharkSpecs.length) * TAU + this.rand() * 0.5,
      speed: (0.42 + this.rand() * 0.16) * (i % 2 ? -1 : 1),
      joinAt: Infinity,
      joined: false,
      present: 0,
      lunge: 0,
      recoil: 0,
      tail: this.rand() * TAU,
    }));
    this.fish = Array.from({ length: fishCount }, (_, i) => ({
      pos: { x: 0, y: 0 },
      vel: { x: -20 + this.rand() * 40, y: -10 + this.rand() * 20 },
      reaction: null,
      prev: null,
      tint: 0,
      cast: false,
      seed: this.rand() * 1000 + i,
      frac: this.rand(),
      tail: this.rand() * TAU,
      pop: 0,
      fleeing: 0,
    }));
    this.resize(this.w, this.h, true);
  }

  // --- geometry ----------------------------------------------------------

  private get base() {
    return Math.min(this.w, this.h * 1.6);
  }
  get sharkLen() {
    return clamp(this.base * 0.19, 74, 150);
  }
  get fishLen() {
    return clamp(this.sharkLen * 0.11, 8.5, 15);
  }
  /** Speed unit: 1 for a 120 px shark. */
  get u() {
    return this.sharkLen / 120;
  }
  get card() {
    const w = clamp(this.base * 0.13, 64, 104);
    return { w, h: w * 0.62 };
  }
  /** The water line, in world pixels. */
  get surface() {
    return clamp(this.h * 0.16, 64, 96);
  }
  /** Lowest visible world y (the camera may be raised). */
  private get bottom() {
    return this.h - this.pan;
  }
  private get band() {
    const top = this.surface + 6;
    const bottom = Math.max(top + 40, this.bottom - 6);
    return { top, bottom, mid: (top + bottom) / 2, half: (bottom - top) / 2 };
  }

  /** The water line on screen right now. */
  get surfaceScreen() {
    return this.surface + this.pan;
  }

  /** Where the pitch card sits before it drops (screen pixels). */
  get introPoint(): Vec {
    return { x: this.w / 2, y: this.introPan() * 0.5 + this.surface * 0.5 };
  }

  private introPan() {
    return Math.max(0, this.h * 0.58 - this.surface);
  }

  resize(w: number, h: number, scatter = false) {
    const sx = w / this.w;
    const sy = h / this.h;
    this.w = w;
    this.h = h;
    if (this.phase === "intro") this.pan = this.panTo = this.introPan();
    if (this.phase === "hoisted") this.layoutHang(this.hang.half);
    const b = this.band;
    for (const f of this.fish) {
      f.pos = scatter
        ? { x: 20 + this.rand() * (w - 40), y: b.top + this.rand() * (b.bottom - b.top) }
        : { x: f.pos.x * sx, y: clamp(f.pos.y * sy, b.top, b.bottom) };
    }
    for (const s of this.sharks) if (!scatter) s.pos = { x: s.pos.x * sx, y: s.pos.y * sy };
    this.idea.pos = { x: this.idea.pos.x * sx, y: this.idea.pos.y * sy };
    if (!scatter && this.motes.length) {
      for (const m of this.motes) {
        m.x *= sx;
        m.y *= sy;
      }
      return;
    }
    const count = Math.round(clamp((w * h) / 9000, 20, 64));
    this.motes = Array.from({ length: count }, () => ({
      x: this.rand() * w,
      y: this.surface + this.rand() * (h - this.surface),
      r: 0.6 + this.rand() * 1.8,
      speed: 8 + this.rand() * 16,
      drift: this.rand() * TAU,
    }));
  }

  // --- events ------------------------------------------------------------

  /** The pitch card has turned into the idea: it falls from `screen` into the water. */
  drop(screen: Vec) {
    if (this.phase !== "intro") return;
    this.phase = "falling";
    this.idea.pos = { x: screen.x, y: screen.y - this.pan };
    this.idea.vel = { x: 0, y: 40 * this.u };
    this.idea.spin = (this.rand() - 0.5) * 1.2;
    this.ideaVisible = true;
    this.movePan(0, 1.15);
    this.sharks.forEach((s, i) => {
      s.joinAt = this.t + 0.55 + i * 0.3;
      const b = this.band;
      s.pos = { x: i % 2 ? this.w + this.sharkLen : -this.sharkLen, y: lerp(b.top + 30, this.h - 40, (i + 0.5) / this.sharks.length) };
    });
  }

  /** Skip the intro: the idea is already in the water and the sharks are on it. */
  placeInWater() {
    this.phase = "frenzy";
    this.pan = this.panTo = 0;
    this.panDur = 0;
    const b = this.band;
    this.idea.pos = { x: this.w / 2, y: b.mid };
    this.idea.vel = { x: 0, y: 0 };
    this.idea.inWater = true;
    this.ideaVisible = true;
    this.sharks.forEach((s, i) => {
      s.joined = true;
      s.present = 1;
      s.pos = this.orbitPoint(s, i);
    });
  }

  /** A shark goes for the idea. */
  bite(i: number) {
    const s = this.sharks[i];
    if (!s || this.phase !== "frenzy") return;
    s.joined = true;
    s.lunge = 1.5;
    s.recoil = 0;
    this.nextAutoBite = this.t + 2 + this.rand() * 1.2;
  }

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
      this.heat = Math.min(1, this.heat + 0.05);
    }
  }

  /** Colour every fish at once (cached verdicts, reduced motion). */
  settleFish(reactions: (Reaction | null)[]) {
    reactions.forEach((r, i) => {
      const f = this.fish[i];
      if (!f) return;
      f.cast = true;
      f.reaction = r;
      f.tint = 1;
    });
  }

  /** Reel the idea out. `hangScreenY` is where its centre ends up; `half` the card's half height there. */
  startCatch(hangScreenY: number, half: number) {
    if (this.phase !== "frenzy") return;
    this.phase = "catch";
    this.catchT = 0;
    this.hang.screenY = hangScreenY;
    this.layoutHang(half);
    this.hook = { x: this.w / 2, y: -this.pan - 30, on: true, hooked: false, half: this.card.h / 2, halfTarget: this.card.h / 2 };
    this.catchFrom = { hookY: this.hook.y, pan: this.pan };
    this.sharks.forEach((s) => (s.lunge = 0));
  }

  /** Straight to the end: the idea hangs above the water (cached verdicts, reduced motion). */
  showHoisted(hangScreenY: number, half: number) {
    this.phase = "hoisted";
    this.hang.screenY = hangScreenY;
    this.layoutHang(half);
    this.pan = this.panTo = this.hang.panTarget;
    this.panDur = 0;
    this.ideaVisible = false;
    this.hook = { x: this.w / 2, y: 0, on: true, hooked: true, half, halfTarget: half };
    this.idea.pos = { x: this.w / 2, y: hangScreenY - this.pan };
    this.hook.y = this.idea.pos.y - half;
    this.sharks.forEach((s, i) => {
      s.joined = true;
      s.present = 1;
      s.pos = { x: i % 2 ? this.w + this.sharkLen * 1.2 : -this.sharkLen * 1.2, y: this.band.mid };
    });
    const b = this.band;
    for (const f of this.fish) f.pos.y = clamp(f.pos.y, b.top, b.bottom);
  }

  /** The DOM card has taken over from the canvas card; the hook follows its top edge. */
  handOff(half: number) {
    this.ideaVisible = false;
    this.hook.halfTarget = half;
    this.dripUntil = this.t + 1.8;
  }

  /** Where the hoisted card's centre should be for a card of this half height. */
  hangPoint(half: number): number {
    return Math.max(half + 30, this.h * 0.36);
  }

  private layoutHang(half: number) {
    this.hang.half = half;
    const water = Math.min(this.h - 64, this.hang.screenY + half + 44);
    this.hang.panTarget = Math.max(0, water - this.surface);
  }

  private movePan(to: number, dur: number) {
    this.panFrom = this.pan;
    this.panTo = to;
    this.panStart = this.t;
    this.panDur = dur;
  }

  fishPosition(i: number): Vec | null {
    const f = this.fish[i];
    return f ? { x: f.pos.x, y: f.pos.y + this.pan } : null;
  }

  sharkPosition(i: number): Vec | null {
    const s = this.sharks[i];
    return s ? { x: s.pos.x, y: s.pos.y + this.pan } : null;
  }

  // --- simulation --------------------------------------------------------

  private orbitPoint(s: Shark, i: number): Vec {
    const b = this.band;
    const c =
      this.phase === "frenzy"
        ? { x: lerp(this.w / 2, this.idea.pos.x, 0.55), y: lerp(b.mid, this.idea.pos.y, 0.55) }
        : { x: this.w / 2, y: b.mid };
    // Out of the frenzy the band is shallow, so the sharks spread wide instead of piling up.
    const rx = this.w * (this.phase === "frenzy" ? 0.27 + (i % 3) * 0.045 : 0.34 + (i % 3) * 0.04);
    const ry = b.half * (0.62 + ((i + 1) % 3) * 0.12);
    const L = this.sharkLen;
    // Keep the dorsal fin under the water line and the belly above the floor.
    const lo = b.top + L * 0.32;
    const hi = Math.max(lo, b.bottom - L * 0.2);
    return {
      x: clamp(c.x + Math.cos(s.phase) * rx, -L * 0.2, this.w + L * 0.2),
      y: clamp(c.y + Math.sin(s.phase) * ry, lo, hi),
    };
  }

  step(dt: number) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;

    if (this.panDur > 0) {
      const k = clamp((this.t - this.panStart) / this.panDur, 0, 1);
      this.pan = lerp(this.panFrom, this.panTo, easeInOut(k));
      if (k >= 1) this.panDur = 0;
    }

    this.stepIdea(dt);
    this.stepSharks(dt);
    this.stepFish(dt);
    this.stepParticles(dt);

    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < 1.4);
    for (const wv of this.waves) wv.age += dt;
    this.waves = this.waves.filter((wv) => wv.age < 3);
    for (const m of this.motes) {
      m.y -= m.speed * dt;
      m.x += Math.sin(this.t * 0.8 + m.drift) * 4 * dt;
      if (m.y < this.surface + 4) {
        m.y = this.h + 4;
        m.x = this.rand() * this.w;
      }
    }
    this.heat *= Math.exp(-dt * 0.03);

    // Ambient bites keep the frenzy going between the scripted ones.
    if (this.phase === "frenzy" && this.t > this.nextAutoBite && !this.sharks.some((s) => s.lunge > 0)) {
      const ready = this.sharks.map((s, i) => (s.present > 0.9 ? i : -1)).filter((i) => i >= 0);
      if (ready.length) this.bite(ready[Math.floor(this.rand() * ready.length)]);
      else this.nextAutoBite = this.t + 0.5;
    }
  }

  private stepIdea(dt: number) {
    const id = this.idea;
    const u = this.u;
    const b = this.band;
    const { w: cw, h: ch } = this.card;

    if (this.phase === "falling" || (this.phase === "frenzy" && !id.inWater)) {
      if (!id.inWater) {
        id.vel.y += 1300 * u * dt;
        if (id.pos.y > this.surface) {
          id.inWater = true;
          this.splash(id.pos.x, 1, id.vel.y);
          id.vel.y *= 0.4;
          id.vel.x += (this.rand() - 0.5) * 60 * u;
          id.spin += (this.rand() - 0.5) * 4;
          this.burst(id.pos.x, id.pos.y + 10, 16);
          this.phase = "frenzy";
          this.nextAutoBite = this.t + 1.6;
        }
      }
    } else if (this.phase === "frenzy") {
      // Drag, a slow drift back to the middle, and bounces off the glass.
      const drag = Math.exp(-dt * 1.5);
      id.vel.x = id.vel.x * drag + (this.w / 2 - id.pos.x) * 0.9 * dt;
      id.vel.y = id.vel.y * drag + (b.mid - id.pos.y) * 1.4 * dt;
      id.spin *= Math.exp(-dt * 1.8);
      id.ang = wrapAngle(id.ang);
      id.spin += -id.ang * 2.2 * dt;
    } else if (this.phase === "catch") {
      this.stepCatch(dt);
    }

    if (this.phase !== "catch" && this.phase !== "hoisted") {
      id.pos.x += id.vel.x * dt;
      id.pos.y += id.vel.y * dt;
      id.ang += id.spin * dt;
      if (id.inWater) {
        const lo = { x: cw * 0.55, y: b.top + ch * 0.6 };
        const hi = { x: this.w - cw * 0.55, y: b.bottom - ch * 0.6 };
        if (id.pos.x < lo.x) {
          id.pos.x = lo.x;
          id.vel.x = Math.abs(id.vel.x) * 0.6;
        }
        if (id.pos.x > hi.x) {
          id.pos.x = hi.x;
          id.vel.x = -Math.abs(id.vel.x) * 0.6;
        }
        if (id.pos.y < lo.y) {
          id.pos.y = lo.y;
          id.vel.y = Math.abs(id.vel.y) * 0.5;
        }
        if (id.pos.y > hi.y) {
          id.pos.y = hi.y;
          id.vel.y = -Math.abs(id.vel.y) * 0.6;
        }
        if (this.rand() < dt * 3) this.particles.push(this.bubble(id.pos.x + (this.rand() - 0.5) * cw * 0.5, id.pos.y - ch * 0.4));
      }
    }
    id.flip += (id.flipTarget - id.flip) * (1 - Math.exp(-dt * 7));
  }

  private stepCatch(dt: number) {
    const id = this.idea;
    const hk = this.hook;
    this.catchT += dt;
    const ch = this.card.h;

    if (this.catchT < CATCH_HOOK) {
      // The idea is drawn to the middle while the hook comes down to meet it.
      const k = 1 - Math.exp(-dt * 5);
      id.pos.x = lerp(id.pos.x, this.w / 2, k);
      id.pos.y = lerp(id.pos.y, this.band.mid, k);
      id.ang = lerp(wrapAngle(id.ang), 0, k);
      id.flipTarget = Math.round(id.flipTarget / TAU) * TAU;
      hk.y = lerp(this.catchFrom.hookY, id.pos.y - ch / 2, easeOut(this.catchT / CATCH_HOOK));
      hk.x = this.w / 2;
      return;
    }

    if (!hk.hooked) {
      hk.hooked = true;
      this.catchFrom = { hookY: id.pos.y - ch / 2, pan: this.pan };
      this.burst(id.pos.x, id.pos.y - ch / 2, 10);
    }

    const k = clamp((this.catchT - CATCH_HOOK) / CATCH_PULL, 0, 1);
    const e = easeInOut(k);
    this.pan = lerp(this.catchFrom.pan, this.hang.panTarget, e);
    const hangWorld = this.hang.screenY - this.hang.panTarget;
    const wasUnder = id.pos.y > this.surface;
    hk.y = lerp(this.catchFrom.hookY, hangWorld - ch / 2, e);
    id.pos.x = this.w / 2;
    id.pos.y = hk.y + ch / 2;
    id.ang = Math.sin(this.t * 5) * 0.06 * (1 - k);
    if (wasUnder && id.pos.y <= this.surface) {
      this.splash(id.pos.x, 0.8, 500 * this.u);
      this.dripUntil = this.t + 1.2;
    }
    if (k >= 1) {
      this.phase = "hoisted";
      const cb = this.onCaught;
      this.onCaught = null;
      cb?.();
    }
  }

  private stepSharks(dt: number) {
    const u = this.u;
    const id = this.idea;
    const L = this.sharkLen;
    this.sharks.forEach((s, i) => {
      if (!s.joined && this.t >= s.joinAt) s.joined = true;
      if (s.joined) s.present = Math.min(1, s.present + dt * 1.8);
      const frenzy = this.phase === "frenzy";
      s.phase += dt * s.speed * (frenzy ? 1.25 : 0.7);
      let target = this.orbitPoint(s, i);
      let max = (frenzy ? 230 : 150) * u;

      if (s.lunge > 0 && frenzy) {
        s.lunge -= dt;
        target = { x: id.pos.x + id.vel.x * 0.12, y: id.pos.y + id.vel.y * 0.12 };
        max = 470 * u;
        const sp = Math.hypot(s.vel.x, s.vel.y) || 1;
        const head = { x: s.pos.x + (s.vel.x / sp) * L * 0.42, y: s.pos.y + (s.vel.y / sp) * L * 0.42 };
        if (Math.hypot(head.x - id.pos.x, head.y - id.pos.y) < this.card.w * 0.55) this.land(s, i);
      } else if (s.recoil > 0) {
        s.recoil -= dt;
      }
      // Not here yet, or done: the prey is out of the water and the sharks lose interest.
      if (!s.joined || this.phase === "hoisted") target = { x: i % 2 ? this.w + L * 1.2 : -L * 1.2, y: target.y };

      const ax = (target.x - s.pos.x) * 3.2 - s.vel.x * 2.1;
      const ay = (target.y - s.pos.y) * 3.2 - s.vel.y * 2.1;
      s.vel.x += ax * dt;
      s.vel.y += ay * dt;
      // Sharks shoulder each other apart so they never pile into one shape.
      for (const o of this.sharks) {
        if (o === s) continue;
        const dx = s.pos.x - o.pos.x;
        const dy = s.pos.y - o.pos.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.1 && d < L * 0.7) {
          s.vel.x += (dx / d) * (L * 0.7 - d) * 6 * dt;
          s.vel.y += (dy / d) * (L * 0.7 - d) * 6 * dt;
        }
      }
      const sp = Math.hypot(s.vel.x, s.vel.y);
      if (sp > max) {
        s.vel.x *= max / sp;
        s.vel.y *= max / sp;
      }
      s.pos.x += s.vel.x * dt;
      s.pos.y += s.vel.y * dt;
      // Never above the water.
      if (s.joined && this.phase !== "hoisted" && s.pos.y < this.surface + L * 0.28) {
        s.pos.y = this.surface + L * 0.28;
        s.vel.y = Math.abs(s.vel.y) * 0.3;
      }
      if (s.joined && s.pos.y > this.bottom - L * 0.16) {
        s.pos.y = this.bottom - L * 0.16;
        s.vel.y = -Math.abs(s.vel.y) * 0.3;
      }
      s.tail += dt * (5 + sp / (20 * u));
    });
  }

  /** A bite connects: the idea is tossed and flipped. */
  private land(s: Shark, i: number) {
    const id = this.idea;
    const u = this.u;
    const sp = Math.hypot(s.vel.x, s.vel.y) || 1;
    const dx = s.vel.x / sp;
    const dy = s.vel.y / sp;
    const side = this.rand() < 0.5 ? -1 : 1;
    id.vel.x += dx * 430 * u - dy * side * 160 * u;
    id.vel.y += dy * 430 * u + dx * side * 160 * u - 90 * u;
    id.spin += side * (5 + this.rand() * 6);
    id.flipTarget += Math.PI;
    s.lunge = 0;
    s.recoil = 0.7;
    s.vel.x *= 0.35;
    s.vel.y *= 0.35;
    this.bites += 1;
    this.heat = Math.min(1, this.heat + 0.08);
    this.burst(id.pos.x - dx * this.card.w * 0.4, id.pos.y - dy * this.card.h * 0.4, 14);
    this.rings.push({ x: id.pos.x, y: id.pos.y, age: 0, color: this.colors.cream });
    this.onBite?.(i);
  }

  private stepFish(dt: number) {
    const u = this.u;
    const F = this.fishLen;
    const b = this.band;
    const id = this.idea;
    const sepR = F * 1.5;
    const nbR = F * 4.5;
    const fleeR = this.sharkLen * 0.9;

    // Spatial grid: each fish only looks at its own and neighbouring cells.
    const cell = nbR;
    const cols = Math.max(1, Math.ceil(this.w / cell));
    const grid = new Map<number, number[]>();
    this.fish.forEach((f, i) => {
      const key = Math.floor(f.pos.y / cell) * cols + Math.floor(f.pos.x / cell);
      const list = grid.get(key);
      if (list) list.push(i);
      else grid.set(key, [i]);
    });

    const ideaShown = this.ideaVisible && id.inWater;
    this.fish.forEach((f) => {
      let sx = 0,
        sy = 0,
        ax = 0,
        ay = 0,
        cx = 0,
        cy = 0,
        n = 0;
      const gx = Math.floor(f.pos.x / cell);
      const gy = Math.floor(f.pos.y / cell);
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const list = grid.get((gy + oy) * cols + gx + ox);
          if (!list) continue;
          for (const j of list) {
            const g = this.fish[j];
            if (g === f) continue;
            const dx = f.pos.x - g.pos.x;
            const dy = f.pos.y - g.pos.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < nbR * nbR) {
              const wgt = g.reaction === f.reaction ? 1 : 0.3;
              ax += g.vel.x * wgt;
              ay += g.vel.y * wgt;
              cx += g.pos.x * wgt;
              cy += g.pos.y * wgt;
              n += wgt;
            }
            if (d2 < sepR * sepR && d2 > 0.01) {
              const d = Math.sqrt(d2);
              sx += (dx / d) * (sepR - d);
              sy += (dy / d) * (sepR - d);
            }
          }
        }

      const home = this.home(f, b);
      const pull = f.reaction === null ? 0.5 : f.reaction === "share" ? 1.7 : f.reaction === "scroll" ? 0.6 : 1.1;
      let fx = (home.x - f.pos.x) * pull + sx * 10;
      let fy = (home.y - f.pos.y) * pull + sy * 10;
      if (n > 0) {
        fx += (ax / n - f.vel.x) * 0.5 + (cx / n - f.pos.x) * 0.2;
        fy += (ay / n - f.vel.y) * 0.5 + (cy / n - f.pos.y) * 0.2;
      }

      // Scatter from the sharks.
      f.fleeing = Math.max(0, f.fleeing - dt);
      for (const s of this.sharks) {
        if (s.present < 0.3) continue;
        const dx = f.pos.x - s.pos.x;
        const dy = f.pos.y - s.pos.y;
        const d = Math.hypot(dx, dy);
        if (d < fleeR && d > 0.1) {
          const k = 1 - d / fleeR;
          fx += (dx / d) * k * 1500 * u;
          fy += (dy / d) * k * 1500 * u;
          f.fleeing = 0.6;
        }
      }
      // Only the sharers press right up to the idea.
      if (ideaShown && f.reaction !== "share") {
        const dx = f.pos.x - id.pos.x;
        const dy = f.pos.y - id.pos.y;
        const d = Math.hypot(dx, dy);
        const r = this.card.w * 0.9;
        if (d < r && d > 0.1) {
          fx += (dx / d) * (r - d) * 14;
          fy += (dy / d) * (r - d) * 14;
        }
      }
      // Soft glass and water line.
      if (f.pos.y < b.top + 16) fy += (b.top + 16 - f.pos.y) * 14;
      if (f.pos.y > b.bottom - 10) fy -= (f.pos.y - (b.bottom - 10)) * 14;
      if (f.pos.x < 14) fx += (14 - f.pos.x) * 14;
      if (f.pos.x > this.w - 14) fx -= (f.pos.x - (this.w - 14)) * 14;
      fx += Math.sin(this.t * 1.7 + f.seed) * 46 * u;
      fy += Math.cos(this.t * 1.3 + f.seed * 1.7) * 30 * u;

      f.vel.x += (fx - f.vel.x * 1.2) * dt;
      f.vel.y += (fy - f.vel.y * 1.2) * dt;
      const max = (f.fleeing > 0 ? 280 : f.reaction === "scroll" ? 80 : 150) * u;
      const sp = Math.hypot(f.vel.x, f.vel.y);
      if (sp > max) {
        f.vel.x *= max / sp;
        f.vel.y *= max / sp;
      }
      f.pos.x = clamp(f.pos.x + f.vel.x * dt, 4, this.w - 4);
      f.pos.y = clamp(f.pos.y + f.vel.y * dt, b.top, Math.max(b.top, b.bottom));
      f.tail += dt * (8 + sp / (7 * u));
      f.tint = Math.min(1, f.tint + dt * 2.2);
      f.pop = Math.max(0, f.pop - dt);
    });
  }

  /** Where a fish wants to be. Sharers swirl tight round the idea, likers wider, objectors hold off, scrollers drift along the floor. */
  private home(f: Fish, b: { top: number; bottom: number; mid: number; half: number }): Vec {
    const id = this.idea;
    const cw = this.card.w;
    const around = this.ideaVisible && id.inWater ? id.pos : { x: this.w / 2, y: b.mid };
    const dir = f.frac < 0.5 ? 1 : -1;
    let p: Vec;
    switch (f.reaction) {
      case "share": {
        const a = f.seed * 2.3 + this.t * 1.3 * dir;
        const r = cw * (0.75 + f.frac * 0.5);
        p = { x: around.x + Math.cos(a) * r, y: around.y + Math.sin(a) * r * 0.75 };
        break;
      }
      case "like": {
        const a = f.seed * 1.7 + this.t * 0.6 * dir;
        const r = cw * (1.6 + f.frac * 0.8);
        p = { x: around.x + Math.cos(a) * r * 1.2, y: around.y + Math.sin(a) * r * 0.7 };
        break;
      }
      case "object": {
        const a = f.seed * 1.3 + this.t * 0.18 * dir;
        const r = cw * (2.7 + f.frac);
        p = { x: around.x + Math.cos(a) * r * 1.3, y: around.y + Math.sin(a) * r * 0.6 };
        break;
      }
      case "scroll": {
        const span = this.w - 40;
        const x = (((f.seed * 137 + this.t * 22 * dir * this.u) % span) + span) % span;
        p = { x: 20 + x, y: b.bottom - 12 - f.frac * b.half * 0.45 };
        break;
      }
      default: {
        const a = f.seed + this.t * 0.3 * dir;
        p = { x: this.w / 2 + Math.cos(a) * this.w * (0.2 + f.frac * 0.22), y: b.mid + Math.sin(a * 1.3) * b.half * 0.75 };
      }
    }
    return { x: clamp(p.x, 16, this.w - 16), y: clamp(p.y, b.top + 14, b.bottom - 8) };
  }

  private stepParticles(dt: number) {
    const u = this.u;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.kind === "bubble") {
        p.vy -= 60 * u * dt;
        p.vx *= Math.exp(-dt * 2);
        p.x += (p.vx + Math.sin(this.t * 6 + p.max * 40) * 8 * u) * dt;
        p.y += p.vy * dt;
        if (p.y < this.surface + 2) p.life = 0;
      } else {
        const under = p.y > this.surface;
        p.vy += 1300 * u * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!under && p.y > this.surface && p.vy > 0) {
          p.life = 0;
          this.waves.push({ x: p.x, age: 0, amp: 1.4 * u });
        }
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // Water drips off the hoisted card.
    if (this.t < this.dripUntil && this.rand() < dt * 14) {
      const half = this.phase === "hoisted" ? this.hook.half : this.card.h / 2;
      const cw = this.phase === "hoisted" ? half * 1.4 : this.card.w / 2;
      this.particles.push({
        x: this.w / 2 + (this.rand() - 0.5) * cw * 1.6,
        y: this.idea.pos.y + half,
        vx: 0,
        vy: 20 * u,
        r: 1.4 + this.rand() * 1.4,
        life: 3,
        max: 3,
        kind: "drop",
      });
    }
    // The hook's line eases to the DOM card's top edge.
    this.hook.half += (this.hook.halfTarget - this.hook.half) * (1 - Math.exp(-dt * 8));
    if (this.phase === "hoisted") this.hook.y = this.hang.screenY - this.pan - this.hook.half;
  }

  private bubble(x: number, y: number): Particle {
    const u = this.u;
    return { x, y, vx: (this.rand() - 0.5) * 40 * u, vy: -(20 + this.rand() * 40) * u, r: 1.2 + this.rand() * 2.6, life: 2.4, max: this.rand(), kind: "bubble" };
  }

  private burst(x: number, y: number, n: number) {
    for (let k = 0; k < n; k++) {
      const p = this.bubble(x + (this.rand() - 0.5) * 16, y + (this.rand() - 0.5) * 16);
      p.vx *= 4;
      this.particles.push(p);
    }
  }

  private splash(x: number, power: number, speed: number) {
    const u = this.u;
    this.waves.push({ x, age: 0, amp: 9 * u * power });
    const n = Math.round(18 * power);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (this.rand() - 0.5) * 1.6;
      const v = (180 + this.rand() * 260) * u * power * clamp(speed / (500 * u), 0.6, 1.4);
      this.particles.push({ x, y: this.surface - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + this.rand() * 2.2, life: 2, max: 2, kind: "drop" });
    }
  }

  private surfaceAt(x: number) {
    let y = this.surface + Math.sin(this.t * 1.4 + x / (60 * this.u)) * 1.6 * this.u;
    for (const wv of this.waves) {
      const d = Math.abs(x - wv.x);
      y += wv.amp * Math.exp(-wv.age * 1.5) * Math.exp(-d / (120 * this.u)) * Math.sin(d / (14 * this.u) - wv.age * 9);
    }
    return y;
  }

  // --- drawing -----------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D) {
    const { w, h } = this;
    const c = this.colors;
    const u = this.u;
    const S = this.surface;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(0, this.pan);
    const top = -this.pan - 2;

    // Sky, with the page's grid.
    const sky = ctx.createLinearGradient(0, top, 0, S);
    sky.addColorStop(0, c.skyTop);
    sky.addColorStop(1, c.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, top, w, S - top + 12);
    ctx.strokeStyle = "rgba(16,32,28,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ((w / 2) % 32) - 32; x < w; x += 32) {
      ctx.moveTo(x + 0.5, top);
      ctx.lineTo(x + 0.5, S + 10);
    }
    for (let y = S - 32; y > top; y -= 32) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // Water body under a moving surface.
    const step = Math.max(6, w / 120);
    ctx.beginPath();
    ctx.moveTo(0, h + 2);
    for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, this.surfaceAt(x));
    ctx.lineTo(w, h + 2);
    ctx.closePath();
    const water = ctx.createLinearGradient(0, S, 0, h);
    water.addColorStop(0, c.waterTop);
    water.addColorStop(1, c.waterBottom);
    ctx.fillStyle = water;
    ctx.fill();

    // Light shafts, mirrored about the centre.
    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 6; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      const base = w / 2 + side * (w * (0.08 + Math.floor(k / 2) * 0.15));
      const sway = Math.sin(this.t * 0.25 + k * 1.3) * 30 * u;
      const spread = (40 + (k % 3) * 22) * u;
      const shaft = ctx.createLinearGradient(0, S, 0, h);
      shaft.addColorStop(0, "rgba(241,236,223,0.08)");
      shaft.addColorStop(1, "rgba(241,236,223,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(base + sway - spread * 0.3, S);
      ctx.lineTo(base + sway + spread * 0.3, S);
      ctx.lineTo(base + sway + spread + side * 60 * u, h);
      ctx.lineTo(base + sway - spread + side * 60 * u, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(241,236,223,0.2)";
    for (const m of this.motes) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.fill();
    }

    for (const r of this.rings) {
      const k = r.age / 1.4;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, (6 + k * 40) * u, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Scrollers swim behind everything; the rest in front of the idea.
    for (const f of this.fish) if (f.reaction === "scroll") this.drawFish(ctx, f);
    if (this.ideaVisible && this.idea.inWater) this.drawIdea(ctx);
    for (const f of this.fish) if (f.reaction !== "scroll") this.drawFish(ctx, f);
    this.sharks.forEach((s) => this.drawShark(ctx, s));

    // The water line.
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, this.surfaceAt(x));
    ctx.stroke();
    ctx.strokeStyle = "rgba(241,236,223,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, this.surfaceAt(x) + 4);
    ctx.stroke();

    if (this.ideaVisible && !this.idea.inWater) this.drawIdea(ctx);
    if (this.ideaVisible && this.idea.inWater && this.phase === "catch" && this.idea.pos.y < S) this.drawIdea(ctx);

    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 0.4) * (p.kind === "bubble" ? 0.55 : 0.9);
      if (p.kind === "bubble") {
        ctx.strokeStyle = c.cream;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.y < S ? "#5d8c80" : c.cream;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (this.hook.on) this.drawLine(ctx, top);
    ctx.restore();
  }

  private drawIdea(ctx: CanvasRenderingContext2D) {
    const c = this.colors;
    const id = this.idea;
    const { w: cw, h: ch } = this.card;
    const u = this.u;
    const sx = Math.cos(id.flip);
    const back = sx < 0;
    ctx.save();
    ctx.translate(id.pos.x, id.pos.y);
    ctx.rotate(id.ang);
    ctx.scale(Math.max(0.06, Math.abs(sx)), 1);
    ctx.fillStyle = c.blood;
    ctx.fillRect(-cw / 2 + 5 * u, -ch / 2 + 5 * u, cw, ch);
    ctx.fillStyle = back ? c.coral : c.paper;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 3;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
    ctx.fillStyle = c.ink;
    ctx.font = `900 ${Math.round(ch * 0.56)}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IDEA", 0, ch * 0.04);
    ctx.restore();
  }

  private drawLine(ctx: CanvasRenderingContext2D, top: number) {
    const c = this.colors;
    const u = this.u;
    const hk = this.hook;
    const x = hk.x;
    const y = hk.y;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, y - 14 * u);
    ctx.stroke();
    // The hook: a short shank and a J that bites into the card's top edge.
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * u);
    ctx.lineTo(x, y + 2 * u);
    ctx.arc(x - 6 * u, y + 2 * u, 6 * u, 0, Math.PI * 0.95);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = this.colors.coral;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 22 * u, 5 * u, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  private drawFish(ctx: CanvasRenderingContext2D, f: Fish) {
    const c = this.colors;
    const ang = Math.atan2(f.vel.y, f.vel.x);
    const len = this.fishLen * (1 + f.pop * 0.6);
    const from = f.prev ? c.reaction[f.prev] : c.reaction.pending;
    const to = f.reaction ? c.reaction[f.reaction] : c.reaction.pending;
    const color = f.tint >= 1 ? to : mix(from, to, f.tint);
    ctx.save();
    ctx.translate(f.pos.x, f.pos.y);
    ctx.rotate(ang);
    ctx.globalAlpha = f.reaction === "scroll" ? 0.5 : f.cast ? 1 : 0.6;
    const sway = Math.sin(f.tail) * 0.5;
    ctx.fillStyle = color;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-len * 0.4, 0);
    ctx.lineTo(-len * 0.95, -len * 0.34 + sway * len * 0.25);
    ctx.lineTo(-len * 0.95, len * 0.34 + sway * len * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.55, len * 0.28, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(len * 0.28, -len * 0.06, Math.max(0.9, len * 0.065), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawShark(ctx: CanvasRenderingContext2D, s: Shark) {
    if (s.present <= 0.01) return;
    const c = this.colors;
    const u = this.u;
    const ang = Math.atan2(s.vel.y, s.vel.x || 0.001);
    const L = this.sharkLen;
    const W = L * 0.19;
    const sway = Math.sin(s.tail) * 0.3;
    // Side view: flip vertically when swimming left so the fin stays on top.
    const left = Math.cos(ang) < 0;

    ctx.save();
    ctx.globalAlpha = s.present;
    ctx.translate(s.pos.x, s.pos.y);
    ctx.save();
    ctx.translate(5 * u, 7 * u);
    ctx.rotate(ang);
    if (left) ctx.scale(1, -1);
    ctx.fillStyle = "rgba(10,22,19,0.35)";
    this.sharkPath(ctx, L, W, sway);
    ctx.fill();
    ctx.restore();

    ctx.rotate(ang);
    if (left) ctx.scale(1, -1);
    ctx.fillStyle = s.spec.color;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    this.sharkPath(ctx, L, W, sway);
    ctx.fill();
    ctx.stroke();
    // Belly, gills, eye, and teeth when it lunges.
    ctx.fillStyle = "rgba(250,247,239,0.55)";
    ctx.beginPath();
    ctx.moveTo(L * 0.44, W * 0.25);
    ctx.quadraticCurveTo(0, W * 1.05, -L * 0.3, W * 0.35);
    ctx.quadraticCurveTo(0, W * 0.5, L * 0.44, W * 0.25);
    ctx.fill();
    ctx.strokeStyle = "rgba(16,32,28,0.55)";
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
      const gx = L * (0.2 - k * 0.045);
      ctx.beginPath();
      ctx.moveTo(gx, -W * 0.35);
      ctx.quadraticCurveTo(gx - L * 0.02, 0, gx, W * 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(L * 0.34, -W * 0.25, Math.max(1.6, 2.4 * u), 0, TAU);
    ctx.fill();
    if (s.lunge > 0) {
      ctx.fillStyle = c.paper;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const tx = L * (0.43 - k * 0.035);
        ctx.moveTo(tx, W * 0.32);
        ctx.lineTo(tx - L * 0.015, W * 0.55);
        ctx.lineTo(tx - L * 0.03, W * 0.32);
      }
      ctx.fill();
    }
    ctx.restore();

    if (u > 0.6) {
      ctx.save();
      ctx.globalAlpha = s.present * 0.9;
      ctx.font = `700 ${Math.round(10 * u + 1)}px ui-monospace, "Space Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = c.cream;
      ctx.fillText(s.spec.label.toUpperCase(), s.pos.x, s.pos.y - W * 2.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Side-view shark: pointed snout, dorsal fin on top, pectoral fin below, forked tail that swings. */
  private sharkPath(ctx: CanvasRenderingContext2D, L: number, W: number, sway: number) {
    const tx = -L * 0.42;
    const ty = sway * W * 1.2;
    ctx.beginPath();
    ctx.moveTo(L * 0.52, W * 0.1);
    ctx.quadraticCurveTo(L * 0.4, -W * 0.95, L * 0.12, -W);
    // Dorsal fin.
    ctx.lineTo(L * 0.02, -W * 2.3);
    ctx.quadraticCurveTo(-L * 0.04, -W * 1.4, -L * 0.1, -W * 0.85);
    ctx.quadraticCurveTo(-L * 0.28, -W * 0.55, tx, ty - W * 0.22);
    // Tail.
    ctx.lineTo(tx - L * 0.13, ty - W * 1.9);
    ctx.lineTo(tx - L * 0.06, ty);
    ctx.lineTo(tx - L * 0.11, ty + W * 1.3);
    ctx.lineTo(tx, ty + W * 0.22);
    ctx.quadraticCurveTo(-L * 0.2, W * 0.75, L * 0.02, W * 0.9);
    // Pectoral fin.
    ctx.lineTo(-L * 0.06, W * 1.9);
    ctx.lineTo(L * 0.12, W * 0.92);
    ctx.quadraticCurveTo(L * 0.4, W * 0.8, L * 0.52, W * 0.1);
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
