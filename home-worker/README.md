# mintryu-site home worker

`home-worker.mjs` is the module of the `mintryu-site` Worker that serves `mintryu.com` (everything except
`/blog*`, `/admin*`, `/api/blog*` and `/media*`, which belong to `blog-worker/`).

It serves the static site from the `ASSETS` binding and, on the paths listed in `RUN_WORKER_FIRST` in
`deploy.mjs`:

- fills the homepage's latest-post cards from the blog worker (`BLOG_SERVICE` service binding);
- serves `/robots.txt`, `/sitemap.xml` (index of `/sitemap-pages.xml` and `/blog/sitemap.xml`) and `/llms.txt`;
- adds the canonical link, Open Graph / Twitter tags and JSON-LD a static page lacks. Tags a page already
  declares are left alone, and no JSON-LD is added to a page that has its own;
- serves the avatar at `/avatar.jpg` (the same file as `public/avatar.jpg`) and redirects the old
  `/avatar.webp` there.

The Person entity uses `@id` `https://mintryu.com/#mint`, the same id Mintaria and mignet use for their
author.

## Deploy

The static assets on Cloudflare are newer than `public/` in this repository, so do not run
`wrangler deploy` from the repository root: it would replace them and drop this module. Deploy the module
on its own, keeping the uploaded assets:

```sh
npx wrangler whoami                                            # refreshes the login deploy.mjs reads
node home-worker/deploy.mjs upload --expect <sha256-of-live>   # new version, not yet serving traffic
node home-worker/deploy.mjs deploy <version-id>                # prints the rollback command
```

A new path that should get the SEO layer has to be added both to `PAGES` in `home-worker.mjs` and to
`RUN_WORKER_FIRST` in `deploy.mjs`.
