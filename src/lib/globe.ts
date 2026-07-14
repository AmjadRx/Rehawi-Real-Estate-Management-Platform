/**
 * Pin color rule (§6.5): status planned → pink; under_construction →
 * yellow; else residential → blue, commercial → red, land/mixed → gray.
 */
export function pinColor(status: string, type: string): string {
  if (status === "planned") return "#ec4899";
  if (status === "under_construction") return "#eab308";
  if (type === "residential") return "#3b82f6";
  if (type === "commercial") return "#ef4444";
  return "#9ca3af";
}

export const PIN_LEGEND = [
  { label: "Planned", color: "#ec4899" },
  { label: "Under construction", color: "#eab308" },
  { label: "Residential", color: "#3b82f6" },
  { label: "Commercial", color: "#ef4444" },
  { label: "Land / mixed", color: "#9ca3af" },
] as const;

export interface GlobePin {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  status: string;
  type: string;
  color: string;
  thumb: string | null;
}
