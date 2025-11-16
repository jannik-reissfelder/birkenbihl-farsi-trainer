# 🚀 Deployment Guide: Birkenbihl Farsi Trainer

This guide will walk you through deploying the Birkenbihl Farsi Trainer to **Vercel** with **Supabase** authentication and database.

## Prerequisites

- GitHub account
- Supabase account (free tier)
- Vercel account (free tier)
- Gemini API key (from Google AI Studio)

---

## Step 1: Setup Supabase Project (15 minutes)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project Name**: `birkenbihl-farsi-trainer` (or your choice)
   - **Database Password**: (generate a strong password and save it)
   - **Region**: Choose closest to your users (e.g., `Europe West (Frankfurt)`)
4. Click "Create new project" (takes ~2 minutes)

### 1.2 Run Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Open the file `docs/supabase-schema.sql` in this Replit
4. **Copy the entire SQL content** and paste it into the Supabase SQL Editor
5. Click **"Run"** (bottom right)
6. You should see: `Success. No rows returned`

✅ **What this did:**
- Created 5 tables: `profiles`, `lesson_progress`, `vocabulary_cards`, `srs_reviews`, `gamification_stats`
- Enabled Row Level Security (RLS) so users can only see their own data
- Created triggers to auto-create profiles on signup

### 1.3 Get Your Supabase Keys

1. Go to **Settings → API** (left sidebar)
2. Find and copy these two values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

📝 **Save these somewhere safe** - you'll need them in the next steps!

---

## Step 2: Add Supabase Keys to Replit (2 minutes)

1. In this Replit, look at the left sidebar
2. Click **"Tools"** → **"Secrets"** (lock icon)
3. Add two new secrets:

   **Secret 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: Your Project URL (e.g., `https://abcdefgh.supabase.co`)

   **Secret 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: Your anon public key (the long `eyJ...` string)

4. Click "Add Secret" for each

✅ **The app will now work locally in Replit with authentication!**

---

## Step 3: Test Locally in Replit (5 minutes)

1. The dev server should already be running (check the webview)
2. You should see a **login/signup screen**
3. Try creating an account:
   - Enter your email
   - Enter a password (min 6 characters)
   - Click "Registrieren"
4. Check your email for the confirmation link (Supabase sends it)
5. Click the link to verify your email
6. Return to the app and login

🎉 **You should now see the Dashboard!**

### 3.1 Configure Redirect URLs for Local Development

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Add this to **Redirect URLs**:
   - `http://localhost:5173/`
   - Your Replit webview URL (e.g., `https://your-repl.repl.co/`)

---

## Step 4: Push Code to GitHub (3 minutes)

### 4.1 Initialize Git (if not already done)

In the Replit Shell, run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git add .
git commit -m "Add Supabase authentication and database"
```

### 4.2 Connect to GitHub

1. Go to [github.com](https://github.com) and create a **new repository**
   - Name: `birkenbihl-farsi-trainer`
   - Make it **Private** (recommended) or Public
   - Don't initialize with README (we already have code)
2. Copy the repository URL (e.g., `https://github.com/yourusername/birkenbihl-farsi-trainer.git`)
3. In Replit Shell, run:

```bash
git remote add origin https://github.com/yourusername/birkenbihl-farsi-trainer.git
git branch -M main
git push -u origin main
```

✅ **Your code is now on GitHub!**

---

## Step 5: Deploy to Vercel (10 minutes)

### 5.1 Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login (use GitHub account for easy integration)
2. Click **"Add New..." → "Project"**
3. Click **"Import Git Repository"**
4. Find your `birkenbihl-farsi-trainer` repo and click **"Import"**

### 5.2 Configure Build Settings

Vercel should auto-detect Vite. Confirm these settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 5.3 Add Environment Variables

**Critical step!** Click **"Environment Variables"** and add these 3 secrets:

1. **VITE_SUPABASE_URL**
   - Value: Your Supabase Project URL (same as Replit)

2. **VITE_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon key (same as Replit)

