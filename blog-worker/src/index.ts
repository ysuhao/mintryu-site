type PostStatus = 'draft' | 'published';
type Language = 'zh-CN' | 'zh-TW' | 'ko' | 'en';
type TranslationLanguage = Exclude<Language, 'zh-CN'>;

type PostTranslation = {
  title: string;
  excerpt: string;
  content: string;
};

type PostTranslations = Partial<Record<TranslationLanguage, PostTranslation>>;

type Post = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  translations?: PostTranslations;
};

const LANGUAGE_OPTIONS: Array<{ code: Language; label: string; shortLabel: string }> = [
  { code: 'zh-CN', label: '简体中文', shortLabel: '简中' },
  { code: 'zh-TW', label: '繁體中文', shortLabel: '繁中' },
  { code: 'ko', label: '한국어', shortLabel: '한국어' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
];

// Share URLs are always built from the production origin, never from the request Host.
const SITE_ORIGIN = 'https://mintryu.com';
const SITE_NAME = 'Mint';
const SHARE_FALLBACK_IMAGE = { path: '/mascots/hachiware-sticker.png', type: 'image/png', width: 598, height: 640 };
const OG_LOCALES: Record<Language, string> = { 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', ko: 'ko_KR', en: 'en_US' };

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: HTML_HEADERS });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char] ?? char);
}

function safeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function normalizeLanguage(value: string | null | undefined): Language {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'zh-tw':
    case 'zh-hant':
    case 'zh-hant-tw':
      return 'zh-TW';
    case 'ko':
    case 'ko-kr':
    case 'kr':
      return 'ko';
    case 'en':
    case 'en-us':
    case 'en-gb':
      return 'en';
    default:
      return 'zh-CN';
  }
}

function languageHref(path: string, language: Language): string {
  return language === 'zh-CN' ? path : `${path}?lang=${encodeURIComponent(language)}`;
}

function localizedPost(post: Post, language: Language): Post {
  const translation = language === 'zh-CN' ? undefined : post.translations?.[language];
  return translation ? { ...post, ...translation } : post;
}

function sanitizeTranslations(value: unknown): PostTranslations | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const translations: PostTranslations = {};
  for (const language of ['zh-TW', 'ko', 'en'] as const) {
    const candidate = input[language];
    if (!candidate || typeof candidate !== 'object') continue;
    const item = candidate as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 160) : '';
    const excerpt = typeof item.excerpt === 'string' ? item.excerpt.trim().slice(0, 500) : '';
    const content = typeof item.content === 'string' ? item.content.slice(0, 100_000) : '';
    if (title && content) translations[language] = { title, excerpt, content };
  }
  return Object.keys(translations).length ? translations : undefined;
}

function markdown(source: string): string {
  const text = source.replace(/\r\n/g, '\n').trim();
  const segments: Array<{ type: 'md' | 'code'; lang?: string; value: string }> = [];
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text))) {
    if (match.index > last) segments.push({ type: 'md', value: text.slice(last, match.index) });
    segments.push({ type: 'code', lang: match[1], value: match[2].replace(/\n$/, '') });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: 'md', value: text.slice(last) });
  return segments.map((segment) => {
    if (segment.type === 'code') {
      const lang = escapeHtml(segment.lang || '');
      return `<pre class="code-block"${lang ? ` data-lang="${lang}"` : ''}><code>${escapeHtml(segment.value)}</code></pre>`;
    }
    return markdownBlocks(segment.value);
  }).join('\n');
}

function markdownBlocks(source: string): string {
  const safe = escapeHtml(source.trim());
  if (!safe) return '';
  return safe.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n').filter((line, index, all) => !(index === 0 && line === '') && !(index === all.length - 1 && line === ''));
    if (!lines.length) return '';
    if (lines.length === 1 && /^---+$/.test(lines[0])) return '<hr>';
    if (lines.every((line) => /^[-*] /.test(line))) {
      return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`).join('')}</ul>`;
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      return `<ol>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
    }
    if (lines.every((line) => /^&gt; /.test(line))) {
      return `<blockquote>${lines.map((line) => inlineMarkdown(line.slice(5))).join('<br>')}</blockquote>`;
    }
    const heading = lines[0]?.match(/^(#{1,3})\s+(.+)$/);
    if (heading && lines.length === 1) return `<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`;
    const html = lines.map(inlineMarkdown).join('<br>');
    if (/^<figure[\s\S]*<\/figure>$/.test(html)) return html;
    return `<p>${html}</p>`;
  }).join('\n');
}

function inlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)]\((\/media\/[a-zA-Z0-9._-]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_all, alt, src, caption) => {
      const img = `<img class="article-image" src="${src}" alt="${alt}" loading="lazy">`;
      return caption
        ? `<figure class="article-figure">${img}<figcaption>${caption}</figcaption></figure>`
        : `<figure class="article-figure">${img}</figure>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
}

async function listPosts(env: Env, includeDrafts = false): Promise<Post[]> {
  const listed = await env.BLOG_DATA.list({ prefix: 'post:' });
  const posts = (await Promise.all(listed.keys.map((key) => env.BLOG_DATA.get<Post>(key.name, 'json'))))
    .filter((post): post is Post => Boolean(post));
  return posts
    .filter((post) => includeDrafts || post.status === 'published')
    .sort((a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt));
}

async function getPost(env: Env, slug: string): Promise<Post | null> {
  return env.BLOG_DATA.get<Post>(`post:${slug}`, 'json');
}

function base64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function equalSecret(a: string, b: string): Promise<boolean> {
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(a)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(b)),
  ]);
  const aa = new Uint8Array(aHash);
  const bb = new Uint8Array(bHash);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < aa.length; i += 1) diff |= aa[i] ^ (bb[i] ?? 0);
  return diff === 0;
}

