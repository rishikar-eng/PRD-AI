# Deployment Guide

This guide covers deploying the PRD Pipeline application to various platforms.

## Prerequisites

- GitHub repository: https://github.com/Adwait10-prog/PRD-generator
- Supabase project configured at: https://ivihmzkultzpmohjuvei.supabase.co
- OpenAI API key
- Rian API credentials

## Option 1: Render (Recommended)

Render is the easiest option for full-stack Node.js + React apps.

### Automatic Deployment

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo: `Adwait10-prog/PRD-generator`
4. Render will detect `render.yaml` and create both services automatically
5. Add the following environment variables in Render dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `RIAN_API_KEY` - Your Rian API key
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key

### Manual Deployment

**Backend Service:**
1. "New +" → "Web Service"
2. Connect GitHub repo
3. Settings:
   - Name: `prd-pipeline-api`
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     OPENAI_API_KEY=<your-key>
     RIAN_API_BASE_URL=https://api.rian.io/v1
     RIAN_API_KEY=<your-key>
     SESSION_SECRET=<random-64-char-string>
     SUPABASE_URL=https://ivihmzkultzpmohjuvei.supabase.co
     SUPABASE_SERVICE_KEY=<your-key>
     CORS_ORIGIN=https://prd-pipeline.onrender.com
     NODE_ENV=production
     PORT=3001
     ```

**Frontend Service:**
1. "New +" → "Static Site"
2. Connect GitHub repo
3. Settings:
   - Name: `prd-pipeline`
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Rewrites/Redirects:
     - Source: `/api/*`
     - Destination: `https://prd-pipeline-api.onrender.com/api/*`
   - Environment Variables:
     ```
     VITE_API_URL=https://prd-pipeline-api.onrender.com
     ```

## Option 2: Railway

1. Go to https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select your repo
4. Add two services:

**Backend:**
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Add all environment variables (same as Render)

**Frontend:**
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Start Command: `npx serve -s dist -p $PORT`
- Environment Variable: `VITE_API_URL=<backend-url>`

## Option 3: Vercel + Render

**Frontend on Vercel:**
```bash
cd client
npm install -g vercel
vercel --prod
```

**Backend on Render** (same as Option 1)

## Option 4: Netlify + Render

**Frontend on Netlify:**
1. Connect GitHub repo
2. Build settings:
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
3. Redirects (`client/_redirects`):
   ```
   /api/*  https://your-backend.onrender.com/api/:splat  200
   /*  /index.html  200
   ```

**Backend on Render** (same as Option 1)

## Post-Deployment

1. **Update CORS_ORIGIN** in backend to match your frontend URL
2. **Test the application**:
   - Visit your frontend URL
   - Login with Rian credentials
   - Create a test PRD
   - Verify it saves to Supabase
3. **Monitor logs** in your hosting platform dashboard

## Environment Variables Reference

### Backend (Required)
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o
- `RIAN_API_BASE_URL` - https://api.rian.io/v1
- `RIAN_API_KEY` - Rian API authentication key
- `SESSION_SECRET` - Random string (min 64 chars)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service_role key
- `CORS_ORIGIN` - Frontend URL (e.g., https://prd-pipeline.onrender.com)
- `NODE_ENV` - production
- `PORT` - 3001 (or platform default)

### Frontend (Optional)
- `VITE_API_URL` - Backend URL (only needed if not using proxy)

## Troubleshooting

**CORS Errors:**
- Ensure `CORS_ORIGIN` in backend matches your frontend URL exactly
- Include protocol (https://)

**Session Issues:**
- Make sure `SESSION_SECRET` is set and long enough
- Check that cookies are enabled in production

**Database Connection:**
- Verify `SUPABASE_SERVICE_KEY` is the service_role key (starts with eyJ...)
- Test connection with Supabase dashboard

**Build Failures:**
- Check Node.js version (should be 18+)
- Verify all dependencies are in package.json
- Check build logs for specific errors
