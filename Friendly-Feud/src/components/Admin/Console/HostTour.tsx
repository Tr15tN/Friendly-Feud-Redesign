import { Button } from "@/components/ui/Button";
import { HOST_TOUR_STEPS } from "@/lib/host/tour";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface HostTourProps {
  open: boolean;
  /** Called when the tour is finished or skipped. */
  onClose: () => void;
  docsLanguage: string;
}

/** A short first-run walkthrough, shown as a card in the corner so the console stays usable behind it. */
export default function HostTour({ open, onClose, docsLanguage }: HostTourProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    nextRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, index, onClose]);

  if (!open) return null;

  const step = HOST_TOUR_STEPS[index];
  const last = index === HOST_TOUR_STEPS.length - 1;

  return (
    <div
      id="hostTour"
      role="dialog"
      aria-label={t("Host tour")}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-[14px] border border-pro-accent bg-pro-panel p-4 text-pro-text shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-pro-mute">
          {t("Step {{current}} of {{total}}", { current: index + 1, total: HOST_TOUR_STEPS.length })}
        </p>
        <button
          type="button"
          id="hostTourSkip"
          aria-label={t("Skip tour")}
          className="-m-1 rounded-md p-1 text-pro-mute hover:text-pro-text"
          onClick={onClose}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      <h2 className="mt-2 text-lg font-bold">{t(step.title)}</h2>
      <p className="mt-1 text-sm text-pro-mute">{t(step.body)}</p>
      {last && (
        <p className="mt-3 text-sm">
          <Link href={`/docs/${docsLanguage}/quickstart`} target="_blank" className="text-pro-link underline">
            {t("Host quickstart")}
          </Link>
          {" · "}
          <Link href={`/docs/${docsLanguage}/guide`} target="_blank" className="text-pro-link underline">
            {t("Full game guide")}
          </Link>
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {HOST_TOUR_STEPS.map((s, i) => (
            <span key={s.id} className={`size-2 rounded-full ${i === index ? "bg-pro-accent" : "bg-pro-line"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {index > 0 && (
            <Button id="hostTourBack" variant="secondary" onClick={() => setIndex(index - 1)}>
              {t("Back")}
            </Button>
          )}
          <button
            ref={nextRef}
            id="hostTourNext"
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-pro-accent px-4 text-sm font-semibold text-white hover:bg-pro-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? t("Got it") : t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
