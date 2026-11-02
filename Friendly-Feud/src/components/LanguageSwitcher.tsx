import { Field, inputClass } from "@/components/ui/form";
import { languageOptions, normalizeLanguage } from "@/i18n/languages";
import { Languages } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface LanguageSwitcherProps {
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  /** "pro" is the dark host-console look with a label above the select. */
  variant?: "legacy" | "pro" | "bare";
}

export default function LanguageSwitcher({ onChange, variant = "legacy" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const selectedLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  if (variant === "bare") {
    return (
      <select
        id="languageInput"
        aria-label={t("Language")}
        className={inputClass}
        value={selectedLanguage}
        onChange={onChange ?? ((e) => i18n.changeLanguage(e.target.value))}
      >
        {languageOptions.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    );
  }

  if (variant === "pro") {
    return (
      <Field label={t("Language")} htmlFor="languageInput">
        <select
          id="languageInput"
          className={inputClass}
          value={selectedLanguage}
          onChange={onChange ?? ((e) => i18n.changeLanguage(e.target.value))}
        >
          {languageOptions.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <div className="flex items-center gap-4 ">
      <Languages color="gray" />
      <select
        id="languageInput"
        className="w-full rounded-lg bg-secondary-300 p-2 capitalize text-foreground sm:w-fit"
        value={selectedLanguage}
        onChange={
          onChange
            ? onChange
            : (e) => {
                i18n.changeLanguage(e.target.value);
              }
        }
      >
        {languageOptions.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </div>
  );
}
