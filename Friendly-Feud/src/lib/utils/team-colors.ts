// Static class maps so Tailwind's JIT can see every class name.
export interface TeamColorClasses {
  solid: string; // filled button / header
  solidHover: string;
  soft: string; // tinted background
  border: string;
  text: string;
  ring: string;
  gradient: string; // score panel gradient
}

const TEAM_COLORS: TeamColorClasses[] = [
  {
    solid: "bg-team1-700 text-white",
    solidHover: "hover:bg-team1-900",
    soft: "bg-team1-200 text-team1-900",
    border: "border-team1-700",
    text: "text-team1-700",
    ring: "ring-team1-500",
    gradient: "from-team1-900 to-team1-500",
  },
  {
    solid: "bg-team2-700 text-white",
    solidHover: "hover:bg-team2-900",
    soft: "bg-team2-200 text-team2-900",
    border: "border-team2-700",
    text: "text-team2-700",
    ring: "ring-team2-500",
    gradient: "from-team2-900 to-team2-500",
  },
];

export function teamColors(team: number): TeamColorClasses {
  return TEAM_COLORS[team] ?? TEAM_COLORS[0];
}
