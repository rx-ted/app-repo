import type { Context } from 'hono';

const isProduction =
  (typeof process !== 'undefined' ? (process.env.NODE_ENV ?? 'development') : 'development') ===
  'production';

function t(lang: 'zh' | 'en', zh: string, en: string) {
  return lang === 'zh' ? zh : en;
}

function detectLanguage(c: Context): 'zh' | 'en' {
  const accept = c.req.header('accept-language') ?? '';
  return accept.startsWith('zh') ? 'zh' : 'en';
}

export function homeHandler(c: Context) {
  const lang = detectLanguage(c);

  return c.html(`<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8f9fa;
      color: #1a1a2e;
    }
    main { text-align: center; max-width: 600px; padding: 2rem; }
    .logo {
      font-size: 0.75rem;
      color: #6366f1;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 2.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #1a1a2e;
    }
    .subtitle { margin-top: .5rem; color: #6b7280; font-size: 1rem; }
    nav { margin-top: 2rem; display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
    .btn {
      padding: .625rem 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: .5rem;
      color: #1a1a2e;
      text-decoration: none;
      font-size: .875rem;
      font-weight: 500;
      transition: all .15s;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .btn:hover {
      border-color: #6366f1;
      color: #6366f1;
      box-shadow: 0 1px 4px rgba(99,102,241,0.12);
    }
    .btn-disabled {
      padding: .625rem 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: .5rem;
      color: #d1d5db;
      font-size: .875rem;
      font-weight: 500;
      background: #f9fafb;
      cursor: not-allowed;
    }
    .about {
      margin-top: 2.5rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
      text-align: left;
    }
    .about h2 {
      font-size: .8125rem;
      color: #6366f1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 600;
      text-align: center;
      margin-bottom: 1.25rem;
    }
    .features { display: flex; flex-direction: column; gap: .75rem; }
    .feature {
      font-size: .8125rem;
      color: #6b7280;
      line-height: 1.6;
    }
    .feature::before {
      content: '-';
      font-weight: 700;
      font-size: 1.1em;
      color: #000000;
      margin-right: .5rem;
    }
    .feature strong {
      color: #1a1a2e;
      font-weight: 600;
    }
    .feature a {
      color: #6366f1;
      text-decoration: none;
    }
    .feature a:hover { text-decoration: underline; }
    .author {
      margin-top: 1.5rem;
      text-align: center;
    }
    .author a {
      color: #9ca3af;
      font-size: .8125rem;
      text-decoration: none;
      transition: color .15s;
    }
    .author a:hover { color: #6366f1; }
  </style>
</head>
<body>
  <main>
    <p class="logo">api.rx-ted.dev</p>
    <h1>Blog API</h1>
    <p class="subtitle">${t(lang, '博客平台 RESTful API', 'RESTful API for blog platform')}</p>
    <nav>
      ${
        isProduction
          ? `<span class="btn-disabled">${t(lang, 'API 文档', 'API Documentation')}</span>`
          : `<a class="btn" href="/docs">${t(lang, 'API 文档', 'API Documentation')}</a>`
      }
      ${
        isProduction
          ? `<span class="btn-disabled">${t(lang, 'OpenAPI 规范', 'OpenAPI Spec')}</span>`
          : `<a class="btn" href="/openapi.json">${t(lang, 'OpenAPI 规范', 'OpenAPI Spec')}</a>`
      }
    </nav>
    <section class="about">
      <h2>${t(lang, '关于', 'About')}</h2>
      <div class="features">
        <div class="feature"><strong>${t(lang, '文章管理', 'Content')}</strong> — ${t(
          lang,
          '草稿/发布/归档工作流，Markdown 编辑，版本历史，软删除',
          'Draft/published/archived workflow, Markdown editing, revision history, soft delete',
        )}</div>
        <div class="feature"><strong>${t(lang, '认证与授权', 'Auth & Authorization')}</strong> — ${t(
          lang,
          'JWT 令牌认证，RBAC 角色模型，资源级权限控制',
          'JWT token auth, RBAC role model, resource-level permission control',
        )}</div>
        <div class="feature"><strong>${t(lang, '多运行时', 'Multi-runtime')}</strong> — ${t(
          lang,
          '支持 Deno / Bun / Node.js / Cloudflare Workers 部署',
          'Deployable on Deno, Bun, Node.js, and Cloudflare Workers',
        )}</div>
        <div class="feature" style="color: #9ca3af;">${t(
          lang,
          '以及评论系统、全文搜索、WebSocket 实时推送等更多功能',
          'Plus comments, full-text search, real-time WebSocket, and more',
        )}</div>
      </div>
      <div class="author">
        <a href="https://github.com/rx-ted" target="_blank" rel="noopener noreferrer">github.com/rx-ted</a>
      </div>
    </section>
  </main>
</body>
</html>`);
}
