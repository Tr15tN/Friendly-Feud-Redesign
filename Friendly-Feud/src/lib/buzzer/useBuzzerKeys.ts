import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BINDINGS, loadBindings, saveBindings, type KeyBinding } from "./keys";

const SOUND_KEY = "famf.buzzerSound";

/** Buzzer key bindings and the local-sound switch, remembered in this browser (the buzzer laptop). */
export function useBuzzerKeys() {
  const [bindings, setBindingsState] = useState<KeyBinding[]>(DEFAULT_BINDINGS);
  const [soundOn, setSoundOnState] = useState(true);

  // localStorage is only available in the browser, so load after mount.
  useEffect(() => {
    setBindingsState(loadBindings(window.localStorage));
    setSoundOnState(window.localStorage.getItem(SOUND_KEY) !== "off");
  }, []);

  const setBindings = useCallback((next: KeyBinding[]) => {
    setBindingsState(next);
    saveBindings(window.localStorage, next);
  }, []);

  const setSoundOn = useCallback((on: boolean) => {
    setSoundOnState(on);
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  }, []);

  return { bindings, setBindings, soundOn, setSoundOn };
}

export function playBuzzSound() {
  new Audio("buzzer.wav").play().catch((error) => console.warn("Error playing buzzer sound:", error));
}
