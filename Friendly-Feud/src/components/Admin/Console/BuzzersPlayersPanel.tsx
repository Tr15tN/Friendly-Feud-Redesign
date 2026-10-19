import Players from "@/components/Admin/Players";
import BuzzerTable from "@/components/BuzzerTable";
import { Button } from "@/components/ui/Button";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, RefObject, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface BuzzersPlayersPanelProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  ws: RefObject<WebSocket>;
  room: string;
  send: (data: WSEvent) => void;
}

const HEADING = "mb-2 text-xs font-semibold uppercase tracking-widest text-pro-mute";

/** Content of the "Players & buzzers" drawer: buzz order plus the per-team player list. */
export default function BuzzersPlayersPanel({ game, setGame, ws, room, send }: BuzzersPlayersPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 text-foreground">
      <section>
        <h3 className={HEADING}>{t("Buzzer Order")}</h3>
        <div className="space-y-3 rounded-[12px] border border-pro-line bg-pro-panel p-3">
          {game.buzzed.length > 0 ? (
            <Button id="clearBuzzersButton" variant="danger" onClick={() => send({ action: "clearbuzzers" })}>
              {t("Clear Buzzers")}
            </Button>
          ) : (
            <Button id="clearBuzzersButtonDisabled" disabled>
              {t("Clear Buzzers")}
            </Button>
          )}
          <p className="text-xs text-pro-mute">{t("Changing rounds also clears buzzers")}</p>
          <BuzzerTable game={game} />
        </div>
      </section>
      <section>
        <h3 className={HEADING}>{t("players")}</h3>
        <Players game={game} setGame={setGame} ws={ws} room={room} />
      </section>
    </div>
  );
}
