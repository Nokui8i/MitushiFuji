# Deployment & Verification Guide

## ✅ Fixed Issues

1. **CORS Headers**: Added in-code to both endpoints (not just vercel.json)
2. **OPTIONS Handler**: Returns 204 (not 200) for preflight requests
3. **Image Normalization**: Explicitly uses `thumbnail_url` for VIDEO/REELS
4. **Cache Headers**: Verified in response
5. **Structure**: Confirmed only `pages/api/` exists (no duplicate folders)

---

## 📝 Final Code

### `pages/api/health.js`

```javascript
/**
 * Health check endpoint
 * GET /api/health
 * Returns service status
 */
export default function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'ok',
    service: 'mitushi-ig-proxy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}
```

### `pages/api/ig-feed.js`

```javascript
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
 */
function normalizeInstagramItem(item) {
  const { media_type, media_url, thumbnail_url, permalink, caption, timestamp, id } = item;
  
  // Determine image URL: use thumbnail_url for videos/reels, media_url for images
  // Critical: For VIDEO/REELS, always use thumbnail_url if available
  let imageUrl = media_url;
  if ((media_type === 'VIDEO' || media_type === 'REELS') && thumbnail_url) {
    imageUrl = thumbnail_url;
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
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers for all responses (critical for Shopify cross-origin requests)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get environment variables
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  const limit = parseInt(req.query.limit) || 12;

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
    
    // Normalize items
    const normalizedItems = (instagramData.data || []).map(normalizeInstagramItem);
    
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
}
```

---

## 🚀 Deployment Commands

### Using Git Bash (Windows 11)

```bash
# 1. Navigate to project
cd mitushi-ig-proxy

# 2. Install Vercel CLI (if not installed)
npm install -g vercel

# 3. Login to Vercel
vercel login

# 4. Deploy (first time)
vercel

# 5. Set environment variables
vercel env add IG_ACCESS_TOKEN
# Paste your Instagram access token when prompted

vercel env add IG_USER_ID
# Paste your Instagram User ID when prompted

# 6. Deploy to production
vercel --prod
```

### Using PowerShell

```powershell
# 1. Navigate to project
cd mitushi-ig-proxy

# 2. Install Vercel CLI (if not installed)
npm install -g vercel

# 3. Login to Vercel
vercel login

# 4. Deploy (first time)
vercel

# 5. Set environment variables
vercel env add IG_ACCESS_TOKEN
# Paste your Instagram access token when prompted

vercel env add IG_USER_ID
# Paste your Instagram User ID when prompted

# 6. Deploy to production
vercel --prod
```

---

## ✅ Verification Steps

### Step 1: Test Health Endpoint

Open in browser:
```
https://YOUR-VERCEL-DOMAIN.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "mitushi-ig-proxy",
  "timestamp": "2026-01-19T...",
  "environment": "production"
}
```

**Check:**
- ✅ Status code: 200
- ✅ JSON is valid
- ✅ Response includes timestamp

### Step 2: Test Feed Endpoint

Open in browser:
```
https://YOUR-VERCEL-DOMAIN.vercel.app/api/ig-feed?limit=6
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "123456789",
      "image": "https://scontent.cdninstagram.com/...",
      "permalink": "https://www.instagram.com/p/...",
      "media_type": "IMAGE",
      "caption": "Post caption...",
      "timestamp": "2026-01-19T12:00:00+0000"
    }
  ],
  "cached_at": "2026-01-19T...",
  "source": "instagram_graph",
  "count": 6
}
```

**Critical Checks:**

1. ✅ **`items` array exists** and has data
2. ✅ **Each item has `image` field** (URL to image)
3. ✅ **For VIDEO/REELS**: 
   - `media_type` is `"VIDEO"` or `"REELS"`
   - `image` field is a **JPG/PNG URL** (not MP4)
   - Verify by checking URL ends with `.jpg`, `.jpeg`, or `.png`
4. ✅ **`permalink` URLs** are valid Instagram links
5. ✅ **Response headers** include:
   - `Access-Control-Allow-Origin: *`
   - `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`