3. **GEMINI_API_KEY**
   - Value: Your Gemini API key (from Replit Secrets)

**Environment**: Select all three (Production, Preview, Development)

### 5.4 Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. You'll get a live URL like: `https://birkenbihl-farsi-trainer.vercel.app`

🎉 **Your app is now LIVE!**

---

## Step 6: Configure Supabase Redirect URLs for Production (2 minutes)

This is **essential** for login to work on your live site!

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Add these to **Redirect URLs**:
   - `https://birkenbihl-farsi-trainer.vercel.app/` (your exact Vercel URL)
   - `https://*.vercel.app/` (for preview deployments)

3. Save changes

✅ **Login will now work on your deployed site!**

---

## Step 7: Test Live Deployment (5 minutes)

1. Visit your Vercel URL: `https://birkenbihl-farsi-trainer.vercel.app`
2. Try signing up with a new account
3. Check your email for verification
4. Login and test:
   - Start a lesson
   - Mark some vocabulary
   - Check progress is saved
5. Open in another browser/incognito → login with same account
6. **Verify you see the same progress!** ✨

---

## Step 8: Add Custom Domain (Optional)

1. In Vercel, go to your project → **Settings → Domains**
2. Add your custom domain (e.g., `farsi.yourdomain.com`)
3. Follow DNS setup instructions
4. Update Supabase redirect URLs to include your custom domain

---

## 🎯 Verification Checklist

Before going live, test these:

- ✅ Signup works and sends confirmation email
- ✅ Login works after email confirmation
- ✅ Lesson progress is saved to database
- ✅ Vocabulary cards are saved per-user
- ✅ SRS system works and schedules reviews
- ✅ Gamification (XP, streaks) persists across sessions
- ✅ Two different users have completely separate data
- ✅ Logout works and clears session
- ✅ Gemini TTS audio works in lessons

---

## 🔧 Troubleshooting

### "Invalid login credentials" error

- Check that email is verified (click link in email)
- Try "Forgot Password?" to reset

### Login redirects to localhost

- Make sure you added your Vercel URL to Supabase redirect URLs
- Check it matches exactly (including trailing slash)

### Environment variables not working

- Make sure they start with `VITE_` prefix for client-side access
- Redeploy after adding environment variables in Vercel

### Database queries failing

- Check Supabase RLS policies are enabled
- Verify user is authenticated (check browser console)
- Look at Supabase logs: Dashboard → Logs

### App shows login screen even after logging in

- Clear browser cache and cookies
- Check Supabase session in browser DevTools → Application → Local Storage

---

## 📊 Free Tier Limits

### Supabase Free Tier:
- ✅ 500 MB database storage
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

### Vercel Free Tier:
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ 100 builds/month
- ✅ Serverless functions

**Estimate:** Should easily handle **100+ active users** on free tier!

---

## 🔄 Updating Your Deployment

### From Replit:

1. Make your code changes in Replit
2. In Shell:
   ```bash
   git add .
   git commit -m "Your change description"
   git push origin main
   ```
3. Vercel auto-deploys in ~2 minutes ✨

---

## 🔐 Security Best Practices

1. ✅ **Never commit secrets** - Use environment variables
2. ✅ **Enable RLS** - Already done in our schema
3. ✅ **Email verification** - Required by default in Supabase
4. ✅ **HTTPS only** - Vercel handles this automatically
5. ✅ **Row-level security** - Users can only access their own data

---

## 📞 Support

If you run into issues:

1. **Supabase Logs**: Dashboard → Logs → check for errors
2. **Vercel Logs**: Deployments → click build → check function logs
3. **Browser Console**: F12 → Console tab → check for errors

---

## 🎉 You're Live!

Your Birkenbihl Farsi Trainer is now:

- ✅ Deployed to the internet
- ✅ Has user authentication
- ✅ Stores per-user data in database
- ✅ Auto-deploys when you push to GitHub
- ✅ Running on free tier (scalable to thousands of users!)

**Share your URL with students and start teaching Farsi! 🚀**
