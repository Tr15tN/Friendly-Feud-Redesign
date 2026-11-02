import { ReactNode } from "react";

/** Shared look for text/number/select controls in the host console. */
export const inputClass =
  "w-full min-h-11 rounded-[10px] border border-pro-line bg-pro-raised px-3 text-sm text-pro-text placeholder:text-pro-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold disabled:opacity-50";

interface SectionProps {
  title: string;
  description?: string;
  /** Highlights the card, used for the next thing the host needs to do. */
  emphasis?: boolean;
  children: ReactNode;
}

/** A titled card that groups related settings. */
export function Section({ title, description, emphasis = false, children }: SectionProps) {
  return (
    <section
      className={`rounded-[14px] border bg-pro-panel p-4 sm:p-5 ${emphasis ? "border-pro-accent" : "border-pro-line"}`}
    >
      <h3 className="text-base font-semibold text-pro-text">{title}</h3>
      {description && <p className="mt-1 text-sm text-pro-mute">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}

/** A label above a control, with an optional hint underneath. */
export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-pro-text">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-pro-mute">{hint}</p>}
    </div>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** A checkbox row with a title and a plain-language hint. */
export function ToggleRow({ id, label, hint, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className={`flex items-start gap-3 ${disabled ? "opacity-50" : ""}`}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-pro-accent disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="min-w-0 cursor-pointer text-sm">
        <span className="block font-medium text-pro-text">{label}</span>
        {hint && <span className="block text-xs text-pro-mute">{hint}</span>}
      </label>
    </div>
  );
}
