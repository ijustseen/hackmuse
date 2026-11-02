import { motionValue, type MotionValue } from "motion/react";
import type { DebateLine } from "../types";

export type PlayerStatus = "idle" | "buffering" | "playing" | "paused" | "done";

export interface PlayerSnapshot {
  lines: DebateLine[];
  /** True once the server has sent every line (and the scores). */
  complete: boolean;
  index: number;
  status: PlayerStatus;
}

const GAP_MS = 420;

/** Reading time for a line: ~3.4 words a second, so the typing never outruns a reader. */
function readingMs(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.min(9000, Math.max(2200, (words / 3.4) * 1000));
}

export const IDLE_SNAPSHOT: PlayerSnapshot = {
  lines: [],
  complete: false,
  index: -1,
  status: "idle",
};

/**
 * Plays a debate line by line while it is still streaming in. Each line types out over its
 * reading time; when playback catches up with Gemma it waits in "buffering" until the next line
 * arrives. Lives outside React so timer callbacks never see stale state; the UI subscribes via
 * useSyncExternalStore.
 */
export class DebateEngine {
  readonly progress: MotionValue<number> = motionValue(0);

  private snapshot: PlayerSnapshot;
  private listeners = new Set<() => void>();
  private waitingFor = -1;
  private token = 0;
  private raf = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private clock = { elapsed: 0, since: 0, duration: 1 };

  constructor(lines: DebateLine[] = [], complete = false) {
    this.snapshot = { ...IDLE_SNAPSHOT, lines, complete };
  }

  // --- store -------------------------------------------------------------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<PlayerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  private get lines() {
    return this.snapshot.lines;
  }

  // --- streaming input ---------------------------------------------------

  push(line: DebateLine) {
    this.set({ lines: [...this.lines, line] });
    if (this.waitingFor === this.lines.length - 1) this.play(this.waitingFor);
  }

  finish() {
    this.set({ complete: true });
    if (this.waitingFor === this.lines.length) this.play(this.lines.length);
  }

  // --- controls ----------------------------------------------------------

  start() {
    this.play(0);
  }

  toggle() {
    const { status, index } = this.snapshot;
    if (status === "playing") this.pause();
    else if (status === "paused") this.resume();
    else if (status === "done") this.play(0);
    else if (status === "idle") this.play(Math.max(0, index));
  }

  next() {
    this.play(Math.min(this.snapshot.index + 1, this.lines.length));
  }

  prev() {
    this.play(Math.max(0, this.snapshot.index - 1));
  }

  jumpTo(i: number) {
    this.play(Math.max(0, Math.min(i, this.lines.length)));
  }

  skipToEnd() {
    this.play(this.snapshot.complete ? this.lines.length : Math.max(0, this.lines.length - 1));
  }

  dispose() {
    this.halt();
    this.waitingFor = -1;
    this.set({ index: -1, status: "idle" });
  }

  // --- internals ---------------------------------------------------------

  private pause() {
    this.clock.elapsed += performance.now() - this.clock.since;
    this.set({ status: "paused" });
  }

  private resume() {
    this.clock.since = performance.now();
    this.set({ status: "playing" });
  }

  private halt() {
    this.token++;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
  }

  private play(i: number) {
    this.halt();
    const token = this.token;
    this.waitingFor = -1;

    if (i >= this.lines.length) {
      if (this.snapshot.complete) {
        this.progress.set(1);
        this.set({ index: this.lines.length, status: "done" });
      } else {
        // Caught up with Gemma: wait for push()/finish().
        this.waitingFor = i;
        this.progress.set(0);
        this.set({ index: i, status: "buffering" });
      }
      return;
    }

    this.progress.set(0);
    this.clock = { elapsed: 0, since: performance.now(), duration: readingMs(this.lines[i].text) };
    this.set({ index: i, status: "playing" });
    this.loop(token);
  }

  private advance(token: number, i: number) {
    if (token !== this.token) return;
    this.progress.set(1);
    this.timer = setTimeout(() => {
      if (token === this.token) this.play(i + 1);
    }, GAP_MS);
  }

  private loop(token: number) {
    const tick = () => {
      if (token !== this.token) return;
      if (this.snapshot.status === "playing") {
        const c = this.clock;
        const elapsed = c.elapsed + (performance.now() - c.since);
        this.progress.set(Math.min(1, elapsed / c.duration));
        if (elapsed >= c.duration) {
          this.advance(token, this.snapshot.index);
          return;
        }
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}
