# 경기 썸네일 스튜디오 (Seoul Vikings)

플로어볼 경기 예고 / 결과 썸네일을 폰에서 바로 만드는 사이트입니다.
대회·상대팀·로고를 미리 등록해두고, 경기 사진 한 장만 올리면 유튜브(16:9),
인스타(1:1), 스토리(9:16) 이미지가 한 번에 나옵니다.

- 사이트: <https://vikings.ludia0602.workers.dev>
- 실행 환경: Cloudflare Workers + D1 (vinext / Next.js App Router)

---

## 다음 대회 때 할 일

폰만 있으면 아래 순서로 끝납니다. 터미널이 필요한 건 3번의 "팀이 많을 때"뿐입니다.

### 1. 대회 프로젝트 만들기

홈 화면 → **+ 새 대회 프로젝트** → 아래 4개를 채웁니다.

| 칸 | 예시 | 설명 |
| --- | --- | --- |
| 프로젝트명 | `2026 제주국제오픈` | 목록에서 보이는 이름 |
| 대회명 1줄 | `2026 제주국제오픈` | 썸네일 첫 줄 |
| 대회명 2줄 | `플로어볼 대회` | 썸네일 둘째 줄 (영문이면 길어지니 짧게) |
| 경기 일정 주소 | `https://flovus.info/competitions/6` | 선택. 넣으면 경기 목록을 자동으로 불러옵니다 |

대회 로고도 여기서 올립니다. 정사각형/직사각형 아무거나 됩니다 — 원형으로
자르지 않고 로고 그대로 얹습니다.

### 2. 상대팀 등록

홈 화면 → **상대팀 관리** → 팀 이름 + 로고 + 소속(남자부/여자부).
소속을 정확히 넣어야 편집 화면에서 **남자팀 테마에는 남자팀만** 뜹니다.

로고에 투명한 안쪽(도넛 모양 배지 등)이 있으면 업로드할 때 자동으로 흰색을
채웁니다. flovus 에서 받은 바이킹스 로고의 "since 2008"이 안 보이던 문제가
이것 때문이었습니다.

### 3. 팀이 많을 때 — 시딩 스크립트

제주국제오픈은 참가팀이 27개라 손으로 넣기 어려워서 스크립트로 심었습니다.
다음 대회도 팀이 많으면 `scripts/seed-jeju.mjs` 를 복사해서 위쪽 3곳만 고치면
됩니다.

```js
const assetsDir = new URL("../public/assets/jeju/", import.meta.url).pathname; // 로고 폴더
const PROJECT = { name, tournamentLine1, tournamentLine2, logo, fixtureUrl };   // 대회 정보
const TEAMS = [["팀 이름", "로고파일.webp", "men" | "women"], ...];             // 참가팀
```

로고 파일은 `public/assets/<대회>/` 에 넣고, 실행은 이렇게 합니다.

```bash
node scripts/seed-jeju.mjs https://vikings.ludia0602.workers.dev
```

같은 이름의 프로젝트/팀이 이미 있으면 새로 만들지 않고 로고가 깨진 것만
고치므로, 여러 번 돌려도 안전합니다. 로고 업로드가 안 먹는 배포본에서는
`data:` URL 로 직접 심습니다.

새 대회용 스크립트를 만들었다면 `.github/workflows/deploy.yml` 의
`Sync Jeju tournament data` 단계도 새 파일 이름으로 바꿔주세요.

참고로 데이터베이스가 완전히 비어 있을 때 자동으로 심는 기본값(제주국제오픈과
참가팀)은 `app/api/storage.ts` 에 있습니다. 새 대회를 여기에 넣을 필요는 없고,
위 스크립트로 추가하는 쪽이 간단합니다.

---

## 썸네일 만드는 법

대회를 고르면 편집 화면으로 들어갑니다.

