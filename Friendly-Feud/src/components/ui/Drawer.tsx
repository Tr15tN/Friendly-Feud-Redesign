import { buttonClass } from "@/components/ui/Button";
import { X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface DrawerProps {
  id: string;
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Right-hand slide-over. Content is only mounted while open. The `darkTheme` class keeps the legacy
 * themed components inside it readable on the dark surface.
 */
export default function Drawer({ id, open, title, onClose, children }: DrawerProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <aside
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="darkTheme relative flex h-full w-full flex-col border-l border-pro-line bg-pro-bg text-pro-text shadow-2xl sm:w-[520px]"
      >
        <header className="flex items-center justify-between border-b border-pro-line px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={t("Close")}
            className={buttonClass("ghost", "px-2")}
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
