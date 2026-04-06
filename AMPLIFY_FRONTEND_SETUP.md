# 🚀 Deploy Frontend to AWS Amplify - Step-by-Step Guide

Follow these steps to deploy your frontend to AWS Amplify using the web console.

---

## Step 1: Open AWS Amplify Console

Click this link: **https://console.aws.amazon.com/amplify**

(Or search for "Amplify" in the AWS Console)

---

## Step 2: Create New App

1. Click **"Create new app"** button (orange button top-right)
2. Select **"Host web app"**
3. Click **"GitHub"** as your Git provider
4. Click **"Continue"**

---

## Step 3: Authorize GitHub

1. If prompted, click **"Authorize AWS Amplify"**
2. You may need to sign in to GitHub
3. Grant Amplify access to your repositories

---

## Step 4: Select Repository and Branch

1. **Repository**: Select `Adwait10-prog/PRD-generator` from the dropdown
2. **Branch**: Select `main`
3. **Monorepo**: Check the box "Connecting a monorepo? Pick a folder."
4. **Monorepo folder**: Enter `client`
5. Click **"Next"**

---

## Step 5: Configure Build Settings

The build settings should auto-detect. Verify they match this:

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

**App name**: Leave as default (PRD-generator) or change to `prd-pipeline-frontend`

Click **"Next"**

---

## Step 6: Add Environment Variable

**IMPORTANT:** Before clicking "Save and deploy", add the environment variable:

1. Scroll down to **"Environment variables"** section
2. Click **"Add environment variable"**
3. **Key**: `VITE_API_URL`
4. **Value**: `https://prd-pipeline-production.eba-mzw2e3xa.us-east-1.elasticbeanstalk.com`
5. Click **"Save and deploy"**

---

## Step 7: Wait for Deployment

The deployment process will take **3-5 minutes**. You'll see these stages:

1. ✅ Provision (30 sec)
2. ✅ Build (2-3 min)
3. ✅ Deploy (1 min)
4. ✅ Verify (10 sec)

---

## Step 8: Get Your Frontend URL

Once deployment completes:

1. Your app URL will be shown at the top
2. It will look like: `https://main.d1a2b3c4d5e6f.amplifyapp.com`
3. **Copy this URL** - you'll need it for the next step

---

## Step 9: Update Backend CORS

Now update your backend to allow requests from your new frontend:

Open your terminal and run:

```bash
cd "/Users/mac/Projects/PRD generator/rian-prd-pipeline/server"
export PATH="/Users/mac/Library/Python/3.11/bin:$PATH"
eb setenv CORS_ORIGIN=https://YOUR-AMPLIFY-URL-HERE.amplifyapp.com
```

Replace `YOUR-AMPLIFY-URL-HERE` with your actual Amplify URL from Step 8.

**Example:**
```bash
eb setenv CORS_ORIGIN=https://main.d1a2b3c4d5e6f.amplifyapp.com
```

This takes about 30 seconds to update.

---

## Step 10: Test Your Application!

1. Visit your Amplify URL
2. You should see your PRD Pipeline login screen
3. Try logging in with your Rian credentials
4. Create a test PRD!

---

## 🎉 Success Checklist

- ✅ Frontend deployed to Amplify
- ✅ Backend running on Elastic Beanstalk
- ✅ CORS configured correctly
- ✅ Environment variables set
- ✅ Application working end-to-end

---

## 📊 What You've Achieved

### Cost: Still ~$8/month!
- **Backend (Elastic Beanstalk)**: $8/month
- **Frontend (Amplify)**: FREE tier
- **Database (Supabase)**: FREE tier

### Benefits:
- ✅ No cold starts (backend always online)
- ✅ Auto-deploys from GitHub (push to deploy)
- ✅ Auto-scaling (handles traffic spikes)
- ✅ Professional AWS infrastructure
- ✅ CloudWatch monitoring built-in

---

## 🔄 Future Deployments

**Frontend updates are automatic!**

Whenever you push to GitHub `main` branch:
1. Amplify auto-detects the push
2. Runs build automatically
3. Deploys new version
4. Takes ~3 minutes

**Backend updates:**
```bash
cd server
export PATH="/Users/mac/Library/Python/3.11/bin:$PATH"
eb deploy
```

---

## 🐛 Troubleshooting

### Frontend shows blank screen
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly in Amplify environment variables

### Login returns 401 errors
- Check CORS_ORIGIN is set on backend: `eb printenv`
- Should match your Amplify URL exactly (with https://)

### Backend not responding
- Check backend status: `eb status`
- View logs: `eb logs`

### Build fails on Amplify
- Check build logs in Amplify console
- Verify `amplify.yml` is in root directory
- Ensure `client/package.json` has build script

---

## 📱 Access Your Apps

**Frontend**: https://YOUR-AMPLIFY-URL.amplifyapp.com
**Backend**: https://prd-pipeline-production.eba-mzw2e3xa.us-east-1.elasticbeanstalk.com

**AWS Consoles**:
- Amplify: https://console.aws.amazon.com/amplify
- Elastic Beanstalk: https://console.aws.amazon.com/elasticbeanstalk
- Billing: https://console.aws.amazon.com/billing

---

## 🎯 Your Turn!

**Ready to deploy?**

1. Click this link to start: https://console.aws.amazon.com/amplify
2. Follow steps 1-10 above
3. It takes about 5 minutes total!

**Any issues?** Check the troubleshooting section above.

---

**Good luck! Your app will be fully deployed on AWS soon! 🚀**
