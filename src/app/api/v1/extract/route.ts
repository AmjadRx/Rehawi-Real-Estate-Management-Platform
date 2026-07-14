import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { apiHandler, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";

/**
 * POST /api/v1/extract (§7 v2) — multipart screenshots/photos/PDFs.
 * The server calls the Claude API and returns DRAFT property fields to
 * prefill the add-property wizard. Drafts are never auto-saved; the user
 * reviews everything before submitting.
 */

export const maxDuration = 120;

const MAX_FILES = 6;
const MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_MIME = "application/pdf";

/** Structured-output schema: every field nullable so partial documents work. */
const nullable = (type: "string" | "number" | "integer") => ({
  anyOf: [{ type }, { type: "null" as const }],
});

const DRAFT_SCHEMA = {
  type: "object" as const,
  properties: {
    name: nullable("string"),
    type: {
      anyOf: [
        { type: "string" as const, enum: ["residential", "commercial", "land", "mixed"] },
        { type: "null" as const },
      ],
    },
    status: {
      anyOf: [
        { type: "string" as const, enum: ["planned", "under_construction", "completed"] },
        { type: "null" as const },
      ],
    },
    purchasePrice: nullable("number"),
    currentValue: nullable("number"),
    currency: nullable("string"),
    country: nullable("string"),
    city: nullable("string"),
    addressLine: nullable("string"),
    postalCode: nullable("string"),
    sizeSqm: nullable("number"),
    yearBuilt: nullable("integer"),
    description: nullable("string"),
    notes: nullable("string"),
  },
  required: [
    "name",
    "type",
    "status",
    "purchasePrice",
    "currentValue",
    "currency",
    "country",
    "city",
    "addressLine",
    "postalCode",
    "sizeSqm",
    "yearBuilt",
    "description",
    "notes",
  ],
  additionalProperties: false as const,
};

export const POST = apiHandler(async (request: NextRequest) => {
  await requireUser();

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(
      503,
      "Document autofill is not configured. Set ANTHROPIC_API_KEY to enable it.",
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError(400, "Expected multipart form data.");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return jsonError(400, "Attach at least one file.");
  if (files.length > MAX_FILES) {
    return jsonError(400, `At most ${MAX_FILES} files per extraction.`);
  }

  const content: Anthropic.ContentBlockParam[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return jsonError(413, `${file.name} is over 25 MB.`);
    }
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    if (file.type === PDF_MIME) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: PDF_MIME, data },
      });
    } else if (IMAGE_MIME.has(file.type)) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data,
        },
      });
    } else {
      return jsonError(
        415,
        `${file.name}: only JPG, PNG, WEBP, GIF images and PDF documents are supported for autofill.`,
      );
    }
  }

  content.push({
    type: "text",
    text: [
      "These files describe a real-estate property (listing screenshots, contracts, brochures, or photos).",
      "Extract the property details into the structured fields.",
      "Rules: use null for anything the documents do not state; never guess numbers.",
      "currency is the 3-letter ISO code of the prices found (e.g. EUR, AED, USD).",
      "purchasePrice and currentValue are plain numbers in that currency, without separators.",
      "description is 1-3 sentences summarizing the property, written in plain language without em dashes.",
      "notes captures anything important that does not fit other fields (payment plans, handover dates, agent names).",
    ].join(" "),
  });

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: DRAFT_SCHEMA,
      },
    },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    return jsonError(422, "The documents could not be processed. Try different files.");
  }
  if (response.stop_reason === "max_tokens") {
    return jsonError(422, "The documents were too complex to summarize. Try fewer files.");
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock) {
    return jsonError(502, "No draft could be extracted from these files.");
  }

  let draft: Record<string, unknown>;
  try {
    draft = JSON.parse(textBlock.text);
  } catch {
    return jsonError(502, "The extraction result was not readable. Try again.");
  }

  // Drafts are returned for review only. They are NEVER auto-saved (§6.3 v2).
  return jsonOk({ draft });
});