async function createSession(env: Env): Promise<string> {
  const payload = `${Date.now() + 8 * 60 * 60 * 1000}.${crypto.randomUUID()}`;
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}

async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get('cookie') ?? '';
  const token = cookie.match(/(?:^|;\s*)blog_session=([^;]+)/)?.[1];
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || Number(parts[0]) < Date.now()) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return equalSecret(parts[2], await hmac(env.SESSION_SECRET, payload));
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === null || origin === new URL(request.url).origin;
}

function pageShell(title: string, content: string, backHref = '/blog', backLabel = '全部文章 ↗'): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet"><style>
  :root{--ink:#221c39;--muted:#6b6286;--blue:#35ccf1;--blue-deep:#0096c7;--pink:#ff6fbd;--pink-deep:#e0449e;--paper:#fbfbff;--line:rgba(48,52,92,.14);--r-lg:20px;--font-display:"Space Grotesk","Noto Sans SC","PingFang SC",ui-sans-serif,sans-serif;--font-body:"Noto Sans SC","PingFang SC",ui-sans-serif,-apple-system,BlinkMacSystemFont,sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(680px 320px at 92% -6%,rgba(53,204,241,.12),transparent 68%),radial-gradient(640px 380px at 0% 108%,rgba(255,111,189,.1),transparent 70%),var(--paper);color:var(--ink);font-family:var(--font-body);-webkit-font-smoothing:antialiased}a{color:inherit}.wrap{width:min(760px,calc(100% - 40px));margin:auto;padding:0 0 80px}.nav{min-height:76px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed var(--line)}.brand{font-family:var(--font-display);font-weight:700;font-size:21px;letter-spacing:-.03em;text-decoration:none}.brand i{color:var(--pink);font-style:normal}.pill{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:8px 15px;text-decoration:none;font-size:12px;font-weight:700;background:rgba(255,255,255,.6);transition:background .2s ease,transform .2s ease}.pill:hover{background:#fff;transform:translateY(-1px)}header{padding:74px 0 56px}.kicker{color:var(--blue-deep);font-size:12px;font-weight:700;letter-spacing:.24em}h1.pagetitle{margin:14px 0 0;font-family:var(--font-display);font-size:clamp(58px,9vw,104px);line-height:.92;letter-spacing:-.055em;font-weight:700}h1.pagetitle .dot{color:var(--pink)}.lede{max-width:560px;margin:26px 0 0;color:var(--muted);font-size:16px;line-height:1.8}.list{border-top:1px solid var(--line)}.row{display:grid;grid-template-columns:104px 1fr auto 16px;gap:26px;align-items:center;padding:26px 6px;border-bottom:1px solid var(--line);text-decoration:none;border-radius:8px;transition:background .2s ease}.row:hover{background:rgba(255,255,255,.7)}.row time{color:var(--muted);font:600 11.5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}.row h2{margin:0 0 8px;font-family:var(--font-display);font-size:clamp(21px,2.6vw,28px);letter-spacing:-.03em;line-height:1.25;font-weight:700}.row p{margin:0;color:var(--muted);font-size:13.5px;line-height:1.7}.thumb{width:150px;aspect-ratio:16/10;object-fit:cover;border-radius:14px;border:1px solid rgba(255,255,255,.85);box-shadow:0 10px 26px rgba(43,39,75,.12)}.thumb-fallback{display:block;background:linear-gradient(135deg,rgba(53,204,241,.35),rgba(255,111,189,.3));border:1px solid var(--line)}.go{color:var(--blue-deep);font-size:17px}.post-head{padding:64px 0 40px}.post-head .meta{color:var(--muted);font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em}.post-head h1{margin:18px 0 0;font-family:var(--font-display);font-size:clamp(34px,5.4vw,52px);line-height:1.18;letter-spacing:-.035em;font-weight:700}.excerpt{margin:22px 0 0;padding-left:16px;border-left:3px solid var(--pink);color:var(--muted);font-size:15px;line-height:1.85}.cover{width:100%;aspect-ratio:16/8;object-fit:cover;border-radius:var(--r-lg);margin:0 0 8px;border:1px solid rgba(255,255,255,.8);box-shadow:0 18px 46px rgba(43,39,75,.12)}.article{font-size:17px;line-height:2}.article p,.article li{font-size:17px;line-height:2}.article p{margin:1.5em 0}.article ul{margin:1.5em 0;padding-left:1.4em}.article h1,.article h2{margin:2.2em 0 .6em;font-family:var(--font-display);font-size:26px;letter-spacing:-.025em;line-height:1.35}.article h1::before,.article h2::before{content:"";display:inline-block;width:9px;height:9px;margin-right:10px;border-radius:3px;background:linear-gradient(135deg,var(--blue),var(--pink))}.article h3{margin:2em 0 .5em;font-family:var(--font-display);font-size:20px;letter-spacing:-.02em}.article strong{font-weight:700}.article code{background:#f0edf8;padding:2px 7px;border-radius:6px;font-size:.88em}.article a{color:var(--blue-deep)}.article-image{display:block;width:100%;height:auto;margin:2em 0;border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.8);box-shadow:0 18px 46px rgba(43,39,75,.12)}.endmark{margin:56px 0 0;text-align:center;color:var(--pink);font-family:var(--font-display);font-size:22px;letter-spacing:.3em}.foot{display:flex;justify-content:space-between;gap:16px;margin-top:34px;padding-top:24px;border-top:1px dashed var(--line);color:#a79ec0;font-size:11px;letter-spacing:.12em}.foot a{text-decoration:none;font-weight:700;color:var(--muted)}.foot a:hover{color:var(--blue-deep)}.empty{text-align:center;padding:70px 20px;background:rgba(255,255,255,.7);border:1px solid var(--line);border-radius:var(--r-lg);margin-top:40px}@media(max-width:640px){.wrap{width:calc(100% - 30px)}header{padding:56px 0 44px}.row{grid-template-columns:1fr 22px;gap:8px}.row time,.thumb{display:none}.article,.article p,.article li{font-size:16px}}</style></head><body><div class="wrap"><nav class="nav"><a class="brand" href="/">Mint<i>.</i></a><a class="pill" href="${backHref}">${backLabel}</a></nav>${content}</div></body></html>`;
}

