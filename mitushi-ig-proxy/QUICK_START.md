# 🚀 Quick Start - OAuth Method (Like Instafeed!)

This guide will get you set up in **5 minutes** using Facebook OAuth (automatic token management).

## ✅ Prerequisites

- Meta App with Facebook Login enabled
- Instagram Business/Creator account connected to Facebook Page
- Vercel account

---

## 📋 Step-by-Step

### 1️⃣ Configure Meta App (One-Time)

1. Go to [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Select your app (or create new "Business" type)
3. Add **"Facebook Login"** product
4. Go to **Facebook Login → Settings**
5. Add **Valid OAuth Redirect URIs**:
   ```
   https://YOUR-VERCEL-DOMAIN.vercel.app/api/callback
   ```
   (You'll get the exact domain after Step 2)
6. Go to **Settings → Basic**
7. Copy:
   - **App ID**
   - **App Secret** (click "Show")

---

### 2️⃣ Deploy to Vercel

```bash
cd mitushi-ig-proxy
vercel login
vercel
```

After deployment, copy your Vercel domain (e.g., `mitushi-ig-proxy.vercel.app`)

---

### 3️⃣ Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add these **3 variables**:

| Variable | Value |
|----------|-------|
| `META_APP_ID` | Your App ID (from Step 1) |
| `META_APP_SECRET` | Your App Secret (from Step 1) |
| `META_REDIRECT_URI` | `https://YOUR-DOMAIN.vercel.app/api/callback` |

**Important:** Replace `YOUR-DOMAIN` with your actual Vercel domain!

Then redeploy:
```bash
vercel --prod
```

---

### 4️⃣ Update Meta App Redirect URI

Go back to Meta App → Facebook Login → Settings

Update **Valid OAuth Redirect URIs** with your actual Vercel domain:
```
https://YOUR-ACTUAL-DOMAIN.vercel.app/api/callback
```

---

### 5️⃣ Connect Instagram (One Click!)

1. Open in browser:
   ```
   https://YOUR-DOMAIN.vercel.app/api/connect
   ```

2. Click **"Connect with Facebook"**

3. Login and approve permissions

4. You'll see a success page with:
   - `IG_BUSINESS_ID`
   - `IG_PAGE_ACCESS_TOKEN`

5. Copy both values

---

### 6️⃣ Add Tokens to Vercel

In Vercel Dashboard → Settings → Environment Variables:

Add these **2 variables**:

| Variable | Value |
|----------|-------|
| `IG_BUSINESS_ID` | (from success page) |
| `IG_PAGE_ACCESS_TOKEN` | (from success page) |

Then redeploy:
```bash
vercel --prod
```

---

### 7️⃣ Test!

Open in browser:
```
https://YOUR-DOMAIN.vercel.app/api/feed?limit=12
```

You should see JSON with Instagram posts! 🎉

---

### 8️⃣ Use in Shopify

In your Shopify section (`sections/mitushi-instagram-feed.liquid`), set:

```liquid
{% schema %}
{
  "settings": [
    {
      "type": "url",
      "id": "feed_url",
      "label": "Feed API URL",
      "default": "https://YOUR-DOMAIN.vercel.app/api/feed"
    }
  ]
}
{% endschema %}
```

---

## 🎯 That's It!

You now have:
- ✅ Automatic token management (no manual Graph Explorer)
- ✅ Long-lived tokens (60 days)
- ✅ One-click reconnect when needed
- ✅ Secure proxy (tokens never exposed to client)

**Just like Instafeed, but you own it!** 🚀

---

## 🔄 Reconnecting (After 60 Days)

When tokens expire:

1. Go to `/api/connect` again
2. Click "Connect"
3. Copy new tokens
4. Update Vercel env vars
5. Redeploy

(Or we can add auto-refresh later!)

---

## ❓ Troubleshooting

**"No pages found" error:**
- Make sure you have Full Control access to the Facebook Page
- Check that Instagram is connected to the Page

**"Instagram Business Account not found":**
- Ensure Instagram account is Business/Creator type
- Verify Instagram is connected to Facebook Page

**"Invalid redirect URI":**
- Double-check `META_REDIRECT_URI` matches exactly what's in Meta App settings
- Must be `https://` (not `http://`)

---

**Need help?** Check `README.md` for detailed documentation.
