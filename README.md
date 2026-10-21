# mintryu.com · Mint Ryu 的个人主页与博客

[mintryu.com](https://mintryu.com/) 是独立开发者 Mint Ryu（Mint，也写作 MINT RYU）的个人主页和博客，汇集 Mint 做的软件与小工具，以及用中文写的关于 AI、软件开发、音频和韩国生活的文章，部分文章有繁体中文、韩语和英语译文。本仓库是整个站点的部署源码。

**English:** Source of [mintryu.com](https://mintryu.com/), the personal site and blog of indie developer Mint Ryu. It runs on Cloudflare Workers: static pages from `public/`, a home Worker that adds the SEO/GEO layer, and a blog Worker backed by KV.

## 站点上的作品

| 作品 | 说明 | 链接 |
| --- | --- | --- |
| Mintaria 萌音 | 免费的 Windows 本地实时 AI 变声软件 | [官网](https://mintaria.mintryu.com/) · [GitHub](https://github.com/ysuhao/Mintaria) |
| mignet | 在 Word 里拿起、瞄准、落章的 Windows 桌面印章，GPLv3 开源 | [官网](https://mignet.mintryu.com/) · [GitHub](https://github.com/ysuhao/mignet) |
| MINT Final Channel | 双模式中英双语 VST3 混音通道条，MIT 开源 | [作品页](https://mintryu.com/works/mint-final-channel/) · [GitHub](https://github.com/ysuhao/mint-final-channel) |
| HANSA 韩学事 | 高丽大学留学生的 Android 校园助手 | [作品页](https://mintryu.com/works/hansa/) |
| Mint 同传 | 韩语与普通话双向实时语音同传 | [live.mintryu.com](https://live.mintryu.com/) |
| mintguide | AI 订阅准备向导 | [ai.mintryu.com](https://ai.mintryu.com/) |

博客：<https://mintryu.com/blog> · RSS：<https://mintryu.com/blog/rss.xml> · 给 AI 助手读的站点摘要：<https://mintryu.com/llms.txt>

## 目录结构

| 路径 | 内容 |
| --- | --- |
| `public/` | 完整的线上静态文件：首页、作品页、发表、测验、图片。上传资源时会整体替换线上文件，缺失的文件会从站点消失 |
| `home-worker/` | `mintryu-site` Worker：在静态页面前补 canonical、Open Graph、JSON-LD，并生成 `robots.txt`、站点地图和 `llms.txt`，见 [home-worker/README.md](home-worker/README.md) |
| `blog-worker/` | `mintryu-blog` Worker：博客、后台与媒体路由，文章存在 KV 中，见 [blog-worker/README.md](blog-worker/README.md) |
| `wrangler.jsonc` | 根 Worker 的完整配置（`ASSETS`、`BLOG_SERVICE`、`run_worker_first`） |

## SEO / GEO

- `robots.txt` 允许搜索引擎与 AI 助手抓取公开页面，屏蔽 `/admin` 与 `/api/`。
- `sitemap.xml` 是 `sitemap-pages.xml` 与 `blog/sitemap.xml` 的索引；博客站点地图带 hreflang。
- `llms.txt` 列出作者、作品和全部文章，文章网址加 `.md` 可取得 Markdown 原文。
- 页面使用统一的 Person 实体 `https://mintryu.com/#mint`，Mintaria 与 mignet 官网引用同一个 `@id`；作品页带 SoftwareApplication，文章带 BlogPosting 与 BreadcrumbList。

## 部署

部署是手动的，从仓库根目录执行，详细步骤与回滚见 [home-worker/README.md](home-worker/README.md)：

```sh
npx wrangler versions upload --message "…"
npx wrangler versions deploy <version-id>@100%
```

博客 Worker 在 `blog-worker/` 目录内单独部署（`npm run deploy`）。

## 作者

Mint Ryu · <https://mintryu.com/> · me@mintryu.com · [X](https://x.com/Ryusoohow) · [YouTube](https://www.youtube.com/@mint8733)
