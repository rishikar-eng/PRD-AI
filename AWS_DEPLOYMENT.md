# AWS Deployment Guide - PRD Pipeline

**Cost Estimate**: ~$8/month (under your $10 budget)
- Backend: AWS Elastic Beanstalk (t3.micro) - $8/month
- Frontend: AWS Amplify - FREE tier
- Database: Supabase - FREE tier

---

## Prerequisites

1. AWS Account with $20-30 credits ✓
2. AWS CLI installed
3. EB CLI installed

---

## Step 1: Install AWS CLI & EB CLI

```bash
# Install AWS CLI (if not installed)
brew install awscli

# Configure AWS credentials
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Output format: json

# Install EB CLI
pip3 install awsebcli --upgrade --user

# Verify installation
eb --version
```

---

## Step 2: Deploy Backend to Elastic Beanstalk

```bash
# Navigate to server directory
cd server

# Initialize Elastic Beanstalk application
eb init

# When prompted:
# 1. Select your region (e.g., us-east-1)
# 2. Create new application: "prd-pipeline-backend"
# 3. Platform: Node.js
# 4. Platform version: Node.js 18 running on 64bit Amazon Linux 2
# 5. Set up SSH: No (for now)

# Create environment and deploy
eb create prd-pipeline-production \
  --instance-type t3.micro \
  --envvars \
    OPENAI_API_KEY=sk-proj-... \
    RIAN_API_BASE_URL=https://api.rian.io/v1 \
    RIAN_API_KEY=your-rian-key \
    SESSION_SECRET=your-session-secret \
    SUPABASE_URL=https://ivihmzkultzpmohjuvei.supabase.co \
    SUPABASE_SERVICE_KEY=eyJ... \
    NODE_ENV=production \
    PORT=8080

# This will:
# - Create EC2 instance (t3.micro)
# - Install Node.js
# - Deploy your backend
# - Set up load balancer
# - Configure auto-scaling
```

**Get your backend URL:**
```bash
eb status
# Look for "CNAME: prd-pipeline-production.us-east-1.elasticbeanstalk.com"
```

---

## Step 3: Update Environment Variables (If Needed)

```bash
# Set individual environment variables
eb setenv CORS_ORIGIN=https://your-frontend-url.amplifyapp.com

# Or update all at once
eb setenv \
  OPENAI_API_KEY=sk-proj-... \
  RIAN_API_BASE_URL=https://api.rian.io/v1 \
  CORS_ORIGIN=https://your-frontend-url.amplifyapp.com

# View current environment variables
eb printenv
```

---

## Step 4: Deploy Frontend to AWS Amplify

### Option A: Using Amplify Console (Easiest)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"New app"** → **"Host web app"**
3. Connect GitHub repository: `https://github.com/Adwait10-prog/PRD-generator.git`
4. Select branch: `main`
5. Configure build settings:

```yaml
version: 1
applications:
  - appRoot: client
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

6. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://prd-pipeline-production.us-east-1.elasticbeanstalk.com`

7. Click **"Save and deploy"**

### Option B: Using Amplify CLI (Advanced)

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Navigate to client directory
cd ../client

# Initialize Amplify
amplify init
# - Name: prdpipelinefrontend
# - Environment: production
# - Default editor: Visual Studio Code
# - App type: javascript
# - Framework: react
# - Source directory: src
# - Distribution directory: dist
# - Build command: npm run build
# - Start command: npm run dev

# Add hosting
amplify add hosting
# - Select: Hosting with Amplify Console
# - Type: Manual deployment

# Publish
amplify publish
```

---

## Step 5: Update CORS_ORIGIN

Once you have your Amplify frontend URL (e.g., `https://main.d1234567890.amplifyapp.com`):

```bash
cd server
eb setenv CORS_ORIGIN=https://main.d1234567890.amplifyapp.com
```

---

## Step 6: Test Your Deployment

1. Visit your Amplify URL: `https://main.d1234567890.amplifyapp.com`
2. Login with Rian credentials
3. Create a test PRD
4. Verify data saves to Supabase

---

## Common Commands

### Backend (Elastic Beanstalk)

```bash
# Deploy updates
cd server
eb deploy

# View logs
eb logs

# SSH into instance
eb ssh

# Check status
eb status

# Open in browser
eb open

# Terminate environment (to save costs)
eb terminate prd-pipeline-production
```

### Frontend (Amplify)

```bash
# Deploy updates
cd client
amplify publish

# View status
amplify status

# Delete app (to save costs)
amplify delete
```

---

## Cost Breakdown

### Elastic Beanstalk (Backend)
- **t3.micro instance**: $0.0104/hour × 730 hours = ~$7.59/month
- **Load balancer**: FREE tier (first 12 months) or ~$0.50/month
- **Data transfer**: FREE tier (1GB/month)

### Amplify (Frontend)
- **Build minutes**: 1000 min/month FREE
- **Hosting**: 15GB served/month FREE
- **Storage**: 5GB FREE

### Supabase (Database)
- **FREE tier**: 500MB database, 2GB bandwidth

**Total: ~$8/month** (well under your $10 budget!)

---

## Monitoring Costs

### Set up billing alerts:

1. Go to [AWS Billing Console](https://console.aws.amazon.com/billing)
2. Click **"Budgets"** → **"Create budget"**
3. Set budget: $10/month
4. Email notification at 80% ($8)

This ensures you never exceed your budget!

---

## Scaling Down to Save Costs

If you want to go even cheaper (~$3-5/month):

### Option 1: Use AWS Lightsail Instead
```bash
# Single $5/month instance
# Hosts both frontend + backend
```

### Option 2: Schedule Beanstalk to stop at night
```bash
# Only run 12 hours/day = ~$4/month
# Use CloudWatch Events to start/stop instance
```

---

## Troubleshooting

### Backend returns 502 Bad Gateway
```bash
# Check logs
eb logs

# Common fix: Ensure PORT=8080 in environment variables
eb setenv PORT=8080
```

### CORS errors
```bash
# Update CORS_ORIGIN to match your Amplify URL
eb setenv CORS_ORIGIN=https://your-amplify-url.amplifyapp.com
```

### Environment variables not updating
```bash
# Restart environment
eb restart
```

---

## Next Steps

1. Install AWS CLI: `brew install awscli`
2. Configure credentials: `aws configure`
3. Install EB CLI: `pip3 install awsebcli --upgrade --user`
4. Run: `cd server && eb init`

Ready to deploy? Let me know if you need help with any step!
