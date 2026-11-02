import { Button } from "@/components/ui/Button";
import { addBinding, isBuzzKey, keyLabel, removeBinding, type KeyBinding } from "@/lib/buzzer/keys";
import { playBuzzSound } from "@/lib/buzzer/useBuzzerKeys";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface BuzzerKeySettingsProps {
  bindings: KeyBinding[];
  onBindingsChange: (bindings: KeyBinding[]) => void;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  onClose: () => void;
}

/** Choose which keys count as the physical buzzer. The buzzer is a USB keyboard, so any key works. */
export default function BuzzerKeySettings({
  bindings,
  onBindingsChange,
  soundOn,
  onSoundChange,
  onClose,
}: BuzzerKeySettingsProps) {
  const { t } = useTranslation();
  const [capturing, setCapturing] = useState(false);
  const [pressedAt, setPressedAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (capturing) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        onBindingsChange(addBinding(bindings, { code: e.code, label: keyLabel(e) }));
        setCapturing(false);
        return;
      }
      if (isBuzzKey(e, bindings)) {
        e.preventDefault();
        setPressedAt(Date.now());
        if (soundOn) playBuzzSound();
      }
    };
    // Capture phase so a focused button does not also react to the key.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [capturing, bindings, onBindingsChange, soundOn]);

  useEffect(() => {
    if (!pressedAt) return;
    setNow(Date.now());
    const timer = setTimeout(() => setNow(Date.now()), 900);
    return () => clearTimeout(timer);
  }, [pressedAt]);

  const justPressed = pressedAt > 0 && now - pressedAt < 800;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div
        id="buzzerKeySettings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buzzerKeySettingsTitle"
        className="darkTheme w-full max-w-lg space-y-5 rounded-[16px] border border-pro-line bg-pro-bg p-6 text-pro-text shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="buzzerKeySettingsTitle" className="text-xl font-bold">
              {t("Buzzer keys")}
            </h2>
            <p className="mt-1 text-sm text-pro-mute">
              {t("Your USB buzzer types a key. Choose which keys count as a buzz. This is saved on this device.")}
            </p>
          </div>
          <Button variant="ghost" className="px-2" aria-label={t("Close")} onClick={onClose}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label={t("Buzzer keys")}>
          {bindings.map((binding) => (
            <li
              key={binding.code}
              className="flex items-center gap-1 rounded-[10px] border border-pro-line bg-pro-raised py-1 pl-3 pr-1"
            >
              <kbd className="font-mono text-sm font-semibold">{binding.label}</kbd>
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
              {t("Press the key your buzzer sends…")}
            </p>
            <Button variant="ghost" onClick={() => setCapturing(false)}>
              {t("Cancel")}
            </Button>
          </div>
        ) : (
          <Button id="addBuzzerKey" variant="primary" onClick={() => setCapturing(true)}>
            {t("Add a key")}
          </Button>
        )}

        <div
          id="buzzerKeyTest"
          aria-live="polite"
          className={`rounded-[12px] border px-4 py-5 text-center text-lg font-semibold transition-colors ${
            justPressed ? "border-pro-gold bg-pro-gold/20 text-pro-gold" : "border-pro-line text-pro-mute"
          }`}
        >
          {justPressed ? t("Buzzer pressed!") : t("Test: press your buzzer")}
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

        <Button variant="secondary" className="w-full" onClick={onClose}>
          {t("Done")}
        </Button>
      </div>
    </div>
  );
}
