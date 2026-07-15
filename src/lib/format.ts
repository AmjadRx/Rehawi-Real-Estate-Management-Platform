/** Display formatting helpers — readability first: clear units, no noise. */

/**
 * Active UI locale, set once per render pass by <Providers> (client) so every
 * formatter below follows the user's language without threading a locale
 * argument through dozens of call sites. In Arabic, ALL numerals render as
 * Eastern Arabic-Indic digits via the ar-EG formatting locale (§2 v3),
 * including amounts, percentages, chart labels, and dates with Arabic month
 * names.
 */
let activeLocale = "en";

export function setFormatLocale(locale: string) {
  activeLocale = locale;
}

/** BCP-47 tag used for all Intl formatting. */
function tag(explicit?: string): string {
  const locale = explicit ?? activeLocale;
  return locale.startsWith("ar") ? "ar-EG" : "en-GB";
}

export function formatMoney(
  amount: number | string,
  currency = "EUR",
  options: { compact?: boolean; decimals?: number } = {},
): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount);
  if (!Number.isFinite(n)) return "-";
  const { compact = false, decimals } = options;
  const useCompact = compact && Math.abs(n) >= 100_000;
  return new Intl.NumberFormat(tag(), {
    style: "currency",
    currency,
    notation: useCompact ? "compact" : "standard",
    // Compact keeps one decimal so €1.7M never reads as €2M.
    maximumFractionDigits: useCompact
      ? 1
      : (decimals ?? (Math.abs(n) >= 1_000 || Number.isInteger(n) ? 0 : 2)),
  }).format(n);
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat(tag(), {
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Compact axis/tick labels (charts): 1.2K, 3M — Arabic digits in AR. */
export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat(tag(), { notation: "compact" }).format(n);
}

export function formatPercent(ratio: number, decimals = 0): string {
  return new Intl.NumberFormat(tag(), {
    style: "percent",
    maximumFractionDigits: decimals,
  }).format(ratio);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(tag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "March 2058" style projected dates (§6.2 v2), locale-aware for AR. */
export function formatMonthYear(
  date: Date | null | undefined,
  locale?: string,
): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat(tag(locale), {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Country name → flag emoji (best effort, for §6.3 city/country flags). */
export function countryFlag(country: string): string {
  const codes: Record<string, string> = {
    germany: "DE",
    syria: "SY",
    "united arab emirates": "AE",
    uae: "AE",
    turkey: "TR",
    türkiye: "TR",
    lebanon: "LB",
    jordan: "JO",
    "saudi arabia": "SA",
    qatar: "QA",
    kuwait: "KW",
    egypt: "EG",
    france: "FR",
    spain: "ES",
    italy: "IT",
    netherlands: "NL",
    austria: "AT",
    switzerland: "CH",
    "united kingdom": "GB",
    uk: "GB",
    greece: "GR",
    cyprus: "CY",
    portugal: "PT",
  };
  const code = codes[country.trim().toLowerCase()];
  if (!code) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
