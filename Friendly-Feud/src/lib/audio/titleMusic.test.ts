import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampVolume,
  DEFAULT_TITLE_MUSIC_VOLUME,
  TITLE_MUSIC_FADE_MS,
  TitleMusicController,
  volumeAlongFade,
  type MusicElement,
} from "./titleMusic";

class FakeAudio implements MusicElement {
  loop = false;
  volume = 1;
  paused = true;
  playCalls = 0;
  failPlay = false;

  constructor(public src: string) {}

  play() {
    this.playCalls += 1;
    if (this.failPlay) return Promise.reject(new Error("blocked"));
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

function setup() {
  const created: FakeAudio[] = [];
  const errors: unknown[] = [];
  const controller = new TitleMusicController(
    (src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    },
    (error) => errors.push(error)
  );
  return { controller, created, errors, audio: () => created[created.length - 1] };
}

describe("title music levels", () => {
  it("clamps the slider and keeps a missing value at the default", () => {
    expect(clampVolume(undefined)).toBe(DEFAULT_TITLE_MUSIC_VOLUME);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_TITLE_MUSIC_VOLUME);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(1.4)).toBe(1);
    expect(clampVolume(0.35)).toBe(0.35);
  });

  it("ramps in a straight line and finishes on the target", () => {
    expect(volumeAlongFade(0, 0.8, 0, TITLE_MUSIC_FADE_MS)).toBe(0);
    expect(volumeAlongFade(0, 0.8, TITLE_MUSIC_FADE_MS / 2, TITLE_MUSIC_FADE_MS)).toBe(0.4);
    expect(volumeAlongFade(0.8, 0, TITLE_MUSIC_FADE_MS / 2, TITLE_MUSIC_FADE_MS)).toBe(0.4);
    expect(volumeAlongFade(0, 0.8, TITLE_MUSIC_FADE_MS, TITLE_MUSIC_FADE_MS)).toBe(0.8);
    expect(volumeAlongFade(0.2, 0.8, 10, 0)).toBe(0.8);
  });
});

describe("TitleMusicController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays the room track looped at the requested volume", async () => {
    const { controller, audio } = setup();
    controller.handle({ action: "play_title_music", volume: 0.5 });
    await Promise.resolve();
    expect(audio().src).toBe("/title.mp3");
    expect(audio().loop).toBe(true);
    expect(audio().volume).toBe(0.5);
    expect(audio().paused).toBe(false);
    expect(audio().playCalls).toBe(1);
  });

  it("pauses and reports a browser that blocks playback", async () => {
    const created: FakeAudio[] = [];
    const errors: unknown[] = [];
    const controller = new TitleMusicController(
      (src) => {
        const audio = new FakeAudio(src);
        audio.failPlay = true;
        created.push(audio);
        return audio;
      },
      (error) => errors.push(error)
    );
    controller.handle({ action: "play_title_music", volume: 0.5 });
    await Promise.resolve();
    expect(errors).toHaveLength(1);

    controller.handle({ action: "pause_title_music" });
    expect(created[0].paused).toBe(true);
  });

  it("fades in from silence to the slider and fades back out to a pause", () => {
    vi.useFakeTimers();
    const { controller, audio } = setup();
    controller.handle({ action: "fade_title_music", fade: "in", volume: 0.8 });
    expect(audio().paused).toBe(false);
    expect(audio().volume).toBe(0);

    vi.advanceTimersByTime(TITLE_MUSIC_FADE_MS / 2);
    expect(audio().volume).toBeCloseTo(0.4);
    vi.advanceTimersByTime(TITLE_MUSIC_FADE_MS / 2);
    expect(audio().volume).toBeCloseTo(0.8);
    expect(audio().paused).toBe(false);

    controller.handle({ action: "fade_title_music", fade: "out" });
    vi.advanceTimersByTime(TITLE_MUSIC_FADE_MS);
    expect(audio().volume).toBe(0);
    expect(audio().paused).toBe(true);
  });

  it("lets the volume slider cut off a fade", () => {
    vi.useFakeTimers();
    const { controller, audio } = setup();
    controller.handle({ action: "fade_title_music", fade: "in", volume: 0.8 });
    vi.advanceTimersByTime(200);
    controller.handle({ action: "set_title_music_volume", volume: 0.2 });
    expect(audio().volume).toBe(0.2);
    vi.advanceTimersByTime(TITLE_MUSIC_FADE_MS);
    expect(audio().volume).toBe(0.2);
    expect(audio().paused).toBe(false);
  });

  it("starts music for a page that joins while it is already playing", async () => {
    const { controller, audio } = setup();
    controller.sync({ source: "/api/rooms/ABCD/title-music", playing: true, volume: 0.25 });
    await Promise.resolve();
    expect(audio().src).toBe("/api/rooms/ABCD/title-music");
    expect(audio().volume).toBe(0.25);
    expect(audio().paused).toBe(false);

    controller.sync({ playing: true, volume: 0.25 });
    expect(audio().playCalls).toBe(1);

    controller.sync({ playing: false });
    expect(audio().paused).toBe(true);
  });

  it("does not interrupt a fade when game data still says the track is playing", () => {
    vi.useFakeTimers();
    const { controller, audio } = setup();
    controller.handle({ action: "fade_title_music", fade: "out" });
    controller.handle({ action: "play_title_music", volume: 1 });
    controller.handle({ action: "fade_title_music", fade: "out" });
    controller.sync({ playing: true, volume: 1 });
    vi.advanceTimersByTime(TITLE_MUSIC_FADE_MS / 2);
    expect(audio().volume).toBeGreaterThan(0);
    expect(audio().volume).toBeLessThan(1);
    expect(audio().paused).toBe(false);
  });
});
