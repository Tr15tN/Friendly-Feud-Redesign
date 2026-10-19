import { defaultLanguage } from "@/i18n/languages";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface HelpButtonProps {
  doc: string;
  textSize?: string;
  padding?: string;
}

export default function HelpButton({ doc, textSize, padding }: HelpButtonProps) {
  const { t } = useTranslation();
  return (
    <Link href={"/docs" + `/${defaultLanguage}` + doc} id="helpDocsButton" target="_blank">
      <button className={`${textSize ?? "text-2xl"}`}>
        <div
          className={`flex justify-center rounded bg-secondary-500 ${padding ?? "p-5"} capitalize text-foreground hover:shadow-md`}
        >
          {t("help")}
        </div>
      </button>
    </Link>
  );
}
