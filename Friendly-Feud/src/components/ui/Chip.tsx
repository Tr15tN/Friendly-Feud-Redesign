import { HTMLAttributes } from "react";

type Tone = "neutral" | "ok" | "gold" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-pro-raised text-pro-mute",
  ok: "bg-pro-ok/15 text-pro-ok",
  gold: "bg-pro-gold/15 text-pro-gold",
  accent: "bg-pro-accent/25 text-pro-text",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export default function Chip({ tone = "neutral", className = "", ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
      {...rest}
    />
  );
}
