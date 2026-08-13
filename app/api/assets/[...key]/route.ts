import { decodeAssetBody, ensureSchema, getBindings, jsonError } from "../../storage";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { DB, BUCKET } = getBindings();
  const { key } = await context.params;
  const objectKey = key.join("/");
  const object = BUCKET ? await BUCKET.get(objectKey) : null;
  if (object) {
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(object.body, { headers });
  }

  if (!DB) return jsonError("Asset not found.", 404);
  await ensureSchema(DB);
  const asset = await DB.prepare("SELECT content_type, body FROM assets WHERE key = ?")
    .bind(objectKey)
    .first<{ content_type: string; body: unknown }>();
  if (!asset) return jsonError("Asset not found.", 404);

  const bytes = decodeAssetBody(asset.body);
  if (!bytes.byteLength) return jsonError("Asset body is empty.", 404);

  return new Response(bytes, {
    headers: {
      "content-type": asset.content_type,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
