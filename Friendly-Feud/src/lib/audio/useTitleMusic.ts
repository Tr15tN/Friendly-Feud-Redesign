import { TitleMusicController, titleMusicFadeMs, type MusicMessage, type MusicSync } from "@/lib/audio/titleMusic";
import { useCallback, useEffect, useRef } from "react";

/** Plays the room's title music in this page. One controller, created on the first request. */
export function useTitleMusic(onError?: (error: unknown) => void) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const controllerRef = useRef<TitleMusicController | null>(null);

  const controller = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = new TitleMusicController(
        (src) => new Audio(src),
        (error) => onErrorRef.current?.(error),
        titleMusicFadeMs()
      );
    }
    return controllerRef.current;
  }, []);

  useEffect(() => () => controllerRef.current?.dispose(), []);

  const handleMessage = useCallback((message: MusicMessage) => controller().handle(message), [controller]);
  const sync = useCallback((state: MusicSync) => controller().sync(state), [controller]);
  const play = useCallback((volume?: number) => controller().play(volume), [controller]);
  const pause = useCallback(() => controller().pause(), [controller]);
  const setVolume = useCallback((volume: number) => controller().setVolume(volume), [controller]);
  const fadeIn = useCallback((volume?: number) => controller().fadeIn(volume), [controller]);
  const fadeOut = useCallback(() => controller().fadeOut(), [controller]);

  return { handleMessage, sync, play, pause, setVolume, fadeIn, fadeOut };
}
