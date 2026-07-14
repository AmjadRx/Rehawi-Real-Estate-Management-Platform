/** Country dial codes for the phone sign-in picker (§6.1 v2). ME + Europe first, then common others. */
export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const flag = (code: string) =>
  String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const raw: Array<[string, string, string]> = [
  // Middle East
  ["AE", "United Arab Emirates", "+971"],
  ["SY", "Syria", "+963"],
  ["SA", "Saudi Arabia", "+966"],
  ["QA", "Qatar", "+974"],
  ["KW", "Kuwait", "+965"],
  ["BH", "Bahrain", "+973"],
  ["OM", "Oman", "+968"],
  ["JO", "Jordan", "+962"],
  ["LB", "Lebanon", "+961"],
  ["IQ", "Iraq", "+964"],
  ["EG", "Egypt", "+20"],
  ["TR", "Turkey", "+90"],
  ["IL", "Israel", "+972"],
  ["PS", "Palestine", "+970"],
  // Europe
  ["DE", "Germany", "+49"],
  ["FR", "France", "+33"],
  ["GB", "United Kingdom", "+44"],
  ["ES", "Spain", "+34"],
  ["IT", "Italy", "+39"],
  ["NL", "Netherlands", "+31"],
  ["BE", "Belgium", "+32"],
  ["AT", "Austria", "+43"],
  ["CH", "Switzerland", "+41"],
  ["SE", "Sweden", "+46"],
  ["NO", "Norway", "+47"],
  ["DK", "Denmark", "+45"],
  ["PL", "Poland", "+48"],
  ["GR", "Greece", "+30"],
  ["CY", "Cyprus", "+357"],
  ["PT", "Portugal", "+351"],
  ["IE", "Ireland", "+353"],
  ["CZ", "Czechia", "+420"],
  ["RO", "Romania", "+40"],
  ["HU", "Hungary", "+36"],
  // Common others
  ["US", "United States", "+1"],
  ["CA", "Canada", "+1"],
  ["AU", "Australia", "+61"],
  ["IN", "India", "+91"],
  ["PK", "Pakistan", "+92"],
  ["MA", "Morocco", "+212"],
  ["TN", "Tunisia", "+216"],
  ["DZ", "Algeria", "+213"],
  ["LY", "Libya", "+218"],
  ["SD", "Sudan", "+249"],
];

export const COUNTRIES: Country[] = raw.map(([code, name, dial]) => ({
  code,
  name,
  dial,
  flag: flag(code),
}));
