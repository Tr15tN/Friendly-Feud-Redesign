import { ReactNode, useEffect, useRef, useState } from "react";
import { buttonClass, ButtonVariant } from "./Button";

interface MenuProps {
  buttonId: string;
  ariaLabel: string;
  label: ReactNode;
  variant?: ButtonVariant;
  /** Which edge of the button the panel lines up with. */
  align?: "left" | "right";
  /** Open above the button instead of below (used by the touch action bar). */
  direction?: "down" | "up";
  buttonClassName?: string;
  panelClassName?: string;
  /** Panel content is only mounted while the menu is open. */
  children: (api: { close: () => void }) => ReactNode;
}

/** A button that toggles a popover panel. Closes on outside press and Escape. */
export default function Menu({
  buttonId,
  ariaLabel,
  label,
  variant = "secondary",
  align = "right",
  direction = "down",
  buttonClassName = "",
  panelClassName = "",
  children,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const placement = `${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} ${align === "right" ? "right-0" : "left-0"}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        id={buttonId}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={buttonClass(variant, buttonClassName)}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <div
          className={`absolute z-40 min-w-64 rounded-[12px] border border-pro-line bg-pro-panel p-3 text-pro-text shadow-xl ${placement} ${panelClassName}`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
