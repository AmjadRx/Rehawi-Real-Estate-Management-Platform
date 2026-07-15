import type { PropertyDetail } from "./property-detail";

/**
 * Profile completeness (§6.3 v3): % complete plus the exact missing fields.
 * Each missing item carries a target so the UI can jump straight to the
 * right editor: the property edit dialog or a specific tab.
 */

export interface MissingField {
  key: string;
  label: string;
  target: { kind: "edit" } | { kind: "tab"; tab: string };
}

export interface Completeness {
  pct: number;
  done: number;
  total: number;
  missing: MissingField[];
}

export function computeCompleteness(detail: PropertyDetail): Completeness {
  const { property } = detail;
  const notCompleted = property.status !== "completed";

  const checks: Array<{
    key: string;
    label: string;
    present: boolean;
    target: MissingField["target"];
  }> = [
    { key: "description", label: "Description", present: !!property.description, target: { kind: "edit" } },
    { key: "sizeSqm", label: "Size", present: property.sizeSqm !== null, target: { kind: "edit" } },
    { key: "yearBuilt", label: "Year built", present: property.yearBuilt !== null, target: { kind: "edit" } },
    { key: "floors", label: "Floors", present: property.floors !== null, target: { kind: "edit" } },
    { key: "units", label: "Units", present: property.units !== null, target: { kind: "edit" } },
    { key: "addressLine", label: "Address", present: !!property.addressLine, target: { kind: "edit" } },
    { key: "coordinates", label: "Map pin", present: property.lat !== null && property.lng !== null, target: { kind: "tab", tab: "location" } },
    { key: "purchasePrice", label: "Purchase price", present: property.purchasePrice !== null, target: { kind: "edit" } },
    { key: "currentValue", label: "Current value", present: property.currentValue !== null, target: { kind: "edit" } },
    { key: "owners", label: "Owners and shares", present: detail.owners.length > 0, target: { kind: "edit" } },
    { key: "payments", label: "Payments", present: detail.payments.length > 0, target: { kind: "tab", tab: "payments" } },
    { key: "photos", label: "Photos", present: detail.documents.some((d) => d.category === "photo"), target: { kind: "tab", tab: "documents" } },
    { key: "coverPhoto", label: "Cover photo", present: property.coverPhotoId !== null, target: { kind: "tab", tab: "documents" } },
    { key: "documents", label: "Contracts or documents", present: detail.documents.some((d) => d.category !== "photo"), target: { kind: "tab", tab: "documents" } },
    { key: "contacts", label: "Linked contacts", present: detail.contacts.length > 0, target: { kind: "tab", tab: "contacts" } },
  ];

  if (property.occupancy === "rented") {
    checks.push({
      key: "lease",
      label: "Lease",
      present: detail.leases.length > 0,
      target: { kind: "tab", tab: "lease" },
    });
  }
  if (notCompleted) {
    checks.push(
      {
        key: "installments",
        label: "Installment schedule",
        present: detail.installments.length > 0,
        target: { kind: "tab", tab: "payments" },
      },
      {
        key: "construction",
        label: "Construction progress",
        present: detail.constructionUpdates.length > 0,
        target: { kind: "tab", tab: "construction" },
      },
    );
  }

  const done = checks.filter((c) => c.present).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    done,
    total: checks.length,
    missing: checks
      .filter((c) => !c.present)
      .map(({ key, label, target }) => ({ key, label, target })),
  };
}
