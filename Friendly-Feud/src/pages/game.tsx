import BoardScreen from "@/components/BoardScreen";
import BuzzerPopup from "@/components/BuzzerPopup";
import StrikeOverlay from "@/components/StrikeOverlay";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { hasPendingBuzz } from "@/lib/host/console";
import { useTeamColors } from "@/lib/hooks/useTeamColors";
import { getWebSocketUrl } from "@/lib/utils";
import { BuzzedState, Game, WSAction, WSEvent } from "@/types/game";
// @ts-expect-error: not sure if cookie-cutter is typed
import cookieCutter from "cookie-cutter";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import NoSession from "../components/ui/NoSession";

let timerInterval: NodeJS.Timeout | null = null;

export default function GamePage() {
  const { i18n, t } = useTranslation();
  const [game, setGame] = useState<Game | null>(null);
  useTeamColors(game?.teams);
  const [timer, setTimer] = useState(0);
  const [showMistake, setShowMistake] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [buzzed, setBuzzed] = useState<BuzzedState>({});
  const ws = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCounterRef = useRef(0);
  const mistakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleMusicRef = useRef<HTMLAudioElement | null>(null);
  const titleMusicSourceRef = useRef("/title.mp3");

  const getTitleMusic = () => {
    const source = titleMusicSourceRef.current;
    const resolvedSource = typeof window === "undefined" ? source : new URL(source, window.location.href).toString();

    if (titleMusicRef.current && titleMusicRef.current.src !== resolvedSource) {
      titleMusicRef.current.pause();
      titleMusicRef.current = null;
    }

    if (!titleMusicRef.current) {
      const audio = new Audio(source);
      audio.loop = true;
      titleMusicRef.current = audio;
    }

    return titleMusicRef.current;
  };

  const notifyTitleMusicPlaybackError = () => {
    const session = cookieCutter.get("session");
    const [room, id, hostPassword] = session?.split(":") ?? [];

    if (!room || !id || ws.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.current.send(
      JSON.stringify({
        action: WSAction.TITLE_MUSIC_PLAYBACK_ERROR,
        room,
        id,
        hostPassword,
      })
    );
  };

  useEffect(() => {
    if (game?.is_final_round && game.final_round_timers) {
      const timerIndex = game.is_final_second ? 1 : 0;
      setTimer(game.final_round_timers[timerIndex]);
    }
  }, [game?.is_final_round, game?.is_final_second, game?.final_round_timers]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const themeClass = game?.settings?.theme ?? "default";
    document.body.className = `${themeClass} bg-background game-screen`;

    return () => {
      document.body.classList.remove("game-screen");
    };
  }, [game?.settings?.theme]);

  useEffect(() => {
    ws.current = new WebSocket(getWebSocketUrl());
    ws.current.onopen = function () {
      console.log("game connected to server");
      const session = cookieCutter.get("session");
      console.debug(session);
      if (session != null && ws.current) {
        console.debug("found user session", session);
        ws.current.send(JSON.stringify({ action: "game_window", session: session }));

        // NOTE: ping interval is for spectator user.
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            console.debug("sending pong in game window");
            const sessionParts = session?.split(":");
            if (sessionParts?.length >= 2) {
              const [room, id, _] = sessionParts;
              ws.current.send(
                JSON.stringify({
                  action: "pong",
                  session: session,
                  id: id,
                  room: room,
                })
              );
            } else {
              console.error("Invalid session format for pong:", session);
            }
          } else {
            clearInterval(pingInterval);
          }
        }, 5000);

        return () => clearInterval(pingInterval);
      }
    };

    ws.current.onmessage = function (evt) {
      const received_msg = evt.data;
      let json: WSEvent;
      try {
        json = JSON.parse(received_msg);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return;
      }

      console.debug(json);
      if (json.action === "data") {
        const newGameData: Game = json.data;
        const nextTitleMusicSource = newGameData.settings?.title_music_url ?? "/title.mp3";
        if (titleMusicSourceRef.current !== nextTitleMusicSource) {
          titleMusicSourceRef.current = nextTitleMusicSource;
          if (titleMusicRef.current) {
            titleMusicRef.current.pause();
            titleMusicRef.current = null;
          }
        }

        if (Object.keys(buzzed).length === 0 && newGameData.buzzed.length > 0) {
          const buzzerInfo = newGameData.buzzed[0];
          const user = newGameData.registeredPlayers[buzzerInfo.id];
          console.log(user);
          if (user && newGameData.teams[user.team ?? 0]) {
            setBuzzed({
              id: buzzerInfo.id,
              name: user.name,
              team_name: newGameData.teams[user.team ?? 0].name,
            });
          } else if (buzzerInfo.team != null && newGameData.teams[buzzerInfo.team]) {
            setBuzzed({
              id: "",
              name: "",
              team_name: newGameData.teams[buzzerInfo.team].name,
            });
          } else if (hasPendingBuzz(newGameData)) {
            // Physical buzzer pressed; the host has not said which team yet.
            setBuzzed({ pending: true });
          } else {
            console.warn("Buzzed user or team not found:", buzzerInfo, newGameData);
            setBuzzed({});
          }
        } else if (Object.keys(buzzed).length > 0 && newGameData.buzzed.length === 0) {
          setBuzzed({});
        }

        if (newGameData.title_text === "Change Me") {
          newGameData.title_text = t("Change Me");
        }

        setGame(newGameData);

        const session = cookieCutter.get("session");
        let sessionParts;
        if (session) {
          sessionParts = session.split(":");
        } else {
          console.error("No session cookie found");
          return;
        }
        if (sessionParts.length === 2) {
          const [_, id] = sessionParts;
          setIsHost(newGameData.host.id === id);
        }
      } else if (json.action === "mistake" || json.action === "show_mistake") {
        const audio = new Audio("wrong.mp3");
        audio.play();
        if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current);
        setShowMistake(typeof json.data === "number" ? json.data : 1);
        mistakeTimeoutRef.current = setTimeout(() => {
          setShowMistake(null);
        }, 1000);
      } else if (json.action === "quit") {
        setGame(null);
        window.close();
      } else if (json.action === "reveal") {
        const audio = new Audio("good-answer.mp3");
        audio.play();
      } else if (json.action === "final_reveal") {
        const audio = new Audio("fm-answer-reveal.mp3");
        audio.play();
      } else if (json.action === "duplicate") {
        const audio = new Audio("duplicate.mp3");
        audio.play();
      } else if (json.action === "final_submit") {
        const audio = new Audio("good-answer.mp3");
        audio.play();
      } else if (json.action === "final_wrong") {
        const audio = new Audio("try-again.mp3");
        audio.play();
      } else if (json.action === WSAction.PLAY_TITLE_MUSIC) {
        const titleMusic = getTitleMusic();
        titleMusic.play().catch((error) => {
          console.warn("Unable to play title music:", error);
          toast.error(t(ERROR_CODES.TITLE_MUSIC_PLAYBACK_ERROR));
          notifyTitleMusicPlaybackError();
        });
      } else if (json.action === WSAction.PAUSE_TITLE_MUSIC) {
        const titleMusic = getTitleMusic();
        titleMusic.pause();
      } else if (json.action === WSAction.TITLE_MUSIC_PLAYBACK_ERROR) {
        console.debug("Title music playback error reported");
      } else if (json.action === "set_timer") {
        setTimer(json.data);
      } else if (json.action === "stop_timer") {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
      } else if (json.action === "start_timer") {
        timerInterval = setInterval(() => {
          setTimer((prevTimer) => {
            const nextTimer = prevTimer - 1;
            if (nextTimer > 0) {
              return nextTimer;
            } else {
              const audio = new Audio("try-again.mp3");
              audio.play();

              if (timerInterval) {
                clearInterval(timerInterval);
              }

              // Send timer stop to admin.js
              try {
                const session = cookieCutter.get("session");
                const [room, id, hostPassword] = session.split(":");

                if (!session) {
                  console.error("No session cookie found");
                  return 0;
                }

                if (!room || !id) {
                  console.error("Invalid session cookie format");
                  return 0;
                }

                if (ws.current?.readyState === WebSocket.OPEN) {
                  ws.current.send(
                    JSON.stringify({
                      action: "timer_complete",
                      room: room,
                      id: id,
                      hostPassword: hostPassword,
                    })
                  );
                } else {
                  console.warn("WebSocket not open when trying to send timer_complete");
                }
              } catch (error) {
                console.error("Error processing session cookie:", error);
              }
              return 0;
            }
          });
        }, 1000);
      } else if (json.action === "change_lang") {
        console.debug("Language Change", json.data);
        i18n.changeLanguage(json.data);
      } else if (json.action === "timer_complete") {
        console.debug("Timer complete");
      } else if (json.action === "clearbuzzers") {
        console.debug("Clear buzzers");
        setBuzzed({});
      } else {
        console.error("didn't expect", json);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error(t(ERROR_CODES.CONNECTION_LOST));
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
    };

    refreshCounterRef.current = 0;
    refreshIntervalRef.current = setInterval(() => {
      if (ws.current?.readyState !== WebSocket.OPEN) {
        refreshCounterRef.current++;
        const remainingSeconds = Math.max(0, 5 - refreshCounterRef.current);
        toast.error(t(ERROR_CODES.CONNECTION_LOST, { message: `${remainingSeconds}` }));
        if (refreshCounterRef.current >= 5) {
          console.debug("game reload()");
          if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
          location.reload();
        }
      } else {
        refreshCounterRef.current = 0;
      }
    }, 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current);
      if (timerInterval) clearInterval(timerInterval);
      if (titleMusicRef.current) {
        titleMusicRef.current.pause();
      }
      ws.current?.close();
    };
  }, []);

  if (game?.teams != null) {
    const activeTheme = game?.settings?.theme ?? "default";

    const gameSession = <BoardScreen game={game} timer={timer} />;

    return (
      <>
        {!isHost ? (
          <div className="absolute flex w-screen flex-col items-end">
            <button
              className="m-1 rounded-lg bg-secondary-500 p-2 font-bold uppercase shadow-md hover:bg-secondary-200"
              id="quitButton"
              onClick={() => {
                cookieCutter.set("session", "");
                window.location.href = "/";
              }}
            >
              {t("quit")}
            </button>
          </div>
        ) : null}
        <StrikeOverlay count={showMistake} />
        <div className={`${activeTheme} game-screen min-h-screen bg-background`}>
          <div className="">{gameSession}</div>
        </div>
        <BuzzerPopup buzzed={buzzed} suppressed={showMistake !== null} />
      </>
    );
  } else {
    return <NoSession />;
  }
}
