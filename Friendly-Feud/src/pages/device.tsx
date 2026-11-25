import BuzzerScreen from "@/components/BuzzerScreen";
import GameScreen from "@/components/GameScreen";
import { buttonClass } from "@/components/ui/button-class";
import { DeviceCredentials, hasRole, loadCredentials } from "@/lib/devices/devices";
import { leaveDevice } from "@/lib/devices/session";
import { Cog, Expand, Keyboard, LogOut } from "lucide-react";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface GearProps {
  credentials: DeviceCredentials;
  /** The TV picture is on screen: keep the gear out of the audience's sight until someone reaches for it. */
  discreet: boolean;
  hasSettings: boolean;
  onOpenSettings: () => void;
}

function DeviceGear({ credentials, discreet, hasSettings, onOpenSettings }: GearProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-3 left-3 z-[60] font-pro text-pro-text">
      {open && (
        <div
          id="deviceMenu"
          role="menu"
          className="mb-2 w-72 space-y-2 rounded-[14px] border border-pro-line bg-pro-panel p-3 shadow-xl"
        >
          <p className="text-sm font-semibold">{t("Connected as {{name}}", { name: credentials.name })}</p>
          <button
            id="deviceFullscreenButton"
            role="menuitem"
            className={buttonClass("secondary", "min-h-10 w-full justify-start gap-2 text-sm")}
            onClick={() => {
              document.documentElement.requestFullscreen?.().catch(() => {});
              setOpen(false);
            }}
          >
            <Expand size={16} aria-hidden />
            {t("Full screen")}
          </button>
          {hasSettings && (
            <button
              id="deviceSettingsButton"
              role="menuitem"
              className={buttonClass("secondary", "min-h-10 w-full justify-start gap-2 text-sm")}
              onClick={() => {
                onOpenSettings();
                setOpen(false);
              }}
            >
              <Keyboard size={16} aria-hidden />
              {t("Buzzer and lights settings")}
            </button>
          )}
          <button
            id="deviceDisconnectButton"
            role="menuitem"
            className={buttonClass("secondary", "min-h-10 w-full justify-start gap-2 text-sm")}
            onClick={() => leaveDevice()}
          >
            <LogOut size={16} aria-hidden />
            {t("Disconnect this device")}
          </button>
        </div>
      )}
      <button
        id="deviceGearButton"
        aria-label={t("Device settings")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex size-10 items-center justify-center rounded-full border border-pro-line bg-pro-panel transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold ${
          discreet && !open ? "opacity-0 hover:opacity-100" : "opacity-70 hover:opacity-100"
        }`}
      >
        <Cog size={18} aria-hidden />
      </button>
    </div>
  );
}

/** A paired TV, buzzer box or lights controller: signs in with its stored token and shows what its roles need. */
export default function DevicePage() {
  const [credentials, setCredentials] = useState<DeviceCredentials | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const stored = loadCredentials(window.localStorage);
    if (!stored) {
      window.location.replace("/connect");
      return;
    }
    setCredentials(stored);
  }, []);

  if (!credentials) {
    return null;
  }

  const tv = hasRole(credentials.roles, "tv");
  const buzzers = hasRole(credentials.roles, "buzzers");
  const lights = hasRole(credentials.roles, "lights");
  const auth = { kind: "device", credentials } as const;

  return (
    <>
      <Head>
        <title>{credentials.name || t("Device")}</title>
      </Head>
      {tv && <GameScreen auth={auth} />}
      {(buzzers || lights) && (
        <BuzzerScreen
          auth={auth}
          layout={tv ? "overlay" : buzzers ? "full" : "lights"}
          keys={buzzers}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
        />
      )}
      <DeviceGear
        credentials={credentials}
        discreet={tv}
        hasSettings={buzzers || lights}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    </>
  );
}
