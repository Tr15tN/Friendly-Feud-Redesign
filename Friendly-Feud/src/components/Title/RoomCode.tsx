import { useTranslation } from "react-i18next";

interface RoomCodeProps {
  code: string;
  /** The host closed the room to new players, so do not invite anyone with the code. */
  locked?: boolean;
}

export default function RoomCode({ code, locked }: RoomCodeProps) {
  const { t } = useTranslation();
  if (!code) return null;

  if (locked) {
    return (
      <div className="flex flex-row items-center justify-center text-center">
        <div id="joiningClosedText" className="rounded-xl bg-secondary-500 p-8 shadow-lg">
          <p className="text-4xl font-bold text-foreground">{t("Joining is closed")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-center text-center">
      <div className="flex h-fit flex-col items-center rounded-xl bg-secondary-500 shadow-lg transition-transform xl:p-2 2xl:p-4">
        <div className={`${process.env.NEXT_PUBLIC_TITLE_URL ? "" : "p-6"}`}>
          <p className="text-[clamp(2rem,7vh,4rem)] font-bold leading-tight text-foreground" id="roomCodeText">
            {code}
          </p>
          <p className="text-[clamp(0.8rem,2vh,1.25rem)] font-semibold text-foreground">{t("Room Code")}</p>
        </div>
        {process.env.NEXT_PUBLIC_TITLE_URL && (
          <>
            <hr className="my-2 w-full border-t-2 border-secondary-900" />
            <span className="rounded-xl bg-secondary-500 p-3 pt-0 text-[clamp(1rem,3.2vh,2.25rem)] text-foreground transition-transform duration-200">
              {t("Join at")} <span className="font-bold">{process.env.NEXT_PUBLIC_TITLE_URL}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
