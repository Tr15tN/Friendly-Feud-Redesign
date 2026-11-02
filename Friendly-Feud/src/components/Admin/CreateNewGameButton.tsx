import { buttonClass } from "@/components/ui/button-class";
import { PencilLine } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function CreateNewGameButton() {
  const { t } = useTranslation();
  return (
    <Link
      href="/new"
      id="createNewGameButton"
      target="_blank"
      className={buttonClass("secondary", "w-full justify-start gap-3 py-2")}
    >
      <PencilLine size={20} aria-hidden />
      <span className="text-left">
        <span className="block">{t("Create New Game")}</span>
        <span className="block text-xs font-normal text-pro-mute">{t("Write your own questions and answers.")}</span>
      </span>
    </Link>
  );
}
