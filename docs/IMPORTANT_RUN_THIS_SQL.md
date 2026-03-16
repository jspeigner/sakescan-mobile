# CRITICAL: Database Migration Required

## The Problem
Anonymous scanning is failing because the database has a NOT NULL constraint on `user_id` in the `scans` table. This needs to be fixed immediately.

## The Solution
You need to run the SQL migration file to make `user_id` nullable.

## Steps to Fix

### Via Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy and paste the contents of `docs/supabase-migrations/make_user_id_nullable.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Refresh your app - anonymous scanning should now work!

## What This Migration Does
1. Makes `user_id` nullable in the `scans` table
2. Updates the foreign key constraint to allow NULL values
3. Updates RLS policies to allow anonymous inserts
4. Allows anyone to read all scans (for community discovery)
5. Keeps update/delete restricted to authenticated users only

## After Running
Once you run this SQL, your app will:
- Allow anonymous users to scan sake labels
- Save all scans to build the database
- Show "Community Discoveries" from all users
- Encourage sign-up after successful scans
