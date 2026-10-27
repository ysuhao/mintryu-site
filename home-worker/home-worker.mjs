// Cloudflare Worker "mintryu-site", module "home-worker.js".
// Serves the static site from ASSETS, fills the homepage's latest-post cards from the blog worker
// (BLOG_SERVICE), and adds the search / AI discovery layer: robots.txt, sitemaps, llms.txt, and the
// share tags and JSON-LD a static page is missing. Existing tags are never overwritten, so a page
// that sets its own metadata keeps it.

const SITE_ORIGIN = "https://mintryu.com";
const SITE_NAME = "Mint";
const PERSON_ID = `${SITE_ORIGIN}/#mint`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const PERSON_REF = { "@type": "Person", "@id": PERSON_ID, name: "Mint Ryu", url: `${SITE_ORIGIN}/` };
const SHARE_IMAGE = { url: `${SITE_ORIGIN}/mascots/hachiware-sticker.png`, type: "image/png", width: "598", height: "640" };
const OG_LOCALES = { "zh-CN": "zh_CN", "zh-TW": "zh_TW", ko: "ko_KR", en: "en_US" };
const X_HANDLE = "@Ryusoohow";
const AVATAR = { path: "/avatar.jpg", width: 460, height: 460 };

// Mintaria and mignet describe the same person with this @id.
const PERSON = {
  ...PERSON_REF,
  alternateName: ["Mint", "MINT RYU"],
  image: { "@type": "ImageObject", url: `${SITE_ORIGIN}${AVATAR.path}`, width: AVATAR.width, height: AVATAR.height },
  description: "独立开发者。做 Windows 实时 AI 变声软件 Mintaria 萌音、Word 桌面印章 mignet 等软件和小工具，也在博客里写 AI、软件开发、音频与韩国生活。",
  email: "mailto:me@mintryu.com",
  knowsAbout: ["C++", "JUCE", "音频插件开发", "实时 AI 语音", "AI 应用", "音乐", "摄影"],
  sameAs: ["https://x.com/Ryusoohow", "https://www.youtube.com/@mint8733", "https://github.com/ysuhao"]
};

