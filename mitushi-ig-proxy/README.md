# MITUSHI Instagram Feed Proxy

Serverless API proxy for Instagram Graph API. Fetches Instagram media and returns normalized JSON for use in Shopify themes.

## 🎯 Overview

This Vercel serverless function acts as a secure proxy between your Shopify theme and Instagram Graph API. It:
- Hides Instagram API credentials from client-side code
- Normalizes Instagram API responses (handles videos/reels thumbnails correctly)
- Implements caching to reduce API calls
- Returns clean JSON ready for rendering

## 📁 Project Structure

```
mitushi-ig-proxy/
├── pages/
│   └── api/
│       ├── health.js      # Health check endpoint
│       └── ig-feed.js     # Instagram feed endpoint
├── package.json
├── vercel.json
└── README.md
```

## 🚀 Setup & Deployment

### Prerequisites

1. **Node.js 18+** installed
2. **Vercel account** (free tier is fine)
3. **Vercel CLI** installed globally: `npm install -g vercel`
4. **Instagram Business/Creator Account** connected to a Facebook Page
5. **Meta App** with Facebook Login enabled

### Step 1: Configure Meta App (One-Time Setup)

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your App (or create new "Business" type app)
3. Add **"Facebook Login"** product
4. Go to **Facebook Login → Settings**
5. Add **Valid OAuth Redirect URIs**:
   ```
   https://YOUR-VERCEL-DOMAIN.vercel.app/api/callback
   ```
   (You'll update this after first deployment)
6. Go to **Settings → Basic**
7. Copy:
   - **App ID**
   - **App Secret** (click "Show")

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

```bash
# Navigate to project directory
cd mitushi-ig-proxy

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables (BEFORE connecting)
vercel env add META_APP_ID
# Paste your Meta App ID

vercel env add META_APP_SECRET
# Paste your Meta App Secret

vercel env add META_REDIRECT_URI
# Paste: https://YOUR-VERCEL-DOMAIN.vercel.app/api/callback
# (Replace YOUR-VERCEL-DOMAIN with your actual Vercel domain)

# Redeploy to apply env vars
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository (or upload the `mitushi-ig-proxy` folder)
4. Go to **Settings → Environment Variables**
5. Add (BEFORE connecting):
   - `META_APP_ID` = Your Meta App ID
   - `META_APP_SECRET` = Your Meta App Secret
   - `META_REDIRECT_URI` = `https://YOUR-VERCEL-DOMAIN.vercel.app/api/callback`
6. Deploy

### Step 3: Connect Instagram (OAuth Flow - Like Instafeed!)

1. **Update Meta App Redirect URI** (if not done):
   - Go to Meta App → Facebook Login → Settings
   - Add: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/callback`

2. **Connect Instagram**:
   - Open: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/connect`
   - Click "Connect with Facebook"
   - Login and approve permissions
   - You'll see a page with tokens

3. **Add Tokens to Vercel**:
   - Copy `IG_BUSINESS_ID` and `IG_PAGE_ACCESS_TOKEN` from the success page
   - Go to Vercel → Settings → Environment Variables
   - Add:
     - `IG_BUSINESS_ID` = (from success page)
     - `IG_PAGE_ACCESS_TOKEN` = (from success page)
   - Redeploy: `vercel --prod`

### Step 4: Get Your API Endpoint URL

After deployment, Vercel will provide a URL like:
```
https://mitushi-ig-proxy.vercel.app
```

**✅ DEPLOYED URL (Production):**
```
https://mitushi-ig-proxy.vercel.app
```

Your endpoints will be:
- **Connect**: `https://mitushi-ig-proxy.vercel.app/api/connect` (one-time setup)
- **Callback**: `https://mitushi-ig-proxy.vercel.app/api/callback` (OAuth callback)
- **Health**: `https://mitushi-ig-proxy.vercel.app/api/health`
- **Feed (OAuth)**: `https://mitushi-ig-proxy.vercel.app/api/feed` ⭐ **Use this one!**
- **Feed (Legacy)**: `https://mitushi-ig-proxy.vercel.app/api/ig-feed` (old manual method)

**📝 Note:** This URL is also saved in `DEPLOYED_URL.txt` for quick reference.

## 🔧 Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

### Required for OAuth Flow (New Method - Recommended)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `META_APP_ID` | Meta App ID | Meta App Dashboard → Settings → Basic |
| `META_APP_SECRET` | Meta App Secret | Meta App Dashboard → Settings → Basic |
| `META_REDIRECT_URI` | OAuth callback URL | `https://YOUR-DOMAIN.vercel.app/api/callback` |
| `IG_BUSINESS_ID` | Instagram Business Account ID | Auto-generated after `/api/connect` |
| `IG_PAGE_ACCESS_TOKEN` | Page Access Token (long-lived) | Auto-generated after `/api/connect` |

### Legacy Method (Manual Tokens)

| Variable | Description | Example |
|----------|-------------|---------|
| `IG_ACCESS_TOKEN` | Instagram Graph API access token | `IGQWRN...` |
| `IG_USER_ID` | Instagram Business Account User ID | `17841405309211844` |

### Getting a Long-Lived Token

Instagram tokens expire. For production:

1. **Short-lived token (60 days)**: Get from Graph API Explorer
2. **Long-lived token (60 days, refreshable)**:
   ```bash
   # Exchange short-lived for long-lived
   curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={app-secret}&access_token={short-lived-token}"
   ```
3. **Refresh token** (before expiration):
   ```bash
   curl -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={current-token}"
   ```

**Note**: For v1, manual refresh is acceptable. Future versions can implement automatic refresh.

## 🧪 Testing

### 1. Test Connect Endpoint

Open in browser:
```
https://mitushi-ig-proxy.vercel.app/api/connect
```

You should see a "Connect with Facebook" button.

### 2. Test Health Endpoint

```bash
curl https://mitushi-ig-proxy.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "mitushi-ig-proxy",
  "timestamp": "2026-01-19T...",
  "environment": "production"
}
```

### 3. Test Instagram Feed Endpoint (OAuth Method)

```bash
curl https://mitushi-ig-proxy.vercel.app/api/feed?limit=6
```

**Or test legacy endpoint:**
```bash
curl https://mitushi-ig-proxy.vercel.app/api/ig-feed?limit=6
```

Expected response:
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

### 4. Test in Browser

Open in browser (OAuth method):
```
https://mitushi-ig-proxy.vercel.app/api/feed?limit=12
```

**Or legacy method:**
```
https://mitushi-ig-proxy.vercel.app/api/ig-feed?limit=12
```

You should see JSON with `items` array. Check:
- ✅ `items` array exists and has data
- ✅ Each item has `image` field (URL)
- ✅ Videos/Reels use `thumbnail_url` (check `media_type`)
- ✅ `permalink` links are valid

### 5. Test Reels/Video Thumbnails

1. Ensure your Instagram account has at least one Reel or Video post
2. Call the API and check response
3. Verify `media_type` is `"VIDEO"` or `"REELS"`
4. Verify `image` field contains a thumbnail URL (not video URL)

### 6. Debug Common Issues

**Issue: 401 Unauthorized**
- Token expired or invalid
- Solution: Generate new token and update `IG_ACCESS_TOKEN`

**Issue: 400 Bad Request**
- User ID incorrect
- Solution: Verify `IG_USER_ID` matches your Instagram Business Account ID

**Issue: Empty items array**
- Account has no posts, or permissions insufficient
- Solution: Check Instagram account has posts, verify token permissions

**Issue: Images not loading in Shopify**
- CORS issue (should be handled by vercel.json)
- Check browser console for errors
- Verify image URLs are accessible

## 📊 API Endpoints

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "mitushi-ig-proxy",
  "timestamp": "ISO 8601 timestamp",
  "environment": "production|development"
}
```

### GET `/api/feed` ⭐ (OAuth Method - Recommended)

Fetches Instagram media feed using OAuth tokens.

**Query Parameters:**
- `limit` (optional): Number of posts to return (default: 12, max: 24)

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "image": "string (URL)",
      "permalink": "string (URL)",
      "media_type": "IMAGE|VIDEO|CAROUSEL_ALBUM",
      "caption": "string",
      "timestamp": "string (ISO 8601)"
    }
  ],
  "cached_at": "string (ISO 8601)",
  "source": "instagram_graph_oauth",
  "count": number
}
```

