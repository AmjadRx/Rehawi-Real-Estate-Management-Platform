import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { AuthError, type CurrentUser } from "@/lib/auth/guard";

/**
 * §7 v2 ownership rule: admins may edit anything; other users may only
 * mutate properties they created. Throws 403/404 like the guards.
 */
export async function requireCanEditProperty(
  user: CurrentUser,
  propertyId: string,
): Promise<void> {
  if (user.role === "admin") return;
  const db = await getDb();
  const [property] = await db
    .select({ createdBy: tables.properties.createdBy })
    .from(tables.properties)
    .where(eq(tables.properties.id, propertyId))
    .limit(1);
  if (!property) throw new AuthError(404, "Property not found.");
  if (property.createdBy !== user.id) {
    throw new AuthError(
      403,
      "Only admins can change data created by someone else.",
    );
  }
}
