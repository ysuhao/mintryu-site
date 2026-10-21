// Deploys home-worker.mjs as the module of the "mintryu-site" Worker without re-uploading its static
// assets (keep_assets). The assets on Cloudflare are newer than public/ in this repository, so a plain
// `wrangler deploy` from the repository root would replace them; this script never touches them.
//
//   node home-worker/deploy.mjs upload --expect <sha256 of the live module>
//       Uploads a new version (not deployed) and prints its id and preview URL.
//   node home-worker/deploy.mjs deploy <version-id>
//       Sends 100% of traffic to that version and prints the version it replaced (for rollback).
//
// Uses the Wrangler login in %APPDATA%/xdg.config/.wrangler (run `npx wrangler whoami` first to refresh it).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ACCOUNT = '3918c5d3a9dd46283c731825a075d11b';
const SCRIPT = 'mintryu-site';
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}`;
// Paths the Worker must see before static assets. Anything else is served straight from assets, and a
// path with no asset gets the 404 page without reaching the Worker.
const RUN_WORKER_FIRST = [
  '/', '/works/*/', '/presentations/', '/presentations/*/', '/persona-check/',
  '/robots.txt', '/sitemap.xml', '/sitemap-pages.xml', '/llms.txt', '/avatar.jpg', '/avatar.webp',
];
const EXPECTED_BINDINGS = ['ASSETS:assets', 'BLOG_SERVICE:service'];

const config = readFileSync(join(process.env.APPDATA, 'xdg.config/.wrangler/config/default.toml'), 'utf8');
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error('No Wrangler login found');
const headers = { authorization: `Bearer ${token}` };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function call(path, init = {}) {
  const response = await fetch(API + path, { ...init, headers: { ...headers, ...init.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) throw new Error(`${init.method ?? 'GET'} ${path || '/'}: HTTP ${response.status} ${JSON.stringify(body?.errors ?? body)}`);
  return body?.result;
}

async function liveModule() {
  const response = await fetch(API, { headers });
  if (!response.ok) throw new Error(`GET module: HTTP ${response.status}`);
  const form = await response.formData();
  const names = [...form.keys()];
  if (names.length !== 1 || names[0] !== 'home-worker.js') throw new Error(`Unexpected module inventory: ${names.join(', ')}`);
  const part = form.get('home-worker.js');
  return typeof part === 'string' ? Buffer.from(part) : Buffer.from(await part.arrayBuffer());
}

async function upload(expected) {
  const current = sha256(await liveModule());
  if (current !== expected) throw new Error(`The live module changed (sha256 ${current}); review it before deploying over it`);
  const settings = await call('/settings');
  const bindings = settings.bindings.map((binding) => `${binding.name}:${binding.type}`).sort();
  if (JSON.stringify(bindings) !== JSON.stringify(EXPECTED_BINDINGS)) throw new Error(`Unexpected bindings: ${bindings.join(', ')}`);
  const module = readFileSync(new URL('./home-worker.mjs', import.meta.url));
  const metadata = {
    main_module: 'home-worker.js',
    compatibility_date: settings.compatibility_date,
    compatibility_flags: settings.compatibility_flags ?? [],
    bindings: settings.bindings,
    keep_assets: true,
    assets: { config: { not_found_handling: '404-page', run_worker_first: RUN_WORKER_FIRST } },
    annotations: { 'workers/message': 'SEO/GEO: robots, sitemaps, llms.txt, share tags, JSON-LD, avatar' },
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('home-worker.js', new Blob([module], { type: 'application/javascript+module' }), 'home-worker.js');
  const version = await call('/versions', { method: 'POST', body: form });
  const subdomain = (await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/subdomain`, { headers })).json()).result?.subdomain;
  console.log(JSON.stringify({
    version_id: version.id,
    module_sha256: sha256(module),
    preview_url: subdomain ? `https://${version.id.split('-')[0]}-${SCRIPT}.${subdomain}.workers.dev` : null,
    assets: version.resources?.script_runtime?.assets ?? null,
  }, null, 2));
}

async function deploy(versionId) {
  const before = (await call('/deployments')).deployments.sort((a, b) => b.created_on.localeCompare(a.created_on))[0];
  await call('/deployments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }], annotations: { 'workers/message': 'SEO/GEO update' } }),
  });
  console.log(JSON.stringify({ deployed: versionId, replaced: before.versions, rollback: `node home-worker/deploy.mjs deploy ${before.versions[0].version_id}` }, null, 2));
}

const [command, ...args] = process.argv.slice(2);
if (command === 'upload' && args[0] === '--expect' && args[1]) await upload(args[1]);
else if (command === 'deploy' && args[0]) await deploy(args[0]);
else {
  console.error('Usage: node home-worker/deploy.mjs upload --expect <sha256> | deploy <version-id>');
  process.exit(2);
}
