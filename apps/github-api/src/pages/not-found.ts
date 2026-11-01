import type { Context } from 'hono';

function t(lang: 'zh' | 'en', zh: string, en: string) {
  return lang === 'zh' ? zh : en;
}

function detectLanguage(c: Context): 'zh' | 'en' {
  const accept = c.req.header('accept-language') ?? '';
  return accept.startsWith('zh') ? 'zh' : 'en';
}

export function notFoundHandler(c: Context) {
  const lang = detectLanguage(c);

  return c.html(
    `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 — Blog API</title>
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
    main { text-align: center; max-width: 520px; padding: 2rem; }
    .code {
      font-size: 5rem;
      font-weight: 800;
      line-height: 1;
      color: #6366f1;
      opacity: 0.12;
      letter-spacing: -0.04em;
    }
    .error-line {
      margin-top: -1.25rem;
      font-size: 0.8125rem;
      color: #9ca3af;
      font-family: ui-monospace, 'SF Mono', monospace;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1.25rem;
      color: #1a1a2e;
    }
    p {
      margin-top: .5rem;
      color: #6b7280;
      font-size: 0.9375rem;
      line-height: 1.6;
    }
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
  </style>
</head>
<body>
  <main>
    <div class="code">404</div>
    <p class="error-line">route not found</p>
    <h1>${t(lang, '页面未找到', 'Page Not Found')}</h1>
    <p>${t(lang, '请求的端点在此服务器上不存在。', 'The requested endpoint does not exist on this server.')}</p>
    <nav>
      <a class="btn" href="/">${t(lang, '首页', 'Home')}</a>
      <a class="btn" href="/docs">${t(lang, 'API 文档', 'API Documentation')}</a>
    </nav>
  </main>
</body>
</html>`,
    404,
  );
}
