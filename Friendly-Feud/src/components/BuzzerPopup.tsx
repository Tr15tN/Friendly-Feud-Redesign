import { useDemo } from "@/components/Demo/DemoContext";
import { BuzzedState } from "@/types/game";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface BuzzerPopupProps {
  buzzed: BuzzedState;
  /** Hide (and dismiss) the banner, e.g. while the strike overlay is on screen. */
  suppressed?: boolean;
}

const VISIBLE_MS = 3000;
// Buzz state that arrives right after the page loads is a restore, not a new press.
const RESTORE_GRACE_MS = 1000;

function buzzKey(buzzed: BuzzedState | undefined): string | null {
  if (buzzed?.pending) return "pending";
  if (!buzzed?.id && !buzzed?.team_name) return null;
  return `${buzzed.id ?? ""}|${buzzed.team_name ?? ""}`;
}

/**
 * "First buzzer" banner. Keyed on the identity of the first buzz (not on the
 * buzzed object, which is re-created on every game update), so the auto-hide
 * timer is not restarted by unrelated host actions.
 */
export default function BuzzerPopup({ buzzed, suppressed = false }: BuzzerPopupProps) {
  const { t } = useTranslation();
  const demo = useDemo();
  const key = buzzKey(buzzed);
  const [shownKey, setShownKey] = useState<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    const previous = lastKeyRef.current;
    lastKeyRef.current = key;
    if (!key) {
      setShownKey(null);
      return;
    }
    if (key === previous || Date.now() - mountedAtRef.current < RESTORE_GRACE_MS) return;
    // The host naming the team after a physical buzz is the same buzz: no second sound.
    const resolvingPending = previous === "pending";

    // Sound Attribution:
    // "Quiz Show Buzzer 2" by JapanYoshiTheGamer
    // Source: https://freesound.org/s/423219/
    // License: Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/)
    if (!resolvingPending && !demo) {
      new Audio("buzzer.wav").play().catch((error) => console.warn("Error playing buzzer sound:", error));
    }

    setShownKey(key);
    const timer = setTimeout(() => setShownKey((current) => (current === key ? null : current)), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [key]);

  useEffect(() => {
    if (suppressed) setShownKey(null);
  }, [suppressed]);

  const visible = !suppressed && key !== null && shownKey === key;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[3vh] z-40 flex justify-center"
      aria-live="assertive"
      role="status"
    >
      <div
        id="buzzerPopup"
        className={`font-oswald flex items-center gap-6 rounded-2xl border-4 border-white bg-warning-900 px-10 py-4 text-white shadow-2xl transition-all duration-300 motion-reduce:transition-none ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        aria-hidden={!visible}
      >
        <span className="text-[3vh] uppercase tracking-widest text-warning-200">{t("First Buzzer")}</span>
        {visible && (
          <span className="text-[4.5vh] font-bold uppercase">
            {buzzed.pending && <span>{t("BUZZ!")}</span>}
            {buzzed.name && <span>{buzzed.name}</span>}
            {buzzed.name && buzzed.team_name && <span className="text-warning-200"> · </span>}
            {buzzed.team_name && <span>{buzzed.team_name}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