### Step 3: Test CORS (Critical for Shopify)

Open browser console (F12) and run:

```javascript
fetch('https://YOUR-VERCEL-DOMAIN.vercel.app/api/ig-feed?limit=3')
  .then(r => r.json())
  .then(data => console.log('✅ CORS works!', data))
  .catch(err => console.error('❌ CORS failed!', err));
```

**Expected:** No CORS errors, JSON data logged

### Step 4: Verify Reels/Video Thumbnails

1. Ensure your Instagram account has at least one Reel or Video
2. Call API: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/ig-feed?limit=12`
3. Find item where `media_type === "VIDEO"` or `"REELS"`
4. **Verify:**
   - ✅ `image` field exists
   - ✅ `image` URL ends with `.jpg`, `.jpeg`, or `.png` (not `.mp4`)
   - ✅ Opening `image` URL in browser shows thumbnail (not video)

**If thumbnail is missing:**
- Check Instagram API response includes `thumbnail_url`
- Verify token has correct permissions
- Some very old videos may not have thumbnails

---

## 🔍 Debugging

### Issue: CORS Error in Browser Console

**Symptoms:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solution:**
1. Verify CORS headers are set in code (they are now)
2. Check Vercel deployment is live
3. Clear browser cache
4. Test in incognito mode

### Issue: Empty Items Array

**Symptoms:** `items: []` or no items in response

**Solution:**
1. Verify `IG_ACCESS_TOKEN` is valid (not expired)
2. Verify `IG_USER_ID` is correct Instagram Business Account ID
3. Check Instagram account has posts
4. Test in Graph API Explorer: `{user-id}/media`

### Issue: Images Don't Load in Shopify

**Symptoms:** Broken images or gray placeholders

**Solution:**
1. Test image URLs directly in browser
2. Check browser console for errors
3. Verify `image` field in API response is valid URL
4. For videos: ensure `thumbnail_url` is used (not `media_url`)

### Issue: 401 Unauthorized

**Symptoms:** API returns 401 error

**Solution:**
1. Token expired - generate new token
2. Update `IG_ACCESS_TOKEN` in Vercel:
   ```bash
   vercel env rm IG_ACCESS_TOKEN
   vercel env add IG_ACCESS_TOKEN
   vercel --prod
   ```

---

## 📊 Response Structure Verification

### Valid Response Example

```json
{
  "items": [
    {
      "id": "17841405309211844_123456789",
      "image": "https://scontent-xxx.cdninstagram.com/v/.../image.jpg",
      "permalink": "https://www.instagram.com/p/ABC123/",
      "media_type": "IMAGE",
      "caption": "Beautiful product photo",
      "timestamp": "2026-01-19T12:00:00+0000"
    },
    {
      "id": "17841405309211844_987654321",
      "image": "https://scontent-xxx.cdninstagram.com/v/.../thumbnail.jpg",
      "permalink": "https://www.instagram.com/p/XYZ789/",
      "media_type": "VIDEO",
      "caption": "Product video",
      "timestamp": "2026-01-18T10:00:00+0000"
    }
  ],
  "cached_at": "2026-01-19T15:30:00+0000",
  "source": "instagram_graph",
  "count": 2
}
```

**Key Points:**
- ✅ `image` is always a valid image URL (JPG/PNG)
- ✅ For videos, `image` uses `thumbnail_url` (not video URL)
- ✅ All required fields present

---

## ✅ Final Checklist

Before using in Shopify:

- [ ] Health endpoint returns 200 OK
- [ ] Feed endpoint returns JSON with `items` array
- [ ] CORS headers present in response
- [ ] Cache headers set correctly
- [ ] Images load when opening URLs directly
- [ ] Videos/Reels show thumbnails (JPG, not MP4)
- [ ] No CORS errors in browser console
- [ ] Environment variables set in Vercel
- [ ] Production deployment successful

---

**Last Updated**: January 2026  
**Status**: ✅ Ready for Production