// Projects. `links` are the URLs that count as a page showing the project: the homepage ItemList
// names only the projects the page links to, in the order the links appear.
const PROJECTS = [
  {
    links: ["https://mintaria.mintryu.com/"],
    entity: { "@type": "SoftwareApplication", "@id": "https://mintaria.mintryu.com/#app", name: "Mintaria 萌音", url: "https://mintaria.mintryu.com/", applicationCategory: "MultimediaApplication", operatingSystem: "Windows x64", isAccessibleForFree: true, description: "免费的 Windows 本地实时 AI 变声软件，声音在本机处理、不上传，适合游戏开黑、语音聊天和直播。" }
  },
  {
    links: ["https://mintaria.mintryu.com/android/"],
    entity: { "@type": "MobileApplication", "@id": "https://mintaria.mintryu.com/android/#app", name: "Mintaria Mobile（Mintaria 安卓版）", url: "https://mintaria.mintryu.com/android/", applicationCategory: "MultimediaApplication", operatingSystem: "Android 8.0+", description: "安卓手机上的录音变声 App：录一段话，在手机里变成另一个声音再播放，方便发微信、QQ 语音。不用 root，声音只在手机里处理。一次买断，与电脑版分开购买。" }
  },
  {
    links: ["https://mignet.mintryu.com/"],
    entity: { "@type": "SoftwareApplication", "@id": "https://mignet.mintryu.com/#app", name: "mignet", url: "https://mignet.mintryu.com/", applicationCategory: "BusinessApplication", operatingSystem: "Windows 10, Windows 11", isAccessibleForFree: true, license: "https://www.gnu.org/licenses/gpl-3.0.html", codeRepository: "https://github.com/ysuhao/mignet", description: "常驻 Windows 桌面的实体印章：在 Word 文档上拿起、瞄准、单击落章。免费下载，GPLv3 开源。" }
  },
  {
    links: ["https://melorb.mintryu.com/"],
    entity: { "@type": "SoftwareApplication", "@id": "https://melorb.mintryu.com/#app", name: "Melorb 弥洛", url: "https://melorb.mintryu.com/", applicationCategory: "MultimediaApplication", operatingSystem: "Windows", description: "开发中的 Windows 直播混音声卡机架：用 Stream 与 Monitor 母泡安排观众和自己听到的混音，每份分身有独立效果链。尚未开放下载。" }
  },
  {
    links: [`${SITE_ORIGIN}/works/hansa/`],
    entity: { "@type": "MobileApplication", "@id": `${SITE_ORIGIN}/works/hansa/#app`, name: "HANSA 韩学事", url: `${SITE_ORIGIN}/works/hansa/`, applicationCategory: "EducationalApplication", operatingSystem: "Android", softwareVersion: "1.1.0", description: "为高丽大学首尔与世宗校区留学生整理学校公告、课表、作业和 A 饭记账的校园助手。" }
  },
  {
    links: [`${SITE_ORIGIN}/works/mint-final-channel/`],
    entity: { "@type": "SoftwareApplication", "@id": `${SITE_ORIGIN}/works/mint-final-channel/#app`, name: "Mint Final Channel（Mint 的混音通道条）", url: `${SITE_ORIGIN}/works/mint-final-channel/`, applicationCategory: "MultimediaApplication", applicationSubCategory: "VST3 音频插件", operatingSystem: "Windows x64", softwareVersion: "0.1.0", isAccessibleForFree: true, license: "https://opensource.org/licenses/MIT", codeRepository: "https://github.com/ysuhao/mint-final-channel", downloadUrl: "https://github.com/ysuhao/mint-final-channel/releases/latest", description: "同时为直播新手和专业创作者设计的双模式 VST3 混音通道条：Simple 一键处理，Formal 展开完整混音控制，音频全部在本地处理。" }
  },
  {
    links: [`${SITE_ORIGIN}/works/ai-guide/`, "https://ai.mintryu.com/"],
    entity: { "@type": "WebApplication", "@id": "https://ai.mintryu.com/#app", name: "mintguide · AI 订阅向导", url: "https://ai.mintryu.com/", applicationCategory: "ReferenceApplication", isAccessibleForFree: true, description: "面向中国大陆新手的 ChatGPT、Claude、Grok、Gemini 订阅准备向导，用卡片分支一步步理清该准备什么、要注意什么。" }
  },
  {
    links: [`${SITE_ORIGIN}/works/haoyi-check/`],
    entity: { "@type": "WebApplication", "@id": `${SITE_ORIGIN}/works/haoyi-check/#app`, name: "豪意值检测", url: `${SITE_ORIGIN}/works/haoyi-check/`, applicationCategory: "EntertainmentApplication", isAccessibleForFree: true, description: "15 道题量化你的豪意值：阴阳、自嘲，但不刻薄。" }
  },
  {
    links: ["https://live.mintryu.com/"],
    entity: { "@type": "WebApplication", "@id": "https://live.mintryu.com/#app", name: "Mint 同传", url: "https://live.mintryu.com/", applicationCategory: "CommunicationApplication", isAccessibleForFree: true, description: "韩语与普通话双向实时语音同传，扫码收听与查看字幕。" }
  },
  {
    links: [`${SITE_ORIGIN}/works/persona-check/`, `${SITE_ORIGIN}/persona-check/`],
    entity: { "@type": "WebApplication", "@id": `${SITE_ORIGIN}/persona-check/#app`, name: "人格验牌", url: `${SITE_ORIGIN}/persona-check/`, applicationCategory: "EntertainmentApplication", isAccessibleForFree: true, description: "16 道站队题，验出你的中文互联网圈层身份与精神内核。" }
  }
];
const projectByLink = (link) => PROJECTS.find((project) => project.links.includes(link))?.entity;

// Static pages besides the homepage. `description` is only used when the page has none of its own.
const PRESENTATIONS = "/presentations/";
const PAGES = {
  "/works/": { name: "其他作品", collection: true },
  "/presentations/": { name: "发表目录", collection: true },
  "/presentations/figma-ax/": { parent: PRESENTATIONS, presentation: true },
  "/presentations/jochiwon-bm/": { parent: PRESENTATIONS, presentation: true },
  "/presentations/jwcc-ucm/": { parent: PRESENTATIONS, presentation: true, description: "JEDI에서 JWCC, 그리고 UCM까지. 미 국방부의 클라우드 구매 방식이 어떻게 바뀌었고 정보시스템 관리에 어떤 과제를 남겼는지 다룬 고려대학교 MIS 발표입니다." },
  "/presentations/geo-interactive/": { parent: PRESENTATIONS, presentation: true },
  "/presentations/esg-strategy/": { parent: PRESENTATIONS, presentation: true, description: "基于消费者偏好的联合分析研究：从属性筛选、方案卡设计，到效用推导和市场细分，梳理 ESG 经营活动战略设计的完整思路。" },
  "/works/geo-classroom/": { parent: PRESENTATIONS, presentation: true },
  "/works/hansa/": { project: `${SITE_ORIGIN}/works/hansa/` },
  "/works/mint-final-channel/": { project: `${SITE_ORIGIN}/works/mint-final-channel/` },
  "/works/ai-guide/": { project: `${SITE_ORIGIN}/works/ai-guide/` },
  "/works/haoyi-check/": { project: `${SITE_ORIGIN}/works/haoyi-check/` },
  "/works/persona-check/": { project: `${SITE_ORIGIN}/works/persona-check/` },
  "/persona-check/": { project: `${SITE_ORIGIN}/persona-check/` }
};

