import LanguageSwitcher from "@/components/LanguageSwitcher";
import TitleLogo from "@/components/TitleLogo";
import { buttonClass } from "@/components/ui/button-class";
import { inputClass } from "@/components/ui/form";
import {
  DeviceCredentials,
  DeviceRole,
  formatCodeInput,
  isCompleteCode,
  loadCredentials,
  saveCredentials,
} from "@/lib/devices/devices";
import { DeviceLoss, leaveDevice } from "@/lib/devices/session";
import { getWebSocketUrl } from "@/lib/utils";
import { WSAction, WSEvent } from "@/types/game";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function lossMessageKey(lost: string | null): string | null {
  const reasons: Record<DeviceLoss, string> = {
    revoked: "The host removed this device. Ask the host for a new code.",
    ended: "The game has ended. Ask the host for a new code.",
    room: "That game no longer exists. Ask the host for a new code.",
  };
  return lost && lost in reasons ? reasons[lost as DeviceLoss] : null;
}

/** Where a TV, a buzzer box or a lights controller types the code from the host's Devices drawer. */
export default function ConnectPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState("");
  const [lost, setLost] = useState<string | null>(null);
  const [existing, setExisting] = useState<DeviceCredentials | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const autoSubmitted = useRef(false);

  function pair(codeToUse: string) {
    if (busy || !isCompleteCode(codeToUse)) return;
    setBusy(true);
    setError(null);
    const socket = new WebSocket(getWebSocketUrl());
    ws.current = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ action: WSAction.PAIR_DEVICE, data: { code: codeToUse } }));
    };
    socket.onmessage = (evt) => {
      let json: WSEvent;
      try {
        json = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (json.action === WSAction.DEVICE_PAIRED) {
        const data = json as WSEvent & {
          room?: string;
          id?: string;
          token?: string;
          name?: string;
          roles?: DeviceRole[];
        };
        saveCredentials(window.localStorage, {
          room: data.room ?? "",
          id: data.id ?? "",
          token: data.token ?? "",
          name: data.name ?? "",
          roles: data.roles ?? [],
        });
        socket.close();
        window.location.href = "/device";
      } else if (json.action === WSAction.ERROR) {
        setError(json.code ? t(json.code, { message: json.message }) : t("Something went wrong. Try again."));
        setBusy(false);
        socket.close();
      }
    };
    socket.onerror = () => {
      setError(t("Could not reach the game server. Check the internet connection and try again."));
      setBusy(false);
    };
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLost(params.get("lost"));
    setExisting(loadCredentials(window.localStorage));
    const fromLink = formatCodeInput(params.get("code") ?? "");
    setCode(fromLink);
    setMounted(true);
    // A link from the host's drawer carries the code: pair straight away, there is nothing else to type.
    if (isCompleteCode(fromLink) && !autoSubmitted.current) {
      autoSubmitted.current = true;
      pair(fromLink);
    }
    return () => ws.current?.close();
  }, []);

  const lostKey = lossMessageKey(lost);

  return (
    <div className="flex min-h-screen w-full flex-col bg-pro-bg px-4 py-4 text-pro-text">
      <Head>
        <title>{t("Connect this device")}</title>
      </Head>
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
        <div className="w-40">
          <LanguageSwitcher variant="bare" />
        </div>
        <Link href="/" className={buttonClass("ghost", "min-h-10 px-3")}>
          {t("Back to start")}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-6">
        <div className="mx-auto w-full max-w-[320px]">
          <TitleLogo insert="" />
        </div>

        {mounted && lostKey && (
          <p
            id="connectLostMessage"
            role="status"
            className="rounded-[10px] border border-pro-line bg-pro-panel p-3 text-sm"
          >
            {t(lostKey)}
          </p>
        )}

        {mounted && existing && !lost && (
          <div id="connectExisting" className="space-y-3 rounded-[14px] border border-pro-line bg-pro-panel p-5">
            <p className="text-sm">{t("This device is already connected as {{name}}.", { name: existing.name })}</p>
            <Link href="/device" id="connectOpenDevice" className={buttonClass("primary", "min-h-12 w-full text-base")}>
              {t("Open")}
            </Link>
            <button
              id="connectDisconnect"
              type="button"
              className={buttonClass("secondary", "min-h-12 w-full text-base")}
              onClick={() => leaveDevice()}
            >
              {t("Disconnect this device")}
            </button>
          </div>
        )}

        <form
          className="space-y-4 rounded-[14px] border border-pro-line bg-pro-panel p-5"
          onSubmit={(e) => {
            e.preventDefault();
            pair(code);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="pairCodeInput" className="block text-sm font-medium">
              {t("Pairing code")}
            </label>
            <input
              id="pairCodeInput"
              className={`${inputClass} min-h-14 text-center text-2xl font-bold uppercase tracking-[0.2em] placeholder:text-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              value={code}
              onChange={(e) => setCode(formatCodeInput(e.target.value))}
              placeholder={t("Code from the host, like ABCD-K7P2")}
            />
            <p className="text-xs text-pro-mute">
              {t("The host makes this code in the Devices panel of the console.")}
            </p>
          </div>

          {error && (
            <p id="connectError" role="alert" className="text-sm text-pro-danger">
              {error}
            </p>
          )}

          <button
            id="pairSubmitButton"
            type="submit"
            disabled={busy || !isCompleteCode(code)}
            className={buttonClass("primary", "min-h-14 w-full text-lg uppercase")}
          >
            {busy ? t("Connecting…") : t("Connect")}
          </button>
        </form>
      </div>
    </div>
  );
}
