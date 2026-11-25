import { findBuzzBinding, type KeyBinding } from "@/lib/buzzer/keys";
import { playBuzzSound } from "@/lib/buzzer/useBuzzerKeys";
import { WSAction, WSEvent } from "@/types/game";
import { useCallback, useEffect } from "react";

interface HostBuzzKeysOptions {
  send: (data: WSEvent) => void;
  /** Someone already buzzed: further presses do nothing until the host clears the buzzers. */
  buzzed: boolean;
  /** Keys that count as the physical buzzer. */
  bindings: KeyBinding[];
  soundOn: boolean;
  /** Only the physical buzzer keys count: no j/k shortcuts. */
  keysOnly: boolean;
  /** A settings dialog is open, so key presses must not buzz. */
  paused: boolean;
}

/** Turns the physical buzzer keys (and the j / k shortcuts) into buzzes for the host's buzzer screen. */
export function useHostBuzzKeys({ send, buzzed, bindings, soundOn, keysOnly, paused }: HostBuzzKeysOptions) {
  const triggerBuzzKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      if (paused) {
        return;
      }
      const binding = findBuzzBinding(evt, bindings);
      if (binding) {
        // Stop a focused button from also reacting to Enter or Space.
        evt.preventDefault();
        if (!buzzed) {
          if (soundOn) playBuzzSound();
          // A team's own button buzzes for that team; a shared button asks the host who was first.
          send(
            binding.team === undefined
              ? { action: WSAction.BUZZER_SCREEN_BUZZ }
              : { action: WSAction.BUZZER_SCREEN_BUZZ, team: binding.team }
          );
        }
        return;
      }
      if (buzzed || keysOnly) {
        return;
      }
      if (evt.key == "j") {
        send({ action: WSAction.BUZZER_SCREEN_BUZZ, team: 0 });
        return;
      }
      if (evt.key == "k") {
        send({ action: WSAction.BUZZER_SCREEN_BUZZ, team: 1 });
        return;
      }
      return;
    },
    [buzzed, send, bindings, soundOn, keysOnly, paused]
  );

  useEffect(() => {
    window.addEventListener("keydown", triggerBuzzKeyPress, false);
    return () => window.removeEventListener("keydown", triggerBuzzKeyPress, false);
  }, [triggerBuzzKeyPress]);
}
