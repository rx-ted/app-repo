import type { IDocRenderer } from '../interfaces/renderer.interface';

export class SwaggerRenderer implements IDocRenderer {
  readonly name = 'swagger';

  renderHtml(config: { specUrl: string; uiTitle: string }): string {
    const { specUrl, uiTitle } = config;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHtml(uiTitle)}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    const savedAuth = localStorage.getItem('swagger_auth');
    let authorizations = [];
    if (savedAuth) {
      try {
        authorizations = JSON.parse(savedAuth);
      } catch (e) {
        console.error('Failed to parse saved auth:', e);
      }
    }

    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "${this.escapeJsString(specUrl)}",
        dom_id: '#swagger-ui',
        responseInterceptor: function(res) {
          if (res.obj && res.obj.data) {
            res.obj = res.obj.data;
          }
          return res;
        },
        onComplete: function() {
          if (authorizations.length > 0) {
            authorizations.forEach(auth => {
              window.ui.preauthorizeApiKey(auth.name, auth.value);
            });
          }

          const originalAuthorize = window.ui.authorize;
          window.ui.authorize = function() {
            const result = originalAuthorize.apply(this, arguments);
            const currentAuth = [];
            const securityDefinitions = window.ui.spec().securityDefinitions || {};
            Object.keys(securityDefinitions).forEach(name => {
              const auth = window.ui.auth().data[name];
              if (auth) {
                currentAuth.push({ name, value: auth });
              }
            });
            localStorage.setItem('swagger_auth', JSON.stringify(currentAuth));
            return result;
          };

          const originalLogout = window.ui.logout;
          window.ui.logout = function() {
            const result = originalLogout.apply(this, arguments);
            localStorage.removeItem('swagger_auth');
            return result;
          };
        }
      });
    };
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
