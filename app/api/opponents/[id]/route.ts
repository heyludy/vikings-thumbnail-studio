import { ensureSchema, getBindings, jsonError, normalizeDivision } from "../../storage";

export const runtime = "edge";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { DB } = getBindings();
  if (!DB) return jsonError("D1 binding DB is unavailable.", 503);
  const { id } = await context.params;
  const payload = (await request.json()) as {
    name?: string;
    logoUrl?: string;
    circularFrame?: boolean;
    division?: string;
  };
  await ensureSchema(DB);
  await DB.prepare(`UPDATE opponents
    SET name = COALESCE(?, name),
      logo_url = COALESCE(?, logo_url),
      circular_frame = COALESCE(?, circular_frame),
      division = COALESCE(?, division),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).bind(
    payload.name?.trim() || null,
    payload.logoUrl?.trim() || null,
    typeof payload.circularFrame === "boolean" ? Number(payload.circularFrame) : null,
    payload.division ? normalizeDivision(payload.division) : null,
    id,
  ).run();
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { DB } = getBindings();
  if (!DB) return jsonError("D1 binding DB is unavailable.", 503);
  const { id } = await context.params;
  await ensureSchema(DB);
  await DB.prepare("DELETE FROM opponents WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
