import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Cookie-based locale (no URL prefixes): the toggle lives in Settings.
 *
 * Arabic runs as "ar-EG" so every ICU-formatted number in messages renders
 * with Eastern Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩, §2 v3). The bare "ar"
 * locale resolves to Latin digits in some ICU builds; ar-EG never does.
 * Consumers should test with startsWith("ar"), not equality.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const locale = raw === "ar" ? "ar-EG" : "en";
  return {
    locale,
    messages: (await import(`../../messages/${raw === "ar" ? "ar" : "en"}.json`))
      .default,
  };
});
