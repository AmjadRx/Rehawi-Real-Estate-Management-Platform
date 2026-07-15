"use client";

import { useState } from "react";
import type { PropertyDetail } from "@/lib/property-detail";
import { PropertyHeader } from "./property-header";
import { PropertyTabs } from "./property-tabs";

/**
 * Owns the edit-dialog and active-tab state so the completeness meter
 * (§6.3 v3) can jump straight to any field's editor from the overview.
 */
export function PropertyDetailView({
  detail,
  canEdit,
  owners,
  allContacts,
}: {
  detail: PropertyDetail;
  canEdit: boolean;
  owners: Array<{ id: string; name: string }>;
  allContacts: Array<{
    id: string;
    name: string;
    role: string;
    companyName: string | null;
  }>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PropertyHeader
        detail={detail}
        canEdit={canEdit}
        owners={owners}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
      />
      <PropertyTabs
        detail={detail}
        canEdit={canEdit}
        allContacts={allContacts}
        tab={tab}
        onTabChange={setTab}
      />
    </div>
  );
}
