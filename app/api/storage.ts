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

export function decodeAssetBody(body: unknown): Uint8Array {
  if (typeof body === "string") {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  if (Array.isArray(body)) return Uint8Array.from(body as number[]);
  return new Uint8Array();
}

// 2026 제주국제오픈 참가팀 (남자부 16팀 + 여자부 13팀, Seoul Vikings 제외)
// 출처: https://flovus.info/competitions/6
const JEJU_TEAMS: Array<[id: string, name: string, logoUrl: string]> = [
  ["jeju-hong-kong-stars", "Hong Kong Stars", "/assets/jeju/hong-kong-stars-logo.webp"],
  ["jeju-ntu-men-s-white", "NTU Men's White", "/assets/jeju/ntu-men-s-white-logo.webp"],
  ["jeju-tamla-devil", "Tamla Devil", "/assets/jeju/tamla-devil-logo.webp"],
  ["jeju-team-leopard", "Team Leopard", "/assets/jeju/team-leopard-logo.webp"],
  ["jeju-astra", "ASTRA", "/assets/jeju/astra-logo.webp"],
  ["jeju-jeju-oceans", "Jeju Oceans", "/assets/jeju/jeju-oceans-logo.webp"],
  ["jeju-lingfung", "LingFung", "/assets/opponent-placeholder.png"],
  ["jeju-pegasus", "Pegasus", "/assets/jeju/pegasus-logo.webp"],
  ["jeju-jeju-dolphins", "Jeju Dolphins", "/assets/jeju/jeju-dolphins-logo.webp"],
  ["jeju-merlion-men", "Merlion Men", "/assets/jeju/merlion-men-logo.webp"],
  ["jeju-shanghai-jingwu", "ShangHai Jingwu", "/assets/jeju/shanghai-jingwu-logo.webp"],
  ["jeju-shinil-fc", "SHINIL FC", "/assets/jeju/shinil-fc-logo.webp"],
  ["jeju-daykey", "Daykey", "/assets/jeju/daykey-logo.webp"],
  ["jeju-mars", "Mars", "/assets/jeju/mars-logo.webp"],
  ["jeju-ntu-men-s-blue", "NTU Men's Blue", "/assets/jeju/ntu-men-s-blue-logo.webp"],
  ["jeju-jeju-blue-dolphins", "Jeju Blue Dolphins", "/assets/jeju/jeju-blue-dolphins-logo.webp"],
  ["jeju-keplites", "Keplites", "/assets/jeju/keplites-logo.webp"],
  ["jeju-tamla-devil-w", "Tamla Devil (W)", "/assets/jeju/tamla-devil-w-logo.webp"],
  ["jeju-pegasus-w", "Pegasus (W)", "/assets/jeju/pegasus-w-logo.webp"],
  ["jeju-shanghai-jingwu-w", "Shanghai JingWu (W)", "/assets/jeju/shanghai-jingwu-w-logo.webp"],
  ["jeju-sojeju", "SoJeju", "/assets/jeju/sojeju-logo.webp"],
  ["jeju-team-leopard-w", "Team Leopard (W)", "/assets/jeju/team-leopard-w-logo.webp"],
  ["jeju-fed-fat", "FED FAT", "/assets/jeju/fed-fat-logo.webp"],
  ["jeju-ntu-women-s", "NTU Women's", "/assets/jeju/ntu-women-s-logo.webp"],
  ["jeju-overflow", "Overflow", "/assets/jeju/overflow-logo.webp"],
  ["jeju-t-allies", "T_Allies", "/assets/jeju/t-allies-logo.webp"],
  ["jeju-team-shinseong", "Team Shinseong", "/assets/jeju/team-shinseong-logo.webp"],
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
        "/assets/jeju/jeju-open-logo.webp",
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
