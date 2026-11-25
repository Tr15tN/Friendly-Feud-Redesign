import { useTranslation } from "react-i18next";

/** "2026 · 25.11 22:40": the year and the moment this version was built (set by deploy/ship.sh), or "dev". */
export function signatureStamp(buildTime = process.env.NEXT_PUBLIC_BUILD_TIME) {
  return `2026 · ${buildTime || "dev"}`;
}

interface SignatureProps {
  /** "tv" sits in the bottom-right corner of the title screen, "footer" is a quiet line on the home page. */
  variant: "tv" | "footer";
}

/**
 * The maker's signature with the year and build time. The image is used as a mask, so it takes the colour of the
 * surrounding text and works on any theme.
 */
export default function Signature({ variant }: SignatureProps) {
  const { t } = useTranslation();
  const tv = variant === "tv";
  const mask = "url(/signature.png) center / contain no-repeat";

  return (
    <div
      id="signature"
      title={`${t("Made by")} Tristan M`}
      className={
        tv
          ? "pointer-events-none absolute bottom-[1.5vh] right-[1.5vw] flex flex-col items-end text-white/70"
          : "flex flex-col items-center text-pro-mute"
      }
    >
      <span
        role="img"
        aria-label="Tristan M"
        className="block bg-current"
        style={{
          WebkitMask: mask,
          mask,
          aspectRatio: "496 / 112",
          height: tv ? "clamp(24px, 3.2vh, 40px)" : "26px",
        }}
      />
      <span
        id="signatureStamp"
        className="mt-0.5 tabular-nums tracking-wide"
        style={{ fontSize: tv ? "clamp(11px, 1.5vh, 16px)" : "11px" }}
      >
        {signatureStamp()}
      </span>
    </div>
  );
}
