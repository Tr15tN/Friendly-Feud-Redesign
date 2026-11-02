/** Languages offered in the UI. Labels are written in the language itself so people can find theirs. */
export const languageOptions = [
  { code: "en", label: "English" },
  { code: "et", label: "Eesti" },
] as const;

export type SupportedLanguage = (typeof languageOptions)[number]["code"];

export const defaultLanguage: SupportedLanguage = "en";

export const supportedLanguages = languageOptions.map((language) => language.code);

export function normalizeLanguage(language?: string | null): SupportedLanguage {
  const languageCode = language?.split("-")[0].toLowerCase();
  const supportedLanguage = supportedLanguages.find((supported) => supported === languageCode);

  return supportedLanguage ?? defaultLanguage;
}
