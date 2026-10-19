import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StrikePipsProps {
  team: number;
  count: number;
  max: number;
  align?: "start" | "end";
}

/** Three-slot strike tracker. A filled slot always contains a ✕ glyph, so it never relies on colour alone. */
export default function StrikePips({ team, count, max, align = "start" }: StrikePipsProps) {
  const { t } = useTranslation();
  return (
    <div
      id={`adminTeam${team}Strikes`}
      role="img"
      aria-label={t("Strikes {{count}} of {{max}}", { count, max })}
      className={`flex gap-1 ${align === "end" ? "justify-end" : ""}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`grid size-6 place-items-center rounded-md border ${
            i < count ? "border-pro-danger bg-pro-danger text-white" : "border-pro-line text-transparent"
          }`}
        >
          <X size={14} strokeWidth={3} aria-hidden />
        </span>
      ))}
    </div>
  );
}
