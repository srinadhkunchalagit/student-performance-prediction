# Student Academic Performance Predictor & Reporting System

An end-to-end Machine Learning web application designed to evaluate student academic risk, predict examination outcomes (Pass/Fail with confidence index), generate professional PDF academic reports, and directly dispatch SMS performance summaries to parents.

## 🚀 One-Click Vercel Deployment Guide

This project is fully configured for **Vercel Serverless Functions**.

### Option A: Deploy via GitHub (Recommended)
1. Push this repository to your **GitHub** account.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Leave all project settings as default:
   - **Framework Preset**: Other / None
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: Leave empty / default
5. Click **"Deploy"**.

### Option B: Deploy via Vercel CLI
```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod
```

---

## 🛠️ Vercel Architecture Highlights
- **Serverless Entry**: `api/index.ts` automatically serves all application routes via Vercel rewrites.
- **Dynamic Asset & Template Bundling**: `vercel.json` configures `includeFiles` to ensure `views/**` and `static/**` are available in the Serverless Lambda runtime.
- **CDN Static Optimization**: Static assets (CSS/JS) are automatically mirrored into `public/static` during `npm run build` for zero-latency CDN delivery.
- **Direct SMS Gateway**: Server-side SMS dispatcher works seamlessly in serverless execution with instant tracking IDs and parent notifications.
