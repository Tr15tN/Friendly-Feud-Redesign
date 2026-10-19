import type { ButtonVariant } from "@/components/ui/Button";

export interface TeamUi {
  text: string;
  border: string;
  dot: string;
  solid: ButtonVariant;
  outline: ButtonVariant;
}

// Static class strings so Tailwind's JIT can see every name.
const TEAM_UI: TeamUi[] = [
  {
    text: "text-pro-team0",
    border: "border-pro-team0/40",
    dot: "bg-pro-team0",
    solid: "team0",
    outline: "team0-outline",
  },
  {
    text: "text-pro-team1",
    border: "border-pro-team1/40",
    dot: "bg-pro-team1",
    solid: "team1",
    outline: "team1-outline",
  },
];

export function teamUi(team: number): TeamUi {
  return TEAM_UI[team] ?? TEAM_UI[0];
}
