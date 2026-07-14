import type { ZodType } from "zod";
import { tables } from "@/db";
import * as v from "@/lib/validation";

/**
 * Registry for the property sub-resource CRUD surface (§7):
 * /api/v1/properties/:id/(payments|installments|leases|income|expenses|
 *                         contacts|construction-updates|maintenance)
 * Owners and documents have dedicated handlers (share validation / uploads).
 */
export const SUBRESOURCES = {
  payments: {
    table: tables.payments,
    create: v.paymentCreate,
    update: v.paymentUpdate,
    entityType: "payment",
  },
  installments: {
    table: tables.installments,
    create: v.installmentCreate,
    update: v.installmentUpdate,
    entityType: "installment",
  },
  leases: {
    table: tables.leases,
    create: v.leaseCreate,
    update: v.leaseUpdate,
    entityType: "lease",
  },
  income: {
    table: tables.income,
    create: v.incomeCreate,
    update: v.incomeUpdate,
    entityType: "income",
  },
  expenses: {
    table: tables.expenses,
    create: v.expenseCreate,
    update: v.expenseUpdate,
    entityType: "expense",
  },
  "construction-updates": {
    table: tables.constructionUpdates,
    create: v.constructionUpdateCreate,
    update: v.constructionUpdateUpdate,
    entityType: "construction_update",
  },
  maintenance: {
    table: tables.maintenance,
    create: v.maintenanceCreate,
    update: v.maintenanceUpdate,
    entityType: "maintenance",
  },
} as const;

export type SubresourceName = keyof typeof SUBRESOURCES;

/**
 * Every sub-resource table shares the shape `{ id, propertyId, ... }`.
 * Handlers get a representative table type so Drizzle's API stays typed;
 * per-resource value shapes are enforced by the zod schemas above.
 */
export type SubresourceTable = typeof tables.payments;

export interface SubresourceDef {
  table: SubresourceTable;
  create: ZodType;
  update: ZodType;
  entityType: string;
}

export function getSubresource(name: string): SubresourceDef | undefined {
  const entry = (SUBRESOURCES as Record<string, unknown>)[name];
  return entry as SubresourceDef | undefined;
}
