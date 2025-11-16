# ⚡ Quick Start - Connect Your Supabase Project

The app is ready to test! You just need to connect it to your Supabase project.

## 🚨 Current Status

You're seeing an error: **"Missing Supabase environment variables"**

This is expected! Follow these steps to fix it:

---

## Step 1: Create Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - Name: `birkenbihl-farsi-trainer`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Click **"Create new project"** (takes ~2 minutes)

---

## Step 2: Run the Database Schema (2 minutes)

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open `docs/supabase-schema.sql` in this Replit
4. Copy the entire SQL and paste into Supabase
5. Click **"Run"** ✅

This creates all the database tables with Row Level Security!

---

## Step 3: Get Your API Keys (1 minute)

1. In Supabase, go to **Settings → API**
2. Copy these two values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 4: Add Keys to Replit (1 minute)

1. In this Replit, click **Tools → Secrets** (lock icon on left sidebar)
2. Add two secrets:

   **Secret 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: Paste your Project URL

   **Secret 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: Paste your anon key

3. Click **"Add Secret"** for each

---

## Step 5: Restart the Workflow (30 seconds)

1. In Replit, click the **"Stop"** button (top right of webview)
2. Click **"Run"** again
3. Wait for the server to start (~10 seconds)

---

## Step 6: Configure Redirect URLs (1 minute)

1. In Supabase → **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   - `http://localhost:5173/`
   - Your Replit webview URL (copy from the webview address bar)

---

## Step 7: Test! 🎉

1. Refresh the webview
2. You should now see a **beautiful login screen**!
3. Click **"Registrieren"** (Sign up)
4. Enter email + password (min 6 chars)
5. Check your email for confirmation link
6. Click the link → come back → login

You're in! ✨

---

## 🐛 Troubleshooting

### Still seeing "Missing environment variables"?

- Make sure you added both secrets to **Tools → Secrets**
- Check for typos in secret names (must be exact)
- Restart the workflow after adding secrets

### Login not working?

- Check redirect URLs in Supabase (must match your webview URL)
- Verify email by clicking the link sent to your inbox

### Database errors?

- Make sure you ran the entire `supabase-schema.sql` file
- Check Supabase logs: Dashboard → Logs

---

## ✅ What You Get

After setup, every user will have:

- ✅ Their own login
- ✅ Private vocabulary lists
- ✅ Separate progress tracking
- ✅ Personal SRS system
- ✅ Individual XP and streaks

**No data is shared between users!** 🔒

---

## 📚 Next Steps

1. Read `docs/DEPLOYMENT.md` for deploying to Vercel
2. Test with multiple accounts to verify data isolation
3. Explore the new authentication system

---

**Need help?** Check the full deployment guide: `docs/DEPLOYMENT.md`
