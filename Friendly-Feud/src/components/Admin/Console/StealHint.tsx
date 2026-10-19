import { stealTeam } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

/** Shown once a team has 3 strikes. It only hints: the host decides who banks the pot. */
export default function StealHint({ game }: { game: Game }) {
  const { t } = useTranslation();
  const steal = stealTeam(game);
  if (steal === null) return null;
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);
  const struckOut = steal === 0 ? 1 : 0;
  return (
    <p
      id="stealHint"
      role="status"
      className="rounded-[10px] border border-pro-gold/50 bg-pro-gold/10 px-4 py-3 text-sm text-pro-gold"
    >
      <b>{t("{{team}} has 3 strikes.", { team: name(struckOut) })}</b>{" "}
      {t("{{team}} can steal: award the pot to whoever wins it.", { team: name(steal) })}
    </p>
  );
}