function languageSwitcher(path: string, language: Language): string {
  const options = LANGUAGE_OPTIONS.map(({ code, label, shortLabel }) => {
    const current = code === language ? ' aria-current="page"' : '';
    return `<a class="language-option${current ? ' active' : ''}" href="${escapeHtml(languageHref(path, code))}" title="${escapeHtml(label)}">${escapeHtml(shortLabel)}</a>`;
  }).join('');
  return `<div class="language-switcher" aria-label="文章语言切换"><span class="language-label">文章语言</span>${options}</div>`;
}

function pageShellComic(title: string, content: string, backHref = '/blog', backLabel = '全部文章 ↗', language: Language = 'zh-CN', languagePath = '/blog', head = ''): string {
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>${head}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet"><style>
  :root{--paper:#fff8e9;--white:#fffdf8;--ink:#182449;--muted:#59647f;--blue:#9bd5f3;--blue-deep:#4b86bd;--yellow:#ffd866;--pink:#f6b0bb;--pink-deep:#c85f78;--line:#182449;--shadow:7px 8px 0 var(--ink);--display:"Nunito","Noto Sans SC","PingFang SC",sans-serif;--body:"Noto Sans SC","PingFang SC",sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;color:var(--ink);background:radial-gradient(700px 420px at 95% -8%,rgba(155,213,243,.45),transparent 70%),radial-gradient(620px 420px at -8% 100%,rgba(246,176,187,.34),transparent 70%),linear-gradient(135deg,#fffdf7,var(--paper) 58%,#fff1d6);font-family:var(--body);-webkit-font-smoothing:antialiased}body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.34;background-image:radial-gradient(rgba(24,36,73,.17) .7px,transparent .8px);background-size:18px 18px;mask-image:linear-gradient(to bottom,black,transparent 88%)}a{color:inherit}:focus-visible{outline:3px solid var(--pink-deep);outline-offset:4px}.wrap{width:min(900px,calc(100% - 36px));margin:auto;padding-bottom:80px}.nav{display:flex;justify-content:space-between;align-items:center;gap:14px;min-height:82px;border-bottom:2px solid var(--line)}.nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.language-switcher{display:inline-flex;align-items:center;gap:2px;padding:3px;border:2px solid var(--line);border-radius:999px;background:rgba(255,253,248,.9);box-shadow:3px 3px 0 rgba(24,36,73,.18)}.language-label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.language-option{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;text-decoration:none;white-space:nowrap}.language-option:hover,.language-option.active{background:var(--yellow);color:var(--ink)}.brand{display:inline-flex;align-items:center;gap:8px;font:900 22px/1 var(--display);letter-spacing:-.04em;text-decoration:none}.brand i{display:inline-block;width:11px;height:11px;border:2px solid var(--ink);border-radius:50%;background:var(--pink);font-size:0}.pill{display:inline-flex;align-items:center;border:2px solid var(--line);border-radius:999px;padding:9px 13px;text-decoration:none;font-size:11px;font-weight:900;background:var(--white);box-shadow:3px 3px 0 rgba(24,36,73,.18);transition:transform .18s ease,background .18s ease}.pill:hover{background:var(--yellow);transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}header{position:relative;padding:78px 0 65px}header::before{content:"";position:absolute;z-index:-1;right:18px;top:53px;width:180px;height:180px;border-radius:50%;background:rgba(155,213,243,.38)}header::after{content:"✦";position:absolute;right:36px;top:62px;color:var(--pink-deep);font-size:28px;transform:rotate(12deg)}.kicker{display:flex;align-items:center;gap:9px;margin:0;color:var(--pink-deep);font:900 11px/1 var(--display);letter-spacing:.18em;text-transform:uppercase}.kicker::before{content:"✦";font-size:16px}h1.pagetitle{margin:16px 0 18px;font:900 clamp(58px,9vw,112px)/.88 var(--display);letter-spacing:-.08em}h1.pagetitle .dot{color:var(--blue-deep)}.lede{max-width:620px;margin:0;color:var(--muted);font-size:16px;line-height:1.9}.list{display:grid;gap:15px}.row{display:grid;grid-template-columns:112px minmax(0,1fr) 150px 18px;gap:22px;align-items:center;padding:21px;border:3px solid var(--ink);border-radius:22px;background:rgba(255,253,248,.88);box-shadow:4px 5px 0 rgba(24,36,73,.2);text-decoration:none;transition:transform .18s ease,box-shadow .18s ease}.row:nth-child(2n){background:rgba(239,249,255,.92);transform:rotate(.35deg)}.row:hover{transform:translate(-2px,-3px) rotate(-.3deg);box-shadow:7px 8px 0 var(--ink)}.row time{display:inline-flex;width:max-content;padding:8px 10px;border:2px solid var(--ink);border-radius:10px;background:var(--yellow);font:900 10px var(--display)}.row:nth-child(2n) time{background:var(--pink)}.row h2{margin:0 0 8px;font-size:clamp(20px,2.8vw,29px);line-height:1.3;letter-spacing:-.04em}.row p{margin:0;color:var(--muted);font-size:12.5px;line-height:1.75}.thumb{width:150px;aspect-ratio:16/10;object-fit:cover;border:2px solid var(--ink);border-radius:15px;box-shadow:3px 4px 0 rgba(24,36,73,.16)}.thumb-fallback{display:block;background:linear-gradient(145deg,var(--blue),var(--pink));border:2px solid var(--ink)}.go{font-size:18px}.post-head{padding:65px 0 38px}.post-head .meta{color:var(--pink-deep);font:900 11px var(--display);letter-spacing:.08em}.post-head h1{max-width:780px;margin:17px 0 0;font:900 clamp(36px,6vw,62px)/1.12 var(--display);letter-spacing:-.055em}.excerpt{max-width:700px;margin:22px 0 0;padding:13px 16px;border-left:4px solid var(--pink-deep);border-radius:0 12px 12px 0;background:rgba(255,253,248,.7);color:var(--muted);font-size:15px;line-height:1.85}.cover{width:100%;aspect-ratio:16/8;object-fit:cover;margin:0 0 10px;border:3px solid var(--ink);border-radius:25px;box-shadow:var(--shadow)}.article{font-size:17px;line-height:2}.article p,.article li{font-size:17px;line-height:2}.article p{margin:1.5em 0}.article ul{margin:1.5em 0;padding-left:1.4em}.article h1,.article h2{margin:2.2em 0 .6em;font:900 27px/1.35 var(--display);letter-spacing:-.03em}.article h1::before,.article h2::before{content:"";display:inline-block;width:10px;height:10px;margin-right:10px;border:2px solid var(--ink);border-radius:4px;background:var(--yellow)}.article h3{margin:2em 0 .5em;font:900 21px var(--display)}.article strong{font-weight:900}.article code{padding:2px 7px;border:1px solid rgba(24,36,73,.2);border-radius:6px;background:var(--paper);font-size:.88em}.article a{color:var(--blue-deep)}.article-figure{margin:2em 0}.article-image{display:block;width:100%;height:auto;border:3px solid var(--ink);border-radius:22px;box-shadow:5px 6px 0 rgba(24,36,73,.16)}.article-figure figcaption{margin-top:10px;color:var(--muted);font-size:13px;line-height:1.7}.article blockquote{margin:1.6em 0;padding:16px 18px;border:2px solid var(--ink);border-left:6px solid var(--pink-deep);border-radius:16px;background:rgba(255,253,248,.88);color:var(--muted);font-size:16px;line-height:1.85}.article pre.code-block{overflow-x:auto;margin:1.6em 0;padding:16px 18px;border:2px solid var(--ink);border-radius:16px;background:var(--paper);box-shadow:4px 5px 0 rgba(24,36,73,.14);font-size:13.5px;line-height:1.65}.article pre.code-block code{padding:0;border:0;background:transparent;font-size:13.5px;white-space:pre}.article hr{border:0;border-top:2px dashed rgba(24,36,73,.35);margin:2.4em 0}.article ol{margin:1.5em 0;padding-left:1.4em}.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.endmark{margin:56px 0 0;text-align:center;color:var(--pink-deep);font:900 22px var(--display);letter-spacing:.3em}.post-head{position:relative}.post-sticker{position:absolute;right:-8px;top:18px;width:92px;filter:drop-shadow(3px 4px 0 rgba(24,36,73,.16));transform:rotate(8deg);pointer-events:none}.foot{display:flex;justify-content:space-between;gap:16px;margin-top:34px;padding-top:24px;border-top:2px dashed rgba(24,36,73,.4);color:var(--muted);font:900 10px var(--display);letter-spacing:.12em}.foot a{text-decoration:none}.foot a:hover{color:var(--blue-deep)}.empty{text-align:center;padding:70px 20px;border:3px solid var(--ink);border-radius:25px;background:var(--white);box-shadow:var(--shadow)}@media(max-width:760px){.wrap{width:calc(100% - 28px)}header{padding:58px 0 50px}.row{grid-template-columns:1fr 18px;gap:10px;padding:17px}.row time,.thumb{display:none}.article,.article p,.article li{font-size:16px}.post-sticker{width:64px;right:-4px;top:8px}.nav{align-items:flex-start;padding:14px 0}.nav-actions{width:100%;justify-content:space-between}.language-option{padding-inline:6px}.foot{flex-direction:column}}
  </style></head><body><div class="wrap"><nav class="nav"><a class="brand" href="${escapeHtml(languageHref('/', language))}">Mint<i>.</i></a><div class="nav-actions"><a class="pill" href="${backHref}">${backLabel}</a>${languageSwitcher(languagePath, language)}</div></nav>${content}</div></body></html>`;
}

function blogIndex(posts: Post[], language: Language = 'zh-CN'): string {
  const rows = posts.length ? posts.map((post) => {
    const view = localizedPost(post, language);
    const iso = (post.publishedAt ?? post.updatedAt).slice(0, 10);
    const disp = iso.replaceAll('-', '.');
    const thumb = post.coverUrl
      ? `<img class="thumb" src="${escapeHtml(post.coverUrl)}" alt="" loading="lazy">`
      : '<span class="thumb thumb-fallback" aria-hidden="true"></span>';
    return `<article><a class="row" href="${escapeHtml(languageHref(`/blog/${encodeURIComponent(post.slug)}`, language))}"><time datetime="${escapeHtml(iso)}">${escapeHtml(disp)}</time><div><h2>${escapeHtml(view.title)}</h2><p>${escapeHtml(view.excerpt)}</p></div>${thumb}<span class="go">↗</span></a></article>`;
  }).join('') : '<div class="empty"><h2>第一篇文章正在路上</h2><p>稍后再来看看。</p></div>';
  return pageShellComic('博客 · Mint', `<header><div class="kicker">NOTES / WORK / PROCESS</div><h1 class="pagetitle">博客<span class="dot">.</span></h1><p class="lede">关于代码、音乐、摄影，以及正在发生的生活。这里是个人站的一页，不急着把每件事都变成产品。</p></header><main class="list">${rows}</main><div class="foot"><span>© 2026 MINT RYU</span><span>CODE / SOUND / LIGHT</span></div>`, languageHref('/', language), '返回主页 ↗', language, '/blog');
}

function stripLeadingTitle(content: string, title: string): string {
  const match = content.match(/^\s*#\s+(.+?)\s*(\r?\n|$)/);
  return match && match[1].trim() === title.trim() ? content.slice(match[0].length) : content;
}

// Language the rendered text is really in: a missing translation falls back to the zh-CN original.
function contentLanguage(post: Post, language: Language): Language {
  return language !== 'zh-CN' && post.translations?.[language] ? language : 'zh-CN';
}

function absoluteShareImage(coverUrl: string): string | null {
  const value = (coverUrl ?? '').trim();
  if (/^\/media\/[a-zA-Z0-9._-]+$/.test(value)) return `${SITE_ORIGIN}${value}`;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function plainSummary(post: Post): string {
  const source = post.excerpt.trim() || stripLeadingTitle(post.content, post.title)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}|>|[-*]|\d+\.)\s+/gm, '')
    .replace(/[*`]+/g, '');
  const text = source.replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 159).trimEnd()}…` : text;
}

function postShareMeta(post: Post, language: Language): string {
  const actual = contentLanguage(post, language);
  const view = localizedPost(post, actual);
  const postPath = `/blog/${encodeURIComponent(post.slug)}`;
  const canonical = `${SITE_ORIGIN}${languageHref(postPath, actual)}`;
  const description = plainSummary(view) || '关于代码、音乐、摄影，以及正在发生的生活。';
  const cover = absoluteShareImage(view.coverUrl);
  const image = cover ?? `${SITE_ORIGIN}${SHARE_FALLBACK_IMAGE.path}`;
  const published = Date.parse(post.publishedAt ?? '');
  const alternates = LANGUAGE_OPTIONS
    .filter(({ code }) => code === 'zh-CN' || post.translations?.[code])
    .map(({ code }) => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(`${SITE_ORIGIN}${languageHref(postPath, code)}`)}">`)
    .join('');
  const tags: Array<[string, string, string]> = [
    ['name', 'description', description],
    ['property', 'og:type', 'article'],
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:locale', OG_LOCALES[actual]],
    ['property', 'og:title', view.title],
    ['property', 'og:description', description],
    ['property', 'og:url', canonical],
    ['property', 'og:image', image],
    ...(cover ? [] : [
      ['property', 'og:image:type', SHARE_FALLBACK_IMAGE.type],
      ['property', 'og:image:width', String(SHARE_FALLBACK_IMAGE.width)],
      ['property', 'og:image:height', String(SHARE_FALLBACK_IMAGE.height)],
    ] as Array<[string, string, string]>),
    ['property', 'og:image:alt', view.title],
    ...(Number.isFinite(published) ? [['property', 'article:published_time', new Date(published).toISOString()]] as Array<[string, string, string]> : []),
    ['name', 'twitter:card', cover ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', view.title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image],
    ['name', 'twitter:image:alt', view.title],
  ];
  return `<meta name="theme-color" content="#fff8e9"><link rel="canonical" href="${escapeHtml(canonical)}">${alternates}<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${SITE_ORIGIN}${postPath}`)}">${tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}">`).join('')}`;
}

