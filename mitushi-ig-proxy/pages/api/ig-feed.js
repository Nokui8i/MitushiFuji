/**
 * Instagram Feed Proxy Endpoint
 * GET /api/ig-feed
 * 
 * Fetches media from Instagram Graph API and returns normalized JSON.
 * Handles caching and proper thumbnail selection for videos/reels.
 * 
 * Environment Variables Required:
 * - IG_ACCESS_TOKEN: Instagram Graph API access token
 * - IG_USER_ID: Instagram Business/Creator account user ID
 */

const INSTAGRAM_API_BASE = 'https://graph.instagram.com';
const CACHE_MAX_AGE = 3600; // 1 hour
const STALE_WHILE_REVALIDATE = 86400; // 24 hours

/**
 * Normalizes Instagram API response to consistent format
 * Returns null if item cannot be displayed (e.g., video without thumbnail)
 */
function normalizeInstagramItem(item) {
  const { media_type, media_url, thumbnail_url, permalink, caption, timestamp, id } = item;
  
  // Determine image URL: use thumbnail_url for videos, media_url for images
  // Critical: For VIDEO, always use thumbnail_url if available
  let imageUrl = media_url;
  if (media_type === 'VIDEO' && thumbnail_url) {
    imageUrl = thumbnail_url;
  }
  
  // Safety check: If VIDEO and no thumbnail_url, and media_url is MP4, skip this item
  if (media_type === 'VIDEO' && !thumbnail_url && media_url && media_url.toLowerCase().endsWith('.mp4')) {
    return null; // Skip items without valid thumbnail
  }
  
  return {
    id: id || null,
    image: imageUrl,
    permalink: permalink || null,
    media_type: media_type || 'IMAGE',
    caption: caption || '',
    timestamp: timestamp || null
  };
}

/**
 * Fetches media from Instagram Graph API
 */
async function fetchInstagramMedia(accessToken, userId, limit = 12) {
  const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';
  const url = `${INSTAGRAM_API_BASE}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Instagram API error: ${response.status} ${response.statusText}. ` +
        `Message: ${errorData.error?.message || 'Unknown error'}`
      );
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Instagram API fetch error:', error.message);
    throw error;
  }
}

/**
 * Vercel Serverless Function handler
 */
module.exports = async (req, res) => {
  // Set CORS headers for all responses (critical for Shopify cross-origin requests)
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

  // Get environment variables
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  
  // Clamp limit to prevent abuse and ensure valid range (1-25)
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 12;

  // Validate required env vars
  if (!accessToken || !userId) {
    console.error('Missing required environment variables');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Instagram API credentials not configured'
    });
  }

  try {
    // Fetch from Instagram API
    const instagramData = await fetchInstagramMedia(accessToken, userId, limit);
    
    // Normalize items and filter out nulls (items that can't be displayed)
    const normalizedItems = (instagramData.data || [])
      .map(normalizeInstagramItem)
      .filter(item => item !== null);
    
    // Build response
    const response = {
      items: normalizedItems,
      cached_at: new Date().toISOString(),
      source: 'instagram_graph',
      count: normalizedItems.length
    };

    // Set cache headers
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
    );
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error fetching Instagram feed:', error);
    
    // Return error response (CORS headers already set above)
    return res.status(500).json({
      error: 'Failed to fetch Instagram feed',
      message: error.message || 'Unknown error occurred'
    });
  }
};
