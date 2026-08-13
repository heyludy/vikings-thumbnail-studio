# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Public deployment

The public production site runs on Cloudflare Workers with D1-backed storage:

<https://vikings.ludia0602.workers.dev>

Deploy with the account's D1 database binding:

```bash
CLOUDFLARE_EXTERNAL_DEPLOY=1 \
CLOUDFLARE_DATABASE_ID=e0e1a2d0-9b02-4018-adc0-f9a6934c696a \
npx vinext deploy
```

`.github/workflows/deploy.yml` runs the same command from GitHub Actions, so a
deploy can also be triggered from a phone: push to `main`, or run the **Deploy**
workflow manually and pick a branch. It needs a `CLOUDFLARE_API_TOKEN`
repository secret with Workers Scripts edit and D1 edit permissions
(`CLOUDFLARE_ACCOUNT_ID` is only required when the token can reach more than one
account). After deploying it syncs the tournament data described below.

Uploaded images are stored in D1 when an R2 bucket is not configured, so the
public deployment works without enabling R2 billing. Image bytes are kept as
base64 text because D1 returns BLOB columns differently depending on the
runtime, which made uploaded logos come back as empty responses in production.

## Tournament seeding

A fresh database is bootstrapped with the `2026 제주국제오픈` project and its
participating teams (logos in `public/assets/jeju/`, sourced from
<https://flovus.info/competitions/6>). To register the same project and teams on
an already-deployed site, whose database is no longer empty:

```bash
node scripts/seed-jeju.mjs https://vikings.ludia0602.workers.dev
```

The script skips entries that already exist with a working logo, and falls back
to inlined `data:` URLs when the deployment cannot serve uploaded images yet.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
