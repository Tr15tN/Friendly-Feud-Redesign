import { THEME_INIT_SCRIPT } from "@/lib/theme/themes";
import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Sets html[data-theme] from localStorage before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
