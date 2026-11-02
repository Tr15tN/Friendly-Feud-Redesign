import dynamic from "next/dynamic";
import Head from "next/head";
import { useTranslation } from "react-i18next";

// Browser-only: the demo uses window, iframes and timers.
const DemoStage = dynamic(() => import("@/components/Demo/DemoStage"), { ssr: false });

export default function DemoPage() {
  const { t } = useTranslation();
  return (
    <>
      <Head>
        <title>{t("Interactive demo")}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DemoStage />
    </>
  );
}
