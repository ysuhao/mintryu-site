# mintryu-blog Worker

Source snapshot of the `mintryu-blog` Cloudflare Worker that serves the blog, admin and media routes of mintryu.com
(`/blog*`, `/admin*`, `/api/blog*`, `/media*` — see `wrangler.jsonc`). Everything else on mintryu.com is the static
site in the repository root (`public/`, deployed by the root `wrangler.jsonc`).

Posts, translations and uploaded media live in the `BLOG_DATA` KV namespace, not in this repository.

## Setup

```sh
cd blog-worker
npm ci
cp .dev.vars.example .dev.vars   # local-only values; edit them
npm run cf-typegen               # generates worker-configuration.d.ts (git-ignored)
```

## Check

```sh
npm run typecheck
npx vitest run                   # runs against local Miniflare storage, not production KV
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
```

## Deploy

```sh
npx wrangler login               # or CLOUDFLARE_API_TOKEN in the environment
npm run deploy                   # = wrangler deploy --keep-vars
```

`--keep-vars` keeps dashboard-managed variables. Production `ADMIN_PASSWORD` and `SESSION_SECRET` are Worker secrets;
set or rotate them with `npx wrangler secret put ADMIN_PASSWORD` (never commit them). Don't change the routes or the KV
binding here unless you intend to change production.

## Article sharing metadata

`blogPost()` adds description, canonical, hreflang alternates, Open Graph and Twitter card tags. All URLs are built
from `SITE_ORIGIN` (`https://mintryu.com`), never from the request host. `?lang=` is kept only when that translation
exists; otherwise the Chinese original URL is canonical. Covers are used only when they are `/media/<file>` or an
`https://` URL; otherwise the share image falls back to `/mascots/hachiware-sticker.png` with a `summary` card.
