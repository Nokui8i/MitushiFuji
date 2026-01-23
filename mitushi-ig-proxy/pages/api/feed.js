/**
 * Instagram Feed Endpoint (OAuth-based)
 * GET /api/feed
 * 
 * Returns Instagram media using tokens from OAuth flow
 * This is the new endpoint that uses IG_PAGE_ACCESS_TOKEN
 */

module.exports = async (req, res) => {
  // CORS: Always allow all origins - MUST be set before any response
  // Set CORS headers for all responses (including errors)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,product_type,timestamp,children';

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

    // Normalize items (use thumbnail_url for videos/reels)
    const items = (j.data || []).map(x => {
      // For videos/reels, use thumbnail_url for display, media_url for playback
      let imageUrl = x.media_url;
      let videoUrl = null;
      
      if (x.media_type === 'VIDEO' || x.product_type === 'REELS') {
        // Priority 1: Use thumbnail_url if available (most common case)
        if (x.thumbnail_url) {
          imageUrl = x.thumbnail_url;
          videoUrl = x.media_url;
        } 
        // Priority 2: Try to get thumbnail from children (for carousel videos)
        else if (x.children && x.children.data && x.children.data.length > 0) {
          const firstChild = x.children.data[0];
          if (firstChild.thumbnail_url) {
            imageUrl = firstChild.thumbnail_url;
            videoUrl = x.media_url;
          } else if (firstChild.media_url && !firstChild.media_url.toLowerCase().endsWith('.mp4')) {
            imageUrl = firstChild.media_url;
            videoUrl = x.media_url;
          }
        }
        // Priority 3: If media_url is not MP4, it might be a thumbnail/frame
        else if (x.media_url && !x.media_url.toLowerCase().endsWith('.mp4')) {
          imageUrl = x.media_url;
          videoUrl = x.media_url;
        }
        // Priority 4: For Reels, try to construct thumbnail URL from video URL
        else if (x.media_url && x.media_url.includes('cdninstagram.com')) {
          // Sometimes Instagram CDN URLs can be converted to thumbnail URLs
          // But if it's MP4, we can't use it as image
          if (x.media_url.toLowerCase().endsWith('.mp4')) {
            // Skip videos without thumbnails
            return null;
          } else {
            imageUrl = x.media_url;
            videoUrl = x.media_url;
          }
        } else {
          // Skip videos without thumbnails and with MP4 media_url (can't display as image)
          return null;
        }
      }

      return {
        id: x.id,
        image: imageUrl,
        video_url: videoUrl || (x.media_type === 'VIDEO' || x.product_type === 'REELS' ? x.media_url : null),
        permalink: x.permalink,
        media_type: x.media_type || 'IMAGE',
        product_type: x.product_type || null,
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