### GET `/api/ig-feed` (Legacy Method)

Fetches Instagram media feed using manual tokens.

**Query Parameters:**
- `limit` (optional): Number of posts to return (default: 12, max: 25)

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "image": "string (URL)",
      "permalink": "string (URL)",
      "media_type": "IMAGE|VIDEO|REELS|CAROUSEL_ALBUM",
      "caption": "string",
      "timestamp": "string (ISO 8601)"
    }
  ],
  "cached_at": "string (ISO 8601)",
  "source": "instagram_graph",
  "count": number
}
```

**Cache Headers:**
- `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- Cache for 1 hour, serve stale for 24 hours while revalidating

## 🔒 Security Notes

- ✅ Tokens stored in Vercel environment variables (never in code)
- ✅ CORS headers configured for public access
- ✅ No sensitive data exposed in response
- ⚠️ Consider rate limiting for production (not implemented in v1)

## 🛠️ Local Development

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Run locally
cd mitushi-ig-proxy
vercel dev

# Create .env.local file (for local testing only)
echo "IG_ACCESS_TOKEN=your_token_here" > .env.local
echo "IG_USER_ID=your_user_id_here" >> .env.local
```

Access locally:
- Health: `http://localhost:3000/api/health`
- Feed: `http://localhost:3000/api/ig-feed`

