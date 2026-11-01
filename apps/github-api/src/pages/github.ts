import type { Context } from 'hono';

export function githubHandler(c: Context) {
  const origin = new URL(c.req.url).origin;

  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub 登录</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f8fa; color: #1f2328; padding: 2rem; }
    main { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    code { background: #f6f8fa; padding: .15rem .35rem; border-radius: 4px; word-break: break-all; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow: auto; white-space: pre-wrap; }
    button { padding: .6rem 1rem; border: 1px solid #1f2328; border-radius: 6px; background: #1f2328; color: #fff; cursor: pointer; margin: .25rem; }
    button.secondary { background: #fff; color: #1f2328; }
    a { color: #0969da; }
    .row { margin: .75rem 0; }
    input { width: 100%; padding: .5rem; border: 1px solid #d0d7de; border-radius: 6px; box-sizing: border-box; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .card { display: flex; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid #d0d7de; border-radius: 8px; margin-top: 1rem; }
    .card img { width: 64px; height: 64px; border-radius: 50%; }
    .step { padding: .5rem 0; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <main>
    <h1>GitHub 登录与用户基本信息</h1>
    <p>点击 GitHub 登录后，页面会展示从发起登录到获取 GitHub 用户基本信息的全过程。</p>

    <h2>1. 配置</h2>
    <div class="grid">
      <div class="row">
        <label>API Base URL</label>
        <input id="baseUrl" value="${origin}" />
      </div>
    </div>

    <h2>2. 发起登录</h2>
    <div class="row">
      <button onclick="startLogin()">开始 GitHub 登录</button>
      <button class="secondary" onclick="clearProcess()">清空过程记录</button>
      <button class="secondary" onclick="loadFromUrl()">从当前 URL 读取 code/state</button>
    </div>
    <p>当前授权 URL：<a id="authLink" href="#" target="_blank">尚未生成</a></p>

    <h2>3. 回调参数</h2>
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
      <button onclick="exchangeToken()">调用 GitHub API 回调获取基本信息</button>
    </div>

    <h2>4. 登录过程</h2>
    <div id="process"></div>

    <h2>5. GitHub 用户基本信息</h2>
    <div id="userInfo">尚未获取</div>

    <h2>6. 原始响应</h2>
    <pre id="result">等待操作…</pre>

    <p><a href="/">返回首页</a></p>
  </main>

  <script>
    const baseUrlInput = document.getElementById('baseUrl');
    const codeInput = document.getElementById('code');
    const stateInput = document.getElementById('state');
    const processBox = document.getElementById('process');
    const userInfoBox = document.getElementById('userInfo');
    const resultBox = document.getElementById('result');

    function logStep(text) {
      const logs = JSON.parse(sessionStorage.getItem('github-login-process') || '[]');
      logs.push({ time: new Date().toLocaleTimeString(), text });
      sessionStorage.setItem('github-login-process', JSON.stringify(logs));
      renderProcess();
    }

    function renderProcess() {
      const logs = JSON.parse(sessionStorage.getItem('github-login-process') || '[]');
      processBox.innerHTML = logs.map((item) =>
        '<div class="step"><strong>' + item.time + '</strong> ' + escapeHtml(item.text) + '</div>'
      ).join('') || '<div class="step">暂无过程记录</div>';
    }

    function escapeHtml(value) {
      return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function params() {
      return {
        baseUrl: baseUrlInput.value.trim().replace(/\\/+$/, ''),
        code: codeInput.value.trim(),
        state: stateInput.value.trim(),
      };
    }

    function loadFromUrl() {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('code')) codeInput.value = qs.get('code');
      if (qs.get('state')) stateInput.value = qs.get('state');
      resultBox.textContent = '已从 URL 读取 code/state';
    }

    function clearProcess() {
      sessionStorage.removeItem('github-login-process');
      sessionStorage.removeItem('github-last-code');
      renderProcess();
      resultBox.textContent = '已清空过程记录';
    }

    async function startLogin() {
      const p = params();
      resultBox.textContent = '步骤 1：请求 /api/v1/github/auth/url ...';
      logStep('步骤 1：请求 /api/v1/github/auth/url');

      try {
        const redirectUri = p.baseUrl + '/oauth/github/callback';
        const url = p.baseUrl + '/api/v1/github/auth/url?redirectUri=' + encodeURIComponent(redirectUri) + '&source=github&redirect=' + encodeURIComponent('/github') + '&frontend=' + encodeURIComponent(p.baseUrl);
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();

        resultBox.textContent = JSON.stringify(data, null, 2);
        logStep('步骤 1 完成：获取到 GitHub 授权 URL');
        logStep('授权 URL: ' + data.url);
        logStep('state: ' + data.state);

        const link = document.getElementById('authLink');
        link.href = data.url;
        link.textContent = data.url;

        logStep('步骤 2：跳转到 GitHub 授权页');
        window.location.href = data.url;
      } catch (err) {
        resultBox.textContent = String(err);
        logStep('登录失败：' + String(err));
      }
    }

    async function exchangeToken() {
      const p = params();
      if (!p.code || !p.state) {
        resultBox.textContent = '请先提供 code 和 state';
        return;
      }

      logStep('步骤 3：收到 GitHub 回调，code=' + p.code + '，state=' + p.state);
      resultBox.textContent = '步骤 4：调用 /api/v1/github/auth/callback ...';

      try {
        const url = p.baseUrl + '/api/v1/github/auth/callback?code=' + encodeURIComponent(p.code) + '&state=' + encodeURIComponent(p.state);
        logStep('步骤 4：请求 ' + url);
        const res = await fetch(url, { credentials: 'include' });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        if (text.includes('invalid_state')) {
          sessionStorage.removeItem('github-last-code');
          resultBox.textContent = 'state 无效或已过期。请重新点击“开始 GitHub 登录”获取新的授权码。\\n\\n原始响应：' + text;
          return;
        }

        resultBox.textContent = JSON.stringify(data, null, 2);

        if (data && typeof data === 'object') {
          logStep('步骤 4 完成：GitHub 登录成功，login=' + (data.login || 'unknown'));
          if (data.githubUserId) logStep('GitHub 用户 ID: ' + data.githubUserId);
          if (data.name) logStep('用户名/姓名: ' + data.name);
          if (data.email) logStep('邮箱: ' + data.email);

          renderUserInfo(data);
          logStep('步骤 5：已获取并展示 GitHub 用户基本信息');
        } else {
          logStep('回调返回非 JSON 结果');
        }
      } catch (err) {
        resultBox.textContent = String(err);
        logStep('获取基本信息失败：' + String(err));
      }
    }

    function renderUserInfo(data) {
      const login = data.login || '-';
      const avatarSrc = data.avatarUrl || (login !== '-' ? 'https://github.com/' + encodeURIComponent(login) + '.png' : '');
      const avatar = avatarSrc ? '<img src="' + escapeHtml(avatarSrc) + '" alt="avatar" />' : '';
      userInfoBox.innerHTML =
        '<div class="card">' +
        avatar +
        '<div>' +
        '<div><strong>login:</strong> ' + escapeHtml(login) + '</div>' +
        '<div><strong>githubUserId:</strong> ' + escapeHtml(data.githubUserId || '-') + '</div>' +
        '<div><strong>name:</strong> ' + escapeHtml(data.name || login || '未公开') + '</div>' +
        '<div><strong>email:</strong> ' + escapeHtml(data.email || '私有或未公开') + '</div>' +
        '<div><strong>stored:</strong> ' + escapeHtml(data.stored) + '</div>' +
        '</div>' +
        '</div>';
    }

    function init() {
      loadFromUrl();
      renderProcess();

      const qs = new URLSearchParams(window.location.search);
      const incomingCode = qs.get('code');
      const incomingState = qs.get('state');
      if (incomingCode && incomingState) {
        const lastCode = sessionStorage.getItem('github-last-code');
        if (lastCode === incomingCode) {
          logStep('页面加载：当前 code 已处理过，未重复请求，避免 400');
          resultBox.textContent = '当前 code 已处理过。请重新点击“开始 GitHub 登录”获取新的授权码。';
        } else {
          logStep('页面加载：检测到 GitHub 回调参数 code/state');
          sessionStorage.setItem('github-last-code', incomingCode);
          exchangeToken();
        }
      } else {
        logStep('页面加载：等待用户点击 GitHub 登录');
      }
    }

    init();
  </script>
</body>
</html>`);
}