const escape = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const unescape = (text) => text.replace(/&(amp|lt|gt|quot|#0?39);/g, (_all, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'", "#39": "'" })[name]);
const languageOf = (value) => ["zh-TW", "ko", "en"].includes(value ?? "") ? value : "zh-CN";
const articleHref = (post, language) => `/blog/${encodeURIComponent(post.slug)}${language === "zh-CN" ? "" : `?lang=${language}`}`;

function jsonLd(data) {
  const body = JSON.stringify({ "@context": "https://schema.org", ...data })
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<script type="application/ld+json">${body}</script>`;
}

// The homepage's #latest-posts: the newest post as a featured card, then up to four rows.
export function renderPostCards(posts, language) {
  if (!posts.length) return '<p class="posts-status">第一篇文章正在路上。欢迎稍后再来。</p>';
  const parts = (post) => {
    const date = (post.publishedAt ?? post.updatedAt).slice(0, 10);
    return {
      href: escape(articleHref(post, language)),
      time: `<time class="mono" datetime="${escape(date)}">${escape(date.replaceAll("-", "."))}</time>`,
      title: escape(post.title),
      lang: post.contentLanguage
    };
  };
  const [latest, ...rest] = posts;
  const top = parts(latest);
  const featured = `<a class="featured" href="${top.href}"><span class="kicker mono">Latest ✦ 最新</span><h3 lang="${top.lang}">${top.title}</h3>${latest.excerpt ? `<p lang="${top.lang}">${escape(latest.excerpt)}</p>` : ""}${top.time}</a>`;
  const rows = rest.slice(0, 4).map((post) => {
    const row = parts(post);
    return `<li><a href="${row.href}">${row.time}<strong lang="${row.lang}">${row.title}</strong><span class="arrow" aria-hidden="true">↗</span></a></li>`;
  }).join("");
  return rows ? `${featured}<ol class="posts">${rows}</ol>` : featured;
}

async function blogPosts(env, language, limit) {
  const posts = [];
  let offset = 0;
  while (offset !== null && posts.length < limit) {
    const api = await env.BLOG_SERVICE.fetch(`${SITE_ORIGIN}/api/blog/posts?view=summary&limit=${Math.min(50, limit - posts.length)}&offset=${offset}&lang=${language}`, { signal: AbortSignal.timeout(4e3) });
    if (!api.ok) throw new Error(`Blog returned ${api.status}`);
    const page = await api.json();
    posts.push(...page.posts);
    offset = page.nextOffset ?? null;
  }
  return posts;
}

function robotsTxt() {
  return [
    "# Public pages on mintryu.com may be crawled by search engines and AI assistants.",
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    ""
  ].join("\n");
}

function sitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE_ORIGIN}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${SITE_ORIGIN}/blog/sitemap.xml</loc></sitemap></sitemapindex>\n`;
}

// Static pages carry no reliable modification date, so no lastmod is claimed for them.
function pagesSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...Object.keys(PAGES)].map((path) => `<url><loc>${SITE_ORIGIN}${path}</loc></url>`).join("")}</urlset>\n`;
}

async function llmsTxt(env) {
  let posts = [];
  try {
    posts = await blogPosts(env, "zh-CN", 200);
  } catch {
    // The rest of the file is still useful without the article list.
  }
  const projectLines = [
    "- [Mintaria 萌音](https://mintaria.mintryu.com/)：免费的 Windows 本地实时 AI 变声软件，声音在本机处理、不上传；版本、音色、价格与下载以官网为准，详见 https://mintaria.mintryu.com/llms.txt",
    "- [Mintaria Mobile（安卓版）](https://mintaria.mintryu.com/android/)：安卓手机上的录音变声 App，录一段话在手机里换个声音，方便发微信、QQ 语音；不用 root，声音只在手机里处理，一次买断，与电脑版分开购买",
    "- [mignet](https://mignet.mintryu.com/)：常驻 Windows 桌面的实体印章，在 Word 文档上拿起、瞄准、单击落章；免费下载，GPLv3 开源（https://github.com/ysuhao/mignet）",
    "- [Melorb 弥洛](https://melorb.mintryu.com/)：开发中的 Windows 直播混音声卡机架，用 Stream 与 Monitor 母泡分开观众和自己听到的混音；尚未开放下载，详见 https://melorb.mintryu.com/llms.txt",
    "- [Mint 同传](https://live.mintryu.com/)：韩语与普通话双向实时语音同传，扫码收听与查看字幕",
    `- [HANSA 韩学事](${SITE_ORIGIN}/works/hansa/)：为高丽大学首尔与世宗校区留学生整理学校公告、课表、作业和 A 饭记账的 Android 校园助手`,
    `- [Mint Final Channel](${SITE_ORIGIN}/works/mint-final-channel/)：同时为直播新手和专业创作者设计的双模式 VST3 混音通道条（开发中）；0.1.0 Windows x64 版与 MIT 开源代码见 https://github.com/ysuhao/mint-final-channel`,
    `- [AI 订阅向导 mintguide](https://ai.mintryu.com/)：面向中国大陆新手的 ChatGPT / Claude / Grok / Gemini 订阅准备向导；介绍页 ${SITE_ORIGIN}/works/ai-guide/`,
    `- [豪意值检测](${SITE_ORIGIN}/works/haoyi-check/)：15 道题的自嘲向互动测验`,
    `- [人格验牌](${SITE_ORIGIN}/persona-check/)：16 道站队题的中文互联网圈层测验`,
    `- [发表目录](${SITE_ORIGIN}/presentations/)：课堂发表与互动演示（Figma AX 与 AI 时代的工具生存、Yext B2B SaaS 商业模式、JWCC UCM、AI Agent 与 GEO、ESG 联合分析）`
  ];
  const postLines = posts.length
    ? posts.map((post) => {
      const url = `${SITE_ORIGIN}/blog/${encodeURIComponent(post.slug)}`;
      const date = (post.publishedAt ?? post.updatedAt).slice(0, 10);
      const summary = post.excerpt ? `：${post.excerpt.replace(/\s+/g, " ").trim()}` : "";
      return `- [${post.title}](${url})${summary}（${date}；Markdown：${url}.md）`;
    })
    : [`- 文章列表暂时无法读取，请访问 ${SITE_ORIGIN}/blog`];
  return [
    "# Mint Ryu（mintryu.com）",
    "",
    "> mintryu.com 是独立开发者 Mint Ryu（Mint）的个人主页和博客。这里汇集 Mint 做的软件与小工具，例如 Windows 实时 AI 变声软件 Mintaria 萌音和 Word 桌面印章 mignet，以及用中文写的关于 AI、软件开发、音频和韩国生活的文章，部分文章有繁体中文、韩语和英语译文。",
    "",
    "English: mintryu.com is the personal site and blog of indie developer Mint Ryu. It links to Mint's software (the Windows real-time AI voice changer Mintaria and the Word desktop stamp mignet, among others) and hosts Chinese-language articles on AI, software, audio and life in Korea, many with Traditional Chinese, Korean and English translations.",
    "",
    "## 作者",
    "- 名字：Mint Ryu（也写作 Mint、MINT RYU）",
    `- 主页：${SITE_ORIGIN}/`,
    "- 邮箱：me@mintryu.com",
    "- X：https://x.com/Ryusoohow ；YouTube：https://www.youtube.com/@mint8733 ；GitHub：https://github.com/ysuhao",
    "",
    "## 软件与作品",
    ...projectLines,
    "",
    "## 博客文章",
    `- 文章列表：${SITE_ORIGIN}/blog ；RSS：${SITE_ORIGIN}/blog/rss.xml`,
    "- 在文章网址后加 .md 可取得 Markdown 原文；加 ?lang=zh-TW、?lang=ko 或 ?lang=en 可读译文（仅在有译文时提供）。",
    ...postLines,
    ""
  ].join("\n");
}

