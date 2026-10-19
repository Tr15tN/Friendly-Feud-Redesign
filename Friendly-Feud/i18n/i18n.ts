import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import translationEN from "public/locales/en/translation.json";
import translationES from "public/locales/es/translation.json";
import translationET from "public/locales/et/translation.json";
import translationFR from "public/locales/fr/translation.json";
import translationID from "public/locales/id/translation.json";
import { initReactI18next } from "react-i18next";
import format from "./i18n-format";
import { defaultLanguage, supportedLanguages } from "./languages";

const resources = {
  en: {
    translation: translationEN,
  },
  es: {
    translation: translationES,
  },
  id: {
    translation: translationID,
  },
  et: {
    translation: translationET,
  },
  fr: {
    translation: translationFR,
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
