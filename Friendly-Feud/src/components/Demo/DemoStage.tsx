import AdminPage from "@/components/AdminPage";
import { DemoApi, DemoContext } from "@/components/Demo/DemoContext";
import Overlay, { OverlayHandle } from "@/components/Demo/Overlay";
import { Cancelled, createStepApi, Dock, Frames, Token } from "@/components/Demo/runner";
import StepBar from "@/components/Demo/StepBar";
import { DEMO_STEPS } from "@/components/Demo/steps";
import { buildDemoSet, DEMO_HOST_ID, DEMO_PASSWORD, DEMO_ROOM, demoFiles } from "@/lib/demo/demoGame";
import { DemoServer } from "@/lib/demo/server";
import { normalizeLanguage } from "@/i18n/languages";
import { Game } from "@/types/game";
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GameContext } from "../../pages";

/** Everything needed to put the demo back exactly where a step ended. */
interface Checkpoint {
  game: Game;
  dock: Dock;
}

const DOCK_WIDE = 460;
const DOCK_NARROW = 210;
const TV_RATIO = 9 / 16;
const PHONE = { w: 390, h: 780 };

function useViewport() {
  const [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

/** The interactive demo: the real host console, a TV and a phone, all running on an in-browser fake server. */
export default function DemoStage() {
  const { t, i18n } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  const [server] = useState(() => {
    return new DemoServer({
      room: DEMO_ROOM,
      hostId: DEMO_HOST_ID,
      files: (language) => demoFiles(normalizeLanguage(language)),
      loadFile: (file) => (file.endsWith("/demo.json") ? buildDemoSet((key) => tRef.current(key)) : null),
      teamNames: ["Alpha", "Bravo"],
    });
  });
  // The TV and phone frames look the server up here. Set in render so it exists before they load.
  if (typeof window !== "undefined") window.famfDemoServer = server;
  const [hostClient] = useState(() => server.connect(DEMO_HOST_ID));
  const ws = useRef(hostClient) as MutableRefObject<unknown>;

  const [hostGame, setHostGame] = useState<Game | null>(() => server.snapshot());
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dock, setDock] = useState<Dock>({ tv: false, phone: false });
  const [epoch, setEpoch] = useState(0);
  const [barHeight, setBarHeight] = useState(150);
  const [phoneSrc, setPhoneSrc] = useState("/demo/phone");
  const viewport = useViewport();
  const wide = viewport.w >= 1024;

  const dockRef = useRef(dock);
  dockRef.current = dock;
  const overlay = useRef<OverlayHandle>(null);
  const tvFrame = useRef<HTMLIFrameElement>(null);
  const phoneFrame = useRef<HTMLIFrameElement>(null);
  const token = useRef<Token>({ cancelled: true, fast: false });
  const checkpoints = useRef<Map<number, Checkpoint>>(new Map());
  const initial = useRef<Checkpoint>({ game: server.snapshot(), dock: { tv: false, phone: false } });
  const finished = useRef<Promise<void>>(Promise.resolve());
  const advanceWhenDone = useRef(false);
  const current = useRef(0);

  const exit = useCallback(() => {
    token.current.cancelled = true;
    window.location.href = "/";
  }, []);

  const demoApi = useMemo<DemoApi>(
    () => ({
      onOpenGameWindow: () => setDock((d) => ({ ...d, tv: true })),
      exit,
    }),
    [exit]
  );

  const frames = useCallback((): Frames => ({ tv: tvFrame.current, phone: phoneFrame.current }), []);

  /** Put the server, the console and the devices back to a checkpoint. `hard` also reloads the console and phone. */
  const restoreTo = useCallback(
    (point: Checkpoint, hard: boolean) => {
      overlay.current?.setPointer(null);
      overlay.current?.setHighlights([]);
      setCaption(null);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      (document.activeElement as HTMLElement | null)?.blur?.();
      server.restore(point.game);
      setHostGame(server.snapshot());
      setDock(point.dock);
      if (hard) {
        setPhoneSrc(
          point.game.registeredPlayers["demo-player-1"] ? "/demo/phone?player=demo-player-1" : "/demo/phone"
        );
        setEpoch((e) => e + 1);
      }
    },
    [server]
  );

  const play = useCallback(
    async (stepIndex: number, hard: boolean) => {
      token.current.cancelled = true; // stop whatever was running
      const mine: Token = { cancelled: false, fast: false };
      token.current = mine;
      current.current = stepIndex;
      setIndex(stepIndex);
      setError(null);
      setRunning(true);
      advanceWhenDone.current = false;

      const base = stepIndex === 0 ? initial.current : checkpoints.current.get(stepIndex - 1);
      if (base) restoreTo(base, hard);
      // Let the console remount before the step starts looking for buttons.
      await new Promise((r) => setTimeout(r, hard ? 400 : 120));
      if (mine.cancelled) return;

      const api = createStepApi({
        token: mine,
        frames,
        overlay: () => overlay.current,
        server,
        t: tRef.current,
        setCaption,
        setDock: (update) => setDock((d) => ({ ...d, ...update })),
      });
      const run = DEMO_STEPS[stepIndex].run(api);
      finished.current = run.then(
        () => undefined,
        () => undefined
      );
      try {
        await run;
        if (mine.cancelled) return;
        overlay.current?.setPointer(null);
        overlay.current?.setHighlights([]);
        setCaption(null);
        // The visitor can poke at the console now; the next step puts everything back first.
        checkpoints.current.set(stepIndex, { game: server.snapshot(), dock: dockRef.current });
        setRunning(false);
        if (advanceWhenDone.current && stepIndex < DEMO_STEPS.length - 1) void play(stepIndex + 1, false);
      } catch (e) {
        if (e instanceof Cancelled || mine.cancelled) return;
        console.error(e);
        setError(tRef.current("This step got stuck. Press Replay, or carry on with Next."));
        overlay.current?.setPointer(null);
        overlay.current?.setHighlights([]);
        checkpoints.current.set(stepIndex, { game: server.snapshot(), dock: dockRef.current });
        setRunning(false);
      }
    },
    [frames, restoreTo, server]
  );

  // Start, once the console and frames exist.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    document.body.className = "bg-pro-bg";
    void play(0, false);
    return () => {
      token.current.cancelled = true;
    };
  }, [play]);

  // The host changing language in the demo changes the whole demo, as in a real room.
  useEffect(() => {
    const watcher = server.connect("demo-stage");
    watcher.addEventListener("message", (evt) => {
      const json = JSON.parse(evt.data) as { action?: string; data?: string };
      if (json.action === "change_lang" && json.data) void i18n.changeLanguage(json.data);
    });
    return () => watcher.close();
  }, [server, i18n]);

  const skip = useCallback(() => {
    token.current.fast = true;
    overlay.current?.setInstant(true);
  }, []);
  useEffect(() => {
    if (!running) overlay.current?.setInstant(false);
  }, [running]);

  const next = useCallback(() => {
    if (current.current >= DEMO_STEPS.length - 1) {
      exit();
      return;
    }
    if (token.current.cancelled === false && running) {
      // Finish this step quickly, then move on.
      advanceWhenDone.current = true;
      skip();
      return;
    }
    void play(current.current + 1, false);
  }, [exit, play, running, skip]);

  const back = useCallback(() => {
    if (current.current > 0) void play(current.current - 1, true);
  }, [play]);
  const replay = useCallback(() => void play(current.current, true), [play]);

  const tvWidth = wide ? Math.round(Math.min(DOCK_WIDE, Math.max(300, viewport.w * 0.3))) : DOCK_NARROW;
  const dockWidth = tvWidth;
  const tvScale = tvWidth / 1280;
  const availableHeight = viewport.h - 64 - barHeight - 24;
  const phoneScale = wide ? Math.max(0.26, Math.min(0.5, (availableHeight - tvWidth * TV_RATIO - 12) / PHONE.h)) : 0.26;

  return (
    <DemoContext.Provider value={demoApi}>
      <GameContext.Provider
        value={{ roomCode: DEMO_ROOM, setRoomCode: () => {}, hostPassword: DEMO_PASSWORD, setHostPassword: () => {} }}
      >
        <div
          className="min-h-screen bg-pro-bg"
          style={{
            paddingBottom: barHeight,
            paddingRight: wide && (dock.tv || dock.phone) ? dockWidth + 24 : 0,
            transition: "padding-right 250ms",
          }}
        >
          {hostGame && (
            <AdminPage
              key={epoch}
              // @ts-expect-error: the demo client stands in for the WebSocket
              ws={ws}
              game={hostGame}
              setGame={setHostGame}
              room={DEMO_ROOM}
              quitGame={exit}
              playerId={DEMO_HOST_ID}
              hostPassword={DEMO_PASSWORD}
            />
          )}
        </div>

        <div
          className={`fixed z-30 flex gap-3 ${wide ? "right-3 top-16 flex-col items-center overflow-y-auto" : "bottom-2 right-2 flex-row-reverse items-end"}`}
          style={wide ? { width: dockWidth, bottom: barHeight + 12 } : { bottom: barHeight + 8 }}
        >
          <div
            data-demo-device="tv"
            className={`overflow-hidden rounded-xl border-2 border-pro-line bg-black shadow-2xl ${dock.tv ? "" : "hidden"}`}
            style={{ width: tvWidth, height: tvWidth * TV_RATIO }}
          >
            <iframe
              ref={tvFrame}
              key={`tv-${epoch}`}
              src="/demo/tv"
              title={t("TV board")}
              tabIndex={-1}
              style={{ width: 1280, height: 720, border: 0, transform: `scale(${tvScale})`, transformOrigin: "0 0" }}
            />
          </div>
          <div
            data-demo-device="phone"
            className={`overflow-hidden rounded-[22px] border-4 border-pro-line bg-black shadow-2xl ${dock.phone ? "" : "hidden"}`}
            style={{ width: PHONE.w * phoneScale + 8, height: PHONE.h * phoneScale + 8 }}
          >
            <iframe
              ref={phoneFrame}
              key={`phone-${epoch}`}
              src={phoneSrc}
              title={t("Player phone")}
              tabIndex={-1}
              style={{
                width: PHONE.w,
                height: PHONE.h,
                border: 0,
                transform: `scale(${phoneScale})`,
                transformOrigin: "0 0",
              }}
            />
          </div>
        </div>

        {running && <div className="fixed inset-0 z-[65]" aria-hidden />}
        <Overlay ref={overlay} />
        <StepBar
          index={index}
          total={DEMO_STEPS.length}
          step={DEMO_STEPS[index]}
          running={running}
          caption={caption}
          error={error}
          onNext={next}
          onBack={back}
          onReplay={replay}
          onSkip={skip}
          onExit={exit}
          onHeight={setBarHeight}
        />
      </GameContext.Provider>
    </DemoContext.Provider>
  );
}
