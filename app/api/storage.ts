import { env } from "cloudflare:workers";

export type ProjectRow = {
  id: string;
  name: string;
  logoUrl: string;
  tournamentLine1: string;
  tournamentLine2: string;
};

export type OpponentRow = {
  id: string;
  name: string;
  logoUrl: string;
  circularFrame: boolean;
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

// 2026 제주국제오픈 참가팀 (남자부 16팀 + 여자부 13팀, Seoul Vikings 제외)
// 출처: https://flovus.info/competitions/6
const JEJU_TEAMS: Array<[id: string, name: string, logoUrl: string]> = [
  ["jeju-hong-kong-stars", "Hong Kong Stars", "/assets/jeju/hong-kong-stars-logo.png"],
  ["jeju-ntu-men-s-white", "NTU Men's White", "/assets/jeju/ntu-men-s-white-logo.png"],
  ["jeju-tamla-devil", "Tamla Devil", "/assets/jeju/tamla-devil-logo.png"],
  ["jeju-team-leopard", "Team Leopard", "/assets/jeju/team-leopard-logo.png"],
  ["jeju-astra", "ASTRA", "/assets/jeju/astra-logo.png"],
  ["jeju-jeju-oceans", "Jeju Oceans", "/assets/jeju/jeju-oceans-logo.png"],
  ["jeju-lingfung", "LingFung", "/assets/opponent-placeholder.png"],
  ["jeju-pegasus", "Pegasus", "/assets/jeju/pegasus-logo.png"],
  ["jeju-jeju-dolphins", "Jeju Dolphins", "/assets/jeju/jeju-dolphins-logo.png"],
  ["jeju-merlion-men", "Merlion Men", "/assets/jeju/merlion-men-logo.png"],
  ["jeju-shanghai-jingwu", "ShangHai Jingwu", "/assets/jeju/shanghai-jingwu-logo.png"],
  ["jeju-shinil-fc", "SHINIL FC", "/assets/jeju/shinil-fc-logo.png"],
  ["jeju-daykey", "Daykey", "/assets/jeju/daykey-logo.png"],
  ["jeju-mars", "Mars", "/assets/jeju/mars-logo.png"],
  ["jeju-ntu-men-s-blue", "NTU Men's Blue", "/assets/jeju/ntu-men-s-blue-logo.png"],
  ["jeju-jeju-blue-dolphins", "Jeju Blue Dolphins", "/assets/jeju/jeju-blue-dolphins-logo.png"],
  ["jeju-keplites", "Keplites", "/assets/jeju/keplites-logo.png"],
  ["jeju-tamla-devil-w", "Tamla Devil (W)", "/assets/jeju/tamla-devil-w-logo.png"],
  ["jeju-pegasus-w", "Pegasus (W)", "/assets/jeju/pegasus-w-logo.png"],
  ["jeju-shanghai-jingwu-w", "Shanghai JingWu (W)", "/assets/jeju/shanghai-jingwu-w-logo.png"],
  ["jeju-sojeju", "SoJeju", "/assets/jeju/sojeju-logo.png"],
  ["jeju-team-leopard-w", "Team Leopard (W)", "/assets/jeju/team-leopard-w-logo.png"],
  ["jeju-fed-fat", "FED FAT", "/assets/jeju/fed-fat-logo.png"],
  ["jeju-ntu-women-s", "NTU Women's", "/assets/jeju/ntu-women-s-logo.png"],
  ["jeju-overflow", "Overflow", "/assets/jeju/overflow-logo.png"],
  ["jeju-t-allies", "T_Allies", "/assets/jeju/t-allies-logo.png"],
  ["jeju-team-shinseong", "Team Shinseong", "/assets/jeju/team-shinseong-logo.png"],
];

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

  const count = await db.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>();
  if (!count?.count) {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO projects (id, name, logo_url, tournament_line_1, tournament_line_2)
        VALUES (?, ?, ?, ?, ?)`).bind(
        "jeju-open-2026",
        "2026 제주국제오픈",
        "/assets/jeju/jeju-open-logo.png",
        "2026 제주국제오픈",
        "플로어볼 대회",
      ),
      db.prepare(`INSERT OR IGNORE INTO projects (id, name, logo_url, tournament_line_1, tournament_line_2)
        VALUES (?, ?, ?, ?, ?)`).bind(
        "sample-project",
        "챌린지컵 샘플",
        "/assets/sample-tournament-logo.png",
        "대전광역시 플로어볼",
        "챌린지컵 대회",
      ),
      ...JEJU_TEAMS.map(([id, name, logoUrl]) =>
        db.prepare(`INSERT OR IGNORE INTO opponents (id, name, logo_url, circular_frame)
        VALUES (?, ?, ?, ?)`).bind(id, name, logoUrl, 1)),
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
}): OpponentRow {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    circularFrame: Boolean(row.circular_frame),
  };
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}
