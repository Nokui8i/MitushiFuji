# MITUSHI Instagram Feed - Complete Setup Guide

## 📋 Quick Start Checklist

- [ ] Get Instagram API credentials
- [ ] Deploy Vercel API
- [ ] Set environment variables
- [ ] Test API endpoints
- [ ] Add section to Shopify theme
- [ ] Configure in Theme Editor
- [ ] Test on live site

---

## 🎯 Phase 0: Vercel API Setup

### Step 1: Get Instagram API Credentials

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Login with your Facebook account

2. **Create/Select App**
   - Click "My Apps" → "Create App"
   - Choose "Business" type
   - Name it (e.g., "MITUSHI Instagram Feed")

3. **Add Instagram Graph API**
   - In App Dashboard, click "Add Product"
   - Find "Instagram Graph API" → Click "Set Up"

4. **Get Access Token**
   - Go to "Tools" → "Graph API Explorer"
   - Select your app
   - Click "Generate Access Token"
   - Grant permissions: `instagram_basic`, `pages_read_engagement`
   - **Copy the token** (you'll need it later)

5. **Get User ID**
   - In Graph API Explorer, query: `me/accounts`
   - Find your Facebook Page
   - Query: `{page-id}?fields=instagram_business_account`
   - Copy the `id` from `instagram_business_account` object
   - This is your `IG_USER_ID`

### Step 2: Deploy to Vercel

#### Using Git Bash / Terminal (Windows 11)

```bash
# 1. Navigate to project
cd "c:\Users\iaaoa\theme_export__mitushii-myshopify-com-fuji__18JAN2026-0245am\mitushi-ig-proxy"

# 2. Install Vercel CLI (if not installed)
npm install -g vercel

# 3. Login to Vercel
vercel login
# Follow prompts to login via browser

# 4. Deploy project
vercel
# Answer prompts:
#   - Set up and deploy? Y
#   - Which scope? (select your account)
#   - Link to existing project? N
#   - Project name? mitushi-ig-proxy (or press Enter)
#   - Directory? . (current directory)
#   - Override settings? N

# 5. Set environment variables
vercel env add IG_ACCESS_TOKEN
# When prompted, paste your Instagram access token

vercel env add IG_USER_ID
# When prompted, paste your Instagram User ID

# 6. Deploy to production
vercel --prod
```

#### Alternative: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Choose "Import Git Repository" (if you have Git) OR "Upload" (drag `mitushi-ig-proxy` folder)
4. Configure:
   - Framework Preset: Other
   - Root Directory: `mitushi-ig-proxy`
5. Click "Deploy"
6. After deployment, go to **Settings → Environment Variables**
7. Add:
   - `IG_ACCESS_TOKEN` = (paste your token)
   - `IG_USER_ID` = (paste your user ID)
8. Go to **Deployments** tab → Click "..." on latest → "Redeploy"

### Step 3: Get Your API URL

After deployment, Vercel shows:
```
✅ Production: https://mitushi-ig-proxy-xxxxx.vercel.app
```

Your endpoints:
- Health: `https://mitushi-ig-proxy-xxxxx.vercel.app/api/health`
- Feed: `https://mitushi-ig-proxy-xxxxx.vercel.app/api/ig-feed`

**Save this URL** - you'll need it for Shopify!

---

## 🧪 Phase 1: Testing

### Test 1: Health Check

Open in browser:
```
https://your-project.vercel.app/api/health
```

Expected: JSON with `"status": "ok"`

### Test 2: Feed Endpoint

Open in browser:
```
https://your-project.vercel.app/api/ig-feed?limit=6
```

Expected: JSON with `items` array containing Instagram posts

**Verify:**
- ✅ `items` array exists
- ✅ Each item has `image` URL
- ✅ Videos/Reels have thumbnail URLs (not video URLs)
- ✅ `permalink` URLs are valid

### Test 3: Check Reels/Video Thumbnails

1. Ensure your Instagram has at least one Reel or Video
2. Call API and find item with `"media_type": "VIDEO"` or `"REELS"`
3. Verify `image` field is a thumbnail URL (ends in `.jpg` or similar, not `.mp4`)

---

## 🛍️ Phase 2: Shopify Integration

### Step 1: Add Section to Theme

The section file is already created:
```
sections/mitushi-instagram-feed.liquid
```

If you need to upload manually:
1. Go to Shopify Admin → Online Store → Themes
2. Click "..." → "Edit code"
3. Navigate to `sections/`
4. Upload `mitushi-instagram-feed.liquid`

### Step 2: Configure in Theme Editor

1. Go to Shopify Admin → Online Store → Themes
2. Click "Customize" on your active theme
3. Click "Add section"
4. Find "MITUSHI Instagram Feed"
5. Configure settings:

   **Required:**
   - **Feed API URL**: `https://your-project.vercel.app/api/ig-feed`
   
   **Layout:**
   - **Layout Mode**: Grid or Slider
   - **Columns (Desktop)**: 4 (recommended)
   - **Columns (Mobile)**: 2 (recommended)
   - **Gap Size**: 16px
   - **Border Radius**: 12px
   - **Number of Posts**: 12

   **Optional:**
   - **Heading**: "Follow Us @mitushi"
   - **Show Follow Button**: ✓
   - **Instagram Handle**: mitushi

6. Click "Save"

### Step 3: Test on Live Site

1. Preview the page with the section
2. Verify:
   - ✅ Images load (no broken images)
   - ✅ Grid/Slider displays correctly
   - ✅ Clicking images opens Instagram
   - ✅ Mobile responsive
   - ✅ Loading skeleton shows while fetching
   - ✅ Error message shows if API fails

---

## 🔧 Troubleshooting

### API Returns 401 Unauthorized

**Problem**: Token expired or invalid

**Solution:**
1. Generate new token in Facebook Graph API Explorer
2. Update `IG_ACCESS_TOKEN` in Vercel:
   ```bash
   vercel env rm IG_ACCESS_TOKEN
   vercel env add IG_ACCESS_TOKEN
   # Paste new token
   vercel --prod
   ```

### API Returns Empty Items

**Problem**: No posts or wrong User ID

**Solution:**
1. Verify Instagram account has posts
2. Check `IG_USER_ID` is correct (Instagram Business Account ID)
3. Test in Graph API Explorer: `{user-id}/media`

### Images Don't Load in Shopify

**Problem**: CORS or URL issue

**Solution:**
1. Open browser console (F12)
2. Check for CORS errors
3. Test image URLs directly in browser
4. Verify Vercel deployment is live

### Feed Shows "Unable to load"

**Problem**: Feed URL incorrect or API down

**Solution:**
1. Verify Feed API URL in Theme Editor
2. Test API endpoint directly in browser
3. Check Vercel deployment status
4. Verify environment variables are set

---

## 📝 Environment Variables Reference

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `IG_ACCESS_TOKEN` | Facebook Graph API Explorer | `IGQWRN...` |
| `IG_USER_ID` | Instagram Business Account ID | `17841405309211844` |

**Where to Set:**
- Vercel Dashboard → Project → Settings → Environment Variables
- OR via CLI: `vercel env add VARIABLE_NAME`

---

## 🎨 Customization

### Change Colors

Edit `sections/mitushi-instagram-feed.liquid`:
- Find `.mitushi-ig-feed__follow-btn` for button colors
- Find `.mitushi-ig-feed__item:hover` for hover effects

### Change Layout

Use Theme Editor settings:
- Grid vs Slider
- Columns (desktop/mobile)
- Gap size
- Border radius

### Add Modal Preview

Future enhancement: Add modal to preview posts without leaving site.
Currently, clicking opens Instagram in new tab.

---

## ✅ Final Checklist

Before going live:

- [ ] Vercel API deployed and accessible
- [ ] Health endpoint returns 200 OK
- [ ] Feed endpoint returns valid JSON with items
- [ ] Reels/Videos show thumbnails (not gray placeholders)
- [ ] Shopify section added to theme
- [ ] Feed URL configured correctly
- [ ] Tested on desktop
- [ ] Tested on mobile
- [ ] All images load correctly
- [ ] Links open Instagram correctly
- [ ] Error handling works (test by breaking API URL)

---

## 🚀 Going Live

1. **Deploy Vercel API to production** (if not already)
2. **Add section to live theme** (not just draft)
3. **Configure Feed URL** in Theme Editor
4. **Test on live site**
5. **Monitor for 24 hours** to ensure stability

---

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check browser console (F12)
3. Test API endpoints directly
4. Verify environment variables
5. Review README.md in `mitushi-ig-proxy/` folder

---

**Last Updated**: January 2026  
**Version**: 1.0.0
