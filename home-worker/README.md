# mintryu-site home worker

`home-worker.mjs` is the module of the `mintryu-site` Worker that serves `mintryu.com` (everything except
`/blog*`, `/admin*`, `/api/blog*` and `/media*`, which belong to `blog-worker/`).

It serves the static site from the `ASSETS` binding and, on the paths listed in `run_worker_first` in the
root `wrangler.jsonc` (and `RUN_WORKER_FIRST` in `deploy.mjs`):

- fills the homepage's `#latest-posts` and article language switcher from the blog worker (`BLOG_SERVICE`
  service binding);
- serves `/robots.txt`, `/sitemap.xml` (index of `/sitemap-pages.xml` and `/blog/sitemap.xml`) and `/llms.txt`;
- adds the canonical link, Open Graph / Twitter tags and JSON-LD a static page lacks. Tags a page already
  declares are left alone, and no JSON-LD is added to a page that has its own;
- serves the avatar at `/avatar.jpg` (the same file as `public/avatar.jpg`) and redirects the old
  `/avatar.webp` there.

The Person entity uses `@id` `https://mintryu.com/#mint`, the same id Mintaria and mignet use for their
author.

## Deploy

Deploys are manual; Workers Builds is disconnected. `public/` holds the complete live file set and the root
`wrangler.jsonc` the full configuration (this module, `ASSETS`, `BLOG_SERVICE`, `run_worker_first`), so a
full deploy goes from the repository root. An asset upload replaces the whole file set on Cloudflare, so a
file missing from `public/` disappears from `mintryu.com`.

```sh
npx wrangler versions upload --message "…"      # new version + preview URL, not yet serving traffic
# check the preview: every page in https://mintryu.com/sitemap-pages.xml, plus static files
npx wrangler versions deploy <version-id>@100%  # rollback: npx wrangler rollback <previous-version-id>
```

To change only this module and keep the uploaded assets, `deploy.mjs` still works:

```sh
npx wrangler whoami                                            # refreshes the login deploy.mjs reads
node home-worker/deploy.mjs upload --expect <sha256-of-live>   # new version, not yet serving traffic
node home-worker/deploy.mjs deploy <version-id>                # prints the rollback command
```

A new path that should get the SEO layer has to be added to `PAGES` in `home-worker.mjs` and to both
`run_worker_first` in `wrangler.jsonc` and `RUN_WORKER_FIRST` in `deploy.mjs`.
