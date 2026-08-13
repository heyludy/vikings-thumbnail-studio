import { createId, ensureSchema, getBindings, jsonError } from "../storage";

export const runtime = "edge";

export async function GET() {
  const { DB } = getBindings();
  if (!DB) return Response.json({ thumbnails: [] });
  await ensureSchema(DB);
  const result = await DB.prepare(`SELECT id, project_id, opponent_id, theme, stage_text,
      our_score, their_score, photo_name, created_at
    FROM thumbnails ORDER BY created_at DESC LIMIT 20`).all();
  return Response.json({ thumbnails: result.results });
}

export async function POST(request: Request) {
  const { DB } = getBindings();
  if (!DB) return jsonError("D1 binding DB is unavailable.", 503);
  const payload = (await request.json()) as {
    projectId?: string;
    opponentId?: string;
    theme?: string;
    stageText?: string;
    ourScore?: string | null;
    theirScore?: string | null;
    photoName?: string | null;
  };
  if (!payload.projectId || !payload.opponentId || !payload.theme) {
    return jsonError("projectId, opponentId, and theme are required.", 400);
  }
  await ensureSchema(DB);
  await DB.prepare(`INSERT INTO thumbnails
      (id, project_id, opponent_id, theme, stage_text, our_score, their_score, photo_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    createId("thumb"),
    payload.projectId,
    payload.opponentId,
    payload.theme,
    payload.stageText ?? "",
    payload.ourScore ?? null,
    payload.theirScore ?? null,
    payload.photoName ?? null,
  ).run();
  return Response.json({ ok: true }, { status: 201 });
}
