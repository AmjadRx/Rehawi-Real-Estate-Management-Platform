import { randomUUID } from "node:crypto";

/**
 * File storage (§8): Vercel Blob with private access in production;
 * .data/uploads on disk for local development (no BLOB_READ_WRITE_TOKEN).
 * Files are ONLY ever served through /api/v1/files/[id], which checks the
 * session first — no public URLs to contracts, ever (§3.3).
 */

const blobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB (§8)

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export interface StoredFile {
  /** Blob URL in production; `fs:<relative-path>` in development. */
  url: string;
}

export async function storeFile(
  filename: string,
  mime: string,
  data: ArrayBuffer,
): Promise<StoredFile> {
  const safeName = `${randomUUID()}-${filename.replace(/[^\w.\-]+/g, "_")}`;

  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`documents/${safeName}`, data, {
      access: "public",
      addRandomSuffix: false,
      contentType: mime,
    });
    // NOTE: the blob URL itself is unguessable and never exposed to the
    // client; every read goes through the authorized proxy route.
    return { url: blob.url };
  }

  const [fs, path] = await Promise.all([import("node:fs"), import("node:path")]);
  const dir = path.join(process.cwd(), ".data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safeName), Buffer.from(data));
  return { url: `fs:uploads/${safeName}` };
}

export async function readFileStream(
  url: string,
): Promise<{ body: ReadableStream | Buffer; fromBlob: boolean } | null> {
  if (url.startsWith("fs:")) {
    const [fs, path] = await Promise.all([
      import("node:fs"),
      import("node:path"),
    ]);
    const full = path.join(process.cwd(), ".data", url.slice(3));
    if (!fs.existsSync(full)) return null;
    return { body: fs.readFileSync(full), fromBlob: false };
  }
  const response = await fetch(url, {
    headers: process.env.BLOB_READ_WRITE_TOKEN
      ? { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
      : undefined,
  });
  if (!response.ok || !response.body) return null;
  return { body: response.body, fromBlob: true };
}

export async function deleteStoredFile(url: string): Promise<void> {
  if (url.startsWith("fs:")) {
    const [fs, path] = await Promise.all([
      import("node:fs"),
      import("node:path"),
    ]);
    const full = path.join(process.cwd(), ".data", url.slice(3));
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return;
  }
  const { del } = await import("@vercel/blob");
  await del(url);
}
