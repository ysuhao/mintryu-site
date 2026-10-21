import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

describe('mintryu blog worker', () => {
  beforeEach(async () => {
    const keys = await env.BLOG_DATA.list();
    await Promise.all(keys.keys.map((key) => env.BLOG_DATA.delete(key.name)));
  });

  it('serves the public blog index', async () => {
    const response = await SELF.fetch('https://mintryu.com/blog');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('博客<span class="dot">.</span>');
  });

  it('serves the admin login page', async () => {
    const response = await SELF.fetch('https://mintryu.com/admin');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('博客后台');
  });

  it('rejects an incorrect password', async () => {
    const response = await SELF.fetch('https://mintryu.com/api/blog/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    expect(response.status).toBe(401);
  });

  it('publishes a post after authentication', async () => {
    const login = await SELF.fetch('https://mintryu.com/api/blog/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com' },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get('set-cookie');
    expect(cookie).toContain('blog_session=');

    const saved = await SELF.fetch('https://mintryu.com/api/blog/admin/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com', cookie: cookie ?? '' },
      body: JSON.stringify({ title: '第一篇', slug: 'first', excerpt: '摘要', content: '正文\n\n![线路截图](/media/example.png)', status: 'published' }),
    });
    expect(saved.status).toBe(200);

    const article = await SELF.fetch('https://mintryu.com/blog/first');
    expect(article.status).toBe(200);
    const articleHtml = await article.text();
    expect(articleHtml).toContain('第一篇');
    expect(articleHtml).toContain('<img class="article-image" src="/media/example.png" alt="线路截图" loading="lazy" decoding="async">');
  });

  it('renders the selected article translation without changing the Chinese original', async () => {
    const login = await SELF.fetch('https://mintryu.com/api/blog/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com' },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    });
    const cookie = login.headers.get('set-cookie');
    const saved = await SELF.fetch('https://mintryu.com/api/blog/admin/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com', cookie: cookie ?? '' },
      body: JSON.stringify({
        title: '中文原文',
        slug: 'language-test',
        excerpt: '中文摘要',
        content: '# 中文原文\n\n中文正文。',
        status: 'published',
        translations: {
          'zh-TW': { title: '繁體原文', excerpt: '繁體摘要', content: '# 繁體原文\n\n繁體正文。' },
          ko: { title: '한국어 원문', excerpt: '한국어 요약', content: '# 한국어 원문\n\n한국어 본문.' },
          en: { title: 'English original', excerpt: 'English excerpt', content: '# English original\n\nEnglish body.' },
        },
      }),
    });
    expect(saved.status).toBe(200);

    const translated = await SELF.fetch('https://mintryu.com/blog/language-test?lang=ko');
    expect(translated.status).toBe(200);
    const translatedHtml = await translated.text();
    expect(translatedHtml).toContain('<html lang="ko">');
    expect(translatedHtml).toContain('한국어 원문');
    expect(translatedHtml).toContain('href="/blog/language-test?lang=en"');
    expect(translatedHtml).not.toContain('中文正文');

    const original = await SELF.fetch('https://mintryu.com/blog/language-test');
    expect(original.status).toBe(200);
    expect(await original.text()).toContain('中文正文');
  });

  it('renders fenced code, captions and blockquotes', async () => {
    const login = await SELF.fetch('https://mintryu.com/api/blog/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com' },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    });
    const cookie = login.headers.get('set-cookie');
    const saved = await SELF.fetch('https://mintryu.com/api/blog/admin/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://mintryu.com', cookie: cookie ?? '' },
      body: JSON.stringify({
        title: '渲染测试',
        slug: 'render-test',
        excerpt: '摘要',
        content: '# 渲染测试\n\n> 写于 2026 年。\n\n```json\n{"ok":true}\n```\n\n![对比图](/media/chart.jpg "来源：独立测试")',
        status: 'published',
      }),
    });
    expect(saved.status).toBe(200);
    const html = await (await SELF.fetch('https://mintryu.com/blog/render-test')).text();
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<pre class="code-block" data-lang="json">');
    expect(html).toContain('{&quot;ok&quot;:true}');
    expect(html).toContain('<figcaption>来源：独立测试</figcaption>');
  });

  it('adds escaped sharing metadata anchored to the production origin', async () => {
    const now = new Date().toISOString();
    await env.BLOG_DATA.put('post:share-test', JSON.stringify({
      title: 'Title "q" <script>x</script>', slug: 'share-test', excerpt: 'Ex & <b>', content: 'Body', coverUrl: '/media/cover-1.png',
      status: 'published', createdAt: now, updatedAt: now, publishedAt: now,
      translations: { en: { title: 'English "q"', excerpt: 'English excerpt', content: 'English body' } },
    }));
    await env.BLOG_DATA.put('post:share-plain', JSON.stringify({
      title: 'Plain', slug: 'share-plain', excerpt: '', content: 'Plain **body**.', coverUrl: 'javascript:alert(1)',
      status: 'published', createdAt: now, updatedAt: now, publishedAt: now,
    }));

    const original = await (await SELF.fetch('https://evil.example/blog/share-test', { headers: { host: 'evil.example' } })).text();
    expect(original).toContain('<link rel="canonical" href="https://mintryu.com/blog/share-test">');
    expect(original).toContain('<meta property="og:title" content="Title &quot;q&quot; &lt;script&gt;x&lt;/script&gt;">');
    expect(original).toContain('<meta name="description" content="Title &quot;q&quot; &lt;script&gt;x&lt;/script&gt; — Ex &amp; &lt;b&gt; — Body">');
    expect(original).toContain('<meta property="og:image" content="https://mintryu.com/media/cover-1.png">');
    expect(original).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(original).not.toContain('evil.example');

    const translated = await (await SELF.fetch('https://mintryu.com/blog/share-test?lang=EN')).text();
    expect(translated).toContain('<meta property="og:url" content="https://mintryu.com/blog/share-test?lang=en">');
    expect(translated).toContain('<meta property="og:title" content="English &quot;q&quot;">');
    expect(translated).toContain('<meta property="og:locale" content="en_US">');

    const fallback = await (await SELF.fetch('https://mintryu.com/blog/share-plain?lang=ko')).text();
    expect(fallback).toContain('<link rel="canonical" href="https://mintryu.com/blog/share-plain">');
    expect(fallback).toContain('<meta name="description" content="Plain — Plain body.">');
    expect(fallback).toContain('<meta property="og:image" content="https://mintryu.com/mascots/hachiware-sticker.png">');
    expect(fallback).toContain('<meta name="twitter:card" content="summary">');
    expect(fallback.slice(0, fallback.indexOf('</head>'))).not.toContain('javascript:');
  });
});

