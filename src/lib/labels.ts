/** Human-readable labels & badge styling for enum values. */

export const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  under_construction: "Under construction",
  completed: "Completed",
};

export const STATUS_BADGE: Record<string, string> = {
  planned:
    "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200",
  under_construction:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  completed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
};

export const TYPE_LABEL: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Land",
  mixed: "Mixed use",
};

export const OCCUPANCY_LABEL: Record<string, string> = {
  rented: "Rented",
  vacant: "Vacant",
  owner_use: "Owner use",
  "n/a": "—",
};

export const CONTACT_ROLE_LABEL: Record<string, string> = {
  developer: "Developer",
  builder: "Builder",
  representative: "Representative",
  property_manager: "Property manager",
  plumber: "Plumber",
  electrician: "Electrician",
  hvac: "HVAC",
  utility: "Utilities",
  lawyer: "Lawyer",
  notary: "Notary",
  agent: "Agent",
  tenant: "Tenant",
  insurance: "Insurance",
  accountant: "Accountant",
  other: "Other",
};

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  tax: "Tax",
  insurance: "Insurance",
  maintenance: "Maintenance",
  utilities: "Utilities",
  management_fee: "Management fee",
  hoa: "HOA",
  legal: "Legal",
  other: "Other",
};

export const PAYMENT_KIND_LABEL: Record<string, string> = {
  down_payment: "Down payment",
  installment: "Installment",
  purchase: "Purchase",
  fee: "Fee",
  tax: "Tax",
  other: "Other",
};

export const INSTALLMENT_STATUS_BADGE: Record<string, string> = {
  upcoming: "bg-muted text-muted-foreground",
  due: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  overdue: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
};

export const MAINTENANCE_PRIORITY_BADGE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  med: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  urgent: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
};
