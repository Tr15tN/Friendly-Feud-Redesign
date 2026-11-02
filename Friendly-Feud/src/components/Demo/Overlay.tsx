import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface PointerTarget {
  x: number;
  y: number;
}

export interface OverlayHandle {
  /** One getter per highlighted thing; each returns the current on-screen box (it can move) or null. */
  setHighlights: (getters: (() => DOMRect | null)[]) => void;
  /** Where the demo cursor should be; null hides it. */
  setPointer: (getter: (() => PointerTarget | null) | null) => void;
  /** Snap straight to the targets instead of gliding (used by "Skip animation"). */
  setInstant: (instant: boolean) => void;
  ripple: () => void;
}

const SLOTS = 3;
const PAD = 6;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
}

const hidden = (): Box => ({ x: 0, y: 0, w: 0, h: 0, a: 0 });

/**
 * Dims the page except the highlighted boxes, and draws the demo cursor. Positions are smoothed in a
 * requestAnimationFrame loop and written straight to the DOM, so tracking a moving element costs no re-renders.
 */
const Overlay = forwardRef<OverlayHandle>(function Overlay(_props, ref) {
  const holes = useRef<(SVGRectElement | null)[]>([]);
  const rings = useRef<(SVGRectElement | null)[]>([]);
  const dim = useRef<SVGRectElement | null>(null);
  const cursor = useRef<HTMLDivElement | null>(null);
  const getters = useRef<(() => DOMRect | null)[]>([]);
  const pointerGetter = useRef<(() => PointerTarget | null) | null>(null);
  const boxes = useRef<Box[]>(Array.from({ length: SLOTS }, hidden));
  const pointer = useRef({ x: 0, y: 0, a: 0, placed: false });
  const instant = useRef(false);
  const [rippleKey, setRippleKey] = useState(0);

  useImperativeHandle(ref, () => ({
    setHighlights: (g) => {
      getters.current = g.slice(0, SLOTS);
    },
    setPointer: (g) => {
      pointerGetter.current = g;
    },
    setInstant: (value) => {
      instant.current = value;
    },
    ripple: () => setRippleKey((k) => k + 1),
  }));

  useEffect(() => {
    let frame = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const k = instant.current || reduce ? 1 : 0.22;
      let anyVisible = false;
      for (let i = 0; i < SLOTS; i++) {
        const box = boxes.current[i];
        const rect = getters.current[i]?.() ?? null;
        if (rect && rect.width > 0 && rect.height > 0) {
          const target = { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 };
          if (box.a === 0) Object.assign(box, target); // appear in place, then follow
          box.x += (target.x - box.x) * k;
          box.y += (target.y - box.y) * k;
          box.w += (target.w - box.w) * k;
          box.h += (target.h - box.h) * k;
          box.a += (1 - box.a) * Math.max(k, 0.3);
          anyVisible = true;
        } else {
          box.a += (0 - box.a) * 0.35;
          if (box.a < 0.02) box.a = 0;
        }
        for (const el of [holes.current[i], rings.current[i]]) {
          if (!el) continue;
          el.setAttribute("x", String(box.x));
          el.setAttribute("y", String(box.y));
          el.setAttribute("width", String(Math.max(0, box.w)));
          el.setAttribute("height", String(Math.max(0, box.h)));
          el.style.opacity = String(box.a);
        }
      }
      if (dim.current) dim.current.style.opacity = anyVisible || boxes.current.some((b) => b.a > 0.05) ? "1" : "0";

      const target = pointerGetter.current?.() ?? null;
      const p = pointer.current;
      if (cursor.current) {
        if (target) {
          if (!p.placed) {
            p.x = target.x;
            p.y = target.y + 60;
            p.placed = true;
          }
          const speed = instant.current || reduce ? 1 : 0.14;
          p.x += (target.x - p.x) * speed;
          p.y += (target.y - p.y) * speed;
          p.a += (1 - p.a) * 0.3;
        } else {
          p.a += (0 - p.a) * 0.3;
          if (p.a < 0.02) p.placed = false;
        }
        cursor.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
        cursor.current.style.opacity = String(p.a);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <svg className="pointer-events-none fixed inset-0 z-[70] h-full w-full" aria-hidden>
        <defs>
          <mask id="demoSpotlightMask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {Array.from({ length: SLOTS }, (_, i) => (
              <rect key={i} ref={(el) => void (holes.current[i] = el)} rx="14" fill="black" style={{ opacity: 0 }} />
            ))}
          </mask>
        </defs>
        <rect
          ref={dim}
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4,5,9,0.62)"
          mask="url(#demoSpotlightMask)"
          style={{ opacity: 0, transition: "opacity 200ms" }}
        />
        {Array.from({ length: SLOTS }, (_, i) => (
          <rect
            key={i}
            ref={(el) => void (rings.current[i] = el)}
            rx="14"
            fill="none"
            strokeWidth="3"
            style={{ opacity: 0, stroke: "rgb(var(--pro-gold))" }}
          />
        ))}
      </svg>
      <div
        ref={cursor}
        className="pointer-events-none fixed left-0 top-0 z-[90]"
        style={{ opacity: 0 }}
        aria-hidden
        id="demoCursor"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
          <path d="M4 2l15 9-6.5 1.6L9 19z" fill="#fff" stroke="#0e1013" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        {rippleKey > 0 && (
          <span
            key={rippleKey}
            className="absolute -left-3 -top-3 size-8 animate-ping rounded-full border-2 border-pro-gold motion-reduce:hidden"
          />
        )}
      </div>
    </>
  );
});

export default Overlay;
