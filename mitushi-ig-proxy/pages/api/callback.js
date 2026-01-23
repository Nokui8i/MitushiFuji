/**
 * Facebook OAuth Callback Endpoint
 * GET /api/callback
 * 
 * Handles OAuth callback from Facebook
 * Exchanges code for tokens and retrieves Instagram Business Account info
 */

async function fbJson(url) {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) {
    throw new Error(JSON.stringify(j));
  }
  return j;
}

module.exports = async (req, res) => {
  try {
    // Trim whitespace and newlines from environment variables
    const APP_ID = (process.env.META_APP_ID || '').trim();
    const APP_SECRET = (process.env.META_APP_SECRET || '').trim();
    const REDIRECT_URI = (process.env.META_REDIRECT_URI || '').trim();

    if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(`
        <html>
          <body style="font-family:system-ui;padding:24px;">
            <h2>❌ Configuration Error</h2>
            <p>Missing required environment variables (META_APP_ID, META_APP_SECRET, or META_REDIRECT_URI).</p>
          </body>
        </html>
      `);
    }

    const code = req.query.code;
    if (!code) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(`
        <html>
          <body style="font-family:system-ui;padding:24px;">
            <h2>❌ Missing Code</h2>
            <p>No authorization code received from Facebook.</p>
          </body>
        </html>
      `);
    }

    // 1) Exchange code for short-lived user token
    const token1 = await fbJson(
      `https://graph.facebook.com/v24.0/oauth/access_token` +
      `?client_id=${encodeURIComponent(APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${encodeURIComponent(APP_SECRET)}` +
      `&code=${encodeURIComponent(code)}`
    );

    const shortUserToken = token1.access_token;

    // 2) Exchange short-lived token for long-lived user token (60 days)
    const token2 = await fbJson(
      `https://graph.facebook.com/v24.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(APP_ID)}` +
      `&client_secret=${encodeURIComponent(APP_SECRET)}` +
      `&fb_exchange_token=${encodeURIComponent(shortUserToken)}`
    );

    const longUserToken = token2.access_token;

    // 3) Get pages
    const pages = await fbJson(
      `https://graph.facebook.com/v24.0/me/accounts` +
      `?access_token=${encodeURIComponent(longUserToken)}`
    );

    if (!pages.data || pages.data.length === 0) {
      // Sometimes /me/accounts is empty - show debug help
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Connection Issue - MITUSHI</title>
            <style>
              body {
                font-family: system-ui, sans-serif;
                padding: 24px;
                max-width: 800px;
                margin: 0 auto;
              }
              pre {
                background: #f5f5f5;
                padding: 16px;
                border-radius: 8px;
                overflow-x: auto;
              }
            </style>
          </head>
          <body>
            <h2>⚠️ No Pages Found</h2>
            <p>No pages returned from /me/accounts. This might happen if:</p>
            <ul>
              <li>You don't have Full Control access to the Page</li>
              <li>You didn't approve the required permissions</li>
              <li>The Page is not connected to your Facebook account</li>
            </ul>
            <p><strong>Debug Info:</strong></p>
            <pre>${JSON.stringify({ longUserToken_exists: !!longUserToken, pages }, null, 2)}</pre>
          </body>
        </html>
      `);
    }

    // Self-use: pick first page
    const page = pages.data[0];
    const PAGE_ID = page.id;
    const PAGE_TOKEN = page.access_token;

    // 4) Get Instagram Business Account ID
    const ig = await fbJson(
      `https://graph.facebook.com/v24.0/${encodeURIComponent(PAGE_ID)}` +
      `?fields=instagram_business_account` +
      `&access_token=${encodeURIComponent(PAGE_TOKEN)}`
    );

    const IG_BUSINESS_ID = ig?.instagram_business_account?.id;

    if (!IG_BUSINESS_ID) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Instagram Not Found - MITUSHI</title>
            <style>
              body {
                font-family: system-ui, sans-serif;
                padding: 24px;
                max-width: 800px;
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            <h2>⚠️ Instagram Business Account Not Found</h2>
            <p>The Facebook Page "${page.name}" (ID: ${PAGE_ID}) is not connected to an Instagram Business Account.</p>
            <p>Please ensure:</p>
            <ul>
              <li>Your Instagram account is a Business or Creator account</li>
              <li>The Instagram account is connected to the Facebook Page</li>
            </ul>
          </body>
        </html>
      `);
    }

    // Success! Show tokens to copy
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Connected ✅ - MITUSHI</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 24px;
              max-width: 900px;
              margin: 0 auto;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 32px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h2 {
              margin-top: 0;
              color: #25D366;
            }
            pre {
              background: #1e1e1e;
              color: #0f0;
              padding: 20px;
              border-radius: 8px;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 14px;
              line-height: 1.5;
              overflow-x: auto;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .steps {
              background: #e7f3ff;
              padding: 16px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
            }
            .steps li {
              margin: 8px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✅ Connected Successfully!</h2>
            <p>Your Instagram account is now connected. Copy these values into <strong>Vercel Environment Variables</strong>:</p>
            
            <pre>IG_BUSINESS_ID=${IG_BUSINESS_ID}
IG_PAGE_ACCESS_TOKEN=${PAGE_TOKEN}</pre>

            <div class="warning">
              <strong>⚠️ Important:</strong> Do not share these tokens. They are sensitive credentials.
            </div>

            <div class="steps">
              <strong>Next Steps:</strong>
              <ol>
                <li>Go to <a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a> → Your Project → Settings → Environment Variables</li>
                <li>Add/Update these variables:
                  <ul>
                    <li><code>IG_BUSINESS_ID</code> = ${IG_BUSINESS_ID}</li>
                    <li><code>IG_PAGE_ACCESS_TOKEN</code> = (the long token above)</li>
                  </ul>
                </li>
                <li>Redeploy your project</li>
                <li>Test: <a href="/api/feed?limit=12" target="_blank">/api/feed?limit=12</a></li>
              </ol>
            </div>

            <p><small>Page: ${page.name} (${PAGE_ID})</small></p>
          </div>
        </body>
      </html>
    `);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Error - MITUSHI</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              padding: 24px;
              max-width: 800px;
              margin: 0 auto;
            }
            pre {
              background: #f5f5f5;
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <h2>❌ Callback Error</h2>
          <p>An error occurred during the OAuth callback:</p>
          <pre>${String(e)}</pre>
        </body>
      </html>
    `);
  }
};
