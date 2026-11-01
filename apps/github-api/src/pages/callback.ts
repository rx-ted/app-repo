import type { Context } from 'hono';

export function callbackHandler(c: Context) {
  const origin = new URL(c.req.url).origin;

  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub API 登录与回调</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f8fa; color: #1f2328; padding: 2rem; }
    main { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    code { background: #f6f8fa; padding: .15rem .35rem; border-radius: 4px; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow: auto; white-space: pre-wrap; }
    button { padding: .6rem 1rem; border: 1px solid #1f2328; border-radius: 6px; background: #1f2328; color: #fff; cursor: pointer; margin: .25rem; }
    button.secondary { background: #fff; color: #1f2328; }
    a { color: #0969da; }
    .row { margin: .75rem 0; }
    input { width: 100%; padding: .5rem; border: 1px solid #d0d7de; border-radius: 6px; box-sizing: border-box; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  </style>
</head>
<body>
  <main>
    <h1>GitHub API 登录与手动回调页</h1>
    <p>这个页面把 web-blog 的 GitHub 登录入口和手动 OAuth 回调调试整合在一起。当前 origin：<code id="origin"></code></p>

    <h2>1. 配置</h2>
    <div class="grid">
      <div class="row">
        <label>API Base URL</label>
        <input id="baseUrl" value="${origin}" />
      </div>
      <div class="row">
        <label>平台回调域名（可选）</label>
        <input id="platformBase" value="https://api.19981204.xyz" />
      </div>
    </div>
    <div class="row">
      <label>username（github-api 登录用）</label>
      <input id="username" value="tester" />
    </div>

    <h2>2. 发起登录</h2>
    <div class="row">
      <button onclick="startGithubApiLogin()">开始 github-api GitHub 登录</button>
      <button class="secondary" onclick="startPlatformLogin()">开始平台 GitHub 登录</button>
      <button class="secondary" onclick="loadFromUrl()">从当前 URL 读取 code/state</button>
    </div>
    <p>github-api 授权 URL：<a id="githubApiAuthLink" href="#" target="_blank">尚未生成</a></p>

    <h2>3. 手动回调参数</h2>
    <div class="grid">
      <div class="row">
        <label>code</label>
        <input id="code" />
      </div>
      <div class="row">
        <label>state</label>
        <input id="state" />
      </div>
    </div>
    <div class="row">
      <button onclick="callGithubApiCallback()">调用 github-api 回调</button>
      <button class="secondary" onclick="openPlatformCallback()">打开平台回调 URL</button>
      <button class="secondary" onclick="copyParams()">复制参数</button>
      <button class="secondary" onclick="saveToken()">保存 token 到 localStorage</button>
    </div>
    <p>github-api 回调地址：<a id="githubCallbackLink" href="#" target="_blank">-</a></p>
    <p>平台回调地址：<a id="platformCallbackLink" href="#" target="_blank">-</a></p>

    <h2>4. 结果</h2>
    <pre id="result">等待操作…</pre>
  </main>

  <script>
    document.getElementById('origin').textContent = window.location.origin;

    const baseUrlInput = document.getElementById('baseUrl');
    const platformBaseInput = document.getElementById('platformBase');
    const usernameInput = document.getElementById('username');
    const codeInput = document.getElementById('code');
    const stateInput = document.getElementById('state');
    const result = document.getElementById('result');

    function params() {
      return {
        baseUrl: baseUrlInput.value.trim().replace(/\\/+$/, ''),
        platformBase: platformBaseInput.value.trim().replace(/\\/+$/, ''),
        username: usernameInput.value.trim() || 'tester',
        code: codeInput.value.trim(),
        state: stateInput.value.trim(),
      };
    }

    function githubApiCallbackUrl() {
      const p = params();
      if (!p.code || !p.state) return p.baseUrl + '/api/v1/github/auth/callback';
      return p.baseUrl + '/api/v1/github/auth/callback?code=' + encodeURIComponent(p.code) + '&state=' + encodeURIComponent(p.state);
    }

    function platformCallbackUrl() {
      const p = params();
      if (!p.code || !p.state) return p.platformBase + '/api/v1/auth/oauth/github/callback';
      return p.platformBase + '/api/v1/auth/oauth/github/callback?code=' + encodeURIComponent(p.code) + '&state=' + encodeURIComponent(p.state);
    }

    function refreshLinks() {
      document.getElementById('githubCallbackLink').href = githubApiCallbackUrl();
      document.getElementById('githubCallbackLink').textContent = githubApiCallbackUrl();
      document.getElementById('platformCallbackLink').href = platformCallbackUrl();
      document.getElementById('platformCallbackLink').textContent = platformCallbackUrl();
    }

    [baseUrlInput, platformBaseInput, codeInput, stateInput].forEach((el) => {
      el.addEventListener('input', refreshLinks);
    });
    refreshLinks();

    function loadFromUrl() {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('code')) codeInput.value = qs.get('code');
      if (qs.get('state')) stateInput.value = qs.get('state');
      refreshLinks();
      result.textContent = '已从 URL 读取 code/state';
    }

    async function startGithubApiLogin() {
      const p = params();
      result.textContent = '正在获取 github-api GitHub 授权 URL…';
      try {
        const redirectUri = p.baseUrl + '/callback';
        const url = p.baseUrl + '/api/v1/github/auth/url?username=' + encodeURIComponent(p.username) + '&redirectUri=' + encodeURIComponent(redirectUri);
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        const link = document.getElementById('githubApiAuthLink');
        link.href = data.url;
        link.textContent = data.url;
        result.textContent = JSON.stringify(data, null, 2);
        window.location.href = data.url;
      } catch (err) {
        result.textContent = String(err);
      }
    }

    function startPlatformLogin() {
      const p = params();
      const redirect = encodeURIComponent('/');
      window.location.href = p.platformBase + '/api/v1/auth/oauth/github?redirect=' + redirect;
    }

    async function callGithubApiCallback() {
      const el = result;
      const url = githubApiCallbackUrl();
      el.textContent = '请求中…';
      try {
        const res = await fetch(url, { credentials: 'include' });
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          result.textContent = JSON.stringify(json, null, 2);
          if (json.accessToken || json.token) {
            window.__lastGithubApiToken = json.accessToken || json.token;
          }
        } catch {
          result.textContent = text;
        }
      } catch (err) {
        result.textContent = String(err);
      }
    }

    function openPlatformCallback() {
      window.location.href = platformCallbackUrl();
    }

    function copyParams() {
      const p = params();
      navigator.clipboard.writeText('code=' + p.code + '&state=' + p.state).then(() => {
        result.textContent = '已复制参数';
      });
    }

    function saveToken() {
      const token = window.__lastGithubApiToken;
      if (!token) {
        result.textContent = '没有可保存的 token，请先调用 github-api 回调';
        return;
      }
      localStorage.setItem('github-api-token', token);
      result.textContent = 'token 已保存到 localStorage: github-api-token';
    }

    loadFromUrl();
  </script>
</body>
</html>`);
}