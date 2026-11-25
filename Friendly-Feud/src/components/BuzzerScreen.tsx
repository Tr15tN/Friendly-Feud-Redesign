import BuzzerKeySettings from "@/components/BuzzerKeySettings";
import HostBuzzersPage from "@/components/HostBuzzersPage";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { useBuzzerKeys } from "@/lib/buzzer/useBuzzerKeys";
import { useHostBuzzKeys } from "@/lib/buzzer/useHostBuzzKeys";
import { useLights } from "@/lib/buzzer/useLights";
import { deviceConnectMessage, leaveDevice, lossForErrorCode, ScreenAuth } from "@/lib/devices/session";
import { getWebSocketUrl } from "@/lib/utils";
import { Game, WSAction, WSEvent } from "@/types/game";
// @ts-expect-error: not sure if cookie-cutter is typed
import cookieCutter from "cookie-cutter";
import { Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import NoSession from "./ui/NoSession";

export type BuzzerLayout =
  /** The whole screen is the buzzer page (team buttons, "who was first?"). */
  | "full"
  /** Something else (the TV) fills the screen: only the keys and lights work, settings are opened from outside. */
  | "overlay"
  /** A device that only switches lights. */
  | "lights";

interface BuzzerScreenProps {
  /** "session": the host types the host password (room from ?room=CODE). "device": a paired device. */
  auth: ScreenAuth;
  layout?: BuzzerLayout;
  /** In the overlay layout: whether the buzzer keys count (a device with the lights role only must not listen). */
  keys?: boolean;
  /** Settings dialog, controlled by the page when something else owns the buttons. */
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}

/** Same keys and same press, whoever is listening. Rendered only while the keys should count. */
function KeyListener(props: Parameters<typeof useHostBuzzKeys>[0]) {
  useHostBuzzKeys(props);
  return null;
}

/** The buzzer screen: physical buzzer keys, "who was first?", and the lights that follow the buzzers. */
export default function BuzzerScreen({
  auth,
  layout = "full",
  keys = true,
  settingsOpen,
  onSettingsOpenChange,
}: BuzzerScreenProps) {
  const { t } = useTranslation();
  const isDevice = auth.kind === "device";
  const ws = useRef<WebSocket | null>(null);
  const [hostPassword, setHostPassword] = useState<string>("");
  const [game, setGame] = useState<Game | null>(null);
  const [buzzerRegistered, setBuzzersRegistered] = useState<boolean>(false);
  const urlParams = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const roomCode = auth.kind === "device" ? auth.credentials.room : urlParams.get("room");
  const [buzzed, setBuzzed] = useState<boolean>(false);
  const hasRoom = !!roomCode;
  const { bindings, setBindings, soundOn, setSoundOn, keysOnly, setKeysOnly } = useBuzzerKeys();
  const [localSettingsOpen, setLocalSettingsOpen] = useState(false);
  const showKeySettings = settingsOpen ?? localSettingsOpen;
  const setShowKeySettings = (open: boolean) => {
    setLocalSettingsOpen(open);
    onSettingsOpenChange?.(open);
  };
  const [connected, setConnected] = useState(false);
  const lights = useLights(game);

  function send(data: WSEvent) {
    console.debug("Sending", data);

    if (ws.current) {
      // A paired device is known to the server by its connection; it never carries the host password.
      const message = isDevice ? { ...data, room: roomCode } : { ...data, hostPassword: hostPassword, room: roomCode };
      ws.current.send(JSON.stringify(message));
      return;
    }
    toast.error(t(ERROR_CODES.CONNECTION_LOST));
  }

  useEffect(() => {
    ws.current = new WebSocket(getWebSocketUrl());
    ws.current.onopen = function () {
      console.log("game connected to server");
      setConnected(true);
      if (auth.kind === "device") {
        ws.current?.send(deviceConnectMessage(auth.credentials));
        return;
      }
      const session = cookieCutter.get("session");
      console.debug(session);
      if (session != null && ws.current) {
        ws.current.send(JSON.stringify({ action: "game_window", session: session }));
      }
    };

    ws.current.onmessage = function (evt) {
      const received_msg = evt.data;
      let json: WSEvent;
      try {
        json = JSON.parse(received_msg);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return;
      }

      switch (json.action) {
        case WSAction.DATA:
          setGame(json.data);
          break;

        case WSAction.REGISTER_BUZZER_SCREEN:
        case WSAction.DEVICE_CONNECTED:
          setBuzzersRegistered(true);
          break;

        case WSAction.DEVICE_REVOKED:
          leaveDevice("revoked");
          break;

        case WSAction.BUZZED:
          setBuzzed(true);
          break;

        case WSAction.CLEARBUZZERS:
          setBuzzed(false);
          break;

        case WSAction.QUIT:
          console.debug("player quit");
          if (isDevice) {
            leaveDevice("ended");
            break;
          }
          cookieCutter.set("session", "");
          setGame(null);
          setHostPassword("");
          break;

        case WSAction.ERROR:
          if (!json.code) {
            console.error("Error code is undefined");
            return;
          }
          if (isDevice) {
            const loss = lossForErrorCode(json.code);
            if (loss) {
              leaveDevice(loss);
              return;
            }
          } else {
            setHostPassword("");
          }
          toast.error(t(json.code, { message: json.message }));
          break;

        default:
          console.error("didn't expect", json);
          break;
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error(t(ERROR_CODES.CONNECTION_LOST));
    };

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    ws.current.onclose = (event) => {
      setConnected(false);
      console.log("WebSocket connection closed:", event.code, event.reason);
      // Nobody is at a paired device to press reload: it signs itself back in.
      if (isDevice) reloadTimer = setTimeout(() => window.location.reload(), 3000);
    };
    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
    };
  }, []);
  if (typeof window !== "undefined" && layout !== "overlay") {
    document.body.className = (game?.settings?.theme ?? "default") + " bg-background";
  }

  if (!hasRoom) {
    return <NoSession />;
  }

  const teamNames: [string, string] = [
    game?.teams?.[0]?.name || t("Team {{number}}", { number: 1 }),
    game?.teams?.[1]?.name || t("Team {{number}}", { number: 2 }),
  ];

  const settingsDialog = showKeySettings && (
    <BuzzerKeySettings
      bindings={bindings}
      onBindingsChange={setBindings}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
      keysOnly={keysOnly}
      onKeysOnlyChange={setKeysOnly}
      onClose={() => setShowKeySettings(false)}
      teamNames={teamNames}
      lightsOnly={layout === "lights"}
      lights={{
        config: lights.config,
        onChange: lights.setConfig,
        connected: lights.connected,
        serialSupported: lights.supported,
        onConnect: lights.connect,
        onTest: lights.test,
        error: lights.error,
      }}
    />
  );

  if (layout === "overlay") {
    // The TV is on screen. This part only listens for the buzzer keys (if the device has buttons) and drives the lights.
    return (
      <>
        {settingsDialog}
        {keys && buzzerRegistered && game?.teams != null && (
          <KeyListener
            send={send}
            buzzed={buzzed}
            bindings={bindings}
            soundOn={soundOn}
            keysOnly={keysOnly}
            paused={showKeySettings}
          />
        )}
      </>
    );
  }

  if (layout === "lights") {
    return (
      <>
        {settingsDialog}
        <div
          id="lightsDevicePanel"
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <Lightbulb size={64} aria-hidden className="text-foreground opacity-70" />
          <p className="text-3xl font-bold text-foreground">{t("Lights")}</p>
          <p id="lightsDeviceStatus" className="text-foreground opacity-80">
            {!buzzerRegistered
              ? t("Connecting to the game…")
              : lights.config.mode === "off"
                ? t("Lights are not set up yet. Open the settings to connect them.")
                : lights.config.mode === "serial" && !lights.connected
                  ? t("Waiting for the lights controller. Open the settings to connect it.")
                  : t("Lights are following the game.")}
          </p>
          <button
            id="lightsSettingsButton"
            onClick={() => setShowKeySettings(true)}
            className="rounded-md bg-primary-200 px-4 py-2 text-lg"
          >
            {t("Lights settings")}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {settingsDialog}
      {!buzzerRegistered ? (
        isDevice ? (
          <div className="flex min-h-screen items-center justify-center">
            <p id="deviceConnecting" className="text-foreground">
              {t("Connecting to the game…")}
            </p>
          </div>
        ) : (
          <div>
            <div className="absolute flex min-w-full justify-end px-10 pt-10">
              <button
                id="quitButton"
                className="text-1xl z-50 w-24 self-end rounded-lg bg-secondary-900 p-2 font-bold uppercase shadow-md hover:bg-secondary-300"
                onClick={() => {
                  cookieCutter.set("session", "");
                  window.location.href = "/";
                }}
              >
                {t("quit")}
              </button>
            </div>
            <div className="flex min-h-screen flex-col items-center justify-center space-y-10">
              <p className="text-xl capitalize text-foreground">{t("enter in host password")}</p>
              <input
                id="buzzersPasswordInput"
                onChange={(e) => {
                  setHostPassword(e.target.value);
                }}
                className="rounded-md border-2 border-secondary-900 bg-secondary-300 p-3 text-foreground"
                value={hostPassword}
              />
              <button
                id="buzzerKeysSetupButton"
                onClick={() => setShowKeySettings(true)}
                className="text-sm text-foreground underline"
              >
                {t("Buzzer keys")}: {bindings.map((b) => b.label).join(", ")}
              </button>
              <button
                id="buzzersSubmitButton"
                disabled={!connected}
                onClick={() => {
                  send({ action: WSAction.REGISTER_BUZZER_SCREEN });
                }}
                className="rounded-md bg-primary-200 p-2 text-lg"
              >
                {t("Submit")}
              </button>
            </div>
          </div>
        )
      ) : game?.teams != null ? (
        <HostBuzzersPage
          game={game}
          send={send}
          buzzed={buzzed}
          bindings={bindings}
          soundOn={soundOn}
          keysOnly={keysOnly}
          paused={showKeySettings}
          onOpenSettings={() => setShowKeySettings(true)}
        />
      ) : (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-foreground">{t("loading")}</p>
        </div>
      )}
    </>
  );
}
