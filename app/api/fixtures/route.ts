import { ensureSchema, getBindings, jsonError, normalizeDivision, OUR_TEAM_NAMES } from "../storage";
import { Fixture, parseFixtures, withStageText } from "./parse";

export const runtime = "edge";

// 경기 일정을 가져올 수 있는 사이트. 임의 주소를 대신 호출해주는 통로가 되지 않도록 제한한다.
const allowedHosts = new Set(["flovus.info", "www.flovus.info"]);
const CACHE_TTL_MS = 10 * 60 * 1000;

async function readCache(db: D1Database | undefined, key: string) {
  if (!db) return null;
  const row = await db.prepare("SELECT body, fetched_at FROM fixture_cache WHERE key = ?")
    .bind(key)
    .first<{ body: string; fetched_at: string }>();
  if (!row) return null;
  const age = Date.now() - Date.parse(`${row.fetched_at.replace(" ", "T")}Z`);
  return { fixtures: JSON.parse(row.body) as Fixture[], fresh: Number.isFinite(age) && age < CACHE_TTL_MS };
}

async function writeCache(db: D1Database | undefined, key: string, fixtures: Fixture[]) {
  if (!db) return;
  await db.prepare(`INSERT INTO fixture_cache (key, body, fetched_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET body = excluded.body, fetched_at = CURRENT_TIMESTAMP`)
    .bind(key, JSON.stringify(fixtures))
    .run();
}

export async function GET(request: Request) {
  const { DB } = getBindings();
  const params = new URL(request.url).searchParams;
  const source = params.get("url");
  const division = normalizeDivision(params.get("division"));
  if (!source) return jsonError("url is required.", 400);

  let target: URL;
  try {
    target = new URL(source);
  } catch {
    return jsonError("url is not a valid address.", 400);
  }
  if (target.protocol !== "https:" || !allowedHosts.has(target.hostname)) {
    return jsonError("Only flovus.info schedules can be imported.", 400);
  }
  if (division !== "both") target.searchParams.set("division", division);

  const key = target.toString();
  if (DB) await ensureSchema(DB);
  const cached = await readCache(DB, key);
  if (cached?.fresh) {
    return Response.json({ fixtures: cached.fixtures, source: key, cached: true });
  }

  try {
    const response = await fetch(key, {
      headers: { accept: "text/html", "user-agent": "vikings-thumbnail-studio" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`schedule request failed: ${response.status}`);
    const fixtures = withStageText(parseFixtures(await response.text(), OUR_TEAM_NAMES));
    await writeCache(DB, key, fixtures);
    return Response.json({ fixtures, source: key, cached: false });
  } catch (error) {
    // 대회 사이트가 느리거나 막혔을 때는 지난번에 받아둔 일정이라도 쓴다.
    if (cached) return Response.json({ fixtures: cached.fixtures, source: key, cached: true, stale: true });
    return jsonError(error instanceof Error ? error.message : "Could not load the schedule.", 502);
  }
}
