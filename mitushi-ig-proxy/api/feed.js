/**
 * Instagram Feed Endpoint (OAuth-based)
 * GET /api/feed
 * 
 * Returns Instagram media using tokens from OAuth flow
 * This is the new endpoint that uses IG_PAGE_ACCESS_TOKEN
 */

module.exports = async (req, res) => {
  // CORS: Allow Shopify domains (storefront, editor, preview)
  const origin = req.headers.origin || '';
  const allowedOrigin = origin && origin.endsWith('.myshopify.com') 
    ? origin 
    : 'https://mitushii.myshopify.com';
  
  // Set CORS headers - MUST be set before any response
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Trim whitespace and newlines from environment variables
    const IG_BUSINESS_ID = (process.env.IG_BUSINESS_ID || '').trim();
    const PAGE_TOKEN = (process.env.IG_PAGE_ACCESS_TOKEN || '').trim();

    if (!IG_BUSINESS_ID || !PAGE_TOKEN) {
      // CORS headers already set at the top
      res.status(500).json({
        error: 'Missing environment variables',
        required: ['IG_BUSINESS_ID', 'IG_PAGE_ACCESS_TOKEN'],
        message: 'Please run /api/connect first to set up tokens'
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit || '12', 10), 24);
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';

    const url =
      `https://graph.facebook.com/v24.0/${encodeURIComponent(IG_BUSINESS_ID)}/media` +
      `?fields=${encodeURIComponent(fields)}` +
      `&limit=${encodeURIComponent(String(limit))}` +
      `&access_token=${encodeURIComponent(PAGE_TOKEN)}`;

    const r = await fetch(url);
    const j = await r.json();
    
    if (!r.ok) {
      // CORS headers already set at the top
      res.status(r.status).json({ 
        error: 'Instagram API error', 
        details: j,
        message: j.error?.message || 'Unknown error'
      });
      return;
    }

    // Normalize items (use thumbnail_url for videos)
    const items = (j.data || []).map(x => {
      // For videos, prioritize thumbnail_url for display, but keep original media_url for playback
      let imageUrl = x.media_url;
      let videoUrl = null;
      
      if (x.media_type === 'VIDEO') {
        // Use thumbnail_url if available, otherwise try to use media_url (might be a frame)
        if (x.thumbnail_url) {
          imageUrl = x.thumbnail_url;
          videoUrl = x.media_url; // Keep original video URL for lightbox
        } else if (x.media_url && !x.media_url.toLowerCase().endsWith('.mp4')) {
          // If media_url is not MP4, it might be a thumbnail/frame
          imageUrl = x.media_url;
        } else {
          // Skip videos without thumbnails and with MP4 media_url (can't display as image)
          return null;
        }
      }

      return {
        id: x.id,
        image: imageUrl,
        video_url: videoUrl || (x.media_type === 'VIDEO' ? x.media_url : null),
        permalink: x.permalink,
        media_type: x.media_type || 'IMAGE',
        caption: x.caption || '',
        timestamp: x.timestamp || null
      };
    }).filter(item => item !== null);

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      items,
      cached_at: new Date().toISOString(),
      source: 'instagram_graph_oauth',
      count: items.length
    });
    return;
  } catch (e) {
    console.error('Feed error:', e);
    // CORS headers already set at the top
    res.status(500).json({ 
      error: 'Server error', 
      details: String(e) 
    });
    return;
  }
};
