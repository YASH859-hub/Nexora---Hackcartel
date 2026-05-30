# Deployment Guide - Nexora

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub account with your repository pushed
- Vercel account (free at https://vercel.com)

### Steps to Deploy Frontend

1. **Connect to Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your Nexora repository from GitHub
   - Authorize Vercel to access your GitHub account

2. **Configure Project:**
   - Project Name: `nexora` (or your preferred name)
   - Framework Preset: `Vite`
   - Build Command: `npm run build` (should auto-detect)
   - Output Directory: `dist` (should auto-detect)
   - Root Directory: `./`

3. **Set Environment Variables:**
   - Click "Environment Variables"
   - Add all variables from your `.env.local`:
     ```
     VITE_SUPABASE_URL
     VITE_SUPABASE_ANON_KEY
     VITE_GOOGLE_API_KEY
     VITE_GEMINI_API_KEY
     VITE_GOOGLE_CLIENT_ID
     VITE_TWILIO_ACCOUNT_SID
     VITE_TWILIO_AUTH_TOKEN
     VITE_TWILIO_WHATSAPP_NUMBER
     VITE_DEEPSEEK_API_KEY
     VITE_DEEPSEEK_MODEL
     ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your frontend will be live at `https://nexora-xxxxx.vercel.app`

5. **Configure Backend URL (after backend deployment):**
   - Add `VITE_BACKEND_URL=https://your-render-backend-url.onrender.com` to Vercel env vars
   - Update frontend code to use this URL for API calls

---

## Backend Deployment (Render)

### Prerequisites
- GitHub account with your repository pushed
- Render account (free at https://render.com)

### Steps to Deploy Backend

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add deployment configurations"
   git push origin main
   ```

2. **Create Render Service:**
   - Go to https://dashboard.render.com/
   - Click "New +" → "Web Service"
   - Select "Deploy an existing repository" or connect GitHub
   - Search for your Nexora repository
   - Click "Connect"

3. **Configure Web Service:**
   - Name: `nexora-backend`
   - Environment: `Node`
   - Region: `Oregon` (or closest to your users)
   - Branch: `main`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: `Free` (or Starter for production)

4. **Set Environment Variables:**
   - In the "Environment" section, add:
     ```
     NODE_ENV = production
     PORT = 3001
     DATABASE_URL = your_supabase_database_url
     TWILIO_ACCOUNT_SID = your_account_sid
     TWILIO_AUTH_TOKEN = your_auth_token
     TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
     ```

5. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy from your GitHub repo
   - Your backend will be live at `https://nexora-backend-xxxxx.onrender.com`
   - Automatic redeployment on GitHub push

---

## Post-Deployment Steps

### 1. Update Frontend API Endpoints
Update your frontend code to use the Render backend URL:

```typescript
// In src/lib/supabase.ts or appropriate file
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'https://nexora-backend-xxxxx.onrender.com';
```

### 2. Update Callback URLs in Third-Party Services

**Google OAuth:**
- Go to Google Cloud Console
- Update Authorized redirect URIs to include:
  - `https://nexora-xxxxx.vercel.app`
  - `https://nexora-xxxxx.vercel.app/auth/callback`

**Twilio:**
- Update webhook URLs to point to your Render backend:
  - `https://nexora-backend-xxxxx.onrender.com/whatsapp/webhook`

**Supabase:**
- Update Auth redirect URLs in Supabase dashboard

### 3. Monitor Deployments
- **Vercel:** https://vercel.com/dashboard
- **Render:** https://dashboard.render.com

### 4. Enable Auto-Deploy
Both Vercel and Render support automatic deployments on GitHub push. This is enabled by default.

---

## Troubleshooting

### Frontend Build Fails on Vercel
- Check Node version: `node --version` (use 18 or 20)
- Clear cache: In Vercel dashboard, Project Settings → Deployments → Clear Production Deployments

### Backend Won't Start on Render
- Check logs in Render dashboard
- Verify all required environment variables are set
- Ensure `npm run build` completes successfully

### CORS Issues
- Add your Vercel frontend URL to CORS settings in your Express backend
- Update `backend/src/server.ts` to include your Vercel URL

### Database Connection Issues
- Verify `DATABASE_URL` is correct in Render
- Check Supabase connection pooling settings
- Ensure IP allowlist is configured

---

## Cost Estimates

**Vercel (Frontend)**
- Free tier: Up to 100 GB/month bandwidth
- Upgrade if needed: $20/month Pro plan

**Render (Backend)**
- Free tier: Limited resources, may spin down
- Starter ($7/month): 0.5 CPU, 512 MB RAM, always on
- Standard ($12/month): 1 CPU, 1 GB RAM

**Supabase Database**
- Free tier: 500 MB database
- Pro ($25/month): 10 GB database + more

---

## Deployment Checklist

- [ ] Push all code to GitHub
- [ ] Create Vercel project and deploy frontend
- [ ] Create Render project and deploy backend
- [ ] Set all environment variables on both platforms
- [ ] Test login flow (frontend → Supabase)
- [ ] Test WhatsApp integration (frontend → backend → Twilio)
- [ ] Update API URLs in frontend
- [ ] Update callback URLs in Google OAuth, Twilio, Supabase
- [ ] Monitor logs and test core features
- [ ] Set up error tracking (optional: Sentry, LogRocket)
