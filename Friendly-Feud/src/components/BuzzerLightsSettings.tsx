import { Button } from "@/components/ui/Button";
import { LIGHT_EVENTS, type LightEvent, type LightsConfig, type LightsMode } from "@/lib/buzzer/lights";
import { useTranslation } from "react-i18next";

interface BuzzerLightsSettingsProps {
  config: LightsConfig;
  onChange: (config: LightsConfig) => void;
  /** The serial port is open. */
  connected: boolean;
  serialSupported: boolean;
  onConnect: () => void;
  onTest: (event: LightEvent) => void;
  error: string;
  teamNames: [string, string];
}

const inputClass =
  "w-full rounded-[10px] border border-pro-line bg-pro-raised px-3 py-2 font-mono text-sm text-pro-text placeholder:text-pro-mute";

/** Lights that go on when a team buzzes: a serial board (Arduino, USB relay) or web addresses (WLED, Shelly...). */
export default function BuzzerLightsSettings({
  config,
  onChange,
  connected,
  serialSupported,
  onConnect,
  onTest,
  error,
  teamNames,
}: BuzzerLightsSettingsProps) {
  const { t } = useTranslation();

  const eventLabel: Record<LightEvent, string> = {
    team0: t("{{team}} buzzed", { team: teamNames[0] }),
    team1: t("{{team}} buzzed", { team: teamNames[1] }),
    pending: t("Buzzed, team not chosen yet"),
    off: t("Buzzers cleared (lights off)"),
  };

  const setMode = (mode: LightsMode) => onChange({ ...config, mode });

  return (
    <section aria-labelledby="buzzerLightsTitle" className="space-y-3 rounded-[12px] border border-pro-line p-4">
      <div>
        <h3 id="buzzerLightsTitle" className="text-base font-semibold">
          {t("Lights")}
        </h3>
        <p className="mt-1 text-sm text-pro-mute">
          {t("Switch lights on when a team buzzes and off when the buzzers are cleared. Saved on this device.")}
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-pro-mute">{t("Connection")}</span>
        <select
          id="lightsMode"
          value={config.mode}
          onChange={(e) => setMode(e.target.value as LightsMode)}
          className={inputClass}
        >
          <option value="off">{t("No lights")}</option>
          <option value="serial">{t("USB or serial board (Arduino, relay)")}</option>
          <option value="webhook">{t("Web address (WLED, Shelly, Home Assistant)")}</option>
        </select>
      </label>

      {config.mode === "serial" && (
        <div className="space-y-3">
          {!serialSupported ? (
            <p id="lightsSerialUnsupported" className="text-sm text-pro-gold">
              {t("This browser cannot talk to a serial port. Use Chrome or Edge on the buzzers laptop.")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button id="lightsConnect" variant="secondary" onClick={onConnect}>
                {connected ? t("Choose another device") : t("Connect a device")}
              </Button>
              <span id="lightsStatus" className={connected ? "text-sm text-pro-ok" : "text-sm text-pro-mute"}>
                {connected ? t("Connected") : t("Not connected")}
              </span>
            </div>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-pro-mute">{t("Baud rate")}</span>
            <input
              id="lightsBaud"
              type="number"
              min={300}
              value={config.baud}
              onChange={(e) => onChange({ ...config, baud: Number(e.target.value) || 9600 })}
              className={inputClass}
            />
          </label>
        </div>
      )}

      {(config.mode === "serial" || config.mode === "webhook") && (
        <div className="space-y-2">
          <p className="text-sm text-pro-mute">
            {config.mode === "serial"
              ? t("What to send for each event. Use \\n for a new line and \\xA0 for a raw byte.")
              : t("Address to call for each event. Start with POST to send a POST. Leave empty to do nothing.")}
          </p>
          {LIGHT_EVENTS.map((event) => {
            const kind = config.mode as "serial" | "webhook";
            return (
              <div key={event} className="grid items-center gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <label htmlFor={`lights-${kind}-${event}`} className="text-sm">
                  {eventLabel[event]}
                </label>
                <input
                  id={`lights-${kind}-${event}`}
                  value={config[kind][event]}
                  placeholder={kind === "webhook" ? "http://192.168.1.50/win&T=1" : ""}
                  onChange={(e) => onChange({ ...config, [kind]: { ...config[kind], [event]: e.target.value } })}
                  className={inputClass}
                />
                <Button id={`lightsTest-${event}`} variant="ghost" onClick={() => onTest(event)}>
                  {t("Test")}
                </Button>
              </div>
            );
          })}
          {config.mode === "webhook" && (
            <p className="text-xs text-pro-mute">
              {t(
                "Browsers block http:// addresses from an https:// page. In Chrome, allow Insecure content for this site, or use the serial option."
              )}
            </p>
          )}
        </div>
      )}

      {error && (
        <p id="lightsError" role="alert" className="text-sm text-pro-danger-text">
          {error}
        </p>
      )}
    </section>
  );
}
