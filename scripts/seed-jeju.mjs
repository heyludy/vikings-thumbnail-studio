// 2026 제주국제오픈 프로젝트와 참가팀 로고를 배포된 사이트에 등록합니다.
// 팀/로고 출처: https://flovus.info/competitions/6 (남자부 / 여자부)
//
//   node scripts/seed-jeju.mjs https://vikings.ludia0602.workers.dev
//
// 같은 이름의 프로젝트/상대팀이 이미 있으면 새로 만들지 않고, 로고가 깨져 있을
// 때만 고쳐 쓰므로 여러 번 실행해도 안전합니다.
//
// 로고는 먼저 /api/uploads 로 올려 보고, 올린 주소가 실제 이미지를 돌려주지
// 않으면(배포본의 저장소가 비어 있는 응답을 주는 경우) data: URL 로 직접 심습니다.

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const assetsDir = new URL("../public/assets/jeju/", import.meta.url).pathname;

const PROJECT = {
  name: "2026 제주국제오픈",
  tournamentLine1: "2026 제주국제오픈",
  tournamentLine2: "플로어볼 대회",
  logo: "jeju-open-logo.webp",
};

// [상대팀명, 로고 파일명] — 남자부 16팀 + 여자부 13팀에서 Seoul Vikings 제외
const TEAMS = [
  ["Hong Kong Stars", "hong-kong-stars-logo.webp"],
  ["NTU Men's White", "ntu-men-s-white-logo.webp"],
  ["Tamla Devil", "tamla-devil-logo.webp"],
  ["Team Leopard", "team-leopard-logo.webp"],
  ["ASTRA", "astra-logo.webp"],
  ["Jeju Oceans", "jeju-oceans-logo.webp"],
  ["LingFung", null], // flovus 에 등록된 로고 없음 → 기본 플레이스홀더 사용
  ["Pegasus", "pegasus-logo.webp"],
  ["Jeju Dolphins", "jeju-dolphins-logo.webp"],
  ["Merlion Men", "merlion-men-logo.webp"],
  ["ShangHai Jingwu", "shanghai-jingwu-logo.webp"],
  ["SHINIL FC", "shinil-fc-logo.webp"],
  ["Daykey", "daykey-logo.webp"],
  ["Mars", "mars-logo.webp"],
  ["NTU Men's Blue", "ntu-men-s-blue-logo.webp"],
  ["Jeju Blue Dolphins", "jeju-blue-dolphins-logo.webp"],
  ["Keplites", "keplites-logo.webp"],
  ["Tamla Devil (W)", "tamla-devil-w-logo.webp"],
  ["Pegasus (W)", "pegasus-w-logo.webp"],
  ["Shanghai JingWu (W)", "shanghai-jingwu-w-logo.webp"],
  ["SoJeju", "sojeju-logo.webp"],
  ["Team Leopard (W)", "team-leopard-w-logo.webp"],
  ["FED FAT", "fed-fat-logo.webp"],
  ["NTU Women's", "ntu-women-s-logo.webp"],
  ["Overflow", "overflow-logo.webp"],
  ["T_Allies", "t-allies-logo.webp"],
  ["Team Shinseong", "team-shinseong-logo.webp"],
];

const PLACEHOLDER_LOGO = "/assets/opponent-placeholder.png";

let uploadsUsable = true;

async function api(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} → ${response.status} ${await response.text()}`);
  }
  return response.json();
}

const postJson = (path, payload) => api(path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const patchJson = (path, payload) => api(path, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

// 로고 주소가 실제로 이미지를 돌려주는지 확인한다. data: URL 은 항상 유효.
async function logoServesImage(logoUrl) {
  if (!logoUrl) return false;
  if (logoUrl.startsWith("data:")) return true;
  try {
    const response = await fetch(logoUrl.startsWith("http") ? logoUrl : `${baseUrl}${logoUrl}`);
    if (!response.ok) return false;
    return (await response.arrayBuffer()).byteLength > 100;
  } catch {
    return false;
  }
}

async function resolveLogoUrl(fileName, folder) {
  if (!fileName) return PLACEHOLDER_LOGO;
  const bytes = await readFile(join(assetsDir, fileName));
  if (uploadsUsable) {
    const body = new FormData();
    body.append("file", new File([bytes], basename(fileName), { type: "image/webp" }));
    body.append("folder", folder);
    const { url } = await api("/api/uploads", { method: "POST", body });
    if (await logoServesImage(url)) return url;
    uploadsUsable = false;
    console.log("업로드한 이미지가 빈 응답으로 돌아옴 → data: URL 로 대체합니다.");
  }
  return `data:image/webp;base64,${bytes.toString("base64")}`;
}

const { projects } = await api("/api/projects");
const existingProject = projects.find((project) => project.name === PROJECT.name);
if (!existingProject) {
  const logoUrl = await resolveLogoUrl(PROJECT.logo, "project-logos");
  const { project } = await postJson("/api/projects", {
    name: PROJECT.name,
    logoUrl,
    tournamentLine1: PROJECT.tournamentLine1,
    tournamentLine2: PROJECT.tournamentLine2,
  });
  console.log(`프로젝트 생성: ${project.name} (${project.id})`);
} else if (await logoServesImage(existingProject.logoUrl)) {
  console.log(`프로젝트 "${PROJECT.name}" 이미 정상 등록됨 → 건너뜀`);
} else {
  const logoUrl = await resolveLogoUrl(PROJECT.logo, "project-logos");
  await patchJson(`/api/projects/${existingProject.id}`, { logoUrl });
  console.log(`프로젝트 로고 복구: ${PROJECT.name}`);
}

const { opponents } = await api("/api/opponents");
const existingOpponents = new Map(opponents.map((opponent) => [opponent.name, opponent]));

// 목록이 최신순으로 정렬되므로 역순으로 등록해 남자부 → 여자부 순서로 보이게 한다.
for (const [name, logo] of [...TEAMS].reverse()) {
  const existing = existingOpponents.get(name);
  if (existing && (await logoServesImage(existing.logoUrl))) {
    console.log(`상대팀 "${name}" 이미 정상 등록됨 → 건너뜀`);
    continue;
  }
  const logoUrl = await resolveLogoUrl(logo, "opponent-logos");
  if (existing) {
    await patchJson(`/api/opponents/${existing.id}`, { logoUrl });
    console.log(`상대팀 로고 복구: ${name}`);
  } else {
    const { opponent } = await postJson("/api/opponents", { name, logoUrl, circularFrame: true });
    console.log(`상대팀 생성: ${opponent.name} (${opponent.id})`);
  }
}

console.log("완료");