function blogPost(post: Post, language: Language = 'zh-CN'): string {
  const view = localizedPost(post, language);
  const iso = (view.publishedAt ?? view.updatedAt).slice(0, 10);
  const disp = iso.replaceAll('-', '.');
  const postPath = `/blog/${encodeURIComponent(view.slug)}`;
  const blogPath = languageHref('/blog', language);
  const homePath = languageHref('/', language);
  return pageShellComic(`${view.title} · Mint`, `<header class="post-head"><img class="post-sticker" src="/mascots/hachiware-sticker.png" alt="" width="92" height="92"><div class="meta"><time datetime="${escapeHtml(iso)}">${escapeHtml(disp)}</time></div><h1>${escapeHtml(view.title)}</h1>${view.excerpt ? `<p class="excerpt">${escapeHtml(view.excerpt)}</p>` : ''}</header>${view.coverUrl ? `<img class="cover" src="${escapeHtml(view.coverUrl)}" alt="">` : ''}<article class="article">${markdown(stripLeadingTitle(view.content, view.title))}</article><div class="cta-row"><a class="pill" href="${escapeHtml(blogPath)}">全部文章 ↗</a><a class="pill" href="${escapeHtml(homePath)}">返回主页 ↗</a></div><div class="endmark">· · ·</div><div class="foot"><span>© 2026 MINT RYU</span><a href="${escapeHtml(blogPath)}">← 返回文章列表</a></div>`, blogPath, '全部文章 ↗', language, postPath, postShareMeta(post, language));
}