1. **팀 테마** — 남자팀 / 여자팀. 상대팀 목록과 색이 바뀝니다.
2. **경기 불러오기** — 대회에 일정 주소를 넣어뒀으면 경기를 고르는 것만으로
   경기명·상대팀·스코어가 채워집니다. 없으면 직접 입력.
3. **경기명** — `[예선 D조 2경기]` 처럼.
4. **스코어** — **비우면 경기 예고, 채우면 경기 결과** 카드가 됩니다.
5. **경기 사진** — 올린 뒤 손가락으로 끌어 옮기고, 두 손가락으로 벌려 확대
   (1~2.4배). 슬라이더로도 조절되고, 초기화 버튼이 있습니다.
6. **저장 크기** 를 고르고 **PNG 저장**, 또는 **세 크기 한 번에 저장**.

홈 화면의 **최근 작업** 에 최근 20개가 남습니다. 눌러서 그대로 열면 대회·상대팀·
경기명·스코어가 복원되니, 사진만 다시 올려 고쳐 만들 수 있습니다. (사진은 저장하지
않고 이름만 기억합니다.)

### 비율마다 역할이 다릅니다

| 비율 | 쓰는 곳 | 점수 |
| --- | --- | --- |
| 16:9 (1920×1080) | 유튜브 썸네일 | **안 들어감** — 예고 전용 |
| 1:1 (1080×1080) | 인스타 피드 | 들어감 (`경기 종료` + 스코어보드) |
| 9:16 (1080×1920) | 스토리 | 들어감 |

실제 스포츠 결과 그래픽들이 대체로 이렇게 나뉘어 있고, 16:9 에 점수를 넣으면
가로로 늘어져서 보기 안 좋아 이렇게 정리했습니다.

### 아이폰에서 저장

사파리는 큰 이미지를 그냥 다운로드하지 못해서, 아이폰·아이패드에서는 **공유
시트**가 뜹니다. "이미지 저장"을 누르면 사진 앱에 들어갑니다. 세 크기를 한
번에 저장하면 3장이 함께 공유 시트에 올라갑니다. 데스크톱은 그냥 다운로드됩니다.

글씨 굵기가 기기마다 달라지지 않도록 Pretendard Black 을 직접 포함해서
(`public/assets/fonts/pretendard-black.woff2`) 폰트가 준비된 뒤에 그립니다.

---

## 배포 (폰에서 가능)

GitHub → **Actions** → **Deploy** → **Run workflow** → 브랜치 선택 → 실행.
`main` 에 푸시해도 같은 워크플로가 돕니다.

필요한 저장소 시크릿 (Settings → Secrets and variables → Actions):

| 시크릿 | 필수 | 권한 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | O | Account → **Workers Scripts: Edit**, Account → **D1: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | 토큰이 여러 계정에 붙어 있을 때만 | — |

워크플로는 배포 전에 `wrangler whoami` 와 `wrangler d1 list` 를 찍어둡니다.
`D1 binding 'DB' references database ... not found [code: 10181]` 로 실패하면
**권한 문제가 아니라 토큰이 다른 계정 것일 가능성이 큽니다.** 로그의 계정
이름과 D1 목록을 먼저 확인하세요 (실제로 한 번 이걸로 실패했습니다).
데이터베이스는 ID 대신 이름(`vikings-thumbnail-studio-db`)으로 찾기 때문에,
DB 를 다시 만들어도 워크플로를 고칠 필요는 없습니다.

터미널에서 직접 배포할 때:

```bash
CLOUDFLARE_EXTERNAL_DEPLOY=1 \
CLOUDFLARE_DATABASE_ID=<d1 database id> \
npx vinext deploy
```

---

## 경기 일정 가져오기

`GET /api/fixtures?division=men&url=<flovus 대회 페이지>`

