# Supabase Setup Instructions

Follow these steps to set up Supabase sync for your ToDoToday app.

## 1. Install Dependencies

First, install the Supabase client library:

```bash
npm install
```

## 2. Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in with your account
3. Click "New Project"
4. Fill in:
   - **Name**: ToDoToday (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait for the project to be created (takes ~2 minutes)

## 3. Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## 4. Configure Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-project-url-here` and `your-anon-key-here` with the values you copied from Supabase.

**Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

## 5. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the file `database/schema.sql` from this project
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click "Run" (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

This creates all the necessary tables, indexes, and security policies.

## 6. Configure Google OAuth

### In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Replace `YOUR_PROJECT_REF` with your Supabase project reference (found in your project URL)
7. Copy the **Client ID** and **Client Secret**

### In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Google provider**
4. Paste your **Client ID** and **Client Secret** from Google Cloud Console
5. Click **Save**

## 7. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. You should see a login screen with "Sign in with Google" button

4. Click the button and complete the Google OAuth flow

5. After signing in, your app should work normally, and all data will sync to Supabase!

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists and has the correct values
- Restart your dev server after creating/updating `.env.local`

### "Failed to fetch" or network errors
- Check that your Supabase project URL and keys are correct
- Make sure your Supabase project is not paused (free tier projects pause after inactivity)

### Google OAuth not working
- Verify the redirect URI in Google Cloud Console matches exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check that Google OAuth is enabled in Supabase dashboard
- Make sure Client ID and Client Secret are correct

### Database errors
- Make sure you ran the SQL schema file in Supabase SQL Editor
- Check that Row Level Security (RLS) policies were created
- Verify tables exist in **Table Editor** in Supabase dashboard

## Data Migration

When you first sign in, the app will:
1. Load your existing localStorage data
2. Fetch any data from Supabase
3. Merge them (keeping the most recent version of each item)
4. Sync the merged data back to Supabase

Your existing data is safe and will be preserved!

## Next Steps

- Your data now syncs automatically across all devices where you sign in
- Changes are saved to both localStorage (for offline use) and Supabase (for sync)
- The app works offline and syncs when you're back online

Enjoy your synced ToDoToday app! 🎉
