import type { DemoStep } from "@/components/Demo/steps";
import { Button } from "@/components/ui/Button";
import { normalizeLanguage } from "@/i18n/languages";
import { ArrowLeft, ArrowRight, FastForward, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface StepBarProps {
  index: number;
  total: number;
  step: DemoStep;
  running: boolean;
  caption: string | null;
  error: string | null;
  onNext: () => void;
  onBack: () => void;
  onReplay: () => void;
  onSkip: () => void;
  onExit: () => void;
  onHeight: (height: number) => void;
}

/** The demo's control strip along the bottom: what this step is about, plus Back / Replay / Skip / Next. */
export default function StepBar({
  index,
  total,
  step,
  running,
  caption,
  error,
  onNext,
  onBack,
  onReplay,
  onSkip,
  onExit,
  onHeight,
}: StepBarProps) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const last = index === total - 1;
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => onHeight(el.offsetHeight));
    observer.observe(el);
    onHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, [onHeight]);

  useEffect(() => {
    if (!running) nextRef.current?.focus({ preventScroll: true });
  }, [running, index]);

  return (
    <section
      ref={ref}
      id="demoBar"
      aria-label={t("Interactive demo")}
      className="darkTheme fixed inset-x-0 bottom-0 z-[80] border-t border-pro-accent bg-pro-panel px-3 py-3 text-pro-text shadow-[0_-8px_30px_rgba(0,0,0,0.5)] sm:px-5"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-[60%]">
          <p className="text-xs font-semibold uppercase tracking-widest text-pro-mute">
            {t("Demo")} · {t("Step {{current}} of {{total}}", { current: index + 1, total })}
          </p>
          <h2 id="demoStepTitle" className="mt-0.5 text-lg font-bold">
            {t(step.title)}
          </h2>
          <p className="mt-0.5 text-sm text-pro-mute">{t(step.body)}</p>
          <p id="demoCaption" aria-live="polite" className="mt-1 min-h-5 text-sm font-semibold text-pro-gold">
            {error ?? caption ?? (!running && !last ? t("Your turn: try it yourself, or press Next.") : "")}
          </p>
          {last && !running && (
            <p className="mt-1 text-sm">
              <Link href={`/docs/${language}/quickstart`} target="_blank" className="text-pro-accent underline">
                {t("Host quickstart")}
              </Link>
              {" · "}
              <Link href={`/docs/${language}/guide`} target="_blank" className="text-pro-accent underline">
                {t("Full game guide")}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="mr-1 hidden gap-1.5 xl:flex" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`size-2 rounded-full ${i === index ? "bg-pro-accent" : "bg-pro-line"}`} />
            ))}
          </div>
          <Button id="demoBack" onClick={onBack} disabled={index === 0} aria-label={t("Back")}>
            <ArrowLeft size={16} aria-hidden />
            <span className="hidden sm:inline">{t("Back")}</span>
          </Button>
          {running ? (
            <Button id="demoSkip" onClick={onSkip}>
              <FastForward size={16} aria-hidden />
              {t("Skip animation")}
            </Button>
          ) : (
            <Button id="demoReplay" onClick={onReplay}>
              <RotateCcw size={16} aria-hidden />
              {t("Replay")}
            </Button>
          )}
          <button
            ref={nextRef}
            id="demoNext"
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-pro-accent px-5 text-sm font-semibold text-white hover:bg-pro-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold"
            onClick={onNext}
          >
            {last ? t("Host a real game") : t("Next")}
            {!last && <ArrowRight size={16} aria-hidden />}
          </button>
          <Button id="demoExit" variant="ghost" onClick={onExit} aria-label={t("Exit demo")} className="px-2">
            <X size={18} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}