function textResponse(request, body, contentType) {
  return new Response(request.method === "HEAD" ? null : body, { headers: { "content-type": contentType, "cache-control": "public, max-age=3600" } });
}

// Collects what a page already declares, then adds the share tags it lacks at </head> and JSON-LD at </body>.
function discoveryRewriter(rewriter, path) {
  const page = PAGES[path];
  const canonical = `${SITE_ORIGIN}${path}`;
  const state = { lang: "zh-CN", title: "", description: "", ogImage: "", tags: new Set(), hasLd: false, links: new Set() };
  return rewriter
    .on("html", { element(element) { state.lang = element.getAttribute("lang") || state.lang; } })
    .on("head title", { text(chunk) { state.title += chunk.text; } })
    .on("head meta", {
      element(element) {
        const key = element.getAttribute("property") || element.getAttribute("name");
        if (!key) return;
        state.tags.add(key);
        if (key === "description") state.description = unescape(element.getAttribute("content") ?? "");
        if (key === "og:image") state.ogImage = element.getAttribute("content") ?? "";
      }
    })
    .on('head link[rel="canonical"]', { element() { state.tags.add("canonical"); } })
    .on('script[type="application/ld+json"]', { element() { state.hasLd = true; } })
    .on("a[href]", {
      element(element) {
        try {
          state.links.add(new URL(element.getAttribute("href"), canonical).href.replace(/#.*$/, "").replace(/^(https:\/\/[^/]+)$/, "$1/"));
        } catch {
          // Ignore hrefs that are not URLs.
        }
      }
    })
    .on("head", {
      element(element) {
        element.onEndTag((end) => {
          const title = unescape(state.title.replace(/\s+/g, " ").trim());
          const description = state.description || page?.description || "";
          const missing = (key) => !state.tags.has(key);
          const tags = [];
          if (missing("canonical")) tags.push(`<link rel="canonical" href="${canonical}">`);
          if (missing("description") && description) tags.push(["name", "description", description]);
          if (missing("og:type")) tags.push(["property", "og:type", "website"]);
          if (missing("og:site_name")) tags.push(["property", "og:site_name", SITE_NAME]);
          if (missing("og:locale")) tags.push(["property", "og:locale", OG_LOCALES[state.lang] ?? "zh_CN"]);
          if (missing("og:title") && title) tags.push(["property", "og:title", title]);
          if (missing("og:description") && description) tags.push(["property", "og:description", description]);
          if (missing("og:url")) tags.push(["property", "og:url", canonical]);
          const image = state.ogImage || SHARE_IMAGE.url;
          if (missing("og:image")) tags.push(["property", "og:image", image]);
          if (image === SHARE_IMAGE.url && missing("og:image:width")) {
            tags.push(["property", "og:image:type", SHARE_IMAGE.type], ["property", "og:image:width", SHARE_IMAGE.width], ["property", "og:image:height", SHARE_IMAGE.height]);
          }
          if (missing("og:image:alt") && title) tags.push(["property", "og:image:alt", title]);
          if (missing("twitter:card")) tags.push(["name", "twitter:card", image === SHARE_IMAGE.url ? "summary" : "summary_large_image"]);
          if (missing("twitter:creator")) tags.push(["name", "twitter:creator", X_HANDLE]);
          if (path === "/") tags.push(`<link rel="alternate" type="application/rss+xml" title="Mint Ryu 的博客" href="${SITE_ORIGIN}/blog/rss.xml">`);
          end.before(tags.map((tag) => typeof tag === "string" ? tag : `<meta ${tag[0]}="${tag[1]}" content="${escape(tag[2])}">`).join(""), { html: true });
        });
      }
    })
    .on("body", {
      element(element) {
        element.onEndTag((end) => {
          if (state.hasLd) return;
          const graph = path === "/" ? homeGraph(state) : page ? pageGraph(path, page, state) : null;
          if (graph) end.before(jsonLd({ "@graph": graph }), { html: true });
        });
      }
    });
}

function homeGraph(state) {
  const shown = [...new Set([...state.links].map(projectByLink).filter(Boolean))];
  return [
    PERSON,
    { "@type": "WebSite", "@id": WEBSITE_ID, url: `${SITE_ORIGIN}/`, name: "Mint.", alternateName: "Mint Ryu", inLanguage: state.lang, author: { "@id": PERSON_ID }, publisher: { "@id": PERSON_ID } },
    {
      "@type": "ProfilePage",
      "@id": `${SITE_ORIGIN}/#webpage`,
      url: `${SITE_ORIGIN}/`,
      name: unescape(state.title.trim()),
      ...state.description ? { description: state.description } : {},
      inLanguage: state.lang,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": PERSON_ID },
      ...shown.length ? { hasPart: { "@id": `${SITE_ORIGIN}/#works` } } : {}
    },
    ...shown.length ? [{
      "@type": "ItemList",
      "@id": `${SITE_ORIGIN}/#works`,
      name: "Mint Ryu 的作品",
      itemListElement: shown.map((entity, index) => ({ "@type": "ListItem", position: index + 1, item: { ...entity, author: PERSON_REF } }))
    }] : []
  ];
}

function pageGraph(path, page, state) {
  const url = `${SITE_ORIGIN}${path}`;
  const name = unescape(state.title.replace(/\s+/g, " ").trim());
  const description = state.description || page.description;
  const project = page.project ? projectByLink(page.project) : null;
  const crumbs = [{ name: "Mint", item: `${SITE_ORIGIN}/` }];
  if (page.parent) crumbs.push({ name: PAGES[page.parent].name, item: `${SITE_ORIGIN}${page.parent}` });
  crumbs.push({ name, item: url });
  return [
    {
      "@type": page.collection ? "CollectionPage" : "WebPage",
      "@id": `${url}#webpage`,
      url,
      name,
      ...description ? { description } : {},
      inLanguage: state.lang,
      isPartOf: { "@type": "WebSite", "@id": WEBSITE_ID, url: `${SITE_ORIGIN}/`, name: "Mint." },
      ...project ? { mainEntity: { ...project, author: PERSON_REF } } : {},
      ...page.presentation ? { mainEntity: { "@type": "PresentationDigitalDocument", name, inLanguage: state.lang, url } } : {},
      breadcrumb: { "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })) }
    }
  ];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/robots.txt") return textResponse(request, robotsTxt(), "text/plain; charset=utf-8");
    if (url.pathname === "/sitemap.xml") return textResponse(request, sitemapIndex(), "application/xml; charset=utf-8");
    if (url.pathname === "/sitemap-pages.xml") return textResponse(request, pagesSitemap(), "application/xml; charset=utf-8");
    if (url.pathname === "/llms.txt") return textResponse(request, await llmsTxt(env), "text/plain; charset=utf-8");
    // The avatar replaced an earlier photo at /avatar.webp; that asset must not be served any more.
    if (url.pathname === "/avatar.webp") return Response.redirect(`${SITE_ORIGIN}${AVATAR.path}`, 301);
    if (url.pathname === AVATAR.path) {
      const bytes = Uint8Array.from(atob(AVATAR_JPEG_BASE64), (char) => char.charCodeAt(0));
      return new Response(request.method === "HEAD" ? null : bytes, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) return response;

    let rewriter = new HTMLRewriter();
    const headers = new Headers(response.headers);
    headers.delete("etag");
    if (url.pathname === "/") {
      const language = languageOf(url.searchParams.get("lang"));
      let cards;
      try {
        cards = renderPostCards(await blogPosts(env, language, 5), language);
      } catch {
        cards = '<p class="posts-status">文章暂时无法加载。<a href="/blog">前往文章列表 ↗</a></p>';
      }
      const blogHref = language === "zh-CN" ? "/blog" : `/blog?lang=${language}`;
      rewriter = rewriter.on("#latest-posts", { element(element) {
        element.setInnerContent(cards, { html: true });
      } }).on("#blog-all", { element(element) {
        element.setAttribute("href", blogHref);
      } }).on(".langs a[data-language]", { element(element) {
        const active = element.getAttribute("data-language") === language;
        if (active) {
          element.setAttribute("class", "is-active");
          element.setAttribute("aria-current", "page");
        } else {
          element.removeAttribute("class");
          element.removeAttribute("aria-current");
        }
      } });
      headers.set("cache-control", "no-cache");
    }
    const rewritten = discoveryRewriter(rewriter, url.pathname).transform(new Response(response.body, { status: response.status, headers }));
    return new Response(request.method === "HEAD" ? null : rewritten.body, { status: rewritten.status, headers: rewritten.headers });
  }
};

// Claude-themed avatar (460x460 JPEG, same image as github.com/ysuhao), also kept as public/avatar.jpg.
const AVATAR_JPEG_BASE64 = "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";
