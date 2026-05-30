# Nexora Deployment Quick Start

## 1️⃣ Prepare Your Repository
```bash
cd c:\Users\YASH\Desktop\nexora

# Ensure all changes are committed
git status
git add .
git commit -m "Add deployment configurations for Vercel and Render"
git push origin main
```

## 2️⃣ Deploy Frontend on Vercel (5 minutes)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Find and select `YASH859-hub/Nexora---Hackcartel`
4. Click "Import"
5. **Project Settings:**
   - Framework: `Vite`
   - Build: `npm run build`
   - Output: `dist`
6. **Environment Variables** - Add these:
   ```
   VITE_SUPABASE_URL = [copy from .env.local]
   VITE_SUPABASE_ANON_KEY = [copy from .env.local]
   VITE_GOOGLE_API_KEY = [copy from .env.local]
   VITE_GEMINI_API_KEY = [copy from .env.local]
   VITE_GOOGLE_CLIENT_ID = [copy from .env.local]
   VITE_TWILIO_ACCOUNT_SID = [copy from .env.local]
   VITE_TWILIO_AUTH_TOKEN = [copy from .env.local]
   VITE_TWILIO_WHATSAPP_NUMBER = [copy from .env.local]
   VITE_DEEPSEEK_API_KEY = [copy from .env.local]
   ```
7. Click "Deploy"
8. ✅ Wait for deployment - your URL will be: `https://nexora-xxxxx.vercel.app`

## 3️⃣ Deploy Backend on Render (5 minutes)

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Click "Build and deploy from a Git repository"
4. Search and select `Nexora---Hackcartel`
5. Click "Connect"
6. **Service Settings:**
   - Name: `nexora-backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: `Free` (for testing) or `Starter` ($7/month for production)
7. **Environment Variables** - Add these:
   ```
   NODE_ENV = production
   PORT = 3001
   DATABASE_URL = [your Supabase connection string]
   TWILIO_ACCOUNT_SID = [from .env.local]
   TWILIO_AUTH_TOKEN = [from .env.local]
   TWILIO_WHATSAPP_NUMBER = [from .env.local]
   FRONTEND_URL = [your Vercel frontend URL once deployed]
   ```
8. Click "Create Web Service"
9. ✅ Wait for deployment - your URL will be: `https://nexora-backend-xxxxx.onrender.com`

## 4️⃣ Configure API Connections

### Update Frontend to use Backend API
In Vercel dashboard:
- Add environment variable: `VITE_BACKEND_URL = https://nexora-backend-xxxxx.onrender.com`
- Trigger a redeploy

### Update Backend CORS (Already done!)
Your backend now accepts:
- Localhost (development)
- Your Vercel frontend URL (production)

## 5️⃣ Final Configuration

### Update Google OAuth
1. Go to Google Cloud Console
2. Select your project
3. OAuth 2.0 Client ID → Settings
4. Add Authorized redirect URIs:
   ```
   https://nexora-xxxxx.vercel.app/auth/callback
   https://nexora-xxxxx.vercel.app/
   ```
5. Save

### Update Twilio Webhooks (if applicable)
1. Go to Twilio Console
2. Update webhook URLs to:
   ```
   https://nexora-backend-xxxxx.onrender.com/whatsapp/webhook
   https://nexora-backend-xxxxx.onrender.com/briefings
   ```

### Update Supabase Redirect URLs
1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Add Site URL: `https://nexora-xxxxx.vercel.app`
4. Add Redirect URLs: `https://nexora-xxxxx.vercel.app/**`

## ✅ Verify Deployment

### Test Frontend
```
Navigate to: https://nexora-xxxxx.vercel.app
Check console for errors (F12)
Try logging in
```

### Test Backend
```bash
curl https://nexora-backend-xxxxx.onrender.com/health
# Should return 200 OK
```

### Monitor Logs
- **Vercel**: Dashboard → Deployments → Function Logs
- **Render**: Dashboard → Logs

## 📊 Cost Breakdown

| Service | Free Tier | Minimum Paid |
|---------|-----------|-------------|
| **Vercel** | Up to 100 GB/mo | $20/mo (Pro) |
| **Render** | Limited resources | $7/mo (Starter) |
| **Supabase** | 500 MB database | $25/mo (Pro) |

## 🚀 What Happens Next

- **Auto-deploy on push**: Both Vercel and Render auto-deploy when you push to `main`
- **Logs available**: Check deployment logs in each dashboard
- **No downtime**: Zero-downtime deployments by default
- **SSL included**: Both platforms provide free SSL certificates

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails on Vercel | Check Node version, clear build cache |
| Backend won't start on Render | Verify env vars, check build logs |
| CORS errors in console | Ensure FRONTEND_URL is set in backend env vars |
| Login not working | Check Google OAuth redirect URLs |
| WhatsApp not working | Verify Twilio credentials and webhook URL |

---

**Total deployment time: ~15 minutes**
**Difficulty: Easy** ✅
