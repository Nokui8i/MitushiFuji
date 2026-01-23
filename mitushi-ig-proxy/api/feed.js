/**
 * Instagram Feed Endpoint (OAuth-based)
 * GET /api/feed
 * OPTIONS /api/feed (CORS preflight)
 *
 * Returns Instagram media using tokens from OAuth flow
 */

module.exports = async (req, res) => {
  // ---- CORS (MUST be first, for BOTH OPTIONS + GET) ----
  const origin = req.headers.origin || '';

  // Allow Shopify domains (store + editor + preview)
  const isShopifyOrigin =
    origin.endsWith('.myshopify.com') ||
    origin === 'https://admin.shopify.com';

  // For safety you can hardcode your store too:
  // const isAllowedExact = origin === 'https://mitushii.myshopify.com';

  if (isShopifyOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    // public endpoint (safe) – allow others too
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // IMPORTANT: DO NOT set Allow-Credentials when using '*'
  // res.setHeader('Access-Control-Allow-Credentials', 'true'); // ❌ don't

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const IG_BUSINESS_ID = (process.env.IG_BUSINESS_ID || '').trim();
    const PAGE_TOKEN = (process.env.IG_PAGE_ACCESS_TOKEN || '').trim();

    if (!IG_BUSINESS_ID || !PAGE_TOKEN) {
      return res.status(500).json({
        error: 'Missing environment variables',
        required: ['IG_BUSINESS_ID', 'IG_PAGE_ACCESS_TOKEN'],
        message: 'Run /api/connect to generate tokens, then add them to Vercel env vars.'
      });
    }

    const limit = Math.min(parseInt(req.query.limit || '12', 10), 24);

    // include product_type for REELS detection
    const fields =
      'id,caption,media_type,media_url,permalink,thumbnail_url,product_type,timestamp';

    const url =
      `https://graph.facebook.com/v24.0/${encodeURIComponent(IG_BUSINESS_ID)}/media` +
      `?fields=${encodeURIComponent(fields)}` +
      `&limit=${encodeURIComponent(String(limit))}` +
      `&access_token=${encodeURIComponent(PAGE_TOKEN)}`;

    const r = await fetch(url);
    const j = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: 'Instagram API error',
        details: j,
        message: j?.error?.message || 'Unknown error'
      });
    }

    const items = (j.data || [])
      .map((x) => ({
        id: x.id,
        media_type: x.media_type || 'IMAGE',
        product_type: x.product_type || null,
        // grid image: always prefer thumbnail for videos/reels
        image:
          x.media_type === 'VIDEO'
            ? (x.thumbnail_url || '')
            : (x.media_url || ''),
        // video playback url (only for videos)
        video_url: x.media_type === 'VIDEO' ? (x.media_url || '') : null,
        permalink: x.permalink,
        caption: x.caption || '',
        timestamp: x.timestamp || null
      }))
      // drop invalid items (e.g. video without thumbnail)
      .filter((it) => it.media_type !== 'VIDEO' || (it.image && it.video_url));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
      items,
      count: items.length,
      cached_at: new Date().toISOString(),
      source: 'instagram_graph_oauth'
    });
  } catch (e) {
    console.error('Feed error:', e);
    return res.status(500).json({ error: 'Server error', details: String(e) });
  }
};