function adminPage(): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>博客后台</title><style>
  :root{--ink:#241448;--pink:#ff71ce;--cyan:#01cdfe;--bg:#f5f2fb}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif}.app{width:min(1100px,calc(100% - 28px));margin:32px auto}.top{display:flex;justify-content:space-between;align-items:center}.grid{display:grid;grid-template-columns:280px 1fr;gap:20px;margin-top:22px}.panel{background:white;border-radius:22px;padding:22px;box-shadow:0 8px 28px rgba(36,20,72,.08)}input,textarea,select,button{font:inherit}input,textarea,select{width:100%;border:1px solid #d8d1e8;border-radius:12px;padding:12px;margin:6px 0 14px;background:white}textarea{min-height:300px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}button{border:0;border-radius:999px;padding:11px 18px;font-weight:800;cursor:pointer;background:var(--ink);color:white}.secondary{background:#ece7f6;color:var(--ink)}.danger{background:#b3261e}.post{padding:12px;border-radius:12px;cursor:pointer;margin:6px 0}.post:hover{background:#f3effa}.muted{color:#7b718d;font-size:13px}.login{max-width:420px;margin:13vh auto}.hide{display:none}.message{min-height:22px;color:#7a2dbb}@media(max-width:760px){.grid{grid-template-columns:1fr}.row{grid-template-columns:1fr}}
  </style></head><body><div id="login" class="login panel"><h1>博客后台</h1><p class="muted">登录后即可写文章、上传封面并发布。</p><input id="password" type="password" placeholder="后台密码"><button id="loginBtn">登录</button><p id="loginMsg" class="message"></p></div><div id="app" class="app hide"><div class="top"><h1>博客后台</h1><div><a href="/blog" target="_blank">查看博客</a> · <button id="logoutBtn" class="secondary">退出</button></div></div><div class="grid"><aside class="panel"><button id="newBtn">＋ 新文章</button><div id="posts"></div></aside><main class="panel"><div class="row"><label>标题<input id="title"></label><label>网址名称<input id="slug" placeholder="my-first-post"></label></div><label>摘要<textarea id="excerpt" style="min-height:90px"></textarea></label><label>封面图<input id="cover" type="file" accept="image/*"><input id="coverUrl" placeholder="上传后自动填写，也可粘贴图片网址"></label><label>正文（支持 Markdown）<textarea id="content" placeholder="# 标题\n\n正文..."></textarea></label><div class="row"><label>状态<select id="status"><option value="draft">草稿</option><option value="published">已发布</option></select></label><div><button id="saveBtn">保存文章</button> <button id="deleteBtn" class="danger">删除</button></div></div><p id="msg" class="message"></p></main></div></div><script>
  const $=id=>document.getElementById(id);let current='';let cache=[];
  async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{...(opts.headers||{}),'content-type':opts.body instanceof Blob?opts.body.type:'application/json'}});if(r.status===401)throw new Error('AUTH');const data=await r.json();if(!r.ok)throw new Error(data.error||'请求失败');return data}
  function blank(){current='';['title','slug','excerpt','content','coverUrl'].forEach(id=>$(id).value='');$('status').value='draft';$('msg').textContent='新文章'}
  function edit(p){current=p.slug;$('title').value=p.title;$('slug').value=p.slug;$('excerpt').value=p.excerpt;$('content').value=p.content;$('coverUrl').value=p.coverUrl||'';$('status').value=p.status;$('msg').textContent='正在编辑 '+p.title}
  async function load(){try{cache=(await api('/api/blog/admin/posts')).posts;$('login').classList.add('hide');$('app').classList.remove('hide');$('posts').innerHTML=cache.map((p,i)=>'<div class="post" data-i="'+i+'"><b>'+escapeText(p.title)+'</b><div class="muted">'+p.status+' · '+p.updatedAt.slice(0,10)+'</div></div>').join('')||'<p class="muted">还没有文章</p>';$('posts').querySelectorAll('.post').forEach(el=>el.onclick=()=>edit(cache[Number(el.dataset.i)]))}catch(e){if(e.message==='AUTH'){$('login').classList.remove('hide');$('app').classList.add('hide')}}}
  function escapeText(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
  $('loginBtn').onclick=async()=>{try{await api('/api/blog/login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await load()}catch(e){$('loginMsg').textContent='密码不正确'}};
  $('logoutBtn').onclick=async()=>{await api('/api/blog/logout',{method:'POST',body:'{}'});location.reload()};$('newBtn').onclick=blank;
  $('title').oninput=()=>{if(!current)$('slug').value=$('title').value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g,'-').replace(/^-+|-+$/g,'')};
  $('cover').onchange=async()=>{const f=$('cover').files[0];if(!f)return;if(f.size>5*1024*1024){$('msg').textContent='图片不能超过 5MB';return}try{$('msg').textContent='正在上传图片...';const r=await fetch('/api/blog/admin/upload',{method:'POST',headers:{'content-type':f.type,'x-filename':encodeURIComponent(f.name)},body:f});const d=await r.json();if(!r.ok)throw new Error(d.error);$('coverUrl').value=d.url;$('msg').textContent='图片上传完成'}catch(e){$('msg').textContent=e.message}};
  $('saveBtn').onclick=async()=>{try{const body={title:$('title').value,slug:$('slug').value,oldSlug:current,excerpt:$('excerpt').value,content:$('content').value,coverUrl:$('coverUrl').value,status:$('status').value};const d=await api('/api/blog/admin/posts',{method:'POST',body:JSON.stringify(body)});current=d.post.slug;$('msg').textContent='保存成功';await load();edit(d.post)}catch(e){$('msg').textContent=e.message}};
  $('deleteBtn').onclick=async()=>{if(!current||!confirm('确定删除这篇文章？'))return;try{await api('/api/blog/admin/posts/'+encodeURIComponent(current),{method:'DELETE',body:'{}'});blank();await load()}catch(e){$('msg').textContent=e.message}};load();
  </script></body></html>`;
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (!sameOrigin(request) && request.method !== 'GET') return json({ error: '来源无效' }, 403);
  if (url.pathname === '/api/blog/posts' && request.method === 'GET') {
    const language = normalizeLanguage(url.searchParams.get('lang'));
    return json({ posts: (await listPosts(env)).map((post) => localizedPost(post, language)) });
  }
  if (url.pathname.startsWith('/api/blog/posts/') && request.method === 'GET') {
    const post = await getPost(env, decodeURIComponent(url.pathname.slice('/api/blog/posts/'.length)));
    const language = normalizeLanguage(url.searchParams.get('lang'));
    return post?.status === 'published' ? json({ post: localizedPost(post, language) }) : json({ error: '文章不存在' }, 404);
  }
  if (url.pathname === '/api/blog/login' && request.method === 'POST') {
    const body = await request.json<{ password?: string }>();
    if (!body.password || !(await equalSecret(body.password, env.ADMIN_PASSWORD))) return json({ error: '密码错误' }, 401);
    const token = await createSession(env);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...JSON_HEADERS, 'set-cookie': `blog_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` } });
  }
  if (url.pathname === '/api/blog/logout' && request.method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...JSON_HEADERS, 'set-cookie': 'blog_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' } });
  }
  if (!(await isAuthenticated(request, env))) return json({ error: '请先登录' }, 401);
  if (url.pathname === '/api/blog/admin/posts' && request.method === 'GET') return json({ posts: await listPosts(env, true) });
  if (url.pathname === '/api/blog/admin/posts' && request.method === 'POST') {
    const body = await request.json<Partial<Post> & { oldSlug?: string }>();
    const slug = safeSlug(body.slug ?? body.title ?? '');
    const title = (body.title ?? '').trim().slice(0, 160);
    if (!slug || !title) return json({ error: '标题和网址名称不能为空' }, 400);
    const existing = await getPost(env, body.oldSlug || slug);
    const now = new Date().toISOString();
    const status: PostStatus = body.status === 'published' ? 'published' : 'draft';
    const post: Post = { title, slug, excerpt: (body.excerpt ?? '').trim().slice(0, 500), content: (body.content ?? '').slice(0, 100_000), coverUrl: (body.coverUrl ?? '').trim().slice(0, 500), status, createdAt: existing?.createdAt ?? now, updatedAt: now, publishedAt: status === 'published' ? (existing?.publishedAt ?? now) : null, translations: sanitizeTranslations(body.translations) ?? existing?.translations };
    if (body.oldSlug && body.oldSlug !== slug) await env.BLOG_DATA.delete(`post:${safeSlug(body.oldSlug)}`);
    await env.BLOG_DATA.put(`post:${slug}`, JSON.stringify(post));
    return json({ post });
  }
  if (url.pathname.startsWith('/api/blog/admin/posts/') && request.method === 'DELETE') {
    await env.BLOG_DATA.delete(`post:${safeSlug(decodeURIComponent(url.pathname.slice('/api/blog/admin/posts/'.length)))}`);
    return json({ ok: true });
  }
  if (url.pathname === '/api/blog/admin/upload' && request.method === 'POST') {
    const contentType = request.headers.get('content-type') ?? '';
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(contentType)) return json({ error: '仅支持 PNG、JPEG、WebP 或 GIF' }, 400);
    const body = await request.arrayBuffer();
    if (body.byteLength > 5 * 1024 * 1024) return json({ error: '图片不能超过 5MB' }, 413);
    const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' } as Record<string, string>)[contentType.toLowerCase()] ?? 'img';
    const key = `media:${crypto.randomUUID()}.${extension}`;
    await env.BLOG_DATA.put(key, body, { metadata: { contentType } });
    return json({ url: `/media/${key.slice(6)}` });
  }
  return json({ error: '接口不存在' }, 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/blog')) return await handleApi(request, env, url);
      if (url.pathname === '/admin' || url.pathname === '/admin/') return html(adminPage());
      if (url.pathname === '/blog' || url.pathname === '/blog/') return html(blogIndex(await listPosts(env), normalizeLanguage(url.searchParams.get('lang'))));
      if (url.pathname.startsWith('/blog/')) {
        const post = await getPost(env, decodeURIComponent(url.pathname.slice('/blog/'.length)));
        const language = normalizeLanguage(url.searchParams.get('lang'));
        return post?.status === 'published' ? html(blogPost(post, language)) : html(pageShell('未找到文章', '<div class="empty"><h1>文章不存在</h1><a href="/blog">返回博客</a></div>'), 404);
      }
      if (url.pathname.startsWith('/media/')) {
        const key = `media:${url.pathname.slice('/media/'.length)}`;
        const result = await env.BLOG_DATA.getWithMetadata<{ contentType?: string }>(key, 'arrayBuffer');
        if (!result.value) return new Response('Not found', { status: 404 });
        return new Response(result.value, { headers: { 'content-type': result.metadata?.contentType ?? 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
      }
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error(JSON.stringify({ event: 'request_error', path: url.pathname, message: error instanceof Error ? error.message : String(error) }));
      return url.pathname.startsWith('/api/') ? json({ error: '服务器暂时出错' }, 500) : html(pageShell('暂时无法访问', '<div class="empty"><h1>暂时无法访问</h1><p>请稍后再试。</p></div>'), 500);
    }
  },
} satisfies ExportedHandler<Env>;