## 📝 Shopify Integration

After deployment, use the feed URL in your Shopify section:

1. Go to Shopify Theme Editor
2. Add "MITUSHI Instagram Feed" section
3. Set **Feed API URL** to: `https://mitushi-ig-proxy.vercel.app/api/ig-feed`
4. Configure layout, columns, gap, etc.
5. Save and preview

See `sections/mitushi-instagram-feed.liquid` for the Shopify section code.

## 🔄 Token Refresh Strategy (Future)

For automatic token refresh, you can:

1. Store refresh token in Vercel env vars
2. Add a scheduled function (Vercel Cron) to refresh token weekly
3. Update `IG_ACCESS_TOKEN` automatically

This is **not required for v1** but can be added later.

## 📚 Resources

- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)

## ✅ Testing Checklist

- [ ] Health endpoint returns 200 OK
- [ ] Feed endpoint returns JSON with `items` array
- [ ] Images load correctly (check URLs in browser)
- [ ] Videos/Reels show thumbnails (not gray placeholders)
- [ ] Permalinks open Instagram posts correctly
- [ ] Cache headers are set correctly
- [ ] Error handling works (test with invalid token)
- [ ] Shopify section displays feed correctly
- [ ] Mobile responsive (test on phone)
- [ ] Grid and Slider modes both work

## 🐛 Troubleshooting

**Problem**: Images show as broken/placeholder
- Check image URLs are accessible (open in browser)
- Verify Instagram account has public posts
- Check browser console for CORS errors

**Problem**: Feed shows "Unable to load"
- Verify feed URL is correct in Theme Editor
- Check Vercel deployment is live
- Test API endpoint directly in browser
- Check browser console for fetch errors

**Problem**: Token expires frequently
- Use long-lived token (60 days)
- Set reminder to refresh before expiration
- Consider implementing auto-refresh (future)

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Status**: Production Ready
