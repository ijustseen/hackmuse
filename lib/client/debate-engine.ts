import { motionValue, type MotionValue } from "motion/react";
import type { DebateLine } from "../types";

export type PlayerStatus = "idle" | "buffering" | "playing" | "paused" | "blocked" | "done";
export type VoiceState = "pending" | "on" | "off";

export interface PlayerSnapshot {
  lines: DebateLine[];
  /** True once the server has sent every line (and the scores). */
  complete: boolean;
  index: number;
  status: PlayerStatus;
  voice: VoiceState;
  muted: boolean;
}

const GAP_MS = 380;

/** Reading time for captions-only mode, ~2.7 words per second. */
function estimateMs(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2600, (words / 2.7) * 1000);
}

export const IDLE_SNAPSHOT: PlayerSnapshot = {
  lines: [],
  complete: false,
  index: -1,
  status: "idle",
  voice: "pending",
  muted: false,
};

/**
 * Plays a debate line by line while it is still streaming in. Each line is
 * voiced through /api/tts (ElevenLabs) and prefetched two lines ahead; if TTS is
 * unavailable the engine falls back to timed captions so the show never stalls.
 * When playback catches up with Gemma it waits in "buffering" until the next
 * line arrives. Lives outside React so playback callbacks never see stale
 * state; the UI subscribes via useSyncExternalStore.
 */
export class DebateEngine {
  readonly progress: MotionValue<number> = motionValue(0);

  private snapshot: PlayerSnapshot;
  private listeners = new Set<() => void>();
  private clips = new Map<number, Promise<string | null>>();
  private voiceOff = false;
  private waitingFor = -1;
  private token = 0;
  private raf = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private clock = { mode: "timer" as "audio" | "timer", elapsed: 0, since: 0, duration: 1 };
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;

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

  get analyser() {
    return this.analyserNode;
  }

  // --- streaming input ---------------------------------------------------

  push(line: DebateLine) {
    this.set({ lines: [...this.lines, line] });
    const i = this.lines.length - 1;
    if (i - Math.max(0, this.snapshot.index) <= 2) this.clip(i);
    if (this.waitingFor === i) void this.play(i);
  }

  finish() {
    this.set({ complete: true });
    if (this.waitingFor === this.lines.length) void this.play(this.lines.length);
  }

  // --- controls ----------------------------------------------------------

  start() {
    void this.play(0);
  }

  /** Called from a click after the browser blocked autoplay. */
  unblock() {
    void this.play(Math.max(0, this.snapshot.index));
  }

  toggle() {
    const { status, index } = this.snapshot;
    if (status === "playing") this.pause();
    else if (status === "paused") this.resume();
    else if (status === "done") void this.play(0);
    else if (status === "idle") void this.play(Math.max(0, index));
    else if (status === "blocked") this.unblock();
  }

  next() {
    void this.play(Math.min(this.snapshot.index + 1, this.lines.length));
  }

  prev() {
    void this.play(Math.max(0, this.snapshot.index - 1));
  }

  jumpTo(i: number) {
    void this.play(Math.max(0, Math.min(i, this.lines.length)));
  }

  skipToEnd() {
    void this.play(this.snapshot.complete ? this.lines.length : Math.max(0, this.lines.length - 1));
  }

  setMuted(muted: boolean) {
    if (this.audio) this.audio.muted = muted;
    this.set({ muted });
  }

  /** Stops playback. Fetched clips are kept, so a restart (React StrictMode
   *  re-runs effects in dev) doesn't pay ElevenLabs for the same lines twice;
   *  the blob URLs are small and die with the page. */
  dispose() {
    this.halt();
    this.waitingFor = -1;
    this.set({ index: -1, status: "idle" });
  }

  // --- internals ---------------------------------------------------------

  private pause() {
    if (this.clock.mode === "audio") this.audio?.pause();
    else this.clock.elapsed += performance.now() - this.clock.since;
    this.set({ status: "paused" });
  }

  private resume() {
    if (this.clock.mode === "audio") {
      this.audio?.play().catch(() => this.set({ status: "blocked" }));
    } else {
      this.clock.since = performance.now();
    }
    this.set({ status: "playing" });
  }

  private halt() {
    this.token++;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    if (this.audio) {
      this.audio.onended = null;
      this.audio.pause();
    }
  }

  private getAudio() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
    }
    return this.audio;
  }

  /** Routes audio through an AnalyserNode for the live waveform — only once the
   *  AudioContext is actually running, otherwise the element would play silently. */
  private async ensureGraph() {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx ??= new Ctx();
    if (this.ctx.state !== "running") {
      await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 300))]).catch(() => {});
    }
    if (this.analyserNode || this.ctx.state !== "running") return;
    const source = this.ctx.createMediaElementSource(this.getAudio());
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    analyser.connect(this.ctx.destination);
    this.analyserNode = analyser;
  }

  private clip(i: number): Promise<string | null> {
    if (i < 0 || i >= this.lines.length) return Promise.resolve(null);
    let p = this.clips.get(i);
    if (!p) {
      p = this.fetchClip(this.lines[i]);
      this.clips.set(i, p);
    }
    return p;
  }

  private async fetchClip(line: DebateLine): Promise<string | null> {
    if (this.voiceOff) return null;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker: line.speaker, text: line.text, cue: line.cue }),
      });
      if (res.status === 503) {
        this.voiceOff = true;
        this.set({ voice: "off" });
        return null;
      }
      if (!res.ok) return null;
      const url = URL.createObjectURL(await res.blob());
      if (this.snapshot.voice !== "on") this.set({ voice: "on" });
      return url;
    } catch {
      return null;
    }
  }

  private async play(i: number) {
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
    this.set({ index: i, status: "buffering" });
    const url = await this.clip(i);
    this.clip(i + 1);
    this.clip(i + 2);
    if (token !== this.token) return;

    if (url) {
      await this.ensureGraph();
      if (token !== this.token) return;
      const audio = this.getAudio();
      audio.src = url;
      audio.muted = this.snapshot.muted;
      audio.onended = () => this.advance(token, i);
      this.clock.mode = "audio";
      try {
        await audio.play();
      } catch (err) {
        if (token !== this.token) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          this.set({ status: "blocked" });
          return;
        }
        this.startTimer(i);
      }
    } else {
      this.startTimer(i);
    }
    if (token !== this.token) return;
    this.set({ status: "playing" });
    this.loop(token);
  }

  private startTimer(i: number) {
    this.clock = { mode: "timer", elapsed: 0, since: performance.now(), duration: estimateMs(this.lines[i].text) };
  }

  private advance(token: number, i: number) {
    if (token !== this.token) return;
    this.progress.set(1);
    this.timer = setTimeout(() => {
      if (token === this.token) void this.play(i + 1);
    }, GAP_MS);
  }

  private loop(token: number) {
    const tick = () => {
      if (token !== this.token) return;
      const c = this.clock;
      if (c.mode === "audio") {
        const a = this.audio;
        if (a && Number.isFinite(a.duration) && a.duration > 0) this.progress.set(a.currentTime / a.duration);
      } else if (this.snapshot.status === "playing") {
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
