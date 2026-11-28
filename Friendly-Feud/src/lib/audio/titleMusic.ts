/** How long Fade in and Fade out take, unless the visitor asked for reduced motion. */
export const TITLE_MUSIC_FADE_MS = 2500;

/** Level used when a page joins before the host has moved the slider. */
export const DEFAULT_TITLE_MUSIC_VOLUME = 0.8;

export const TITLE_MUSIC_SRC = "/title.mp3";

export interface MusicElement {
  src: string;
  loop: boolean;
  volume: number;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
}

export interface MusicMessage {
  action: string;
  volume?: number;
  fade?: string;
}

export interface MusicSync {
  source?: string;
  playing?: boolean;
  volume?: number;
}

export function titleMusicFadeMs(): number {
  if (typeof window === "undefined") return TITLE_MUSIC_FADE_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : TITLE_MUSIC_FADE_MS;
}

/** A slider value in the 0–1 range. Anything unusable becomes the default level. */
export function clampVolume(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TITLE_MUSIC_VOLUME;
  return Math.min(1, Math.max(0, value));
}

/** Straight ramp from `from` to `to`. A zero duration finishes immediately. */
export function volumeAlongFade(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return to;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return from + (to - from) * t;
}

/**
 * One looping track for a room page. The host's buttons become messages; a page that
 * opens later catches up from the game settings via `sync`.
 */
export class TitleMusicController {
  private audio: MusicElement | null = null;
  private source = TITLE_MUSIC_SRC;
  private target = DEFAULT_TITLE_MUSIC_VOLUME;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private create: (src: string) => MusicElement,
    private onError?: (error: unknown) => void,
    private fadeMs = TITLE_MUSIC_FADE_MS
  ) {}

  handle(message: MusicMessage) {
    switch (message.action) {
      case "play_title_music":
        this.play(message.volume);
        break;
      case "pause_title_music":
        this.pause();
        break;
      case "set_title_music_volume":
        if (typeof message.volume === "number") this.setVolume(message.volume);
        break;
      case "fade_title_music":
        if (message.fade === "in") this.fadeIn(message.volume);
        else if (message.fade === "out") this.fadeOut();
        break;
      default:
        break;
    }
  }

  /** Catch a page up to music that is already going. Leaves an in-progress fade alone. */
  sync(state: MusicSync) {
    if (state.source) this.setSource(state.source);
    if (this.fadeTimer) return;
    if (typeof state.volume === "number") this.setVolume(state.volume);
    if (state.playing === true) this.play(this.target);
    else if (state.playing === false) this.pause();
  }

  play(volume?: number) {
    this.cancelFade();
    this.target = clampVolume(volume);
    const audio = this.ensure();
    audio.loop = true;
    audio.volume = this.target;
    if (!audio.paused) return;
    this.watch(audio.play());
  }

  pause() {
    this.cancelFade();
    this.audio?.pause();
  }

  setVolume(volume: number) {
    this.cancelFade();
    this.target = clampVolume(volume);
    if (this.audio) this.audio.volume = this.target;
  }

  fadeIn(volume?: number) {
    if (typeof volume === "number") this.target = clampVolume(volume);
    const audio = this.ensure();
    audio.loop = true;
    this.cancelFade();
    audio.volume = 0;
    if (audio.paused) this.watch(audio.play());
    this.fadeToward(this.target, () => {});
  }

  fadeOut() {
    if (!this.audio || this.audio.paused) return;
    this.fadeToward(0, () => this.pause());
  }

  dispose() {
    this.cancelFade();
    this.audio?.pause();
    this.audio = null;
  }

  private setSource(src: string) {
    const next = src || TITLE_MUSIC_SRC;
    if (this.source === next && this.audio) return;
    const wasPlaying = !!this.audio && !this.audio.paused;
    this.source = next;
    this.audio?.pause();
    this.audio = this.create(next);
    this.audio.loop = true;
    this.audio.volume = this.target;
    if (wasPlaying) this.watch(this.audio.play());
  }

  private ensure() {
    if (!this.audio) this.audio = this.create(this.source);
    return this.audio;
  }

  private fadeToward(target: number, onDone: () => void) {
    this.cancelFade();
    if (!this.audio) return;
    if (this.fadeMs <= 0) {
      this.audio.volume = target;
      onDone();
      return;
    }
    const from = this.audio.volume;
    const started = Date.now();
    this.fadeTimer = setInterval(() => {
      if (!this.audio) return;
      const elapsed = Date.now() - started;
      this.audio.volume = volumeAlongFade(from, target, elapsed, this.fadeMs);
      if (elapsed < this.fadeMs) return;
      this.audio.volume = target;
      this.cancelFade();
      onDone();
    }, 50);
  }

  private cancelFade() {
    if (this.fadeTimer == null) return;
    clearInterval(this.fadeTimer);
    this.fadeTimer = null;
  }

  private watch(pending: Promise<void>) {
    pending.catch((error) => this.onError?.(error));
  }
}
