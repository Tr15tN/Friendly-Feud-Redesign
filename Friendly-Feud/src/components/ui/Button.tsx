import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant =
  | "secondary"
  | "primary"
  | "team0"
  | "team1"
  | "team0-outline"
  | "team1-outline"
  | "danger"
  | "ghost";

const BASE =
  "inline-flex min-h-11 touch-manipulation select-none items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold disabled:cursor-not-allowed disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  secondary: "border-pro-line bg-pro-raised text-pro-text hover:bg-pro-line",
  primary: "border-transparent bg-pro-accent text-white hover:bg-pro-accent-hover",
  team0: "border-transparent bg-pro-team0 text-pro-team0-on hover:brightness-110",
  team1: "border-transparent bg-pro-team1 text-pro-team1-on hover:brightness-110",
  "team0-outline": "border-pro-team0/50 bg-pro-raised text-pro-team0 hover:bg-pro-line",
  "team1-outline": "border-pro-team1/50 bg-pro-raised text-pro-team1 hover:bg-pro-line",
  danger: "border-pro-danger/50 bg-pro-raised text-pro-danger-text hover:bg-pro-line",
  ghost: "border-transparent bg-transparent text-pro-mute hover:bg-pro-raised hover:text-pro-text",
};

/** Class string for anything that must look like a Button but is not one (links, ConfirmButton). */
export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim();
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className = "", type = "button", ...rest },
  ref
) {
  return <button ref={ref} type={type} className={buttonClass(variant, className)} {...rest} />;
});
