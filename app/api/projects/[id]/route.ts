import { ensureSchema, getBindings, jsonError } from "../../storage";

export const runtime = "edge";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { DB } = getBindings();
  if (!DB) return jsonError("D1 binding DB is unavailable.", 503);
  const { id } = await context.params;
  const payload = (await request.json()) as {
    name?: string;
    logoUrl?: string;
    tournamentLine1?: string;
    tournamentLine2?: string;
    fixtureUrl?: string;
  };
  await ensureSchema(DB);
  await DB.prepare(`UPDATE projects
    SET name = COALESCE(?, name),
      logo_url = COALESCE(?, logo_url),
      tournament_line_1 = COALESCE(?, tournament_line_1),
      tournament_line_2 = COALESCE(?, tournament_line_2),
      fixture_url = COALESCE(?, fixture_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).bind(
    payload.name?.trim() || null,
    payload.logoUrl?.trim() || null,
    payload.tournamentLine1?.trim() || null,
    payload.tournamentLine2?.trim() || null,
    payload.fixtureUrl?.trim() || null,
    id,
  ).run();
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { DB } = getBindings();
  if (!DB) return jsonError("D1 binding DB is unavailable.", 503);
  const { id } = await context.params;
  await ensureSchema(DB);
  await DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
