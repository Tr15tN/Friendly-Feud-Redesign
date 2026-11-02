import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import translationEN from "public/locales/en/translation.json";
import translationET from "public/locales/et/translation.json";
import { initReactI18next } from "react-i18next";
import format from "./i18n-format";
import { defaultLanguage, supportedLanguages } from "./languages";

const resources = {
  en: {
    translation: translationEN,
  },
  et: {
    translation: translationET,
  },
};
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    react: {
      useSuspense: false,
    },
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    cleanCode: true,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    interpolation: {
      format,
    },
  });

export default i18n;
