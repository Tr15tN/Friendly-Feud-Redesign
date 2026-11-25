import BuzzerLightsSettings from "@/components/BuzzerLightsSettings";
import { Button } from "@/components/ui/Button";
import {
  addBinding,
  findBuzzBinding,
  keyLabel,
  removeBinding,
  setBindingTeam,
  type KeyBinding,
} from "@/lib/buzzer/keys";
import type { LightEvent, LightsConfig } from "@/lib/buzzer/lights";
import { playBuzzSound } from "@/lib/buzzer/useBuzzerKeys";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface BuzzerKeySettingsProps {
  bindings: KeyBinding[];
  onBindingsChange: (bindings: KeyBinding[]) => void;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  keysOnly: boolean;
  onKeysOnlyChange: (on: boolean) => void;
  onClose: () => void;
  /** Names of the two teams, for the team buttons. */
  teamNames: [string, string];
  lights: {
    config: LightsConfig;
    onChange: (config: LightsConfig) => void;
    connected: boolean;
    serialSupported: boolean;
    onConnect: () => void;
    onTest: (event: LightEvent) => void;
    error: string;
  };
}

/** What a captured key becomes: a shared buzzer, or a button for one team. */
type Capture = { team: 0 | 1 | undefined };

const selectClass =
  "rounded-[8px] border border-pro-line bg-pro-bg px-2 py-1 text-sm text-pro-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-pro-accent";

/** Choose which keys count as buzzers, and which team each one belongs to. A USB buzzer is a keyboard, so any key works. */
export default function BuzzerKeySettings({
  bindings,
  onBindingsChange,
  soundOn,
  onSoundChange,
  keysOnly,
  onKeysOnlyChange,
  onClose,
  teamNames,
  lights,
}: BuzzerKeySettingsProps) {
  const { t } = useTranslation();
  const [capturing, setCapturing] = useState<Capture | null>(null);
  const [pressed, setPressed] = useState<{ at: number; binding: KeyBinding } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (capturing) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        onBindingsChange(addBinding(bindings, { code: e.code, label: keyLabel(e), team: capturing.team }));
        setCapturing(null);
        return;
      }
      const binding = findBuzzBinding(e, bindings);
      if (binding) {
        e.preventDefault();
        setPressed({ at: Date.now(), binding });
        if (soundOn) playBuzzSound();
      }
    };
    // Capture phase so a focused button does not also react to the key.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [capturing, bindings, onBindingsChange, soundOn]);

  useEffect(() => {
    if (!pressed) return;
    setNow(Date.now());
    const timer = setTimeout(() => setNow(Date.now()), 900);
    return () => clearTimeout(timer);
  }, [pressed]);

  const justPressed = pressed !== null && now - pressed.at < 800;
  const teamLabel = (team: 0 | 1 | undefined) => (team === undefined ? t("Shared buzzer") : teamNames[team]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/80 p-4">
      <div
        id="buzzerKeySettings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buzzerKeySettingsTitle"
        className="darkTheme my-auto w-full max-w-2xl space-y-5 rounded-[16px] border border-pro-line bg-pro-bg p-6 text-pro-text shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="buzzerKeySettingsTitle" className="text-xl font-bold">
              {t("Buzzer keys")}
            </h2>
            <p className="mt-1 text-sm text-pro-mute">
              {t(
                "Your USB buzzer types a key. Give each team its own button, or keep one shared button and decide who was first. This is saved on this device."
              )}
            </p>
          </div>
          <Button variant="ghost" className="px-2" aria-label={t("Close")} onClick={onClose}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <ul className="space-y-2" aria-label={t("Buzzer keys")}>
          {bindings.map((binding) => (
            <li
              key={binding.code}
              className="flex items-center gap-3 rounded-[10px] border border-pro-line bg-pro-raised py-2 pl-3 pr-2"
            >
              <kbd className="min-w-14 font-mono text-sm font-semibold">{binding.label}</kbd>
              <select
                aria-label={t("Team for {{key}}", { key: binding.label })}
                data-key-code={binding.code}
                className={`${selectClass} flex-1`}
                value={binding.team === undefined ? "shared" : String(binding.team)}
                onChange={(e) =>
                  onBindingsChange(
                    setBindingTeam(
                      bindings,
                      binding.code,
                      e.target.value === "shared" ? undefined : (Number(e.target.value) as 0 | 1)
                    )
                  )
                }
              >
                <option value="shared">{t("Shared buzzer (ask who was first)")}</option>
                <option value="0">{teamNames[0]}</option>
                <option value="1">{teamNames[1]}</option>
              </select>
              <button
                type="button"
                aria-label={t("Remove {{key}}", { key: binding.label })}
                disabled={bindings.length === 1}
                className="rounded p-1 text-pro-mute hover:text-pro-text disabled:opacity-30"
                onClick={() => onBindingsChange(removeBinding(bindings, binding.code))}
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        {capturing ? (
          <div className="flex items-center gap-3">
            <p id="bindCapturePrompt" className="flex-1 rounded-[10px] border border-pro-gold px-3 py-3 text-pro-gold">
              {capturing.team === undefined
                ? t("Press the key your buzzer sends…")
                : t("Press the button for {{team}}…", { team: teamNames[capturing.team] })}
            </p>
            <Button variant="ghost" onClick={() => setCapturing(null)}>
              {t("Cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button id="addTeamBuzzerKey0" variant="primary" onClick={() => setCapturing({ team: 0 })}>
              {t("Bind a button for {{team}}", { team: teamNames[0] })}
            </Button>
            <Button id="addTeamBuzzerKey1" variant="primary" onClick={() => setCapturing({ team: 1 })}>
              {t("Bind a button for {{team}}", { team: teamNames[1] })}
            </Button>
            <Button id="addBuzzerKey" variant="secondary" onClick={() => setCapturing({ team: undefined })}>
              {t("Add a shared key")}
            </Button>
          </div>
        )}

        <div
          id="buzzerKeyTest"
          aria-live="polite"
          className={`rounded-[12px] border px-4 py-5 text-center text-lg font-semibold transition-colors ${
            justPressed ? "border-pro-gold bg-pro-gold/20 text-pro-gold" : "border-pro-line text-pro-mute"
          }`}
        >
          {justPressed && pressed
            ? `${t("Buzzer pressed!")} ${pressed.binding.team === undefined ? "" : `· ${teamLabel(pressed.binding.team)}`}`
            : t("Test: press your buzzer")}
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            id="buzzerSoundToggle"
            type="checkbox"
            checked={soundOn}
            onChange={(e) => onSoundChange(e.target.checked)}
            className="h-4 w-4"
          />
          {t("Play a sound on this device when the buzzer is pressed")}
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            id="buzzerKeysOnlyToggle"
            type="checkbox"
            checked={keysOnly}
            onChange={(e) => onKeysOnlyChange(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            {t("Physical buzzer only")}
            <span className="block text-pro-mute">
              {t("Hide the on-screen team buttons and only count presses of the keys above.")}
            </span>
          </span>
        </label>

        <BuzzerLightsSettings
          config={lights.config}
          onChange={lights.onChange}
          connected={lights.connected}
          serialSupported={lights.serialSupported}
          onConnect={lights.onConnect}
          onTest={lights.onTest}
          error={lights.error}
          teamNames={teamNames}
        />

        <Button variant="secondary" className="w-full" onClick={onClose}>
          {t("Done")}
        </Button>
      </div>
    </div>
  );
}
