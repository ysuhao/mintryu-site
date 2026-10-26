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

## Post index

Public pages (`/blog`, posts, RSS, sitemap, `/api/blog/posts`) read every post from the single KV key `index:posts`
instead of listing `post:*` keys, because the free plan allows only 1,000 KV lists a day and each list used to cost
one per page view. Admin saves, renames and deletes rewrite the index; it expires after an hour and the next request
rebuilds it from `post:*`, so a post edited straight in KV appears within an hour. The admin post list still scans
`post:*` directly.

## Article sharing metadata

`blogPost()` adds description, canonical, hreflang alternates, Open Graph and Twitter card tags. All URLs are built
from `SITE_ORIGIN` (`https://mintryu.com`), never from the request host. `?lang=` is kept only when that translation
exists; otherwise the Chinese original URL is canonical.

## Search and AI discovery

- Posts carry `BlogPosting` + `BreadcrumbList` JSON-LD (author `https://mintryu.com/#mint`, translations linked
  with `workTranslation` / `translationOfWork`); the index carries `Blog` JSON-LD, localized title and
  description, and hreflang alternates for all four languages.
- `/blog/sitemap.xml` lists the index and every published post in every available language, with hreflang
  alternates. The root `/sitemap.xml` (home worker) points to it.
- `/blog/rss.xml` (`?lang=` supported) and `/blog/<slug>.md` (Markdown copy with a `Link: rel="canonical"` header
  back to the HTML page).
- `/admin`, `/api/blog/*` and error pages are `noindex`.
- A `#` heading inside a post renders as `h2`, so the title stays the page's only `h1`. An excerpt shorter than
  30 characters is extended with the opening of the body for the meta description.

`src/index.ts` was rebuilt from the deployed bundle on 2026-10-21 (it compiled back to the identical bundle),
so this directory matches production again. Covers are used only when they are `/media/<file>` or an
`https://` URL; otherwise the share image falls back to `/mascots/hachiware-sticker.png` with a `summary` card.
