import HideGameQuestions from "@/components/Admin/HideGameQuestions";
import { Button, buttonClass } from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import Menu from "@/components/ui/Menu";
import { Game, WSEvent } from "@/types/game";
import { SlidersHorizontal } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { FlowActions } from "./useFlowActions";

interface FlowMenuProps {
  game: Game;
  flow: FlowActions;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

const ITEM = "w-full justify-start";
const ARMED = buttonClass("secondary", `${ITEM} border-pro-gold text-pro-gold ring-2 ring-pro-gold`);
const SELECT =
  "mt-1 min-h-11 w-full rounded-[10px] border border-pro-line bg-pro-raised px-3 text-sm text-pro-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold";

/** Everything that changes where the game is, tucked into one menu instead of a row of buttons. */
export default function FlowMenu({ game, flow, setGame, send }: FlowMenuProps) {
  const { t } = useTranslation();

  return (
    <Menu
      buttonId="flowMenuButton"
      ariaLabel={t("Game flow")}
      label={
        <>
          <SlidersHorizontal size={16} aria-hidden />
          <span className="hidden md:inline">{t("Flow")}</span>
        </>
      }
      panelClassName="w-72 space-y-3"
    >
      {({ close }) => (
        <>
          <label className="block text-xs text-pro-mute">
            {t("Jump to round")}
            <select
              id="roundSelector"
              aria-label={t("round")}
              title={t("Jump to a specific round")}
              className={SELECT}
              value={game.round}
              onChange={(e) => {
                flow.goToRound(parseInt(e.target.value, 10));
                close();
              }}
            >
              {game.rounds.map((_, index) => (
                <option value={index} key={`round-select-${index}`}>
                  {t("round")} {t("number", { count: index + 1 })}
                </option>
              ))}
            </select>
          </label>
          <HideGameQuestions game={game} setGame={setGame} send={send} />
          <ConfirmButton
            id="titleCardButton"
            className={buttonClass("secondary", ITEM)}
            armedClassName={ARMED}
            title={t("Show the title screen on the TV (starts a fresh game)")}
            needsConfirm={!game.title && flow.inProgress}
            confirmLabel={t("Click again to confirm")}
            onConfirm={() => {
              flow.showTitle();
              close();
            }}
          >
            {t("Title Card")}
          </ConfirmButton>
          {!game.title && (
            <ConfirmButton
              id="startRoundOneButton"
              className={buttonClass("secondary", ITEM)}
              armedClassName={ARMED}
              title={t("Put the board live and start scoring round 1")}
              needsConfirm={flow.startNeedsConfirm}
              confirmLabel={t("Click again to confirm")}
              onConfirm={() => {
                flow.startRoundOne();
                close();
              }}
            >
              {t("Restart from Round 1")}
            </ConfirmButton>
          )}
          {game.final_round != null && (
            <Button
              id="finalRoundButton"
              className={ITEM}
              title={t("Switch to the Fast Money round")}
              onClick={() => {
                flow.goFinal();
                close();
              }}
            >
              {t("Final Round")}
            </Button>
          )}
        </>
      )}
    </Menu>
  );
}
