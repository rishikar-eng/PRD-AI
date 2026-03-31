# Fly.io Deployment Guide

This guide walks you through deploying the PRD Pipeline to Fly.io.

## Prerequisites

1. Fly.io CLI installed: `brew install flyctl`
2. Fly.io account (free): https://fly.io/app/sign-up
3. Your API keys ready

## Step 1: Login to Fly.io

```bash
flyctl auth login
```

This will open a browser window for authentication.

## Step 2: Deploy Backend

```bash
cd server

# Create the app (first time only)
flyctl apps create prd-pipeline-api

# Set secrets (environment variables)
flyctl secrets set \
  OPENAI_API_KEY="your-openai-key" \
  RIAN_API_KEY="your-rian-key" \
  SUPABASE_SERVICE_KEY="your-supabase-service-role-key" \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  CORS_ORIGIN="https://prd-pipeline.vercel.app"

# Deploy
flyctl deploy

# Check status
flyctl status
```

Your backend will be live at: `https://prd-pipeline-api.fly.dev`

## Step 3: Deploy Frontend to Vercel

The frontend is best deployed to Vercel (free, fast CDN):

```bash
cd ../client

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

When prompted:
- Project name: `prd-pipeline`
- Environment variable: `VITE_API_URL=https://prd-pipeline-api.fly.dev`

## Step 4: Update CORS

Update backend CORS to match your Vercel URL:

```bash
cd ../server
flyctl secrets set CORS_ORIGIN="https://your-vercel-url.vercel.app"
```

## Monitoring & Management

```bash
# View logs
flyctl logs

# SSH into the machine
flyctl ssh console

# Scale (if needed)
flyctl scale vm shared-cpu-1x --memory 512

# Check resource usage
flyctl status
```

## Free Tier Limits

Fly.io free tier includes:
- ✅ Up to 3 shared-cpu-1x VMs with 256MB RAM
- ✅ 3GB persistent storage
- ✅ 160GB outbound data transfer/month
- ✅ Always running (no sleep!)

## Updating Your App

```bash
# Backend
cd server
flyctl deploy

# Frontend
cd ../client
vercel --prod
```

## Troubleshooting

**Connection errors:**
```bash
flyctl logs
```

**Check machine status:**
```bash
flyctl status
flyctl vm status
```

**Restart:**
```bash
flyctl apps restart prd-pipeline-api
```

**Database connection issues:**
- Verify SUPABASE_SERVICE_KEY is set correctly
- Check Supabase dashboard for connection errors

## Environment Variables Reference

Set these with `flyctl secrets set`:

```bash
OPENAI_API_KEY=sk-...
RIAN_API_KEY=your-key
SUPABASE_SERVICE_KEY=eyJ...
SESSION_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://your-frontend.vercel.app
```

## Cost Estimate

**Free Plan (Sufficient for most use):**
- Backend on Fly.io: $0/month
- Frontend on Vercel: $0/month
- Supabase: $0/month
- **Total: $0/month**

**If you exceed free limits:**
- Extra compute: ~$2-5/month
- Extra bandwidth: ~$0.02/GB
