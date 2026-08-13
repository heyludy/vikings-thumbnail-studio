import { env } from "cloudflare:workers";

export type ProjectRow = {
  id: string;
  name: string;
  logoUrl: string;
  tournamentLine1: string;
  tournamentLine2: string;
};

export type TeamDivision = "men" | "women" | "both";

export type OpponentRow = {
  id: string;
  name: string;
  logoUrl: string;
  circularFrame: boolean;
  division: TeamDivision;
};

export function normalizeDivision(value: unknown): TeamDivision {
  return value === "men" || value === "women" ? value : "both";
}

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

export async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      tournament_line_1 TEXT NOT NULL,
      tournament_line_2 TEXT NOT NULL,
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
    db.prepare("CREATE INDEX IF NOT EXISTS thumbnails_created_at_idx ON thumbnails (created_at)"),
  ]);

  // Tables created before the men's/women's split predate the division column.
  const opponentColumns = await db.prepare("PRAGMA table_info(opponents)").all<{ name: string }>();
  if (!opponentColumns.results.some((column: { name: string }) => column.name === "division")) {
    await db.prepare("ALTER TABLE opponents ADD COLUMN division TEXT NOT NULL DEFAULT 'both'").run();
  }

  const count = await db.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>();
  if (!count?.count) {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO projects (id, name, logo_url, tournament_line_1, tournament_line_2)
        VALUES (?, ?, ?, ?, ?)`).bind(
        "jeju-open",
        "제주오픈대회",
        "/assets/jeju-open-logo.png",
        "제10회 제주오픈",
        "국제플로어볼대회",
      ),
      db.prepare(`INSERT OR IGNORE INTO projects (id, name, logo_url, tournament_line_1, tournament_line_2)
        VALUES (?, ?, ?, ?, ?)`).bind(
        "sample-project",
        "챌린지컵 샘플",
        "/assets/sample-tournament-logo.png",
        "대전광역시 플로어볼",
        "챌린지컵 대회",
      ),
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
}): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    tournamentLine1: row.tournament_line_1,
    tournamentLine2: row.tournament_line_2,
  };
}

export function normalizeOpponent(row: {
  id: string;
  name: string;
  logo_url: string;
  circular_frame: number;
  division?: string;
}): OpponentRow {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    circularFrame: Boolean(row.circular_frame),
    division: normalizeDivision(row.division),
  };
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}
