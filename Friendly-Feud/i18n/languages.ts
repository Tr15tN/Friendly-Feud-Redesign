export const languageOptions = [
  { code: "en", label: "English", translationKey: "english" },
  { code: "es", label: "Español", translationKey: "spanish" },
  { code: "id", label: "Indonesian", translationKey: "indonesian" },
  { code: "et", label: "Estonian", translationKey: "estonian" },
  { code: "fr", label: "Français", translationKey: "french" },
] as const;

export type SupportedLanguage = (typeof languageOptions)[number]["code"];

export const defaultLanguage: SupportedLanguage = "en";

export const supportedLanguages = languageOptions.map((language) => language.code);

export function normalizeLanguage(language?: string | null): SupportedLanguage {
  const languageCode = language?.split("-")[0].toLowerCase();
  const supportedLanguage = supportedLanguages.find((supported) => supported === languageCode);

  return supportedLanguage ?? defaultLanguage;
}
