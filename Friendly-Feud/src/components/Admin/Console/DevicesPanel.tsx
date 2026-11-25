import { Button, buttonClass } from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { inputClass, ToggleRow } from "@/components/ui/form";
import {
  connectLink,
  DEVICE_ROLES,
  DeviceInfo,
  DeviceRole,
  formatCountdown,
  onlineCount,
  secondsLeft,
} from "@/lib/devices/devices";
import { WSAction, WSEvent } from "@/types/game";
import { Check, Copy, Keyboard, Monitor, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DevicesPanelProps {
  room: string;
  devices: DeviceInfo[];
  send: (data: WSEvent) => void;
}

const HEADING = "mb-2 text-xs font-semibold uppercase tracking-widest text-pro-mute";

const ROLE_LABEL: Record<DeviceRole, string> = {
  tv: "TV board",
  buzzers: "Physical buttons",
  lights: "Lights",
};

const ROLE_HINT: Record<DeviceRole, string> = {
  tv: "Shows the game on a big screen",
  buzzers: "The buzzer buttons are plugged into that computer",
  lights: "Switches the lights when a button is pressed",
};

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function CopyButton({ id, text, label }: { id: string; text: string; label: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      id={id}
      onClick={() => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {copied ? t("Copied") : label}
    </Button>
  );
}

function DeviceCard({ device, now, send }: { device: DeviceInfo; now: number; send: (data: WSEvent) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(device.name);
  useEffect(() => setName(device.name), [device.name]);

  const left = secondsLeft(device.codeExpires, now);
  const waiting = !device.paired;
  const expired = waiting && (device.expired || left === 0);
  const link = typeof window === "undefined" ? "" : connectLink(window.location.origin, device.code);
  const address = typeof window === "undefined" ? "/connect" : `${window.location.host}/connect`;

  function rename() {
    const clean = name.trim();
    if (!clean) {
      setName(device.name);
      return;
    }
    if (clean !== device.name) {
      send({ action: WSAction.RENAME_DEVICE, name: clean, data: { deviceId: device.id } });
    }
  }

  return (
    <li id={`deviceCard-${device.id}`} className="space-y-3 rounded-[12px] border border-pro-line bg-pro-panel p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`deviceName-${device.id}`}
          aria-label={t("Device name")}
          className={`${inputClass} min-h-9 w-44 font-semibold`}
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        {device.roles.map((role) => (
          <Chip key={role}>{t(ROLE_LABEL[role])}</Chip>
        ))}
        <span className="ml-auto" />
        {waiting ? (
          <Chip tone={expired ? "neutral" : "gold"} id={`deviceStatus-${device.id}`}>
            {expired ? t("Code expired") : t("Waiting for the code")}
          </Chip>
        ) : (
          <Chip tone={device.connected ? "ok" : "neutral"} id={`deviceStatus-${device.id}`}>
            {device.connected ? t("Online") : t("Offline")}
          </Chip>
        )}
      </div>

      {waiting && !expired && device.code && (
        <div className="space-y-2 rounded-[10px] bg-pro-raised p-3 text-center">
          <p className="text-xs text-pro-mute">
            {t("On that device open")} <span className="font-semibold text-pro-text">{address}</span>{" "}
            {t("and type this code")}
          </p>
          <p
            id={`deviceCode-${device.id}`}
            className="select-all text-4xl font-extrabold tracking-[0.15em] text-pro-text sm:text-5xl"
          >
            {device.code}
          </p>
          <p className="break-all text-xs text-pro-mute" id={`deviceLink-${device.id}`}>
            {link}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CopyButton id={`copyDeviceLink-${device.id}`} text={link} label={t("Copy link")} />
            <span className="text-xs tabular-nums text-pro-mute">
              {t("Valid for")} {formatCountdown(left)}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {waiting && expired && (
          <Button
            id={`refreshDevice-${device.id}`}
            onClick={() => send({ action: WSAction.REFRESH_PAIRING, data: { deviceId: device.id } })}
          >
            <RefreshCw size={16} aria-hidden />
            {t("New code")}
          </Button>
        )}
        <ConfirmButton
          id={`revokeDevice-${device.id}`}
          needsConfirm
          confirmLabel={t("Click again to confirm")}
          className={buttonClass("danger")}
          armedClassName={buttonClass("secondary", "border-pro-gold text-pro-gold ring-2 ring-pro-gold")}
          onConfirm={() => send({ action: WSAction.REVOKE_DEVICE, data: { deviceId: device.id } })}
        >
          {waiting ? t("Cancel") : t("Revoke")}
        </ConfirmButton>
      </div>
    </li>
  );
}

/** Content of the "Devices" drawer: the TV, buzzer buttons and lights can each run on their own device. */
export default function DevicesPanel({ room, devices, send }: DevicesPanelProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<DeviceRole[]>(["tv"]);
  const now = useNow(devices.some((d) => !d.paired));

  function toggle(role: DeviceRole, on: boolean) {
    setRoles((current) => (on ? [...current, role] : current.filter((r) => r !== role)));
  }

  function create() {
    if (roles.length === 0) return;
    send({ action: WSAction.CREATE_PAIRING, name: name.trim(), data: { roles } });
    setName("");
  }

  return (
    <div className="space-y-6 text-foreground">
      <section>
        <h3 className={HEADING}>{t("On this computer")}</h3>
        <div className="flex flex-wrap gap-2 rounded-[12px] border border-pro-line bg-pro-panel p-3">
          <Link id="devicesOpenGameWindow" href="/game" target="_blank" className={buttonClass("secondary")}>
            <Monitor size={16} aria-hidden />
            {t("Open Game Window")}
          </Link>
          <Link
            id="devicesHostBuzzers"
            href={`/buzzers?room=${room}`}
            target="_blank"
            className={buttonClass("secondary")}
          >
            <Keyboard size={16} aria-hidden />
            {t("Host Buzzers")}
          </Link>
          <p className="basis-full text-xs text-pro-mute">
            {t("These open in a new window on this computer. For another computer or a TV, add a device below.")}
          </p>
        </div>
      </section>

      <section>
        <h3 className={HEADING}>{t("Add a device")}</h3>
        <form
          className="space-y-4 rounded-[12px] border border-pro-line bg-pro-panel p-3"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="newDeviceName" className="block text-sm font-medium text-pro-text">
              {t("Device name")}
            </label>
            <input
              id="newDeviceName"
              className={inputClass}
              value={name}
              maxLength={24}
              placeholder={t("For example: Stage TV")}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-pro-text">{t("What is this device for?")}</legend>
            {DEVICE_ROLES.map((role) => (
              <ToggleRow
                key={role}
                id={`deviceRole-${role}`}
                label={t(ROLE_LABEL[role])}
                hint={t(ROLE_HINT[role])}
                checked={roles.includes(role)}
                onChange={(on) => toggle(role, on)}
              />
            ))}
          </fieldset>
          <Button id="createDeviceButton" variant="primary" type="submit" disabled={roles.length === 0}>
            {t("Create code")}
          </Button>
        </form>
      </section>

      <section>
        <h3 className={HEADING}>
          {t("Devices")}
          {devices.some((d) => d.paired) && (
            <span className="ml-2 normal-case tracking-normal">
              {t("{{online}} of {{total}} online", {
                online: onlineCount(devices),
                total: devices.filter((d) => d.paired).length,
              })}
            </span>
          )}
        </h3>
        {devices.length === 0 ? (
          <p
            id="noDevicesText"
            className="rounded-[12px] border border-dashed border-pro-line p-4 text-sm text-pro-mute"
          >
            {t("No devices yet. Everything runs on this computer.")}
          </p>
        ) : (
          <ul id="deviceList" className="space-y-3">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} now={now} send={send} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
