import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth/guard";

/** Uniform route-handler wrapper: auth + validation errors → clean JSON. */
export function apiHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse | Response>,
) {
  return async (...args: T): Promise<NextResponse | Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            ok: false,
            message: "Validation failed.",
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      console.error("[api] unhandled error:", error);
      return NextResponse.json(
        { ok: false, message: "Internal error." },
        { status: 500 },
      );
    }
  };
}

export async function parseBody<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<S["_output"]> {
  const body = await request.json().catch(() => {
    throw new AuthError(400, "Invalid JSON body.");
  });
  return schema.parse(body);
}

export const jsonOk = (data: object = {}, init?: ResponseInit) =>
  NextResponse.json({ ok: true, ...data }, init);

export const jsonError = (status: number, message: string) =>
  NextResponse.json({ ok: false, message }, { status });