- 브라우저에서 flovus 를 직접 부를 수 없어서(CORS 헤더가 없음) 서버에서 읽습니다.
- 결과는 D1 에 10분 캐시하고, 사이트가 안 열리면 마지막으로 받아둔 일정을 씁니다.
- `flovus.info` 주소만 허용합니다. 아무 주소나 대신 불러주는 통로가 되지 않게 하려고요.
- **조별 예선만 나옵니다.** 결선 대진표는 flovus 가 브라우저에서 그려서 서버가
  읽을 수 없습니다. 8강 이후 경기명은 손으로 타이핑하세요.
- 파서는 `app/api/fixtures/parse.ts` 에 순수 함수로 분리해뒀고 `npm test` 로
  검사합니다 (우리 팀이 원정일 때 스코어 뒤집기 등).

---

## 로컬 개발

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm test        # 경기 일정 파서 테스트
```

알아두면 좋은 것:

- 로컬은 miniflare 로 D1 을 흉내 냅니다. 배포본 데이터와는 별개입니다.
- `wrangler` 가 `compatibility_date` 가 미래라고 거부하면 `wrangler.jsonc` 의
  날짜를 잠시 낮춰 쓰되, 커밋하지는 마세요.
- 이미지 바이트는 D1 에 **base64 텍스트**로 저장합니다. BLOB 은 로컬과 실제
  D1 의 반환 형식이 달라서, 예전에 배포본에서 업로드한 로고가 전부 빈 응답으로
  돌아온 적이 있습니다. R2 없이 돌리려는 것이기도 합니다.

---

## 코드 지도

| 파일 | 하는 일 |
| --- | --- |
| `app/thumbnail-studio.tsx` | 화면 전체 + 캔버스 렌더링. 레이아웃 좌표는 `VERTICAL_LAYOUTS` 와 `renderWide` 에 있습니다 |
| `app/api/storage.ts` | D1 스키마·마이그레이션, 기본 대회/팀 데이터, base64 인코딩 |
| `app/api/fixtures/parse.ts` | flovus HTML → 경기 목록 (순수 함수, 테스트 대상) |
| `app/api/fixtures/route.ts` | 일정 가져오기 + 캐시 + 허용 주소 검사 |
| `app/api/{projects,opponents,thumbnails,uploads,assets}` | 대회·상대팀·기록·이미지 |
| `scripts/seed-jeju.mjs` | 배포된 사이트에 대회/팀 심기 |
| `scripts/resolve-d1.mjs` | 이름으로 D1 데이터베이스 ID 찾기 (배포용) |
| `public/assets/jeju/` | 제주국제오픈 로고 모음 |

레이아웃을 건드릴 때는 세 비율을 모두 확인하세요. 1:1 여백을 고치다가 9:16 의
대회명 둘째 줄이 경기명과 겹친 적이 있습니다.

## 남은 아이디어

- 저장한 썸네일 공유 링크
- 라인업 / 선수 소개 템플릿
- 하단 워터마크 · 스폰서 줄
- 결선 대진 자동 입력 (flovus 클라이언트 렌더링 우회 필요)
- 렌더 스냅샷 테스트 — 위의 9:16 겹침 같은 걸 자동으로 잡기

---

<details>
<summary>스타터 템플릿에서 딸려온 것들</summary>

이 저장소는 [vinext](https://github.com/cloudflare/vinext) 스타터에서
시작했습니다. 아직 쓰지 않지만 남아 있는 것:

- `app/chatgpt-auth.ts` — ChatGPT 로그인(SIWC) 헬퍼. `getChatGPTUser()`,
  `requireChatGPTUser(returnTo)` 등. 팀 계정 기능을 붙일 때 쓸 수 있습니다.
- `db/schema.ts`, `drizzle.config.ts` — Drizzle 마이그레이션용. 지금 스키마는
  `app/api/storage.ts` 의 `ensureSchema` 가 직접 만듭니다.
- `examples/d1/` — D1 예제 화면.
- `.openai/hosting.json` — D1 / R2 바인딩 선언. R2 는 켜지 않았습니다.

</details>
