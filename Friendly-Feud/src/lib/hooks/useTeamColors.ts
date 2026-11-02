import { teamCssVars } from "@/lib/theme/team-palette";
import type { Team } from "@/types/game";
import { useEffect, useLayoutEffect } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Publishes each team's colour as CSS variables on <html>; everything team-coloured reads them. */
export function useTeamColors(teams: Team[] | undefined) {
  const key = `${teams?.[0]?.color ?? ""}|${teams?.[1]?.color ?? ""}`;
  useIsoLayoutEffect(() => {
    const style = document.documentElement.style;
    const [c0, c1] = key.split("|");
    const vars = { ...teamCssVars(c0, 0), ...teamCssVars(c1, 1) };
    for (const [name, value] of Object.entries(vars)) style.setProperty(name, value);
    // No cleanup on purpose: the demo mounts host, TV and phone in one document, and the
    // next page to mount sets its own values.
  }, [key]);
}
