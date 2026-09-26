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
    expect(articleHtml).toContain('<img class="article-image" src="/media/example.png" alt="线路截图" loading="lazy">');
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
    expect(original).toContain('<meta name="description" content="Ex &amp; &lt;b&gt;">');
    expect(original).toContain('<meta property="og:image" content="https://mintryu.com/media/cover-1.png">');
    expect(original).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(original).not.toContain('evil.example');

    const translated = await (await SELF.fetch('https://mintryu.com/blog/share-test?lang=EN')).text();
    expect(translated).toContain('<meta property="og:url" content="https://mintryu.com/blog/share-test?lang=en">');
    expect(translated).toContain('<meta property="og:title" content="English &quot;q&quot;">');
    expect(translated).toContain('<meta property="og:locale" content="en_US">');

    const fallback = await (await SELF.fetch('https://mintryu.com/blog/share-plain?lang=ko')).text();
    expect(fallback).toContain('<link rel="canonical" href="https://mintryu.com/blog/share-plain">');
    expect(fallback).toContain('<meta name="description" content="Plain body.">');
    expect(fallback).toContain('<meta property="og:image" content="https://mintryu.com/mascots/hachiware-sticker.png">');
    expect(fallback).toContain('<meta name="twitter:card" content="summary">');
    expect(fallback.slice(0, fallback.indexOf('</head>'))).not.toContain('javascript:');
  });
});
