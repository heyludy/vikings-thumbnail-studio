// `wrangler d1 list --json` 출력에서 배포에 쓸 데이터베이스 ID 를 골라
// GitHub Actions 의 스텝 출력(database_id)으로 넘긴다.
//
//   node scripts/resolve-d1.mjs d1-list.json

import { appendFileSync, readFileSync } from "node:fs";

const [listPath] = process.argv.slice(2);
const wantedName = process.env.D1_DATABASE_NAME;
const raw = readFileSync(listPath, "utf8");

// wrangler 가 JSON 앞뒤로 배너를 섞어 출력하는 경우가 있어 배열 부분만 잘라 쓴다.
const start = raw.indexOf("[");
const end = raw.lastIndexOf("]");
if (start === -1 || end === -1) {
  console.error("D1 목록을 해석하지 못했습니다. wrangler 출력:");
  console.error(raw.slice(0, 2000));
  process.exit(1);
}

const parsed = JSON.parse(raw.slice(start, end + 1));
const databases = Array.isArray(parsed) ? parsed : parsed.result ?? [];
if (!databases.length) {
  console.error("이 계정에 D1 데이터베이스가 없습니다. 토큰이 올바른 계정에 연결됐는지 확인하세요.");
  process.exit(1);
}

// 이름이 다른 데이터베이스를 대신 붙이면 운영 데이터가 바뀌므로 정확히 일치할 때만 쓴다.
const target = databases.find((database) => database.name === wantedName);
if (!target) {
  console.error(`"${wantedName}" 데이터베이스를 찾지 못했습니다.`);
  console.error(`계정의 데이터베이스: ${databases.map((database) => database.name).join(", ")}`);
  console.error("이름이 바뀌었다면 워크플로의 D1_DATABASE_NAME 값을 맞춰주세요.");
  process.exit(1);
}

const databaseId = target.uuid ?? target.database_id ?? target.id;
if (!databaseId) {
  console.error(`데이터베이스 ID 를 읽지 못했습니다: ${JSON.stringify(target)}`);
  process.exit(1);
}

console.log(`D1: ${target.name} → ${databaseId}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `database_id=${databaseId}\n`);
}
