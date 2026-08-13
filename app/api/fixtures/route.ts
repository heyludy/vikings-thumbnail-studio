import { ensureSchema, getBindings, jsonError, normalizeDivision, OUR_TEAM_NAMES } from "../storage";

export const runtime = "edge";

// 경기 일정을 가져올 수 있는 사이트. 임의 주소를 대신 호출해주는 통로가 되지 않도록 제한한다.
const allowedHosts = new Set(["flovus.info", "www.flovus.info"]);
const CACHE_TTL_MS = 10 * 60 * 1000;

export type Fixture = {
  id: string;
  label: string;
  stageText: string;
  opponentName: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  venue: string;
  isOurMatch: boolean;
};

const stripTags = (value: string) => value.replace(/<[^>]*>/g, "");

const decode = (value: string) => stripTags(value)
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const isOurTeam = (name: string) => OUR_TEAM_NAMES.some((team) => name === team);

/** 조별 경기 카드에서 경기 정보를 읽는다. */
export function parseFixtures(html: string): Fixture[] {
  const fixtures: Fixture[] = [];
  const cardPattern = /<a href="\/matches\/(\d+)"([\s\S]*?)<\/a>/g;
  let card: RegExpExecArray | null;
  while ((card = cardPattern.exec(html)) !== null) {
    const [, id, body] = card;
    const labelMatch = body.match(/<div class="text-\[11px\][^"]*">([\s\S]*?)<\/div>/);
    const teams = [...body.matchAll(/<span class="min-w-0[^"]*">([\s\S]*?)<\/span>/g)].map((match) => decode(match[1]));
    const metaMatches = [...body.matchAll(/<div class="mt-2 text-\[11px\][^"]*">([\s\S]*?)<\/div>/g)];
    if (teams.length < 2) continue;

    const label = labelMatch ? decode(labelMatch[1]) : "";
    const meta = metaMatches.length ? decode(metaMatches[metaMatches.length - 1][1]) : "";
    const [kickoff, venue] = meta.split("·").map((part) => part.trim());
    const [homeTeam, awayTeam] = teams;
    const ourSide = isOurTeam(homeTeam) ? homeTeam : isOurTeam(awayTeam) ? awayTeam : null;
    fixtures.push({
      id,
      label,
      stageText: "",
      opponentName: ourSide === homeTeam ? awayTeam : homeTeam,
      homeTeam,
      awayTeam,
      kickoff: kickoff ?? "",
      venue: venue ?? "",
      isOurMatch: ourSide !== null,
    });
  }
  return fixtures;
}

/** 우리 팀 경기에 "[예선 D조 2경기]" 같은 경기명을 붙인다. 순번은 시작 시간 순서. */
export function withStageText(fixtures: Fixture[]): Fixture[] {
  const counters = new Map<string, number>();
  return fixtures.map((fixture) => {
    const group = fixture.label.match(/([A-Z]조)/)?.[1];
    if (fixture.label.includes("예선") && group) {
      const order = (counters.get(group) ?? 0) + 1;
      counters.set(group, order);
      return { ...fixture, stageText: `[예선 ${group} ${order}경기]` };
    }
    return { ...fixture, stageText: fixture.label ? `[${fixture.label}]` : "" };
  });
}

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
    const fixtures = withStageText(parseFixtures(await response.text()));
    await writeCache(DB, key, fixtures);
    return Response.json({ fixtures, source: key, cached: false });
  } catch (error) {
    // 대회 사이트가 느리거나 막혔을 때는 지난번에 받아둔 일정이라도 쓴다.
    if (cached) return Response.json({ fixtures: cached.fixtures, source: key, cached: true, stale: true });
    return jsonError(error instanceof Error ? error.message : "Could not load the schedule.", 502);
  }
}
