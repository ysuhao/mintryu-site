import thumbnails from '../../public/thumbnails/manifest.json';

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
  { code: "zh-CN", label: "\u7B80\u4F53\u4E2D\u6587", shortLabel: "\u7B80\u4E2D" },
  { code: "zh-TW", label: "\u7E41\u9AD4\u4E2D\u6587", shortLabel: "\u7E41\u4E2D" },
  { code: "ko", label: "\uD55C\uAD6D\uC5B4", shortLabel: "\uD55C\uAD6D\uC5B4" },
  { code: "en", label: "English", shortLabel: "EN" }
];
const SITE_ORIGIN = "https://mintryu.com";
const SITE_NAME = "Mint";
const SHARE_FALLBACK_IMAGE = { path: "/mascots/hachiware-sticker.png", type: "image/png", width: 598, height: 640 };
const OG_LOCALES: Record<Language, string> = { "zh-CN": "zh_CN", "zh-TW": "zh_TW", ko: "ko_KR", en: "en_US" };
// The author entity is shared by every mintryu.com property: Mintaria and mignet point at the same @id.
const PERSON_ID = `${SITE_ORIGIN}/#mint`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const BLOG_ID = `${SITE_ORIGIN}/blog#blog`;
const AUTHOR = { "@type": "Person", "@id": PERSON_ID, name: "Mint Ryu", url: `${SITE_ORIGIN}/` };
const BLOG_COPY: Record<Language, { title: string; heading: string; lede: string; description: string; byline: string; updated: string; more: string }> = {
  "zh-CN": {
    title: "Mint Ryu 的博客：AI、开发与生活笔记",
    heading: "博客",
    lede: "关于代码、音乐、摄影，以及正在发生的生活。这里是个人站的一页，不急着把每件事都变成产品。",
    description: "Mint Ryu 的个人博客：AI 产品与落地观察、独立软件开发、声卡与音频、VPS 与网络、支付与银行小常识，以及在韩国和上海的生活记录。",
    byline: "作者",
    updated: "更新于",
    more: "继续阅读"
  },
  "zh-TW": {
    title: "Mint Ryu 的部落格：AI、開發與生活筆記",
    heading: "部落格",
    lede: "關於程式、音樂、攝影，以及正在發生的生活。這裡是個人站的一頁，不急著把每件事都變成產品。",
    description: "Mint Ryu 的個人部落格：AI 產品與落地觀察、獨立軟體開發、音訊介面、VPS 與網路、支付與銀行小常識，以及在韓國和上海的生活紀錄。",
    byline: "作者",
    updated: "更新於",
    more: "繼續閱讀"
  },
  ko: {
    title: "Mint Ryu 블로그: AI, 개발, 생활 노트",
    heading: "블로그",
    lede: "코드, 음악, 사진, 그리고 지금 일어나고 있는 생활에 대한 기록. 개인 사이트의 한 페이지일 뿐, 모든 일을 제품으로 만들 필요는 없어요.",
    description: "Mint Ryu의 개인 블로그: AI 제품과 도입 이야기, 인디 소프트웨어 개발, 오디오 인터페이스, VPS와 네트워크, 결제와 은행 상식, 그리고 한국과 상하이에서의 생활 기록.",
    byline: "글",
    updated: "업데이트",
    more: "더 읽기"
  },
  en: {
    title: "Mint Ryu's Blog: Notes on AI, Software and Life",
    heading: "Blog",
    lede: "Notes on code, music, photography, and the life happening right now. Just one page of a personal site — not everything has to become a product.",
    description: "Mint Ryu's personal blog: AI products and adoption, indie software, audio interfaces, VPS and networking, payments and banking basics, and life in Korea and Shanghai.",
    byline: "By",
    updated: "Updated",
    more: "Keep reading"
  }
};
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const NOINDEX_HEADERS = { "x-robots-tag": "noindex, nofollow" };
const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff"
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...NOINDEX_HEADERS } });
}
function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: HTML_HEADERS });
}
// JSON-LD inside <script>: escape characters that could close the element or break the line.
function jsonLd(data: unknown): string {
  const body = JSON.stringify({ "@context": "https://schema.org", ...data as object })
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<script type="application/ld+json">${body}</script>`;
}
function metaTags(tags: Array<[string, string, string]>): string {
  return tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}">`).join("");
}
function postUrl(post: Post, language: Language): string {
  return `${SITE_ORIGIN}${languageHref(`/blog/${encodeURIComponent(post.slug)}`, language)}`;
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char] ?? char);
}
function safeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function normalizeLanguage(value: string | null | undefined): Language {
  switch ((value ?? "").trim().toLowerCase()) {
    case "zh-tw":
    case "zh-hant":
    case "zh-hant-tw":
      return "zh-TW";
    case "ko":
    case "ko-kr":
    case "kr":
      return "ko";
    case "en":
    case "en-us":
    case "en-gb":
      return "en";
    default:
      return "zh-CN";
  }
}
function languageHref(path: string, language: Language): string {
  return language === "zh-CN" ? path : `${path}?lang=${encodeURIComponent(language)}`;
}
function localizedPost(post: Post, language: Language): Post {
  const translation = language === "zh-CN" ? void 0 : post.translations?.[language];
  return translation ? { ...post, ...translation } : post;
}
function sanitizeTranslations(value: unknown): PostTranslations | undefined {
  if (!value || typeof value !== "object") return void 0;
  const input = value as Record<string, unknown>;
  const translations: PostTranslations = {};
  for (const language of ["zh-TW", "ko", "en"] as const) {
    const candidate = input[language];
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 160) : "";
    const excerpt = typeof item.excerpt === "string" ? item.excerpt.trim().slice(0, 500) : "";
    const content = typeof item.content === "string" ? item.content.slice(0, 1e5) : "";
    if (title && content) translations[language] = { title, excerpt, content };
  }
  return Object.keys(translations).length ? translations : void 0;
}
function markdown(source: string): string {
  const text = source.replace(/\r\n/g, "\n").trim();
  const segments = [];
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let match;
  while (match = fenceRe.exec(text)) {
    if (match.index > last) segments.push({ type: "md", value: text.slice(last, match.index) });
    segments.push({ type: "code", lang: match[1], value: match[2].replace(/\n$/, "") });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "md", value: text.slice(last) });
  return segments.map((segment) => {
    if (segment.type === "code") {
      const lang = escapeHtml(segment.lang || "");
      return `<pre class="code-block"${lang ? ` data-lang="${lang}"` : ""}><code>${escapeHtml(segment.value)}</code></pre>`;
    }
    return markdownBlocks(segment.value);
  }).join("\n");
}
function markdownBlocks(source: string): string {
  const safe = source.trim();
  if (!safe) return "";
  return safe.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n").filter((line, index, all) => !(index === 0 && line === "") && !(index === all.length - 1 && line === ""));
    if (!lines.length) return "";
    if (lines.length === 1 && /^---+$/.test(lines[0])) return "<hr>";
    if (lines.every((line) => /^[-*] /.test(line))) {
      return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`).join("")}</ul>`;
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      return `<ol>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
    }
    if (lines.every((line) => /^> /.test(line))) {
      return `<blockquote>${lines.map((line) => inlineMarkdown(line.slice(2))).join("<br>")}</blockquote>`;
    }
    const heading = lines[0]?.match(/^(#{1,3})\s+(.+)$/);
    // The post title is the page's only h1, so a "#" heading inside the body renders as h2.
    const level = Math.max(2, heading?.[1].length ?? 0);
    if (heading && lines.length === 1) return `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
    const html2 = lines.map(inlineMarkdown).join("<br>");
    return html2.split(/(<figure\b[\s\S]*?<\/figure>)/g).map((part) => {
      if (part.startsWith("<figure")) return part;
      const prose = part.replace(/^(?:<br>)+|(?:<br>)+$/g, "");
      return prose ? `<p>${prose}</p>` : "";
    }).join("");
  }).join("\n");
}
function inlineMarkdown(value: string): string {
  const pattern = /!\[([^\]]*)]\((\/media\/[a-zA-Z0-9._-]+)(?:\s+"([^"]*)")?\)|`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g;
  let result = "";
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    result += escapeHtml(value.slice(last, match.index));
    const [, alt, src, caption, code, strong, label, href] = match;
    if (src) {
      const image = `<img class="article-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
      result += `<figure class="article-figure">${image}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
    } else if (code !== void 0) result += `<code>${escapeHtml(code)}</code>`;
    else if (strong !== void 0) result += `<strong>${inlineMarkdown(strong)}</strong>`;
    else result += `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    last = (match.index ?? 0) + match[0].length;
  }
  return result + escapeHtml(value.slice(last));
}
// Every post is copied into one KV value, so a public page costs one read instead of a list plus a read per post
// (the free plan allows 1,000 lists a day). Admin saves and deletes rewrite it, and it expires after an hour so a
// post edited straight in KV still shows up.
const POST_INDEX_KEY = "index:posts";
const POST_INDEX_TTL = 60 * 60;
async function scanPosts(env: Env): Promise<Post[]> {
  const keys: KVNamespaceListKey<unknown>[] = [];
  let cursor: string | undefined;
  do {
    const page: KVNamespaceListResult<unknown> = await env.BLOG_DATA.list({ prefix: "post:", cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  return (await Promise.all(keys.map((key) => env.BLOG_DATA.get<Post>(key.name, "json")))).filter((post): post is Post => Boolean(post));
}
async function savePostIndex(env: Env, posts: Post[]): Promise<void> {
  await env.BLOG_DATA.put(POST_INDEX_KEY, JSON.stringify(posts), { expirationTtl: POST_INDEX_TTL });
}
// A list right after a write can still miss the new key or return a deleted one, so the change is applied on top of the scan.
async function refreshPostIndex(env: Env, saved: Post | null, removed: string[]): Promise<void> {
  const drop = new Set(saved ? [...removed, saved.slug] : removed);
  const posts = (await scanPosts(env)).filter((post) => !drop.has(post.slug));
  await savePostIndex(env, saved ? [...posts, saved] : posts);
}
async function listPosts(env: Env, includeDrafts = false): Promise<Post[]> {
  let posts = includeDrafts ? null : await env.BLOG_DATA.get<Post[]>(POST_INDEX_KEY, "json");
  if (!posts) {
    posts = await scanPosts(env);
    // Best effort: requests rebuilding at the same moment can hit KV's limit of one write per second to a key.
    await savePostIndex(env, posts).catch(() => void 0);
  }
  return posts.filter((post) => includeDrafts || post.status === "published").sort((a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt));
}
async function getPost(env: Env, slug: string): Promise<Post | null> {
  return env.BLOG_DATA.get(`post:${slug}`, "json");
}
function base64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}
async function equalSecret(a: string, b: string): Promise<boolean> {
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(a)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(b))
  ]);
  const aa = new Uint8Array(aHash);
  const bb = new Uint8Array(bHash);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < aa.length; i += 1) diff |= aa[i] ^ (bb[i] ?? 0);
  return diff === 0;
}
async function createSession(env: Env): Promise<string> {
  const payload = `${Date.now() + 8 * 60 * 60 * 1e3}.${crypto.randomUUID()}`;
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}
async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.match(/(?:^|;\s*)blog_session=([^;]+)/)?.[1];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || Number(parts[0]) < Date.now()) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return equalSecret(parts[2], await hmac(env.SESSION_SECRET, payload));
}
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}
function pageShell(title: string, content: string, backHref = '/blog', backLabel = '全部文章 ↗'): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="robots" content="noindex"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet"><style>
  :root{--ink:#221c39;--muted:#6b6286;--blue:#35ccf1;--blue-deep:#0096c7;--pink:#ff6fbd;--pink-deep:#e0449e;--paper:#fbfbff;--line:rgba(48,52,92,.14);--r-lg:20px;--font-display:"Space Grotesk","Noto Sans SC","PingFang SC",ui-sans-serif,sans-serif;--font-body:"Noto Sans SC","PingFang SC",ui-sans-serif,-apple-system,BlinkMacSystemFont,sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(680px 320px at 92% -6%,rgba(53,204,241,.12),transparent 68%),radial-gradient(640px 380px at 0% 108%,rgba(255,111,189,.1),transparent 70%),var(--paper);color:var(--ink);font-family:var(--font-body);-webkit-font-smoothing:antialiased}a{color:inherit}.wrap{width:min(760px,calc(100% - 40px));margin:auto;padding:0 0 80px}.nav{min-height:76px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed var(--line)}.brand{font-family:var(--font-display);font-weight:700;font-size:21px;letter-spacing:-.03em;text-decoration:none}.brand i{color:var(--pink);font-style:normal}.pill{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:8px 15px;text-decoration:none;font-size:12px;font-weight:700;background:rgba(255,255,255,.6);transition:background .2s ease,transform .2s ease}.pill:hover{background:#fff;transform:translateY(-1px)}header{padding:74px 0 56px}.kicker{color:var(--blue-deep);font-size:12px;font-weight:700;letter-spacing:.24em}h1.pagetitle{margin:14px 0 0;font-family:var(--font-display);font-size:clamp(58px,9vw,104px);line-height:.92;letter-spacing:-.055em;font-weight:700}h1.pagetitle .dot{color:var(--pink)}.lede{max-width:560px;margin:26px 0 0;color:var(--muted);font-size:16px;line-height:1.8}.list{border-top:1px solid var(--line)}.row{display:grid;grid-template-columns:104px 1fr auto 16px;gap:26px;align-items:center;padding:26px 6px;border-bottom:1px solid var(--line);text-decoration:none;border-radius:8px;transition:background .2s ease}.row:hover{background:rgba(255,255,255,.7)}.row time{color:var(--muted);font:600 11.5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}.row h2{margin:0 0 8px;font-family:var(--font-display);font-size:clamp(21px,2.6vw,28px);letter-spacing:-.03em;line-height:1.25;font-weight:700}.row p{margin:0;color:var(--muted);font-size:13.5px;line-height:1.7}.thumb{width:150px;height:auto;aspect-ratio:16/10;object-fit:cover;border-radius:14px;border:1px solid rgba(255,255,255,.85);box-shadow:0 10px 26px rgba(43,39,75,.12)}.thumb-fallback{display:block;background:linear-gradient(135deg,rgba(53,204,241,.35),rgba(255,111,189,.3));border:1px solid var(--line)}.go{color:var(--blue-deep);font-size:17px}.post-head{padding:64px 0 40px}.post-head .meta{color:var(--muted);font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em}.post-head h1{margin:18px 0 0;font-family:var(--font-display);font-size:clamp(34px,5.4vw,52px);line-height:1.18;letter-spacing:-.035em;font-weight:700}.excerpt{margin:22px 0 0;padding-left:16px;border-left:3px solid var(--pink);color:var(--muted);font-size:15px;line-height:1.85}.cover{width:100%;aspect-ratio:16/8;object-fit:cover;border-radius:var(--r-lg);margin:0 0 8px;border:1px solid rgba(255,255,255,.8);box-shadow:0 18px 46px rgba(43,39,75,.12)}.article{font-size:17px;line-height:2}.article p,.article li{font-size:17px;line-height:2}.article p{margin:1.5em 0}.article ul{margin:1.5em 0;padding-left:1.4em}.article h1,.article h2{margin:2.2em 0 .6em;font-family:var(--font-display);font-size:26px;letter-spacing:-.025em;line-height:1.35}.article h1::before,.article h2::before{content:"";display:inline-block;width:9px;height:9px;margin-right:10px;border-radius:3px;background:linear-gradient(135deg,var(--blue),var(--pink))}.article h3{margin:2em 0 .5em;font-family:var(--font-display);font-size:20px;letter-spacing:-.02em}.article strong{font-weight:700}.article code{background:#f0edf8;padding:2px 7px;border-radius:6px;font-size:.88em}.article a{color:var(--blue-deep)}.article h2 a[href^="https://pan.quark.cn/"]{display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;border:2px solid var(--ink);border-radius:999px;background:linear-gradient(135deg,rgba(53,204,241,.35),rgba(255,111,189,.4));color:var(--ink);font-size:20px;font-weight:900;line-height:1.35;text-decoration:none;box-shadow:4px 5px 0 rgba(34,28,57,.18);transition:transform .18s ease,box-shadow .18s ease}.article h2 a[href^="https://pan.quark.cn/"]:hover{transform:translateY(-2px);box-shadow:5px 7px 0 rgba(34,28,57,.22)}.article h2 a[href^="https://pan.quark.cn/"]:focus-visible{outline:3px solid var(--blue-deep);outline-offset:4px}@media(prefers-reduced-motion:reduce){.article h2 a[href^="https://pan.quark.cn/"]{transition:none}}.article-image{display:block;width:100%;height:auto;margin:2em 0;border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.8);box-shadow:0 18px 46px rgba(43,39,75,.12)}.endmark{margin:56px 0 0;text-align:center;color:var(--pink);font-family:var(--font-display);font-size:22px;letter-spacing:.3em}.foot{display:flex;justify-content:space-between;gap:16px;margin-top:34px;padding-top:24px;border-top:1px dashed var(--line);color:#a79ec0;font-size:11px;letter-spacing:.12em}.foot a{text-decoration:none;font-weight:700;color:var(--muted)}.foot a:hover{color:var(--blue-deep)}.empty{text-align:center;padding:70px 20px;background:rgba(255,255,255,.7);border:1px solid var(--line);border-radius:var(--r-lg);margin-top:40px}@media(max-width:640px){.wrap{width:calc(100% - 30px)}header{padding:56px 0 44px}.row{grid-template-columns:1fr 22px;gap:8px}.row time,.thumb{display:none}.article,.article p,.article li{font-size:16px}}</style></head><body><div class="wrap"><nav class="nav"><a class="brand" href="/">Mint<i>.</i></a><a class="pill" href="${backHref}">${backLabel}</a></nav>${content}</div></body></html>`;
}
function languageSwitcher(path: string, language: Language): string {
  const options = LANGUAGE_OPTIONS.map(({ code, label, shortLabel }) => {
    const current = code === language ? ' aria-current="page"' : "";
    return `<a class="language-option${current ? " active" : ""}" href="${escapeHtml(languageHref(path, code))}" title="${escapeHtml(label)}">${escapeHtml(shortLabel)}</a>`;
  }).join("");
  return `<div class="language-switcher" role="group" aria-label="\u6587\u7AE0\u8BED\u8A00\u5207\u6362"><span class="language-label">\u6587\u7AE0\u8BED\u8A00</span>${options}</div>`;
}
function pageShellComic(title: string, content: string, backHref = '/blog', backLabel = '全部文章 ↗', language: Language = 'zh-CN', languagePath = '/blog', head = '', htmlLanguage: Language = language): string {
  return `<!doctype html><html lang="${htmlLanguage}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>${head}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet"><style>
  :root{--paper:#fff8e9;--white:#fffdf8;--ink:#182449;--muted:#59647f;--blue:#9bd5f3;--blue-deep:#4b86bd;--yellow:#ffd866;--pink:#f6b0bb;--pink-deep:#c85f78;--line:#182449;--shadow:7px 8px 0 var(--ink);--display:"Nunito","Noto Sans SC","PingFang SC",sans-serif;--body:"Noto Sans SC","PingFang SC",sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;color:var(--ink);background:radial-gradient(700px 420px at 95% -8%,rgba(155,213,243,.45),transparent 70%),radial-gradient(620px 420px at -8% 100%,rgba(246,176,187,.34),transparent 70%),linear-gradient(135deg,#fffdf7,var(--paper) 58%,#fff1d6);font-family:var(--body);-webkit-font-smoothing:antialiased}body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.34;background-image:radial-gradient(rgba(24,36,73,.17) .7px,transparent .8px);background-size:18px 18px;mask-image:linear-gradient(to bottom,black,transparent 88%)}a{color:inherit}:focus-visible{outline:3px solid var(--pink-deep);outline-offset:4px}.wrap{width:min(900px,calc(100% - 36px));margin:auto;padding-bottom:80px}.nav{display:flex;justify-content:space-between;align-items:center;gap:14px;min-height:82px;border-bottom:2px solid var(--line)}.nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.language-switcher{display:inline-flex;align-items:center;gap:2px;padding:3px;border:2px solid var(--line);border-radius:999px;background:rgba(255,253,248,.9);box-shadow:3px 3px 0 rgba(24,36,73,.18)}.language-label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.language-option{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;text-decoration:none;white-space:nowrap}.language-option:hover,.language-option.active{background:var(--yellow);color:var(--ink)}.brand{display:inline-flex;align-items:center;gap:8px;font:900 22px/1 var(--display);letter-spacing:-.04em;text-decoration:none}.brand i{display:inline-block;width:11px;height:11px;border:2px solid var(--ink);border-radius:50%;background:var(--pink);font-size:0}.pill{display:inline-flex;align-items:center;border:2px solid var(--line);border-radius:999px;padding:9px 13px;text-decoration:none;font-size:11px;font-weight:900;background:var(--white);box-shadow:3px 3px 0 rgba(24,36,73,.18);transition:transform .18s ease,background .18s ease}.pill:hover{background:var(--yellow);transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}header{position:relative;padding:78px 0 65px}header::before{content:"";position:absolute;z-index:-1;right:18px;top:53px;width:180px;height:180px;border-radius:50%;background:rgba(155,213,243,.38)}header::after{content:"\u2726";position:absolute;right:36px;top:62px;color:var(--pink-deep);font-size:28px;transform:rotate(12deg)}.kicker{display:flex;align-items:center;gap:9px;margin:0;color:var(--pink-deep);font:900 11px/1 var(--display);letter-spacing:.18em;text-transform:uppercase}.kicker::before{content:"\u2726";font-size:16px}h1.pagetitle{margin:16px 0 18px;font:900 clamp(58px,9vw,112px)/.88 var(--display);letter-spacing:-.08em}h1.pagetitle .dot{color:var(--blue-deep)}.lede{max-width:620px;margin:0;color:var(--muted);font-size:16px;line-height:1.9}.list{display:grid;gap:15px}.row{display:grid;grid-template-columns:112px minmax(0,1fr) 150px 18px;gap:22px;align-items:center;padding:21px;border:3px solid var(--ink);border-radius:22px;background:rgba(255,253,248,.88);box-shadow:4px 5px 0 rgba(24,36,73,.2);text-decoration:none;transition:transform .18s ease,box-shadow .18s ease}.row:nth-child(2n){background:rgba(239,249,255,.92);transform:rotate(.35deg)}.row:hover{transform:translate(-2px,-3px) rotate(-.3deg);box-shadow:7px 8px 0 var(--ink)}.row time{display:inline-flex;width:max-content;padding:8px 10px;border:2px solid var(--ink);border-radius:10px;background:var(--yellow);font:900 10px var(--display)}.row:nth-child(2n) time{background:var(--pink)}.row h2{margin:0 0 8px;font-size:clamp(20px,2.8vw,29px);line-height:1.3;letter-spacing:-.04em}.row p{margin:0;color:var(--muted);font-size:12.5px;line-height:1.75}.thumb{width:150px;height:auto;aspect-ratio:16/10;object-fit:cover;border:2px solid var(--ink);border-radius:15px;box-shadow:3px 4px 0 rgba(24,36,73,.16)}.thumb-fallback{display:block;background:linear-gradient(145deg,var(--blue),var(--pink));border:2px solid var(--ink)}.go{font-size:18px}.post-head{padding:65px 0 38px}.post-head .meta{color:var(--pink-deep);font:900 11px var(--display);letter-spacing:.08em}.post-head h1{max-width:780px;margin:17px 0 0;font:900 clamp(36px,6vw,62px)/1.12 var(--display);letter-spacing:-.055em}.excerpt{max-width:700px;margin:22px 0 0;padding:13px 16px;border-left:4px solid var(--pink-deep);border-radius:0 12px 12px 0;background:rgba(255,253,248,.7);color:var(--muted);font-size:15px;line-height:1.85}.cover{width:100%;aspect-ratio:16/8;object-fit:cover;margin:0 0 10px;border:3px solid var(--ink);border-radius:25px;box-shadow:var(--shadow)}.article{font-size:17px;line-height:2}.article p,.article li{font-size:17px;line-height:2}.article p{margin:1.5em 0}.article ul{margin:1.5em 0;padding-left:1.4em}.article h1,.article h2{margin:2.2em 0 .6em;font:900 27px/1.35 var(--display);letter-spacing:-.03em}.article h1::before,.article h2::before{content:"";display:inline-block;width:10px;height:10px;margin-right:10px;border:2px solid var(--ink);border-radius:4px;background:var(--yellow)}.article h3{margin:2em 0 .5em;font:900 21px var(--display)}.article strong{font-weight:900}.article code{padding:2px 7px;border:1px solid rgba(24,36,73,.2);border-radius:6px;background:var(--paper);font-size:.88em}.article a{color:var(--blue-deep)}.article h2 a[href^="https://pan.quark.cn/"]{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;padding:14px 28px;border:2px solid var(--ink);border-radius:999px;background:linear-gradient(135deg,var(--blue),var(--pink));color:var(--ink);font-size:20px;font-weight:700;line-height:1.2;letter-spacing:0;text-decoration:none;box-shadow:5px 6px 0 var(--ink);transition:transform .18s ease,box-shadow .18s ease}.article h2 a[href^="https://pan.quark.cn/"]:hover,.article h2 a[href^="https://pan.quark.cn/"]:focus-visible{color:var(--ink);transform:translate(3px,3px);box-shadow:2px 2px 0 var(--ink);outline:3px solid var(--ink);outline-offset:4px}@media(prefers-reduced-motion:reduce){.article h2 a[href^="https://pan.quark.cn/"]{transition:none}.article h2 a[href^="https://pan.quark.cn/"]:hover,.article h2 a[href^="https://pan.quark.cn/"]:focus-visible{transform:none}}.article-figure{margin:2em 0}.article-image{display:block;width:100%;height:auto;border:3px solid var(--ink);border-radius:22px;box-shadow:5px 6px 0 rgba(24,36,73,.16)}.article-figure figcaption{margin-top:10px;color:var(--muted);font-size:13px;line-height:1.7}.article blockquote{margin:1.6em 0;padding:16px 18px;border:2px solid var(--ink);border-left:6px solid var(--pink-deep);border-radius:16px;background:rgba(255,253,248,.88);color:var(--muted);font-size:16px;line-height:1.85}.article pre.code-block{overflow-x:auto;margin:1.6em 0;padding:16px 18px;border:2px solid var(--ink);border-radius:16px;background:var(--paper);box-shadow:4px 5px 0 rgba(24,36,73,.14);font-size:13.5px;line-height:1.65}.article pre.code-block code{padding:0;border:0;background:transparent;font-size:13.5px;white-space:pre}.article hr{border:0;border-top:2px dashed rgba(24,36,73,.35);margin:2.4em 0}.article ol{margin:1.5em 0;padding-left:1.4em}.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.endmark{margin:56px 0 0;text-align:center;color:var(--pink-deep);font:900 22px var(--display);letter-spacing:.3em}.post-head{position:relative}.post-sticker{position:absolute;right:-8px;top:18px;width:92px;filter:drop-shadow(3px 4px 0 rgba(24,36,73,.16));transform:rotate(8deg);pointer-events:none}.foot{display:flex;justify-content:space-between;gap:16px;margin-top:34px;padding-top:24px;border-top:2px dashed rgba(24,36,73,.4);color:var(--muted);font:900 10px var(--display);letter-spacing:.12em}.foot a{text-decoration:none}.foot a:hover{color:var(--blue-deep)}.empty{text-align:center;padding:70px 20px;border:3px solid var(--ink);border-radius:25px;background:var(--white);box-shadow:var(--shadow)}@media(max-width:760px){.wrap{width:calc(100% - 28px)}header{padding:58px 0 50px}.row{grid-template-columns:1fr 18px;gap:10px;padding:17px}.row time,.thumb{display:none}.article,.article p,.article li{font-size:16px}.post-sticker{width:64px;right:-4px;top:8px}.nav{align-items:flex-start;padding:14px 0}.nav-actions{width:100%;justify-content:space-between}.language-option{padding-inline:6px}.foot{flex-direction:column}}
  .article-toc{padding:16px 20px;margin:28px 0;border:2px solid var(--ink);border-radius:16px;background:var(--white)}.article-toc summary{font-weight:900;cursor:pointer}.article-toc ol{padding-left:22px;line-height:1.9}.toc-sub{margin-left:18px}.article h2,.article h3{scroll-margin-top:24px}.translation-note{padding:12px 16px;border-left:4px solid var(--pink-deep);background:var(--white)}.byline a{text-decoration:none;border-bottom:2px solid var(--yellow)}.byline a:hover{color:var(--blue-deep)}.more-posts{margin:48px 0 0;padding:18px 22px;border:2px solid var(--ink);border-radius:18px;background:var(--white);box-shadow:4px 5px 0 rgba(24,36,73,.14)}.more-posts h2{margin:0 0 6px;font:900 18px var(--display)}.more-posts ul{margin:0;padding:0;list-style:none}.more-posts li+li{border-top:1px dashed rgba(24,36,73,.3)}.more-posts a{display:flex;gap:14px;align-items:baseline;padding:11px 0;text-decoration:none;line-height:1.6}.more-posts a:hover span{color:var(--blue-deep)}.more-posts time{flex:none;color:var(--pink-deep);font:900 11px var(--display)}@media(max-width:760px){.nav{flex-wrap:wrap}.nav-actions{gap:6px}.pill{font-size:10px;padding:8px 10px}.row time{display:inline-flex;grid-column:1;grid-row:1}.row>div{grid-column:1;grid-row:2}.row .go{grid-column:2;grid-row:2}.language-option{min-height:32px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  </style></head><body><div class="wrap"><nav class="nav"><a class="brand" href="${escapeHtml(languageHref("/", language))}">Mint<i>.</i></a><div class="nav-actions"><a class="pill" href="${backHref}">${backLabel}</a>${languageSwitcher(languagePath, language)}<a class="pill" href="/#works">\u4F5C\u54C1</a><a class="pill" href="/presentations/">\u53D1\u8868</a><a class="pill" href="/#contact">\u8054\u7CFB</a></div></nav>${content}</div></body></html>`;
}
function blogIndex(posts: Post[], language: Language = 'zh-CN'): string {
  const rows = posts.length ? posts.map((post) => {
    const view = localizedPost(post, language);
    const iso = (post.publishedAt ?? post.updatedAt).slice(0, 10);
    const disp = iso.replaceAll("-", ".");
    const listingCover = (thumbnails as Record<string, string>)[post.coverUrl] ?? "";
    const thumb = listingCover ? `<img class="thumb" src="${escapeHtml(listingCover)}" alt="" loading="lazy" decoding="async" width="640" height="400">` : '<span class="thumb thumb-fallback" aria-hidden="true"></span>';
    return `<article><a class="row" href="${escapeHtml(languageHref(`/blog/${encodeURIComponent(post.slug)}`, language))}"><time datetime="${escapeHtml(iso)}">${escapeHtml(disp)}</time><div lang="${contentLanguage(post, language)}"><h2>${escapeHtml(view.title)}</h2><p>${escapeHtml(view.excerpt)}</p></div>${thumb}<span class="go">\u2197</span></a></article>`;
  }).join("") : '<div class="empty"><h2>\u7B2C\u4E00\u7BC7\u6587\u7AE0\u6B63\u5728\u8DEF\u4E0A</h2><p>\u7A0D\u540E\u518D\u6765\u770B\u770B\u3002</p></div>';
  const copy = BLOG_COPY[language];
  return pageShellComic(copy.title, `<header><div class="kicker">NOTES / WORK / PROCESS</div><h1 class="pagetitle">${escapeHtml(copy.heading)}<span class="dot">.</span></h1><p class="lede">${escapeHtml(copy.lede)}</p></header><main class="list">${rows}</main><div class="foot"><span>\xA9 2026 MINT RYU</span><span>CODE / SOUND / LIGHT</span></div>`, languageHref("/", language), "\u8FD4\u56DE\u4E3B\u9875 \u2197", language, "/blog", blogIndexMeta(posts, language));
}
function blogIndexMeta(posts: Post[], language: Language): string {
  const copy = BLOG_COPY[language];
  const canonical = `${SITE_ORIGIN}${languageHref("/blog", language)}`;
  const image = `${SITE_ORIGIN}${SHARE_FALLBACK_IMAGE.path}`;
  const alternates = LANGUAGE_OPTIONS.map(({ code }) => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(`${SITE_ORIGIN}${languageHref("/blog", code)}`)}">`).join("");
  const graph = [
    {
      "@type": "Blog",
      "@id": BLOG_ID,
      url: canonical,
      name: copy.title,
      description: copy.description,
      inLanguage: language,
      author: AUTHOR,
      publisher: AUTHOR,
      isPartOf: { "@type": "WebSite", "@id": WEBSITE_ID, url: `${SITE_ORIGIN}/`, name: "Mint." },
      blogPost: posts.map((post) => {
        const actual = contentLanguage(post, language);
        const view = localizedPost(post, actual);
        const url = postUrl(post, actual);
        return { "@type": "BlogPosting", "@id": `${url}#article`, headline: view.title, url, datePublished: post.publishedAt ?? post.updatedAt, dateModified: post.updatedAt, inLanguage: actual, author: AUTHOR, ...absoluteShareImage(post.coverUrl) ? { image: absoluteShareImage(post.coverUrl) } : {} };
      })
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Mint", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: copy.heading, item: canonical }
      ]
    }
  ];
  return `<meta name="theme-color" content="#fff8e9"><link rel="canonical" href="${escapeHtml(canonical)}">${alternates}<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/blog">${feedLinks(language)}${metaTags([
    ["name", "description", copy.description],
    ["property", "og:type", "website"],
    ["property", "og:site_name", SITE_NAME],
    ["property", "og:locale", OG_LOCALES[language]],
    ["property", "og:title", copy.title],
    ["property", "og:description", copy.description],
    ["property", "og:url", canonical],
    ["property", "og:image", image],
    ["property", "og:image:type", SHARE_FALLBACK_IMAGE.type],
    ["property", "og:image:width", String(SHARE_FALLBACK_IMAGE.width)],
    ["property", "og:image:height", String(SHARE_FALLBACK_IMAGE.height)],
    ["property", "og:image:alt", copy.title],
    ["name", "twitter:card", "summary"],
    ["name", "twitter:title", copy.title],
    ["name", "twitter:description", copy.description],
    ["name", "twitter:image", image]
  ])}${jsonLd({ "@graph": graph })}`;
}
function feedLinks(language: Language): string {
  return `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(BLOG_COPY[language].title)}" href="${escapeHtml(`${SITE_ORIGIN}${languageHref("/blog/rss.xml", language)}`)}">`;
}
function stripLeadingTitle(content: string, title: string): string {
  const match = content.match(/^\s*#\s+(.+?)\s*(\r?\n|$)/);
  const squash = (value: string) => value.replace(/\s+/g, "");
  return match && squash(match[1]) === squash(title) ? content.slice(match[0].length) : content;
}
function contentLanguage(post: Post, language: Language): Language {
  return language !== "zh-CN" && post.translations?.[language] ? language : "zh-CN";
}
function absoluteShareImage(coverUrl: string): string | null {
  const value = (coverUrl ?? "").trim();
  if (/^\/media\/[a-zA-Z0-9._-]+$/.test(value)) return `${SITE_ORIGIN}${value}`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
function plainSummary(post: Post): string {
  const excerpt = post.excerpt.replace(/\s+/g, " ").trim();
  const body = () => stripLeadingTitle(post.content, post.title).replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*]\([^)]*\)/g, " ").replace(/\[([^\]]+)]\([^)]*\)/g, "$1").replace(/^\s*(?:#{1,6}|>|[-*]|\d+\.)\s+/gm, "").replace(/[*`]+/g, "").replace(/([。！？；：，、」』）])\s+/g, "$1").replace(/\s+/g, " ").trim();
  // A subtitle-length excerpt makes a poor search snippet, so the opening of the body is added to it;
  // a post with almost no prose is described by its title as well.
  let text = excerpt.length >= 30 ? excerpt : [excerpt, body()].filter(Boolean).join(" \u2014 ");
  if (text.length < 40) text = [post.title, text].filter(Boolean).join(" \u2014 ");
  return text.length > 160 ? `${text.slice(0, 159).trimEnd()}\u2026` : text;
}
function postShareMeta(post: Post, language: Language): string {
  const actual = contentLanguage(post, language);
  const view = localizedPost(post, actual);
  const postPath = `/blog/${encodeURIComponent(post.slug)}`;
  const canonical = `${SITE_ORIGIN}${languageHref(postPath, actual)}`;
  const description = plainSummary(view) || "\u5173\u4E8E\u4EE3\u7801\u3001\u97F3\u4E50\u3001\u6444\u5F71\uFF0C\u4EE5\u53CA\u6B63\u5728\u53D1\u751F\u7684\u751F\u6D3B\u3002";
  const cover = absoluteShareImage(view.coverUrl);
  const image = cover ?? `${SITE_ORIGIN}${SHARE_FALLBACK_IMAGE.path}`;
  const published = Date.parse(post.publishedAt ?? "");
  const alternates = LANGUAGE_OPTIONS.filter(({ code }) => code === "zh-CN" || post.translations?.[code]).map(({ code }) => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(`${SITE_ORIGIN}${languageHref(postPath, code)}`)}">`).join("");
  const tags = [
    ["name", "description", description],
    ["property", "og:type", "article"],
    ["property", "og:site_name", SITE_NAME],
    ["property", "og:locale", OG_LOCALES[actual]],
    ["property", "og:title", view.title],
    ["property", "og:description", description],
    ["property", "og:url", canonical],
    ["property", "og:image", image],
    ...cover ? [] : [
      ["property", "og:image:type", SHARE_FALLBACK_IMAGE.type],
      ["property", "og:image:width", String(SHARE_FALLBACK_IMAGE.width)],
      ["property", "og:image:height", String(SHARE_FALLBACK_IMAGE.height)]
    ],
    ["property", "og:image:alt", view.title],
    ...Number.isFinite(published) ? [["property", "article:published_time", new Date(published).toISOString()]] : [],
    ["property", "article:modified_time", post.updatedAt],
    ["property", "article:author", `${SITE_ORIGIN}/`],
    ["name", "author", AUTHOR.name],
    ["name", "robots", "max-image-preview:large"],
    ["name", "twitter:card", cover ? "summary_large_image" : "summary"],
    ["name", "twitter:title", view.title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", image],
    ["name", "twitter:image:alt", view.title]
  ];
  const markdownHref = `${SITE_ORIGIN}${languageHref(`${postPath}.md`, actual)}`;
  return `<meta name="theme-color" content="#fff8e9"><link rel="canonical" href="${escapeHtml(canonical)}">${alternates}<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${SITE_ORIGIN}${postPath}`)}">${feedLinks(actual)}<link rel="alternate" type="text/markdown" href="${escapeHtml(markdownHref)}">${tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}">`).join("")}${jsonLd({ "@graph": postGraph(post, actual, description, image) })}`;
}
function postGraph(post: Post, actual: Language, description: string, image: string): object[] {
  const view = localizedPost(post, actual);
  const canonical = postUrl(post, actual);
  const translations = LANGUAGE_OPTIONS.filter(({ code }) => code !== "zh-CN" && post.translations?.[code]).map(({ code }) => ({ "@id": `${postUrl(post, code)}#article` }));
  return [
    {
      "@type": "BlogPosting",
      "@id": `${canonical}#article`,
      mainEntityOfPage: canonical,
      url: canonical,
      headline: view.title,
      description,
      image: [image],
      datePublished: post.publishedAt ?? post.updatedAt,
      dateModified: post.updatedAt,
      inLanguage: actual,
      author: AUTHOR,
      publisher: AUTHOR,
      isPartOf: { "@type": "Blog", "@id": BLOG_ID, url: `${SITE_ORIGIN}/blog`, name: BLOG_COPY[actual].title },
      ...actual === "zh-CN"
        ? translations.length ? { workTranslation: translations } : {}
        : { translationOfWork: { "@id": `${postUrl(post, "zh-CN")}#article` } }
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Mint", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: BLOG_COPY[actual].heading, item: `${SITE_ORIGIN}${languageHref("/blog", actual)}` },
        { "@type": "ListItem", position: 3, name: view.title, item: canonical }
      ]
    }
  ];
}
// Neighbouring posts by date, newer one first, so every post links to the posts around it.
function morePosts(post: Post, posts: Post[], language: Language): string {
  const index = posts.findIndex((item) => item.slug === post.slug);
  const picks = [index - 1, index + 1, index + 2, index - 2, index + 3]
    .filter((i) => index >= 0 && i >= 0 && i < posts.length)
    .slice(0, 3)
    .map((i) => posts[i]);
  if (!picks.length) return "";
  const items = picks.map((item) => {
    const iso = (item.publishedAt ?? item.updatedAt).slice(0, 10);
    const actual = contentLanguage(item, language);
    return `<li><a href="${escapeHtml(languageHref(`/blog/${encodeURIComponent(item.slug)}`, language))}"><time datetime="${escapeHtml(iso)}">${escapeHtml(iso.replaceAll("-", "."))}</time><span lang="${actual}">${escapeHtml(localizedPost(item, actual).title)}</span></a></li>`;
  }).join("");
  return `<section class="more-posts" aria-labelledby="more-posts-title"><h2 id="more-posts-title">${escapeHtml(BLOG_COPY[language].more)}</h2><ul>${items}</ul></section>`;
}
function articleWithContents(source: string): string {
  const links: string[] = [];
  let index = 0;
  const body = markdown(source).replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_all, level, title) => {
    const id = `section-${++index}`;
    links.push(`<li${level === "3" ? ' class="toc-sub"' : ""}><a href="#${id}">${title.replace(/<[^>]*>/g, "")}</a></li>`);
    return `<h${level} id="${id}">${title}</h${level}>`;
  });
  const toc = links.length >= 2 ? `<details class="article-toc" open><summary>\u6587\u7AE0\u76EE\u5F55</summary><ol>${links.join("")}</ol></details>` : "";
  return `${toc}<article class="article">${body}</article>`;
}
function blogPost(post: Post, language: Language = 'zh-CN', posts: Post[] = []): string {
  const view = localizedPost(post, language);
  const actual = contentLanguage(post, language);
  const copy = BLOG_COPY[actual];
  const iso = (view.publishedAt ?? view.updatedAt).slice(0, 10);
  const disp = iso.replaceAll("-", ".");
  const updatedIso = view.updatedAt.slice(0, 10);
  const updated = updatedIso > iso ? ` \xB7 ${escapeHtml(copy.updated)} <time datetime="${escapeHtml(updatedIso)}">${escapeHtml(updatedIso.replaceAll("-", "."))}</time>` : "";
  const postPath = `/blog/${encodeURIComponent(view.slug)}`;
  const blogPath = languageHref("/blog", language);
  const homePath = languageHref("/", language);
  return pageShellComic(`${view.title} \xB7 Mint`, `${language !== "zh-CN" && actual === "zh-CN" ? '<p class="translation-note">\u6682\u65E0\u8BE5\u8BED\u8A00\u8BD1\u6587\uFF0C\u5F53\u524D\u663E\u793A\u4E2D\u6587\u539F\u6587\u3002</p>' : ""}<main lang="${actual}"><header class="post-head"><img class="post-sticker" src="/mascots/hachiware-sticker.png" alt="" width="92" height="92"><div class="meta"><time datetime="${escapeHtml(iso)}">${escapeHtml(disp)}</time> \xB7 <span class="byline">${escapeHtml(copy.byline)} <a rel="author" href="${escapeHtml(homePath)}">${AUTHOR.name}</a></span>${updated}</div><h1>${escapeHtml(view.title)}</h1>${view.excerpt ? `<p class="excerpt">${escapeHtml(view.excerpt)}</p>` : ""}</header>${view.coverUrl ? `<img class="cover" src="${escapeHtml(view.coverUrl)}" alt="${escapeHtml(view.title)}" fetchpriority="high">` : ""}${articleWithContents(stripLeadingTitle(view.content, view.title))}</main>${morePosts(post, posts, language)}<div class="cta-row"><a class="pill" href="${escapeHtml(blogPath)}">\u5168\u90E8\u6587\u7AE0 \u2197</a><a class="pill" href="${escapeHtml(homePath)}">\u8FD4\u56DE\u4E3B\u9875 \u2197</a></div><div class="endmark">\xB7 \xB7 \xB7</div><div class="foot"><span>\xA9 2026 MINT RYU</span><a href="${escapeHtml(blogPath)}">\u2190 \u8FD4\u56DE\u6587\u7AE0\u5217\u8868</a></div>`, blogPath, "\u5168\u90E8\u6587\u7AE0 \u2197", language, postPath, postShareMeta(post, language), actual);
}
function blogFeed(posts: Post[], language: Language): string {
  const copy = BLOG_COPY[language];
  const latest = posts.reduce((max, post) => post.updatedAt > max ? post.updatedAt : max, "");
  const items = posts.map((post) => {
    const actual = contentLanguage(post, language);
    const view = localizedPost(post, actual);
    const url = postUrl(post, actual);
    return `<item><title>${escapeHtml(view.title)}</title><link>${escapeHtml(url)}</link><guid isPermaLink="true">${escapeHtml(url)}</guid><pubDate>${new Date(post.publishedAt ?? post.updatedAt).toUTCString()}</pubDate><dc:creator>${AUTHOR.name}</dc:creator><description>${escapeHtml(plainSummary(view))}</description></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${escapeHtml(copy.title)}</title><link>${SITE_ORIGIN}${escapeHtml(languageHref("/blog", language))}</link><description>${escapeHtml(copy.description)}</description><language>${language}</language>${latest ? `<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ""}<atom:link href="${SITE_ORIGIN}${escapeHtml(languageHref("/blog/rss.xml", language))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`;
}
// Every language version is listed with the full set of alternates, as Google expects for hreflang in sitemaps.
function blogSitemap(posts: Post[]): string {
  const entries = (versions: Array<{ language: Language; href: string }>, lastmod: string) => versions.map(({ href }) => `<url><loc>${escapeHtml(href)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${versions.map((version) => `<xhtml:link rel="alternate" hreflang="${version.language}" href="${escapeHtml(version.href)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(versions[0].href)}"/></url>`).join("");
  const latest = posts.reduce((max, post) => post.updatedAt > max ? post.updatedAt : max, "");
  const index = entries(LANGUAGE_OPTIONS.map(({ code }) => ({ language: code, href: `${SITE_ORIGIN}${languageHref("/blog", code)}` })), latest);
  const pages = posts.map((post) => entries(LANGUAGE_OPTIONS.filter(({ code }) => code === "zh-CN" || post.translations?.[code]).map(({ code }) => ({ language: code, href: postUrl(post, code) })), post.updatedAt)).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${index}${pages}</urlset>\n`;
}
// Plain Markdown copy of a post for AI agents and readers; the HTML page stays canonical.
function postMarkdown(post: Post, language: Language): string {
  const actual = contentLanguage(post, language);
  const view = localizedPost(post, actual);
  const body = stripLeadingTitle(view.content, view.title).replace(/\]\(\/media\//g, `](${SITE_ORIGIN}/media/`).trim();
  return [
    "---",
    `title: ${JSON.stringify(view.title)}`,
    `url: ${postUrl(post, actual)}`,
    `author: ${AUTHOR.name}`,
    `language: ${actual}`,
    `published: ${post.publishedAt ?? post.updatedAt}`,
    `updated: ${post.updatedAt}`,
    `description: ${JSON.stringify(plainSummary(view))}`,
    "---",
    "",
    `# ${view.title}`,
    "",
    ...view.excerpt.trim() ? [`> ${view.excerpt.trim()}`, ""] : [],
    body,
    ""
  ].join("\n");
}
function adminPage(): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u535A\u5BA2\u540E\u53F0</title><meta name="robots" content="noindex, nofollow"><style>
  :root{--ink:#241448;--pink:#ff71ce;--cyan:#01cdfe;--bg:#f5f2fb}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif}.app{width:min(1100px,calc(100% - 28px));margin:32px auto}.top{display:flex;justify-content:space-between;align-items:center}.grid{display:grid;grid-template-columns:280px 1fr;gap:20px;margin-top:22px}.panel{background:white;border-radius:22px;padding:22px;box-shadow:0 8px 28px rgba(36,20,72,.08)}input,textarea,select,button{font:inherit}input,textarea,select{width:100%;border:1px solid #d8d1e8;border-radius:12px;padding:12px;margin:6px 0 14px;background:white}textarea{min-height:300px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}button{border:0;border-radius:999px;padding:11px 18px;font-weight:800;cursor:pointer;background:var(--ink);color:white}.secondary{background:#ece7f6;color:var(--ink)}.danger{background:#b3261e}.post{padding:12px;border-radius:12px;cursor:pointer;margin:6px 0}.post:hover{background:#f3effa}.muted{color:#7b718d;font-size:13px}.login{max-width:420px;margin:13vh auto}.hide{display:none}.message{min-height:22px;color:#7a2dbb}@media(max-width:760px){.grid{grid-template-columns:1fr}.row{grid-template-columns:1fr}}
  </style></head><body><div id="login" class="login panel"><h1>\u535A\u5BA2\u540E\u53F0</h1><p class="muted">\u767B\u5F55\u540E\u5373\u53EF\u5199\u6587\u7AE0\u3001\u4E0A\u4F20\u5C01\u9762\u5E76\u53D1\u5E03\u3002</p><input id="password" type="password" placeholder="\u540E\u53F0\u5BC6\u7801"><button id="loginBtn">\u767B\u5F55</button><p id="loginMsg" class="message"></p></div><div id="app" class="app hide"><div class="top"><h1>\u535A\u5BA2\u540E\u53F0</h1><div><a href="/blog" target="_blank">\u67E5\u770B\u535A\u5BA2</a> \xB7 <button id="logoutBtn" class="secondary">\u9000\u51FA</button></div></div><div class="grid"><aside class="panel"><button id="newBtn">\uFF0B \u65B0\u6587\u7AE0</button><div id="posts"></div></aside><main class="panel"><div class="row"><label>\u6807\u9898<input id="title"></label><label>\u7F51\u5740\u540D\u79F0<input id="slug" placeholder="my-first-post"></label></div><label>\u6458\u8981<textarea id="excerpt" style="min-height:90px"></textarea></label><label>\u5C01\u9762\u56FE<input id="cover" type="file" accept="image/*"><input id="coverUrl" placeholder="\u4E0A\u4F20\u540E\u81EA\u52A8\u586B\u5199\uFF0C\u4E5F\u53EF\u7C98\u8D34\u56FE\u7247\u7F51\u5740"></label><label>\u6B63\u6587\uFF08\u652F\u6301 Markdown\uFF09<textarea id="content" placeholder="# \u6807\u9898

\u6B63\u6587..."></textarea></label><div class="row"><label>\u72B6\u6001<select id="status"><option value="draft">\u8349\u7A3F</option><option value="published">\u5DF2\u53D1\u5E03</option></select></label><div><button id="saveBtn">\u4FDD\u5B58\u6587\u7AE0</button> <button id="deleteBtn" class="danger">\u5220\u9664</button></div></div><p id="msg" class="message"></p></main></div></div><script>
  const $=id=>document.getElementById(id);let current='';let cache=[];
  async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{...(opts.headers||{}),'content-type':opts.body instanceof Blob?opts.body.type:'application/json'}});if(r.status===401)throw new Error('AUTH');const data=await r.json();if(!r.ok)throw new Error(data.error||'\u8BF7\u6C42\u5931\u8D25');return data}
  function blank(){current='';['title','slug','excerpt','content','coverUrl'].forEach(id=>$(id).value='');$('status').value='draft';$('msg').textContent='\u65B0\u6587\u7AE0'}
  function edit(p){current=p.slug;$('title').value=p.title;$('slug').value=p.slug;$('excerpt').value=p.excerpt;$('content').value=p.content;$('coverUrl').value=p.coverUrl||'';$('status').value=p.status;$('msg').textContent='\u6B63\u5728\u7F16\u8F91 '+p.title}
  async function load(){try{cache=(await api('/api/blog/admin/posts')).posts;$('login').classList.add('hide');$('app').classList.remove('hide');$('posts').innerHTML=cache.map((p,i)=>'<div class="post" data-i="'+i+'"><b>'+escapeText(p.title)+'</b><div class="muted">'+p.status+' \xB7 '+p.updatedAt.slice(0,10)+'</div></div>').join('')||'<p class="muted">\u8FD8\u6CA1\u6709\u6587\u7AE0</p>';$('posts').querySelectorAll('.post').forEach(el=>el.onclick=()=>edit(cache[Number(el.dataset.i)]))}catch(e){if(e.message==='AUTH'){$('login').classList.remove('hide');$('app').classList.add('hide')}}}
  function escapeText(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
  $('loginBtn').onclick=async()=>{try{await api('/api/blog/login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await load()}catch(e){$('loginMsg').textContent='\u5BC6\u7801\u4E0D\u6B63\u786E'}};
  $('logoutBtn').onclick=async()=>{await api('/api/blog/logout',{method:'POST',body:'{}'});location.reload()};$('newBtn').onclick=blank;
  $('title').oninput=()=>{if(!current)$('slug').value=$('title').value.trim().toLowerCase().replace(/[^a-z0-9\u4E00-\u9FFF-]+/g,'-').replace(/^-+|-+$/g,'')};
  $('cover').onchange=async()=>{const f=$('cover').files[0];if(!f)return;if(f.size>5*1024*1024){$('msg').textContent='\u56FE\u7247\u4E0D\u80FD\u8D85\u8FC7 5MB';return}try{$('msg').textContent='\u6B63\u5728\u4E0A\u4F20\u56FE\u7247...';const r=await fetch('/api/blog/admin/upload',{method:'POST',headers:{'content-type':f.type,'x-filename':encodeURIComponent(f.name)},body:f});const d=await r.json();if(!r.ok)throw new Error(d.error);$('coverUrl').value=d.url;$('msg').textContent='\u56FE\u7247\u4E0A\u4F20\u5B8C\u6210'}catch(e){$('msg').textContent=e.message}};
  $('saveBtn').onclick=async()=>{if($('saveBtn').disabled)return;$('saveBtn').disabled=true;try{const body={title:$('title').value,slug:$('slug').value,oldSlug:current,excerpt:$('excerpt').value,content:$('content').value,coverUrl:$('coverUrl').value,status:$('status').value};const d=await api('/api/blog/admin/posts',{method:'POST',body:JSON.stringify(body)});current=d.post.slug;$('msg').textContent='\u4FDD\u5B58\u6210\u529F';await load();edit(d.post)}catch(e){$('msg').textContent=e.message}finally{$('saveBtn').disabled=false}};
  $('deleteBtn').onclick=async()=>{if(!current||!confirm('\u786E\u5B9A\u5220\u9664\u8FD9\u7BC7\u6587\u7AE0\uFF1F'))return;try{await api('/api/blog/admin/posts/'+encodeURIComponent(current),{method:'DELETE',body:'{}'});blank();await load()}catch(e){$('msg').textContent=e.message}};load();
  <\/script></body></html>`;
}
async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (!sameOrigin(request) && request.method !== "GET") return json({ error: "\u6765\u6E90\u65E0\u6548" }, 403);
  if (url.pathname === "/api/blog/posts" && request.method === "GET") {
    const language = normalizeLanguage(url.searchParams.get("lang"));
    const posts = await listPosts(env);
    if (url.searchParams.get("view") !== "summary") return json({ posts: posts.map((post) => localizedPost(post, language)) });
    const requestedLimit = Number(url.searchParams.get("limit") ?? 20);
    const requestedOffset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 20;
    const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
    return json({ posts: posts.slice(offset, offset + limit).map((post) => {
      const view = localizedPost(post, language);
      return { title: view.title, slug: post.slug, excerpt: view.excerpt, coverUrl: absoluteShareImage(post.coverUrl) ? post.coverUrl : "", publishedAt: post.publishedAt, updatedAt: post.updatedAt, contentLanguage: contentLanguage(post, language) };
    }), total: posts.length, nextOffset: offset + limit < posts.length ? offset + limit : null });
  }
  if (url.pathname.startsWith("/api/blog/posts/") && request.method === "GET") {
    const post = await getPost(env, decodeURIComponent(url.pathname.slice("/api/blog/posts/".length)));
    const language = normalizeLanguage(url.searchParams.get("lang"));
    return post?.status === "published" ? json({ post: localizedPost(post, language) }) : json({ error: "\u6587\u7AE0\u4E0D\u5B58\u5728" }, 404);
  }
  if (url.pathname === "/api/blog/login" && request.method === "POST") {
    const body = await request.json<{ password?: string }>();
    if (!body.password || !await equalSecret(body.password, env.ADMIN_PASSWORD)) return json({ error: "\u5BC6\u7801\u9519\u8BEF" }, 401);
    const token = await createSession(env);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...JSON_HEADERS, "set-cookie": `blog_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` } });
  }
  if (url.pathname === "/api/blog/logout" && request.method === "POST") {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...JSON_HEADERS, "set-cookie": "blog_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" } });
  }
  if (!await isAuthenticated(request, env)) return json({ error: "\u8BF7\u5148\u767B\u5F55" }, 401);
  if (url.pathname === "/api/blog/admin/posts" && request.method === "GET") return json({ posts: await listPosts(env, true) });
  if (url.pathname === "/api/blog/admin/posts" && request.method === "POST") {
    const body = await request.json<Partial<Post> & { oldSlug?: string }>();
    const slug = safeSlug(body.slug ?? body.title ?? "");
    const title = (body.title ?? "").trim().slice(0, 160);
    if (!slug || !title) return json({ error: "\u6807\u9898\u548C\u7F51\u5740\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
    const oldSlug = body.oldSlug ? safeSlug(body.oldSlug) : "";
    const existing = oldSlug ? await getPost(env, oldSlug) : null;
    if (oldSlug && !existing) return json({ error: "\u539F\u6587\u7AE0\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5" }, 404);
    if (oldSlug !== slug && (await getPost(env, slug) || await env.BLOG_DATA.get(`redirect:${slug}`))) return json({ error: "\u8BE5\u7F51\u5740\u5DF2\u88AB\u5360\u7528\uFF0C\u8BF7\u6362\u4E00\u4E2A\u7F51\u5740\u540D\u79F0" }, 409);
    const coverUrl = (body.coverUrl ?? "").trim();
    if (coverUrl && !absoluteShareImage(coverUrl)) return json({ error: "\u5C01\u9762\u5FC5\u987B\u662F\u672C\u7AD9\u5A92\u4F53\u5730\u5740\u6216 HTTPS \u56FE\u7247\u7F51\u5740" }, 400);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const status = body.status === "published" ? "published" : "draft";
    const post: Post = { title, slug, excerpt: (body.excerpt ?? "").trim().slice(0, 500), content: (body.content ?? "").slice(0, 1e5), coverUrl: coverUrl.slice(0, 500), status, createdAt: existing?.createdAt ?? now, updatedAt: now, publishedAt: status === "published" ? existing?.publishedAt ?? now : null, translations: sanitizeTranslations(body.translations) ?? existing?.translations };
    if (existing) await env.BLOG_DATA.put(`backup:${oldSlug}:${crypto.randomUUID()}`, JSON.stringify(existing));
    await env.BLOG_DATA.put(`post:${slug}`, JSON.stringify(post));
    if (oldSlug && oldSlug !== slug) {
      await env.BLOG_DATA.put(`redirect:${oldSlug}`, slug);
      await env.BLOG_DATA.delete(`post:${oldSlug}`);
    }
    await refreshPostIndex(env, post, oldSlug && oldSlug !== slug ? [oldSlug] : []);
    return json({ post });
  }
  if (url.pathname.startsWith("/api/blog/admin/posts/") && request.method === "DELETE") {
    const slug = safeSlug(decodeURIComponent(url.pathname.slice("/api/blog/admin/posts/".length)));
    const existing = await getPost(env, slug);
    if (existing) await env.BLOG_DATA.put(`backup:${slug}:${crypto.randomUUID()}`, JSON.stringify(existing));
    await env.BLOG_DATA.delete(`post:${slug}`);
    await refreshPostIndex(env, null, [slug]);
    return json({ ok: true });
  }
  if (url.pathname === "/api/blog/admin/upload" && request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(contentType)) return json({ error: "\u4EC5\u652F\u6301 PNG\u3001JPEG\u3001WebP \u6216 GIF" }, 400);
    const body = await request.arrayBuffer();
    if (body.byteLength > 5 * 1024 * 1024) return json({ error: "\u56FE\u7247\u4E0D\u80FD\u8D85\u8FC7 5MB" }, 413);
    const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[contentType.toLowerCase()] ?? "img";
    const key = `media:${crypto.randomUUID()}.${extension}`;
    await env.BLOG_DATA.put(key, body, { metadata: { contentType } });
    return json({ url: `/media/${key.slice(6)}` });
  }
  return json({ error: "\u63A5\u53E3\u4E0D\u5B58\u5728" }, 404);
}
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/blog")) return await handleApi(request, env, url);
      if (url.pathname === "/admin" || url.pathname === "/admin/") return new Response(adminPage(), { headers: { ...HTML_HEADERS, ...NOINDEX_HEADERS } });
      if (url.pathname === "/blog" || url.pathname === "/blog/") return html(blogIndex(await listPosts(env), normalizeLanguage(url.searchParams.get("lang"))));
      // Slugs never contain ".", so these paths cannot shadow a post.
      if (url.pathname === "/blog/rss.xml") {
        return new Response(blogFeed(await listPosts(env), normalizeLanguage(url.searchParams.get("lang"))), { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
      }
      if (url.pathname === "/blog/sitemap.xml") {
        return new Response(blogSitemap(await listPosts(env)), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
      }
      if (url.pathname.startsWith("/blog/") && url.pathname.endsWith(".md")) {
        const post = await getPost(env, decodeURIComponent(url.pathname.slice("/blog/".length, -".md".length)));
        if (post?.status !== "published") return new Response("Not found", { status: 404, headers: NOINDEX_HEADERS });
        const language = normalizeLanguage(url.searchParams.get("lang"));
        return new Response(postMarkdown(post, language), { headers: { "content-type": "text/markdown; charset=utf-8", link: `<${postUrl(post, contentLanguage(post, language))}>; rel="canonical"`, "cache-control": "public, max-age=600", "x-content-type-options": "nosniff" } });
      }
      if (url.pathname.startsWith("/blog/")) {
        const slug = decodeURIComponent(url.pathname.slice("/blog/".length));
        const post = await getPost(env, slug);
        if (!post) {
          let target = await env.BLOG_DATA.get(`redirect:${slug}`);
          const seen = /* @__PURE__ */ new Set([slug]);
          while (target && !seen.has(target) && seen.size < 20) {
            seen.add(target);
            const destination = await getPost(env, target);
            if (destination?.status === "published") return Response.redirect(`${SITE_ORIGIN}${languageHref(`/blog/${encodeURIComponent(target)}`, normalizeLanguage(url.searchParams.get("lang")))}`, 301);
            target = await env.BLOG_DATA.get(`redirect:${target}`);
          }
        }
        const language = normalizeLanguage(url.searchParams.get("lang"));
        return post?.status === "published" ? html(blogPost(post, language, await listPosts(env))) : html(pageShell("\u672A\u627E\u5230\u6587\u7AE0", '<div class="empty"><h1>\u6587\u7AE0\u4E0D\u5B58\u5728</h1><a href="/blog">\u8FD4\u56DE\u535A\u5BA2</a></div>'), 404);
      }
      if (url.pathname.startsWith("/media/")) {
        const key = `media:${url.pathname.slice("/media/".length)}`;
        const result = await env.BLOG_DATA.getWithMetadata<{ contentType?: string }>(key, "arrayBuffer");
        if (!result.value) return new Response("Not found", { status: 404 });
        return new Response(result.value, { headers: { "content-type": result.metadata?.contentType ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
      }
      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error(JSON.stringify({ event: "request_error", path: url.pathname, message: error instanceof Error ? error.message : String(error) }));
      return url.pathname.startsWith("/api/") ? json({ error: "\u670D\u52A1\u5668\u6682\u65F6\u51FA\u9519" }, 500) : html(pageShell("\u6682\u65F6\u65E0\u6CD5\u8BBF\u95EE", '<div class="empty"><h1>\u6682\u65F6\u65E0\u6CD5\u8BBF\u95EE</h1><p>\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002</p></div>'), 500);
    }
  }
} satisfies ExportedHandler<Env>;
