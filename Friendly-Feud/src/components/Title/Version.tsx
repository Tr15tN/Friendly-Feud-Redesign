import Link from "next/link";
import { useTranslation } from "react-i18next";

const Version = () => {
  const { t } = useTranslation();
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  if (!version) return null;

  return (
    <Link
      href={"https://github.com/joshzcold/Friendly-Feud/releases"}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-pro-mute hover:text-pro-text hover:underline"
    >
      {t("Version")} {version}
    </Link>
  );
};

export default Version;
