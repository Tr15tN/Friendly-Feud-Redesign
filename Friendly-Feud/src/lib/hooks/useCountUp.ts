import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animates a number towards `target` (ease-out). Jumps straight to the value when
 * the user prefers reduced motion. A timeout guarantees the final value even when
 * requestAnimationFrame is paused (e.g. the game window is in a background tab).
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const from = currentRef.current;
    if (from === target || prefersReducedMotion()) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      currentRef.current = value;
      setDisplay(value);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const settle = setTimeout(() => {
      currentRef.current = target;
      setDisplay(target);
    }, durationMs + 50);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [target, durationMs]);

  return display;
}

/** Positive change of `value` since the previous render, shown for `visibleMs` (null otherwise). */
export function usePositiveDelta(value: number, visibleMs = 1800): { amount: number; id: number } | null {
  const previousRef = useRef(value);
  const [delta, setDelta] = useState<{ amount: number; id: number } | null>(null);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    if (value <= previous) return;
    const next = { amount: value - previous, id: Date.now() };
    setDelta(next);
    const timer = setTimeout(() => setDelta((d) => (d?.id === next.id ? null : d)), visibleMs);
    return () => clearTimeout(timer);
  }, [value, visibleMs]);

  return delta;
}
