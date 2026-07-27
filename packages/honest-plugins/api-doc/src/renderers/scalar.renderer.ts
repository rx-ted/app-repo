import type { IDocRenderer } from '../interfaces/renderer.interface';

export class ScalarRenderer implements IDocRenderer {
  readonly name = 'scalar';

  renderHtml(config: { specUrl: string; uiTitle: string }): string {
    const { specUrl, uiTitle } = config;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(uiTitle)}</title>
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.52.6/dist/browser/standalone.min.js"></script>
  <script>
    (async function() {
      const savedAuth = localStorage.getItem('scalar_auth');
      let parsedAuth = {};
      if (savedAuth) {
        try {
          parsedAuth = JSON.parse(savedAuth);
        } catch(e) {
          console.error('Failed to parse saved auth:', e);
        }
      }

      try {
        const res = await fetch('${this.escapeJsString(specUrl)}');
        const body = await res.json();
        const spec = body && body.data ? body.data : body;

        Scalar.createApiReference(document.getElementById('app'), {
          spec: { content: spec },
          authentication: {
            preferredSecurityScheme: 'bearerAuth',
            ...parsedAuth
          }
        });
      } catch(e) {
        console.error('Failed to load API spec:', e);
        document.getElementById('app').textContent = 'Failed to load API documentation: ' + e.message;
      }

      try {
        const app = document.getElementById('app');
        if (app) {
          app.addEventListener('scalar-authorization-change', function(event) {
            const detail = event.detail;
            if (detail && Object.keys(detail).length > 0) {
              localStorage.setItem('scalar_auth', JSON.stringify(detail));
            } else {
              localStorage.removeItem('scalar_auth');
            }
          });
        }
      } catch(e) {
        console.error('Failed to setup auth listener:', e);
      }
    })();
  </script>
</body>
</html>`.trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeJsString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
