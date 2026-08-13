import { createId, encodeAssetBody, ensureSchema, getBindings, jsonError } from "../storage";

export const runtime = "edge";

const allowedFolders = new Set(["project-logos", "opponent-logos"]);

export async function POST(request: Request) {
  const { DB, BUCKET } = getBindings();
  if (!BUCKET && !DB) return jsonError("File storage is unavailable.", 503);

  const form = await request.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "uploads");
  if (!(file instanceof File)) return jsonError("file is required.", 400);
  if (!allowedFolders.has(folder)) return jsonError("folder is not allowed.", 400);
  if (!file.type.startsWith("image/")) return jsonError("Only image uploads are allowed.", 400);
  if (file.size > 1_800_000) return jsonError("Image must be smaller than 1.8 MB.", 413);

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const key = `${folder}/${createId("image")}.${extension}`;
  if (BUCKET) {
    await BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { originalName: file.name },
    });
  } else if (DB) {
    await ensureSchema(DB);
    await DB.prepare(`INSERT INTO assets (key, content_type, body, original_name)
      VALUES (?, ?, ?, ?)`)
      .bind(
        key,
        file.type || "application/octet-stream",
        encodeAssetBody(new Uint8Array(await file.arrayBuffer())),
        file.name,
      )
      .run();
  }
  return Response.json({ key, url: `/api/assets/${key}` }, { status: 201 });
}
