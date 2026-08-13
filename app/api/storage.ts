import { env } from "cloudflare:workers";

export type ProjectRow = {
  id: string;
  name: string;
  logoUrl: string;
  tournamentLine1: string;
  tournamentLine2: string;
  fixtureUrl: string | null;
};

export type Division = "men" | "women" | "both";

// 썸네일의 왼쪽은 항상 우리 팀이다. 대회 일정에서 상대팀을 골라낼 때 쓴다.
export const OUR_TEAM_NAMES = ["Seoul Vikings", "Seoul Vikings (W)"];

export type OpponentRow = {
  id: string;
  name: string;
  logoUrl: string;
  circularFrame: boolean;
  division: Division;
};

type EnvWithStorage = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
};

export const runtime = "edge";

export function getBindings() {
  return env as EnvWithStorage;
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

// D1 은 BLOB 바인딩/반환 형식이 런타임마다 달라 업로드한 이미지가 빈 응답으로
// 나오는 경우가 있다. 이미지는 base64 텍스트로 저장하고, 읽을 때는 예전에 저장된
// BLOB 형식(ArrayBuffer / TypedArray / number[])도 함께 처리한다.
export function encodeAssetBody(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x2000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function decodeAssetBody(body: unknown): ArrayBuffer {
  if (typeof body === "string") {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body)) {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  }
  if (Array.isArray(body)) return Uint8Array.from(body as number[]).buffer;
  return new ArrayBuffer(0);
}

export const JEJU_FIXTURE_URL = "https://flovus.info/competitions/6";

// 2026 제주국제오픈 참가팀 (남자부 16팀 + 여자부 13팀, Seoul Vikings 제외)
// 출처: https://flovus.info/competitions/6
const JEJU_TEAMS: Array<[id: string, name: string, logoUrl: string, division: Division]> = [
  ["jeju-hong-kong-stars", "Hong Kong Stars", "/assets/jeju/hong-kong-stars-logo.webp", "men"],
  ["jeju-ntu-men-s-white", "NTU Men's White", "/assets/jeju/ntu-men-s-white-logo.webp", "men"],
  ["jeju-tamla-devil", "Tamla Devil", "/assets/jeju/tamla-devil-logo.webp", "men"],
  ["jeju-team-leopard", "Team Leopard", "/assets/jeju/team-leopard-logo.webp", "men"],
  ["jeju-astra", "ASTRA", "/assets/jeju/astra-logo.webp", "men"],
  ["jeju-jeju-oceans", "Jeju Oceans", "/assets/jeju/jeju-oceans-logo.webp", "men"],
  ["jeju-lingfung", "LingFung", "/assets/opponent-placeholder.png", "men"],
  ["jeju-pegasus", "Pegasus", "/assets/jeju/pegasus-logo.webp", "men"],
  ["jeju-jeju-dolphins", "Jeju Dolphins", "/assets/jeju/jeju-dolphins-logo.webp", "men"],
  ["jeju-merlion-men", "Merlion Men", "/assets/jeju/merlion-men-logo.webp", "men"],
  ["jeju-shanghai-jingwu", "ShangHai Jingwu", "/assets/jeju/shanghai-jingwu-logo.webp", "men"],
  ["jeju-shinil-fc", "SHINIL FC", "/assets/jeju/shinil-fc-logo.webp", "men"],
  ["jeju-daykey", "Daykey", "/assets/jeju/daykey-logo.webp", "men"],
  ["jeju-mars", "Mars", "/assets/jeju/mars-logo.webp", "men"],
  ["jeju-ntu-men-s-blue", "NTU Men's Blue", "/assets/jeju/ntu-men-s-blue-logo.webp", "men"],
  ["jeju-jeju-blue-dolphins", "Jeju Blue Dolphins", "/assets/jeju/jeju-blue-dolphins-logo.webp", "women"],
  ["jeju-keplites", "Keplites", "/assets/jeju/keplites-logo.webp", "women"],
  ["jeju-tamla-devil-w", "Tamla Devil (W)", "/assets/jeju/tamla-devil-w-logo.webp", "women"],
  ["jeju-pegasus-w", "Pegasus (W)", "/assets/jeju/pegasus-w-logo.webp", "women"],
  ["jeju-shanghai-jingwu-w", "Shanghai JingWu (W)", "/assets/jeju/shanghai-jingwu-w-logo.webp", "women"],
  ["jeju-sojeju", "SoJeju", "/assets/jeju/sojeju-logo.webp", "women"],
  ["jeju-team-leopard-w", "Team Leopard (W)", "/assets/jeju/team-leopard-w-logo.webp", "women"],
  ["jeju-fed-fat", "FED FAT", "/assets/jeju/fed-fat-logo.webp", "women"],
  ["jeju-ntu-women-s", "NTU Women's", "/assets/jeju/ntu-women-s-logo.webp", "women"],
  ["jeju-overflow", "Overflow", "/assets/jeju/overflow-logo.webp", "women"],
  ["jeju-t-allies", "T_Allies", "/assets/jeju/t-allies-logo.webp", "women"],
  ["jeju-team-shinseong", "Team Shinseong", "/assets/jeju/team-shinseong-logo.webp", "women"],
];

// 기존에 만들어진 opponents 테이블에는 division 컬럼이 없다. 한 번만 추가하고
// 이미 등록된 제주국제오픈 참가팀의 소속을 이름으로 채워 넣는다.
async function ensureDivisionColumn(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(opponents)").all<{ name: string }>();
  if (columns.results.some((column: { name: string }) => column.name === "division")) return;

  await db.prepare("ALTER TABLE opponents ADD COLUMN division TEXT NOT NULL DEFAULT 'both'").run();
  await db.batch(JEJU_TEAMS.map(([, name, , division]) =>
    db.prepare("UPDATE opponents SET division = ? WHERE name = ?").bind(division, name)));
}

// 먼저 만들어진 projects 테이블에는 fixture_url 컬럼이 없다.
async function ensureFixtureUrlColumn(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(projects)").all<{ name: string }>();
  if (columns.results.some((column: { name: string }) => column.name === "fixture_url")) return;
  await db.prepare("ALTER TABLE projects ADD COLUMN fixture_url TEXT").run();
  // 배포본의 제주 프로젝트는 API 로 만들어져 id 가 다르므로 이름으로 찾는다.
  await db.prepare("UPDATE projects SET fixture_url = ? WHERE id = ? OR name = ?")
    .bind(JEJU_FIXTURE_URL, "jeju-open-2026", "2026 제주국제오픈")
    .run();
}

export async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      tournament_line_1 TEXT NOT NULL,
      tournament_line_2 TEXT NOT NULL,
      fixture_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS opponents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      circular_frame INTEGER NOT NULL DEFAULT 1,
      division TEXT NOT NULL DEFAULT 'both',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      opponent_id TEXT NOT NULL,
      theme TEXT NOT NULL,
      stage_text TEXT NOT NULL,
      photo_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS assets (
      key TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      body BLOB NOT NULL,
      original_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS fixture_cache (
      key TEXT PRIMARY KEY,
      body TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS thumbnails_created_at_idx ON thumbnails (created_at)"),
  ]);

  await ensureDivisionColumn(db);
  await ensureFixtureUrlColumn(db);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>();
  if (!count?.count) {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO projects (id, name, logo_url, tournament_line_1, tournament_line_2, fixture_url)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(
        "jeju-open-2026",
        "2026 제주국제오픈",
        "/assets/jeju/jeju-open-logo.webp",
        "2026 제주국제오픈",
        "플로어볼 대회",
        JEJU_FIXTURE_URL,
      ),
      db.prepare(`INSERT OR IGNORE INTO projects (id, name, logo_url, tournament_line_1, tournament_line_2)
        VALUES (?, ?, ?, ?, ?)`).bind(
        "sample-project",
        "챌린지컵 샘플",
        "/assets/sample-tournament-logo.png",
        "대전광역시 플로어볼",
        "챌린지컵 대회",
      ),
      ...JEJU_TEAMS.map(([id, name, logoUrl, division]) =>
        db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame, division)
        VALUES (?, ?, ?, ?, ?)`).bind(id, name, logoUrl, 1, division)),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("incheon-sniper", "인천 스나이퍼", "/assets/incheon-sniper-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("seoul-haechis", "서울 해치스", "/assets/seoul-haechis-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("seoul-ares", "서울 아레스", "/assets/seoul-ares-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("gyeryong-onekill-dragons", "계룡 원킬 드래곤즈", "/assets/gyeryong-onekill-dragons-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("gwangju-team-leopard", "광주 Team-Leopard", "/assets/gwangju-team-leopard-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("jeju-blue-dolphins", "제주 블루돌핀스", "/assets/jeju-blue-dolphins-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("gangwon-blue-knights", "강원 블루나이츠", "/assets/gangwon-blue-knights-logo.png", 1),
      db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind("jeonbuk-overflow", "전북 오버플로", "/assets/jeonbuk-overflow-logo.png", 1),
    ]);
  }
}

export function normalizeProject(row: {
  id: string;
  name: string;
  logo_url: string;
  tournament_line_1: string;
  tournament_line_2: string;
  fixture_url?: string | null;
}): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    tournamentLine1: row.tournament_line_1,
    tournamentLine2: row.tournament_line_2,
    fixtureUrl: row.fixture_url ?? null,
  };
}

export function normalizeOpponent(row: {
  id: string;
  name: string;
  logo_url: string;
  circular_frame: number;
  division?: string | null;
}): OpponentRow {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    circularFrame: Boolean(row.circular_frame),
    division: normalizeDivision(row.division),
  };
}

export function normalizeDivision(value: unknown): Division {
  return value === "men" || value === "women" ? value : "both";
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}
