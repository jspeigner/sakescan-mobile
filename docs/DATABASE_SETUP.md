# Database Setup Instructions for SakeScan

## Problem
When users sign up via Supabase Auth, they are added to `auth.users` but NOT to the `public.users` table. This causes foreign key constraint errors when trying to create ratings, scans, or favorites.

## Solution
Run these SQL scripts in your Supabase SQL Editor in the following order:

### Step 1: Fix Users Table (REQUIRED - Run First!)
Run `docs/supabase-migrations/fix_users_table.sql` - This creates:
- A properly structured `public.users` table that references `auth.users`
- A database trigger that automatically creates a user record when someone signs up
- Backfills existing auth users into the users table
- Row Level Security policies

**How to run:**
1. Go to your Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `fix_users_table.sql`
4. Click "Run"

### Step 2: Fix Ratings Table (Run Second)
Run `docs/supabase-migrations/fix_ratings_table.sql` - This creates:
- A properly structured `ratings` table with correct foreign keys
- Row Level Security policies for public reviews
- Triggers to automatically update sake average ratings
- Indexes for performance

### Step 3: Make user_id Nullable (For Anonymous Scans)
Run `docs/supabase-migrations/make_user_id_nullable.sql` - This allows:
- Anonymous users to scan sake labels
- Scans to be saved without requiring authentication

### Step 4: (Optional) Favorites Table
Run `docs/supabase-migrations/create_favorites_table.sql` to set up the favorites feature.

### Step 5: (Optional) Sake Images Storage
Run `docs/supabase-migrations/fix_sake_images_storage.sql` to fix sake image display (B03).

### Step 6: Additional Bug Fixes (B03, B06, B10, B14)
See **`docs/SUPABASE_BUG_FIXES.md`** for Dashboard and SQL instructions for:
- B03: Storage RLS for sake images
- B06: Remove auto-assigned profile image trigger
- B10: Scans table RLS for image picker scans
- B14: Reset password email template (styled link)

## Verification
After running the scripts, test by:
1. Signing up a new user in the app
2. Check that a record appears in `public.users`
3. Try submitting a review - it should work now!

## Testing
```sql
-- Check if users are being created properly
SELECT * FROM public.users LIMIT 10;

-- Check if ratings work
SELECT * FROM public.ratings LIMIT 10;

-- Verify the trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Troubleshooting

### "User not present in table users" error
- Make sure you ran `fix_users_table.sql` first
- Check if the trigger was created: Run the verification query above
- Backfill existing users by running just the INSERT part of `fix_users_table.sql` again

### "Permission denied" errors
- Make sure RLS policies are created
- Verify the user is authenticated (not anonymous)
- Check that `auth.uid()` matches the user_id being inserted