describe('search and AI discovery', () => {
  const day = (date: string) => `${date}T09:00:00.000Z`;
  const seed = async () => {
    const keys = await env.BLOG_DATA.list();
    await Promise.all(keys.keys.map((key) => env.BLOG_DATA.delete(key.name)));
    const posts = [
      { slug: 'oldest', title: '最早', date: '2026-07-01', updated: '2026-07-01' },
      { slug: 'middle', title: '中间', date: '2026-08-01', updated: '2026-09-15' },
      { slug: 'newest', title: '最新', date: '2026-10-01', updated: '2026-10-01' },
    ];
    for (const { slug, title, date, updated } of posts) {
      await env.BLOG_DATA.put(`post:${slug}`, JSON.stringify({
        title, slug, excerpt: `${title}的摘要，写得足够长，可以直接拿来当搜索结果里的描述。`,
        content: `# ${title.split('').join(' ')}\n\n# 正文里的一级标题\n\n第一段。\n\n![图](/media/pic-1.png)`,
        coverUrl: '/media/cover.png', status: 'published', createdAt: day(date), updatedAt: day(updated), publishedAt: day(date),
        translations: slug === 'middle' ? { en: { title: 'Middle </script>', excerpt: 'English excerpt that is long enough to be used.', content: 'English body.' } } : undefined,
      }));
    }
    await env.BLOG_DATA.put('post:draft', JSON.stringify({ title: '草稿', slug: 'draft', excerpt: '', content: 'x', coverUrl: '', status: 'draft', createdAt: day('2026-10-02'), updatedAt: day('2026-10-02'), publishedAt: null }));
  };
  const ldOf = (page: string) => [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));

  beforeEach(seed);

  it('gives the blog index localized metadata, alternates and a Blog graph', async () => {
    const page = await (await SELF.fetch('https://mintryu.com/blog?lang=en')).text();
    expect(page).toContain('<html lang="en">');
    expect(page).toContain("<title>Mint Ryu&#039;s Blog: Notes on AI, Software and Life</title>");
    expect(page).toContain('<link rel="canonical" href="https://mintryu.com/blog?lang=en">');
    expect(page).toContain('<link rel="alternate" hreflang="ko" href="https://mintryu.com/blog?lang=ko">');
    expect(page).toContain('<link rel="alternate" type="application/rss+xml"');
    const [graph] = ldOf(page);
    const blog = graph['@graph'].find((node: { '@type': string }) => node['@type'] === 'Blog');
    expect(blog.author['@id']).toBe('https://mintryu.com/#mint');
    expect(blog.blogPost.map((post: { url: string }) => post.url)).toEqual([
      'https://mintryu.com/blog/newest', 'https://mintryu.com/blog/middle?lang=en', 'https://mintryu.com/blog/oldest',
    ]);
  });

  it('marks up a post with BlogPosting, breadcrumbs, one h1, a byline and neighbouring posts', async () => {
    const page = await (await SELF.fetch('https://mintryu.com/blog/middle')).text();
    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(page).toContain('<h2 id="section-1">正文里的一级标题</h2>');
    expect(page).toContain('<a rel="author" href="/">Mint Ryu</a>');
    expect(page).toContain('更新于 <time datetime="2026-09-15">2026.09.15</time>');
    expect(page).toContain('<meta property="article:modified_time" content="2026-09-15T09:00:00.000Z">');
    expect(page).toContain('<link rel="alternate" type="text/markdown" href="https://mintryu.com/blog/middle.md">');
    expect(page).toMatch(/<section class="more-posts"[\s\S]*href="\/blog\/newest"[\s\S]*href="\/blog\/oldest"/);
    expect(page).not.toContain('href="/blog/draft"');
    const [graph] = ldOf(page);
    const [article, breadcrumbs] = graph['@graph'];
    expect(article).toMatchObject({
      '@type': 'BlogPosting', '@id': 'https://mintryu.com/blog/middle#article', headline: '中间', inLanguage: 'zh-CN',
      datePublished: '2026-08-01T09:00:00.000Z', dateModified: '2026-09-15T09:00:00.000Z',
      author: { '@id': 'https://mintryu.com/#mint', name: 'Mint Ryu' },
      workTranslation: [{ '@id': 'https://mintryu.com/blog/middle?lang=en#article' }],
    });
    expect(breadcrumbs.itemListElement.map((item: { item: string }) => item.item)).toEqual([
      'https://mintryu.com/', 'https://mintryu.com/blog', 'https://mintryu.com/blog/middle',
    ]);
  });

  it('keeps a translated title from closing the JSON-LD script', async () => {
    const page = await (await SELF.fetch('https://mintryu.com/blog/middle?lang=en')).text();
    expect(page).toContain('<html lang="en">');
    const [graph] = ldOf(page);
    expect(graph['@graph'][0]).toMatchObject({ headline: 'Middle </script>', inLanguage: 'en', translationOfWork: { '@id': 'https://mintryu.com/blog/middle#article' } });
  });

  it('serves an RSS feed and a sitemap with hreflang alternates', async () => {
    const feed = await SELF.fetch('https://mintryu.com/blog/rss.xml');
    expect(feed.headers.get('content-type')).toContain('application/rss+xml');
    const feedXml = await feed.text();
    expect(feedXml.match(/<item>/g)).toHaveLength(3);
    expect(feedXml).toContain('<guid isPermaLink="true">https://mintryu.com/blog/newest</guid>');

    const sitemap = await (await SELF.fetch('https://mintryu.com/blog/sitemap.xml')).text();
    expect(sitemap).toContain('<url><loc>https://mintryu.com/blog/middle?lang=en</loc><lastmod>2026-09-15T09:00:00.000Z</lastmod>');
    expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://mintryu.com/blog/middle?lang=en"/>');
    expect(sitemap).not.toContain('/blog/draft');
    expect(sitemap.match(/<loc>/g)).toHaveLength(4 + 4);
  });

  it('serves a Markdown copy that points back to the canonical page', async () => {
    const response = await SELF.fetch('https://mintryu.com/blog/middle.md?lang=en');
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('link')).toBe('<https://mintryu.com/blog/middle?lang=en>; rel="canonical"');
    expect(await response.text()).toContain('# Middle </script>\n\n> English excerpt that is long enough to be used.\n\nEnglish body.');
    const zh = await (await SELF.fetch('https://mintryu.com/blog/oldest.md')).text();
    expect(zh).toContain('![图](https://mintryu.com/media/pic-1.png)');
    expect((await SELF.fetch('https://mintryu.com/blog/draft.md')).status).toBe(404);
  });

  it('keeps the admin page, API and error pages out of search results', async () => {
    expect((await SELF.fetch('https://mintryu.com/admin')).headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect((await SELF.fetch('https://mintryu.com/api/blog/posts')).headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const missing = await SELF.fetch('https://mintryu.com/blog/nope');
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('<meta name="robots" content="noindex">');
  });
});
