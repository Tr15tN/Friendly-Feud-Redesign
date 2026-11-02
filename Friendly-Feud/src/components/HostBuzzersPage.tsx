import { isBuzzKey, type KeyBinding } from "@/lib/buzzer/keys";
import { playBuzzSound } from "@/lib/buzzer/useBuzzerKeys";
import { hasPendingBuzz } from "@/lib/host/console";
import { getTeamDisplayName } from "@/lib/utils";
import { Game, WSAction, WSEvent } from "@/types/game";
import { Keyboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface HostBuzzerPageProps {
  game: Game | null;
  send: (data: WSEvent) => void;
  buzzed: boolean;
  /** Keys that count as the physical buzzer. */
  bindings: KeyBinding[];
  soundOn: boolean;
  /** Only the physical buzzer keys count: no on-screen team buttons, no j/k shortcuts. */
  keysOnly: boolean;
  /** The key settings dialog is open, so key presses must not buzz. */
  paused: boolean;
  onOpenSettings: () => void;
}

export default function HostBuzzersPage({
  game,
  send,
  buzzed,
  bindings,
  soundOn,
  keysOnly,
  paused,
  onOpenSettings,
}: HostBuzzerPageProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(true);
  const pending = game ? hasPendingBuzz(game) : false;
  const firstTeam = game?.buzzed[0]?.team;
  let buzzColors = ["bg-failure-500", "bg-primary-500"];
  const writingDirection = ["[writing-mode:vertical-lr]", "[writing-mode:vertical-lr] rotate-180"];
  if (buzzed) {
    buzzColors = ["bg-secondary-900", "bg-secondary-900"];
  }

  // Key presses only reach the focused tab, so warn when this page lost focus.
  useEffect(() => {
    setFocused(document.hasFocus());
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const triggerBuzzKeyPress = useCallback(
    (evt: KeyboardEvent) => {
      if (paused) {
        return;
      }
      if (isBuzzKey(evt, bindings)) {
        // Stop a focused button from also reacting to Enter or Space.
        evt.preventDefault();
        if (!buzzed) {
          if (soundOn) playBuzzSound();
          send({ action: WSAction.BUZZER_SCREEN_BUZZ });
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
  return (
    <>
      {buzzed ? (
        <div className="pointer-events-none absolute z-50 flex min-h-screen min-w-full items-center justify-center">
          <div id="buzzersInfo" className="rounded-xl bg-warning-900 p-5 text-6xl capitalize text-white">
            {pending ? (
              <>
                <span className="font-extrabold uppercase">{t("BUZZ!")}</span>
                <span className="mt-2 block text-2xl normal-case opacity-80">{t("Waiting for the host…")}</span>
              </>
            ) : game && firstTeam != null && game.teams[firstTeam] ? (
              getTeamDisplayName(game.teams[firstTeam].name, firstTeam, t)
            ) : (
              ""
            )}
          </div>
        </div>
      ) : null}
      <div className="absolute inset-x-0 top-3 z-40 flex justify-center gap-3">
        <button
          id="buzzerKeysButton"
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
        >
          <Keyboard size={16} aria-hidden />
          {t("Buzzer keys")}: {bindings.map((b) => b.label).join(", ")}
        </button>
        {!focused && (
          <p id="buzzerFocusWarning" className="rounded-full bg-warning-900 px-4 py-2 text-sm font-semibold text-white">
            {t("Click this page so buzzer presses reach it")}
          </p>
        )}
      </div>
      {keysOnly && (
        <div id="keysOnlyPanel" className="flex min-h-screen flex-col items-center justify-center gap-3 p-5 text-center">
          <Keyboard size={64} aria-hidden className="text-foreground opacity-60" />
          <p className="text-3xl font-bold text-foreground">{t("Press your buzzer")}</p>
          <p className="text-foreground opacity-70">{t("Only the physical buzzer counts on this screen.")}</p>
        </div>
      )}
      <div className={`${keysOnly ? "hidden" : "flex"} min-h-screen flex-row justify-between space-x-12 p-5`}>
        {Array(2)
          .fill(1)
          .map((_, i) => (
            <button
              key={i}
              id={`buzzersButtonTeam${i}`}
              className={`
                  ${buzzColors[i]}
                  ${writingDirection[i]}
                  w-full
                  rounded-full
                  text-6xl
                  font-extrabold
                  capitalize
                  text-white
              `}
              onClick={() => {
                if (buzzed) {
                  return;
                }
                send({ action: WSAction.BUZZER_SCREEN_BUZZ, team: i });
              }}
            >
              {game ? getTeamDisplayName(game.teams[i].name, i, t) : ""}
            </button>
          ))}
      </div>
    </>
  );
}
