// 경기 일정 파서 테스트.
//
//   npm test
//
// 대회 사이트에 결과가 올라온 경기는 실제로 확인할 수 없는 시점이 많아서,
// 끝난 경기·안 끝난 경기·우리 팀이 원정인 경우를 직접 만들어 검사한다.

import assert from "node:assert/strict";
import { parseFixtures, withStageText } from "../app/api/fixtures/parse.ts";

const OUR_TEAMS = ["Seoul Vikings", "Seoul Vikings (W)"];

const card = ({ id, label, home, away, score, meta }) => `
  <a href="/matches/${id}" class="data-card block bg-zinc-50 p-4">
    <div class="text-[11px] font-black uppercase tracking-wide text-zinc-500">${label}</div>
    <div class="mt-2 grid score-layout items-center gap-2">
      <span class="min-w-0 flex-1 truncate text-sm font-black text-[#082f3c]">${home}</span>
      <span class="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-center text-base font-black">${score}</span>
      <span class="min-w-0 flex-1 truncate text-right text-sm font-black text-[#082f3c]">${away}</span>
    </div>
    <div class="mt-2 text-[11px] font-bold text-zinc-500">${meta}</div>
  </a>`;

const html = [
  card({ id: "201", label: "D조 예선 경기", home: "Daykey", away: "Mars", score: "---", meta: "2026.08.15 09:00 · 사라봉 체육관" }),
  // 우리 팀이 홈: 스코어가 그대로 우리 점수
  card({ id: "202", label: "D조 예선 경기", home: "Seoul Vikings", away: "NTU Men&#39;s Blue", score: "5 - 3", meta: "2026.08.15 11:30 · 사라봉 체육관" }),
  // 우리 팀이 원정: 스코어가 뒤집혀야 한다
  card({ id: "203", label: "D조 예선 경기", home: "Mars", away: "Seoul Vikings", score: "2 : 7", meta: "2026.08.15 17:20 · 사라봉 체육관" }),
  // 아직 안 끝난 우리 경기
  card({ id: "204", label: "8강 1경기", home: "Seoul Vikings", away: "Tamla Devil", score: "---", meta: "2026.08.16 10:00 · 한라체육관" }),
].join("\n");

const fixtures = withStageText(parseFixtures(html, OUR_TEAMS));
const byId = Object.fromEntries(fixtures.map((fixture) => [fixture.id, fixture]));

assert.equal(fixtures.length, 4, "카드 4개를 모두 읽어야 한다");

assert.equal(byId["201"].isOurMatch, false, "우리 팀이 없는 경기는 표시되지 않는다");

assert.deepEqual(
  [byId["202"].opponentName, byId["202"].ourScore, byId["202"].theirScore, byId["202"].stageText],
  ["NTU Men's Blue", "5", "3", "[예선 D조 2경기]"],
  "홈 경기: 상대팀·스코어·경기명",
);

assert.deepEqual(
  [byId["203"].opponentName, byId["203"].ourScore, byId["203"].theirScore],
  ["Mars", "7", "2"],
  "원정 경기는 스코어를 뒤집어야 한다",
);

assert.deepEqual(
  [byId["204"].ourScore, byId["204"].theirScore, byId["204"].stageText],
  ["", "", "[8강 1경기]"],
  "안 끝난 경기는 스코어가 비어 있고, 조별 경기가 아니면 라벨을 그대로 쓴다",
);

assert.equal(byId["202"].kickoff, "2026.08.15 11:30", "시작 시간");
assert.equal(byId["202"].venue, "사라봉 체육관", "경기장");
assert.equal(byId["201"].stageText, "[예선 D조 1경기]", "조별 순번은 카드 순서대로 붙는다");

console.log(`경기 일정 파서 테스트 통과 (${fixtures.length}경기 확인)`);
