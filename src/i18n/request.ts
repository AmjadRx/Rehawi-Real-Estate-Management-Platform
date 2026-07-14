import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Cookie-based locale (no URL prefixes): the toggle lives in Settings. */
export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = raw === "ar" ? "ar" : "en";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
