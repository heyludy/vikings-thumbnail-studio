// 2026 제주국제오픈 프로젝트와 참가팀 로고를 배포된 사이트에 등록합니다.
// 팀/로고 출처: https://flovus.info/competitions/6 (남자부 / 여자부)
//
//   node scripts/seed-jeju.mjs https://vikings.ludia0602.workers.dev
//
// 이미 같은 이름의 프로젝트/상대팀이 있으면 건너뛰므로 여러 번 실행해도 안전합니다.
// 로고는 /api/uploads 로 업로드되어 배포본의 D1(또는 R2)에 저장됩니다.

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const assetsDir = new URL("../public/assets/jeju/", import.meta.url).pathname;

const PROJECT = {
  name: "2026 제주국제오픈",
  tournamentLine1: "2026 제주국제오픈",
  tournamentLine2: "플로어볼 대회",
  logo: "jeju-open-logo.png",
};

// [상대팀명, 로고 파일명] — 남자부 16팀 + 여자부 13팀에서 Seoul Vikings 제외
const TEAMS = [
  ["Hong Kong Stars", "hong-kong-stars-logo.png"],
  ["NTU Men's White", "ntu-men-s-white-logo.png"],
  ["Tamla Devil", "tamla-devil-logo.png"],
  ["Team Leopard", "team-leopard-logo.png"],
  ["ASTRA", "astra-logo.png"],
  ["Jeju Oceans", "jeju-oceans-logo.png"],
  ["LingFung", null], // flovus 에 등록된 로고 없음 → 기본 플레이스홀더 사용
  ["Pegasus", "pegasus-logo.png"],
  ["Jeju Dolphins", "jeju-dolphins-logo.png"],
  ["Merlion Men", "merlion-men-logo.png"],
  ["ShangHai Jingwu", "shanghai-jingwu-logo.png"],
  ["SHINIL FC", "shinil-fc-logo.png"],
  ["Daykey", "daykey-logo.png"],
  ["Mars", "mars-logo.png"],
  ["NTU Men's Blue", "ntu-men-s-blue-logo.png"],
  ["Jeju Blue Dolphins", "jeju-blue-dolphins-logo.png"],
  ["Keplites", "keplites-logo.png"],
  ["Tamla Devil (W)", "tamla-devil-w-logo.png"],
  ["Pegasus (W)", "pegasus-w-logo.png"],
  ["Shanghai JingWu (W)", "shanghai-jingwu-w-logo.png"],
  ["SoJeju", "sojeju-logo.png"],
  ["Team Leopard (W)", "team-leopard-w-logo.png"],
  ["FED FAT", "fed-fat-logo.png"],
  ["NTU Women's", "ntu-women-s-logo.png"],
  ["Overflow", "overflow-logo.png"],
  ["T_Allies", "t-allies-logo.png"],
  ["Team Shinseong", "team-shinseong-logo.png"],
];

const PLACEHOLDER_LOGO = "/assets/opponent-placeholder.png";

async function api(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} → ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function uploadLogo(fileName, folder) {
  const body = new FormData();
  const bytes = await readFile(join(assetsDir, fileName));
  body.append("file", new File([bytes], basename(fileName), { type: "image/png" }));
  body.append("folder", folder);
  const { url } = await api("/api/uploads", { method: "POST", body });
  return url;
}

const postJson = (path, payload) => api(path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const { projects } = await api("/api/projects");
if (projects.some((project) => project.name === PROJECT.name)) {
  console.log(`프로젝트 "${PROJECT.name}" 이미 존재 → 건너뜀`);
} else {
  const logoUrl = await uploadLogo(PROJECT.logo, "project-logos");
  const { project } = await postJson("/api/projects", {
    name: PROJECT.name,
    logoUrl,
    tournamentLine1: PROJECT.tournamentLine1,
    tournamentLine2: PROJECT.tournamentLine2,
  });
  console.log(`프로젝트 생성: ${project.name} (${project.id}) ${project.logoUrl}`);
}

const { opponents } = await api("/api/opponents");
const existing = new Set(opponents.map((opponent) => opponent.name));

// 목록이 최신순으로 정렬되므로 역순으로 등록해 남자부 → 여자부 순서로 보이게 한다.
for (const [name, logo] of [...TEAMS].reverse()) {
  if (existing.has(name)) {
    console.log(`상대팀 "${name}" 이미 존재 → 건너뜀`);
    continue;
  }
  const logoUrl = logo ? await uploadLogo(logo, "opponent-logos") : PLACEHOLDER_LOGO;
  const { opponent } = await postJson("/api/opponents", { name, logoUrl, circularFrame: true });
  console.log(`상대팀 생성: ${opponent.name} → ${opponent.logoUrl}`);
}

console.log("완료");
