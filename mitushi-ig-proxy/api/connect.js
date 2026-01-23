/**
 * Facebook OAuth Connect Endpoint
 * GET /api/connect
 * 
 * Initiates Facebook Login OAuth flow
 * Redirects user to Facebook login page
 */

module.exports = async (req, res) => {
  // Trim whitespace and newlines from environment variables
  const APP_ID = (process.env.META_APP_ID || '').trim();
  const REDIRECT_URI = (process.env.META_REDIRECT_URI || '').trim();

  if (!APP_ID || !REDIRECT_URI) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`
      <html>
        <body style="font-family:system-ui;padding:24px;">
          <h2>❌ Configuration Error</h2>
          <p>Missing META_APP_ID or META_REDIRECT_URI environment variables.</p>
          <p>Please set these in Vercel Dashboard → Settings → Environment Variables</p>
        </body>
      </html>
    `);
  }

  // Simple state for CSRF protection (good enough for self-use)
  const state = Math.random().toString(36).slice(2);

  const scope = [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "business_management"
  ].join(",");

  const url =
    `https://www.facebook.com/v24.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}`;

  // Debug: Log the URL (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('OAuth URL:', url);
    console.log('APP_ID:', APP_ID);
    console.log('REDIRECT_URI:', REDIRECT_URI);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Connect Instagram - MITUSHI</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            padding: 40px 24px;
            max-width: 600px;
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
            color: #333;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #1877F2;
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 16px;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #166FE5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🔗 Connect Instagram</h2>
          <p>Click the button below to connect your Facebook/Instagram account (self-use only).</p>
          <p><small>This will open Facebook login. After approval, you'll receive tokens to add to Vercel.</small></p>
          <a href="${url}" class="btn">Connect with Facebook</a>
        </div>
      </body>
    </html>
  `);
};
