import { buttonClass, type ButtonVariant } from "@/components/ui/button-class";
import { ButtonHTMLAttributes, forwardRef } from "react";

export type { ButtonVariant } from "@/components/ui/button-class";
export { buttonClass };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className = "", type = "button", ...rest },
  ref
) {
  return <button ref={ref} type={type} className={buttonClass(variant, className)} {...rest} />;
});
