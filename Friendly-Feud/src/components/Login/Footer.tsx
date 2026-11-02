import Version from "@/components/Title/Version";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const linkClass = "text-sm text-pro-mute hover:text-pro-text hover:underline";

/** Quiet footer: source code, an optional contact link (set NEXT_PUBLIC_CONTACT_URL at build time) and the version. */
export default function Footer() {
  const { t } = useTranslation();
  const contactUrl = process.env.NEXT_PUBLIC_CONTACT_URL;

  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-pro-line px-4 py-4">
      <Link
        href="https://github.com/joshzcold/Friendly-Feud"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {t("Source code")}
      </Link>
      {contactUrl && (
        <Link
          href={contactUrl}
          id="contactLink"
          target={contactUrl.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className={linkClass}
        >
          {t("Contact")}
        </Link>
      )}
      <Version />
    </footer>
  );
}
