import { ButtonHTMLAttributes, ReactNode, useEffect, useState } from "react";

interface ConfirmButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** When false the button acts immediately; when true the first click arms it. */
  needsConfirm: boolean;
  onConfirm: () => void;
  confirmLabel: ReactNode;
  /** Classes used instead of className while armed (avoid conflicting utility classes). */
  armedClassName?: string;
  children: ReactNode;
}

/** Two-step button for destructive host actions: click once to arm, again within 3s to confirm. */
export default function ConfirmButton({
  needsConfirm,
  onConfirm,
  confirmLabel,
  children,
  className = "",
  armedClassName = "rounded-lg border-2 border-warning-700 bg-warning-200 px-4 py-3 text-lg font-semibold text-black ring-4 ring-warning-500",
  ...rest
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      {...rest}
      aria-live="polite"
      data-armed={armed || undefined}
      className={armed ? armedClassName : className}
      onClick={() => {
        if (needsConfirm && !armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
