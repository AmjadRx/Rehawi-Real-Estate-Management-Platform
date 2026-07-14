import { headers } from "next/headers";
import type { Role } from "./allowlist";

export interface CurrentUser {
  id: string;
  role: Role;
  identifier: string;
}

/**
 * Identity forwarded by the middleware. Every route under the matcher is
 * guaranteed authenticated; this reads the verified identity — it never
 * trusts client input.
 */
export async function currentUser(): Promise<CurrentUser | null> {
  const h = await headers();
  const id = h.get("x-rehawi-user-id");
  const role = h.get("x-rehawi-role") as Role | null;
  const identifier = h.get("x-rehawi-identifier");
  if (!id || !role || !identifier) return null;
  return { id, role, identifier };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) throw new AuthError(401, "Authentication required.");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AuthError(403, "Admin access required.");
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
