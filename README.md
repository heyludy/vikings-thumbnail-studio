# Match Thumbnail Studio · 경기 썸네일 스튜디오

Preview and result graphics for floorball matches, made on a phone in about a
minute. Built for [Seoul Vikings](https://flovus.info), running on Cloudflare
Workers.

**<https://vikings.ludia0602.workers.dev>**

![The home screen, listing saved tournaments](docs/screenshot-home.png)

[English](#english) · [Korean](#korean)

---

## English

### What it is

Every match day, someone on the team has to make a thumbnail: the tournament
name, the two crests, the score, a photo from the game. Doing that in a design
app on a phone, between matches, in a gym, is miserable.

This is a small web app that does exactly that one job. You register a
tournament and its teams once, and from then on making a graphic is: pick the
match, drop in a photo, save. It gives you three sizes at once — YouTube,
Instagram, and Stories.

### What it does

- **Tournament projects.** Save a tournament's name, logo, and the two title
  lines once. Every thumbnail for that tournament starts from it.
- **Opponent library.** Teams are stored with their crest and their division, so
  the men's theme only ever offers men's teams.
- **Schedule import.** Point a project at a [flovus.info](https://flovus.info)
  competition page and the editor lists the actual fixtures. Picking one fills in
  the match label, the opponent, and — if the match is over — the score.
- **Preview or result, automatically.** Leave the score empty and you get a
  match preview. Type a score and the same card becomes a result graphic.
- **Photo placement by hand.** Drag the game photo to reframe it, pinch to zoom
  (1×–2.4×). Sliders and a reset button are there for desktop.
- **Three sizes, one tap.** 16:9 for YouTube, 1:1 for the feed, 9:16 for
  Stories. Save one, or save all three together.
- **Logo repair on upload.** Crests exported from tournament sites often have a
  transparent interior — the ring of a badge, the space around lettering. Those
  enclosed areas are filled with white automatically, so fine details don't
  disappear against a dark panel.
- **Recent work.** The last 20 thumbnails are listed; tapping one restores the
  tournament, opponent, match label, and score so you can re-cut it.

### The three sizes have different jobs

| Size | Where it goes | Score |
| --- | --- | --- |
| 16:9 — 1920×1080 | YouTube thumbnail | **No score** — preview only |
| 1:1 — 1080×1080 | Instagram feed | Yes (`경기 종료` + scoreboard row) |
| 9:16 — 1080×1920 | Stories | Yes |

Most real sports result graphics split this way. A score stretched across a
16:9 frame reads as empty space, so the wide card stays a preview.

### Making one

![The editor: controls on the left, live preview on the right](docs/screenshot-editor.png)

1. Open the tournament from the home screen.
2. Choose the **men's** or **women's** theme — it changes the colours and the
   opponent list.
3. Pick a fixture under **경기 불러오기**, or type the match label yourself.
4. Leave the score blank for a preview, or fill it in for a result.
5. Upload the game photo and drag it into place.
6. Save one size, or **세 크기 한 번에 저장** for all three.

On iPhone and iPad the images arrive through the **share sheet** — Safari won't
download images this large directly. Tap *Save Image* and they land in Photos.
Desktop browsers download them normally.

Text weight is device-independent: Pretendard Black is bundled with the app and
the canvas waits for the font before drawing, so a thumbnail made on a phone
looks the same as one made on a laptop.

### Setting up the next tournament

Everything below except step 3 works from a phone.

**1 — Create the project.** Home → **+ 새 대회 프로젝트**:

| Field | Example | Notes |
| --- | --- | --- |
| 프로젝트명 | `2026 제주국제오픈` | Shown in the list |
| 대회명 1줄 | `2026 JEJU OPEN` | First line on the card |
| 대회명 2줄 | `Floorball Championship` | Second line — keep it short, English runs long |
| 경기 일정 주소 | `https://flovus.info/competitions/6` | Optional; enables the fixture picker |

The tournament logo is uploaded here too. Any aspect ratio works — it is placed
as-is, not cropped to a circle.

**2 — Add the opponents.** Home → **상대팀 관리** → name, crest, division. The
division matters: it drives the men's/women's filtering.

**3 — Or seed a large field with the script.** The Jeju Open had 27 teams, which
is too many to type in. Copy `scripts/seed-jeju.mjs` and edit the three
declarations at the top:

```js
const assetsDir = new URL("../public/assets/jeju/", import.meta.url).pathname; // logo folder
const PROJECT = { name, tournamentLine1, tournamentLine2, logo, fixtureUrl };   // the tournament
const TEAMS = [["Team name", "logo.webp", "men" | "women"], ...];               // the field
```

Put the crests in `public/assets/<tournament>/` and run:

```bash
node scripts/seed-jeju.mjs https://vikings.ludia0602.workers.dev
```

It skips projects and teams that already exist with a working logo, so it is
safe to run repeatedly. If the deployment cannot serve uploaded images yet, it
falls back to inlining them as `data:` URLs.

If you write a new seed script, update the `Sync Jeju tournament data` step in
`.github/workflows/deploy.yml` to call it. The defaults that bootstrap a
completely empty database (the Jeju Open and its teams) live in
`app/api/storage.ts`; new tournaments do not need to be added there.

### Deploying

GitHub → **Actions** → **Deploy** → **Run workflow** → pick a branch. Pushing to
`main` runs the same workflow. No terminal required.

Repository secrets (Settings → Secrets and variables → Actions):

| Secret | Required | Permissions |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | yes | Account → **Workers Scripts: Edit** and **D1: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | only if the token can reach several accounts | — |

The workflow logs `wrangler whoami` and `wrangler d1 list` before deploying. If
it fails with `D1 binding 'DB' references database ... not found [code: 10181]`,
check those two outputs first: **the usual cause is a token belonging to a
different Cloudflare account, not a missing permission.** The database is looked
up by name (`vikings-thumbnail-studio-db`), so recreating it does not break the
workflow.

From a terminal:

```bash
CLOUDFLARE_EXTERNAL_DEPLOY=1 \
CLOUDFLARE_DATABASE_ID=<d1 database id> \
npx vinext deploy
```

### Schedule import

`GET /api/fixtures?division=men&url=<flovus competition page>`

- Read server-side, because flovus sends no CORS headers and the browser cannot
  fetch it directly.
- Cached in D1 for ten minutes, with the last successful copy served if the
  tournament site is unreachable.
- Only `flovus.info` addresses are accepted, so the endpoint cannot be used to
  fetch arbitrary URLs.
- **Group stage only.** The knockout bracket is rendered client-side on flovus,
  so nothing is in the HTML to read. Type those match labels by hand.
- The parser is a pure function in `app/api/fixtures/parse.ts`, covered by
  `npm test` — including the case where we are the away team and the score has to
  be flipped.

### Running locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm test        # fixture parser
```

Worth knowing:

- Local development simulates D1 through miniflare; its data is separate from
  the deployment.
- If wrangler rejects a `compatibility_date` in the future, lower it in
  `wrangler.jsonc` temporarily — but don't commit that.
- Image bytes are stored in D1 as **base64 text**, not BLOBs. Real D1 and the
  local simulator return BLOB columns differently, which once made every logo
  uploaded through the production site come back as an empty response. It also
  means the app runs without an R2 bucket.

### Code map

| File | Responsibility |
| --- | --- |
| `app/thumbnail-studio.tsx` | The whole UI and the canvas rendering. Layout coordinates live in `VERTICAL_LAYOUTS` and `renderWide` |
| `app/api/storage.ts` | D1 schema and migrations, default tournament data, base64 encoding |
| `app/api/fixtures/parse.ts` | flovus HTML → fixture list (pure, tested) |
| `app/api/fixtures/route.ts` | Fetching, caching, and the host allow-list |
| `app/api/{projects,opponents,thumbnails,uploads,assets}` | Tournaments, opponents, history, images |
| `scripts/seed-jeju.mjs` | Registers a tournament and its teams on a deployed site |
| `scripts/resolve-d1.mjs` | Resolves the D1 database id by name, for deploys |
| `public/assets/jeju/` | Jeju Open crests |

When touching layout, check all three sizes. Fixing the square card's spacing is
how the 9:16 overlap — the second tournament line sitting on top of the match
label — was found.

### Ideas not built yet

- Share links for saved thumbnails
- Lineup and player-introduction templates
- A watermark / sponsor strip
- Knockout fixtures (needs a way around flovus's client-side bracket)
- Render snapshot tests, to catch the kind of overlap described above

---

## Korean

### 뭐 하는 앱인가

경기가 끝나면 누군가는 썸네일을 만들어야 합니다. 대회 이름 넣고, 양 팀 로고 넣고,
점수 넣고, 사진 한 장 얹고. 문제는 그걸 보통 체육관에서, 다음 경기 기다리면서,
폰으로 해야 한다는 겁니다. 그 상황에서 디자인 앱을 켜는 건 좀 고역이죠.

그래서 딱 그 일만 하는 앱을 만들었습니다. 대회랑 참가팀은 처음에 한 번만
등록해두면 됩니다. 그다음부터는 경기 고르고, 사진 올리고, 저장. 유튜브랑 인스타,
스토리 크기가 한꺼번에 나옵니다.

### 뭐가 되나

- **대회 프로젝트.** 대회 이름, 로고, 썸네일에 들어갈 문구 두 줄을 저장해둡니다.
  그 대회 썸네일은 전부 여기서 출발합니다.
- **상대팀 목록.** 팀마다 로고와 소속(남자부/여자부)을 같이 넣습니다. 소속을
  넣어둬야 남자팀 테마에서 남자팀만 뜹니다.
- **경기 일정 불러오기.** 대회에 [flovus](https://flovus.info) 대회 페이지 주소를
  넣어두면 편집 화면에 그 대회 경기 목록이 뜹니다. 하나 누르면 경기명과 상대팀이
  채워지고, 이미 끝난 경기면 점수까지 같이 들어옵니다.
- **예고랑 결과를 따로 만들 일이 없습니다.** 점수 칸을 비우면 예고, 숫자를 넣으면
  결과 카드가 됩니다.
- **사진 위치는 손으로.** 사진을 끌어서 원하는 데로 옮기고, 두 손가락으로 벌리면
  확대됩니다(1~2.4배). 마우스로 쓸 때를 위한 슬라이더랑 초기화 버튼도 있습니다.
- **세 크기 한 번에.** 유튜브 16:9, 피드 1:1, 스토리 9:16. 하나만 받아도 되고 세 개
  다 받아도 버튼 한 번입니다.
- **로고는 알아서 고칩니다.** 대회 사이트에서 받은 로고는 가운데가 뚫려 있는 게
  많습니다. 배지 링 안쪽이나 글자 주변 같은 데요. 그런 자리를 흰색으로 메워서
  어두운 배경 위에 올려도 디테일이 안 묻히게 합니다.
- **최근 작업.** 만든 썸네일 20개가 남습니다. 누르면 대회, 상대팀, 경기명, 점수가
  그대로 돌아오니까 사진만 새로 올려서 다시 뽑으면 됩니다.

### 크기마다 쓰임이 다릅니다

| 크기 | 쓰는 곳 | 점수 |
| --- | --- | --- |
| 16:9 — 1920×1080 | 유튜브 썸네일 | **안 들어감.** 예고 전용입니다 |
| 1:1 — 1080×1080 | 인스타 피드 | 들어감 (`경기 종료` + 스코어보드) |
| 9:16 — 1080×1920 | 스토리 | 들어감 |

구단 계정들 그래픽을 찾아보니 대체로 이렇게 나눠 쓰고 있었습니다. 16:9에 점수를
넣어봤더니 가로로 늘어지면서 가운데가 휑해져서, 가로 카드는 예고만 만드는 걸로
정리했습니다.

### 만드는 순서

![편집 화면. 왼쪽이 설정, 오른쪽이 미리보기](docs/screenshot-editor.png)

1. 홈에서 대회를 누릅니다.
2. **남자팀 / 여자팀** 을 고릅니다. 색이랑 상대팀 목록이 같이 바뀝니다.
3. **경기 불러오기** 에서 경기를 고르거나, 경기명을 직접 칩니다.
4. 점수는 예고면 비워두고, 결과면 채웁니다.
5. 경기 사진을 올리고 끌어서 자리를 잡습니다.
6. 한 크기만 저장하거나 **세 크기 한 번에 저장** 을 누릅니다.

아이폰이랑 아이패드에서는 저장을 누르면 **공유 시트**가 올라옵니다. 사파리가 이만한
이미지를 바로 받지 못해서 그렇습니다. "이미지 저장" 누르면 사진 앱에 들어갑니다.
노트북 브라우저는 그냥 다운로드됩니다.

글씨 굵기는 기기를 안 탑니다. Pretendard Black을 앱에 같이 넣어두고 폰트가 다 뜬
다음에 그리기 때문에, 폰에서 만든 거랑 노트북에서 만든 게 똑같이 나옵니다.

### 다음 대회 준비하기

3번 빼고는 폰으로 다 됩니다.

**1. 대회 프로젝트 만들기.** 홈 → **+ 새 대회 프로젝트**

| 칸 | 예시 | 메모 |
| --- | --- | --- |
| 프로젝트명 | `2026 제주국제오픈` | 목록에 뜨는 이름 |
| 대회명 1줄 | `2026 JEJU OPEN` | 썸네일 첫 줄 |
| 대회명 2줄 | `Floorball Championship` | 둘째 줄. 영문은 금방 길어지니 짧게 |
| 경기 일정 주소 | `https://flovus.info/competitions/6` | 안 넣어도 되지만, 넣으면 경기 목록이 뜹니다 |

대회 로고도 여기서 올립니다. 비율은 상관없습니다. 원형으로 자르지 않고 그대로
얹으니까요.

**2. 상대팀 넣기.** 홈 → **상대팀 관리** 에서 이름, 로고, 소속. 소속을 대충 넣으면
남녀 필터가 어긋나니 이것만 신경 써주세요.

**3. 팀이 많으면 스크립트로.** 제주국제오픈은 27팀이라 손으로 넣기엔 무리였습니다.
`scripts/seed-jeju.mjs` 를 복사해서 맨 위 세 줄만 바꾸면 됩니다.

```js
const assetsDir = new URL("../public/assets/jeju/", import.meta.url).pathname; // 로고 폴더
const PROJECT = { name, tournamentLine1, tournamentLine2, logo, fixtureUrl };   // 대회 정보
const TEAMS = [["팀 이름", "로고파일.webp", "men" | "women"], ...];             // 참가팀
```

로고는 `public/assets/<대회>/` 에 넣고 이렇게 돌립니다.

```bash
node scripts/seed-jeju.mjs https://vikings.ludia0602.workers.dev
```

이미 있는 프로젝트나 팀은 건너뛰고, 로고가 깨진 것만 고쳐 씁니다. 여러 번 돌려도
탈 안 납니다. 배포본이 업로드한 이미지를 제대로 못 돌려주는 상황이면 `data:` URL로
직접 심어버립니다.

새 시딩 스크립트를 만들었다면 `.github/workflows/deploy.yml` 의
`Sync Jeju tournament data` 단계도 그 파일로 바꿔주세요. 참고로 완전히 빈
데이터베이스를 처음 채우는 기본값(제주국제오픈과 참가팀)은 `app/api/storage.ts` 에
들어 있는데, 새 대회를 굳이 거기 넣을 필요는 없습니다.

### 배포

GitHub → **Actions** → **Deploy** → **Run workflow** 에서 브랜치 고르고 실행.
`main` 에 푸시해도 같은 게 돕니다. 터미널 없어도 됩니다.

저장소 시크릿은 Settings → Secrets and variables → Actions 에서 넣습니다.

| 시크릿 | 필수 | 권한 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | 필수 | Account → **Workers Scripts: Edit**, **D1: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | 토큰이 계정 여러 개에 붙어 있을 때만 | |

워크플로는 배포하기 전에 `wrangler whoami` 와 `wrangler d1 list` 결과를 로그에
남깁니다. `D1 binding 'DB' references database ... not found [code: 10181]` 로
실패하면 이 두 출력부터 보세요. **권한이 빠져서가 아니라 토큰이 다른 계정 것이라서
나는 경우가 많습니다.** 실제로 한 번 이걸로 반나절 날렸습니다. 데이터베이스는 ID가
아니라 이름(`vikings-thumbnail-studio-db`)으로 찾으니까, DB를 다시 만들어도 워크플로
고칠 일은 없습니다.

터미널에서 바로 배포할 때는 이렇게 합니다.

```bash
CLOUDFLARE_EXTERNAL_DEPLOY=1 \
CLOUDFLARE_DATABASE_ID=<d1 database id> \
npx vinext deploy
```

### 경기 일정 가져오기

`GET /api/fixtures?division=men&url=<flovus 대회 페이지>`

- 브라우저에서 flovus를 직접 부르면 막힙니다(CORS 헤더가 없어서요). 그래서 서버가
  대신 읽습니다.
- 받아온 건 D1에 10분 넣어두고, 대회 사이트가 안 열리면 마지막으로 받아둔 걸 씁니다.
- `flovus.info` 주소만 받습니다. 아무 주소나 대신 불러주는 통로가 되면 곤란하니까요.
- **조별 예선만 나옵니다.** 결선 대진표는 flovus가 브라우저에서 그려서 HTML에는
  읽을 게 없습니다. 8강부터는 경기명을 직접 쳐야 합니다.
- 파싱은 `app/api/fixtures/parse.ts` 의 순수 함수가 하고 `npm test` 로 검사합니다.
  우리가 원정일 때 점수를 뒤집는 것 같은 것들이요.

### 로컬에서 돌리기

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm test        # 경기 일정 파서
```

몇 가지 알아둘 것:

- 로컬은 miniflare가 D1을 흉내 냅니다. 배포본 데이터와는 아무 상관 없습니다.
- wrangler가 `compatibility_date` 가 미래라고 화를 내면 `wrangler.jsonc` 의 날짜를
  잠깐 낮춰 쓰세요. 대신 그 상태로 커밋하면 안 됩니다.
- 이미지는 D1에 BLOB이 아니라 **base64 텍스트**로 넣습니다. 실제 D1과 로컬
  시뮬레이터가 BLOB을 다르게 돌려줘서, 예전에 배포본에서 올린 로고가 전부 빈 응답이
  된 적이 있습니다. 덕분에 R2 없이도 돌아갑니다.

### 코드 어디에 뭐가 있나

| 파일 | 하는 일 |
| --- | --- |
| `app/thumbnail-studio.tsx` | 화면 전체와 캔버스 렌더링. 좌표는 `VERTICAL_LAYOUTS` 와 `renderWide` 에 |
| `app/api/storage.ts` | D1 스키마와 마이그레이션, 기본 대회 데이터, base64 인코딩 |
| `app/api/fixtures/parse.ts` | flovus HTML을 경기 목록으로 (순수 함수, 테스트 있음) |
| `app/api/fixtures/route.ts` | 일정 가져오기, 캐시, 허용 주소 검사 |
| `app/api/{projects,opponents,thumbnails,uploads,assets}` | 대회, 상대팀, 기록, 이미지 |
| `scripts/seed-jeju.mjs` | 배포된 사이트에 대회와 참가팀 심기 |
| `scripts/resolve-d1.mjs` | 이름으로 D1 데이터베이스 ID 찾기 (배포용) |
| `public/assets/jeju/` | 제주국제오픈 로고 모음 |

레이아웃 건드릴 땐 세 크기를 다 봐야 합니다. 1:1 여백을 고치다가 9:16에서 대회명
둘째 줄이 경기명 위에 올라타 있던 걸 발견했거든요.

### 아직 안 만든 것

- 저장한 썸네일 공유 링크
- 라인업, 선수 소개 템플릿
- 하단 워터마크나 스폰서 줄
- 결선 대진 자동 입력 (flovus가 브라우저에서 그리는 걸 어떻게든 우회해야 함)
- 렌더 스냅샷 테스트. 위에 쓴 9:16 겹침 같은 걸 자동으로 잡으려고요

---

<details>
<summary>Left over from the starter template · 스타터 템플릿에서 딸려온 것들</summary>

This repository began as a [vinext](https://github.com/cloudflare/vinext)
starter. Still present, still unused:

- `app/chatgpt-auth.ts` — Sign in with ChatGPT helpers (`getChatGPTUser()`,
  `requireChatGPTUser(returnTo)`). A starting point if team accounts are ever
  added.
- `db/schema.ts`, `drizzle.config.ts` — Drizzle migrations. The live schema is
  created by `ensureSchema` in `app/api/storage.ts` instead.
- `examples/d1/` — the starter's D1 example surface.
- `.openai/hosting.json` — declares the D1 and R2 bindings. R2 is not enabled.

</details>
