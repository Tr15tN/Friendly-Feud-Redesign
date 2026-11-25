import { Game } from "@/types/game";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LIGHTS,
  LightEvent,
  lightEventFor,
  LightsConfig,
  LightsController,
  loadLights,
  saveLights,
  serialSupported,
} from "./lights";

/** Lights on the buzzers laptop: follows who is first in the game, and is configured per device. */
export function useLights(game: Game | null) {
  const controller = useRef<LightsController>(new LightsController(DEFAULT_LIGHTS));
  const [config, setConfigState] = useState<LightsConfig>(DEFAULT_LIGHTS);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const lastEvent = useRef<LightEvent | null>(null);
  const event = lightEventFor(game);

  // localStorage and navigator.serial only exist in the browser.
  useEffect(() => {
    const loaded = loadLights(window.localStorage);
    controller.current.setConfig(loaded);
    setConfigState(loaded);
    setSupported(serialSupported());
    if (loaded.mode === "serial") {
      controller.current.reconnect().then((ok) => setConnected(ok));
    }
  }, []);

  const setConfig = useCallback((next: LightsConfig) => {
    controller.current.setConfig(next);
    setConfigState(next);
    saveLights(window.localStorage, next);
    lastEvent.current = null; // Send the current state again with the new settings.
  }, []);

  const connect = useCallback(async () => {
    const ok = await controller.current.connect();
    setConnected(ok);
    setError(ok ? "" : controller.current.lastError);
    lastEvent.current = null;
  }, []);

  const test = useCallback(async (testEvent: LightEvent) => {
    await controller.current.fire(testEvent);
    setError(controller.current.lastError);
  }, []);

  // Follow the game: light up for the first buzz, go dark when the buzzers are cleared.
  useEffect(() => {
    if (game === null || config.mode === "off") return;
    if (lastEvent.current === event) return;
    const first = lastEvent.current === null;
    lastEvent.current = event;
    // On first sight of a game that is already dark, there is nothing to switch off.
    if (first && event === "off" && !connected && config.mode === "serial") return;
    controller.current.fire(event).then(() => setError(controller.current.lastError));
  }, [event, game, config, connected]);

  return { config, setConfig, connected, connect, test, error, supported };
}
