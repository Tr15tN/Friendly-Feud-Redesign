import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/form";
import { DEFAULT_DISPLAY_SCALE, MAX_DISPLAY_SCALE, MIN_DISPLAY_SCALE, normalizeDisplayScale } from "@/lib/tv/layout";
import { Game, WSAction, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface DisplayScaleProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

const SEND_DELAY_MS = 120;

/** "TV size": how much of the TV the picture may use. Lower it if the TV cuts off the edges (overscan). */
export default function DisplayScale({ game, setGame, send }: DisplayScaleProps) {
  const { t } = useTranslation();
  const saved = normalizeDisplayScale(game.settings.display_scale);
  const [value, setValue] = useState(saved);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ game, setGame, send });
  latest.current = { game, setGame, send };

  // Follow changes made elsewhere (another host tab), but not while the slider is being dragged.
  useEffect(() => {
    if (!timer.current) setValue(saved);
  }, [saved]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function change(next: number) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    // The TV follows while dragging, but not with one message per pixel.
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = latest.current;
      const updated = { ...current.game, settings: { ...current.game.settings, display_scale: next } };
      current.send({ action: WSAction.DATA, data: updated });
      current.setGame(updated);
    }, SEND_DELAY_MS);
  }

  return (
    <Field
      label={`${t("TV size")}: ${value}%`}
      htmlFor="displayScaleInput"
      hint={t("If your TV cuts off the edges of the picture, lower this until everything is visible.")}
    >
      <div className="flex items-center gap-3">
        <input
          id="displayScaleInput"
          type="range"
          min={MIN_DISPLAY_SCALE}
          max={MAX_DISPLAY_SCALE}
          step={1}
          value={value}
          onChange={(e) => change(normalizeDisplayScale(Number(e.target.value)))}
          className="w-full accent-pro-accent"
        />
        <Button
          id="displayScaleReset"
          variant="secondary"
          disabled={value === DEFAULT_DISPLAY_SCALE}
          onClick={() => change(DEFAULT_DISPLAY_SCALE)}
        >
          {t("Reset")}
        </Button>
      </div>
    </Field>
  );
}
