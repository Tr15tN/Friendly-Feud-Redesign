import { clearCredentials, DeviceCredentials } from "@/lib/devices/devices";

/** Why a device has to be paired again; shown on the pairing page. */
export type DeviceLoss = "revoked" | "ended" | "room";

/** Error codes from the server that mean this device's credentials are no good any more. */
const LOSS_BY_ERROR_CODE: Record<string, DeviceLoss> = {
  "errors.device_revoked": "revoked",
  "errors.unauthenticated": "revoked",
  "errors.room_not_found": "room",
  "errors.game_closed": "ended",
  "errors.host_quit": "ended",
};

export function lossForErrorCode(code: string | undefined): DeviceLoss | null {
  return (code && LOSS_BY_ERROR_CODE[code]) || null;
}

/** Forget this device's pairing and go back to the pairing page. */
export function leaveDevice(reason?: DeviceLoss) {
  clearCredentials(window.localStorage);
  window.location.href = reason ? `/connect?lost=${reason}` : "/connect";
}

/** The first message every connection of a paired device sends. */
export function deviceConnectMessage(credentials: DeviceCredentials) {
  return JSON.stringify({
    action: "device_connect",
    room: credentials.room,
    id: credentials.id,
    data: { token: credentials.token },
  });
}

/** How a screen is signed in: with the host's browser session, or as a paired device. */
export type ScreenAuth = { kind: "session" } | { kind: "device"; credentials: DeviceCredentials };
