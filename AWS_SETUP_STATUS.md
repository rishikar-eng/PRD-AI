# AWS Deployment Status - PRD Pipeline

**Started**: April 1, 2026 at 11:41 AM IST

---

## Current Status: 🟡 In Progress

### ✅ Completed Steps:

1. **AWS CLI Configuration**
   - Configured with credentials from existing Rian Recipe Cloud project
   - Region: `us-east-1`
   - Account: `361151528058`
   - User: `rian_recipe_devloper`

2. **EB CLI Installation**
   - Installed EB CLI version 3.27.1
   - Path configured: `/Users/mac/Library/Python/3.11/bin`

3. **Elastic Beanstalk Application Created**
   - Application name: `prd-pipeline-backend`
   - Platform: Node.js 18
   - Region: `us-east-1`

4. **Environment Creation Started** 🔄
   - Environment name: `prd-pipeline-production`
   - Instance type: `t3.micro` (~$8/month)
   - Estimated completion: 5-10 minutes

### Environment Variables Configured:

```bash
OPENAI_API_KEY=sk-proj-b_rtY4JJC8WKu5VZ9oSBQm... (configured)
RIAN_API_BASE_URL=https://api.rian.io/v1
SUPABASE_URL=https://ivihmzkultzpmohjuvei.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (configured)
SESSION_SECRET=rian-prd-pipeline-aws-prod-secret-2026
NODE_ENV=production
PORT=8080
```

---

## Next Steps (After Backend Deploys):

### 1. Get Backend URL
```bash
cd server
export PATH="/Users/mac/Library/Python/3.11/bin:$PATH"
eb status
```

Look for the CNAME like: `prd-pipeline-production.us-east-1.elasticbeanstalk.com`

### 2. Set CORS_ORIGIN (After Frontend Deployment)
```bash
cd server
export PATH="/Users/mac/Library/Python/3.11/bin:$PATH"
eb setenv CORS_ORIGIN=https://your-frontend-url.amplifyapp.com
```

### 3. Deploy Frontend to AWS Amplify

**Option A: Amplify Console (Recommended)**

1. Go to https://console.aws.amazon.com/amplify
2. Click "New app" → "Host web app"
3. Connect GitHub: `https://github.com/Adwait10-prog/PRD-generator.git`
4. Branch: `main`
5. Build settings:
   - App root: `client`
   - Build command: `npm run build`
   - Output directory: `dist`
6. Environment variable:
   - `VITE_API_URL` = `https://prd-pipeline-production.us-east-1.elasticbeanstalk.com`
7. Deploy!

**Option B: Amplify CLI**

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Navigate to client
cd client

# Initialize
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

---

## Cost Estimate

- **Backend (Elastic Beanstalk)**: ~$8/month
  - t3.micro instance: $7.59/month (730 hours)
  - Load balancer: FREE (first 12 months)
  - Data transfer: FREE tier (1GB/month)

- **Frontend (Amplify)**: FREE
  - Build minutes: 1000/month FREE
  - Hosting: 15GB served/month FREE

- **Database (Supabase)**: FREE
  - 500MB database
  - 2GB bandwidth

**Total: ~$8/month** (using your $20-30 AWS credits)

---

## Monitoring Your Budget

Set up billing alert:
1. Go to https://console.aws.amazon.com/billing
2. Click "Budgets" → "Create budget"
3. Set $10/month budget
4. Email alert at 80% ($8)

---

## Common Commands

### Backend Management
```bash
# Check status
cd server && export PATH="/Users/mac/Library/Python/3.11/bin:$PATH"
eb status

# View logs
eb logs

# Deploy updates
eb deploy

# Open in browser
eb open

# SSH into instance
eb ssh

# Terminate (to save costs)
eb terminate prd-pipeline-production
```

### Frontend Management (Amplify)
```bash
# Deploy updates
cd client
amplify publish

# Check status
amplify status

# Delete app
amplify delete
```

---

## Troubleshooting

### If deployment fails:
```bash
# Check logs
cd server
export PATH="/Users/mac/Library/Python/3.11/bin:$PATH"
eb logs

# Common fixes:
# 1. Ensure package.json has "start" script
# 2. Check .ebextensions/nodecommand.config exists
# 3. Verify environment variables are set
eb printenv
```

### If backend returns 502:
```bash
# Restart environment
eb restart
```

### If CORS errors:
```bash
# Update CORS_ORIGIN to match frontend URL
eb setenv CORS_ORIGIN=https://your-amplify-url.amplifyapp.com
```

---

## Deployment Timeline

- **11:41 AM**: AWS credentials configured ✅
- **11:42 AM**: EB CLI installed ✅
- **11:43 AM**: Application created ✅
- **11:44 AM**: Environment creation started 🔄
- **11:50-55 AM (est)**: Backend deployment complete ⏳
- **Next**: Deploy frontend to Amplify ⏳

---

## Files Created

- `server/.ebextensions/nodecommand.config` - EB Node.js configuration
- `server/.ebextensions/01_packages.config` - System packages
- `server/.ebignore` - Files to exclude from deployment
- `AWS_DEPLOYMENT.md` - Complete deployment guide
- `AWS_SETUP_STATUS.md` - This file (real-time status)

---

**Deployment in progress... Check back in 5-10 minutes!**
