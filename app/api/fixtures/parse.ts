// 대회 사이트(flovus.info) 경기 카드 파싱. 워커 API 와 테스트가 함께 쓰는 순수 함수라
// 여기서는 D1 이나 fetch 같은 런타임 의존성을 두지 않는다.

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
  // 아직 안 끝난 경기는 빈 문자열. 대회 사이트에 결과가 올라오면 채워진다.
  ourScore: string;
  theirScore: string;
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


/** 조별 경기 카드에서 경기 정보를 읽는다. */
export function parseFixtures(html: string, ourTeamNames: readonly string[]): Fixture[] {
  const isOurTeam = (name: string) => ourTeamNames.some((team) => name === team);
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
    const scoreMatch = body.match(/<span class="shrink-0[^"]*">([\s\S]*?)<\/span>/);
    const scorePair = scoreMatch ? decode(scoreMatch[1]).match(/(\d+)\s*[-:]\s*(\d+)/) : null;
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
      // 홈/원정 중 우리 팀이 어느 쪽인지에 맞춰 점수를 돌려놓는다.
      ourScore: scorePair ? (ourSide === awayTeam ? scorePair[2] : scorePair[1]) : "",
      theirScore: scorePair ? (ourSide === awayTeam ? scorePair[1] : scorePair[2]) : "",
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
