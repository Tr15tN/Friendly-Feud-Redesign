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

const OVERRIDE_PREFIXES = ["px-", "py-", "gap-", "justify-", "min-h-", "rounded"] as const;

function utilityToken(token: string): string {
  const colon = token.lastIndexOf(":");
  return colon === -1 ? token : token.slice(colon + 1);
}

function overrideGroup(utility: string): (typeof OVERRIDE_PREFIXES)[number] | null {
  for (const prefix of OVERRIDE_PREFIXES) {
    if (utility === prefix || utility.startsWith(prefix)) return prefix;
  }
  return null;
}

/** Non-responsive extra tokens that override a shared Tailwind utility group. */
function overriddenGroups(extra: string): Set<(typeof OVERRIDE_PREFIXES)[number]> {
  const groups = new Set<(typeof OVERRIDE_PREFIXES)[number]>();
  for (const token of extra.split(/\s+/).filter(Boolean)) {
    if (token.includes(":")) continue;
    const group = overrideGroup(utilityToken(token));
    if (group) groups.add(group);
  }
  return groups;
}

function mergeBaseWithExtra(base: string, extra: string): string {
  const groups = overriddenGroups(extra);
  if (groups.size === 0) return base;
  return base
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => {
      const group = overrideGroup(utilityToken(token));
      return !group || !groups.has(group);
    })
    .join(" ");
}

/** Class string for anything that must look like a Button but is not one (links, ConfirmButton). */
export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${mergeBaseWithExtra(BASE, extra)} ${VARIANTS[variant]} ${extra}`.trim();
}
