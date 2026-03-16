# Supabase Bug Fixes (B03, B06, B10, B14)

**Applied via CLI (2024):** B03, B10 — Migrations pushed to remote via `supabase db push`. See `supabase/migrations/`.

**Manual (Dashboard only):** B06, B14 — Must be done in Supabase Dashboard.

---

## Password Reset Redirect (localhost:3000 / otp_expired)

**Symptom:** Password reset email link goes to `http://localhost:3000/?error=access_denied&error_code=otp_expired` instead of opening the app.

**Cause:** Supabase redirects to Site URL when `vibecode://reset-password` is not in the allowed Redirect URLs list.

### Fix

1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:
   - `vibecode://**`
   - `vibecode://reset-password`
   - `vibecode://auth/callback`
3. **Site URL:** Set to `vibecode://` (or your production web URL if you have one). Avoid `localhost:3000` for a mobile-only app.
4. Click **Save**

**Note:** Reset links expire in 1 hour. If the link is old, request a new one.

---

## B03 — Missing sake images (Storage RLS)

**Symptom:** Sake label images don't load; profile/avatar images may also be missing.

### Option A: Via Supabase Dashboard (Storage)

1. Go to **Storage** → **Buckets**
2. Find the bucket for sake images (likely `sake-images`, `sakes`, or similar)
3. If the bucket is **Private**:
   - Either set it to **Public**, OR
   - Add a policy: **SELECT** allowed for `anon` and `authenticated` roles on objects where `bucket_id = 'sake-images'` (adjust bucket name if different)
4. Repeat for the **avatars** bucket if profile images are missing

### Option B: Via SQL (if bucket exists)

Run in **SQL Editor**:

```sql
-- Make sake-images bucket public (or add RLS policy)
UPDATE storage.buckets SET public = true WHERE id = 'sake-images';

-- If using a different bucket name (e.g. 'sakes'), run:
-- UPDATE storage.buckets SET public = true WHERE id = 'sakes';

-- For avatars bucket:
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
```

Or use the full migration: `docs/supabase-migrations/fix_sake_images_storage.sql`

---

## B06 — Auto-assigned profile image (Auth trigger)

**Symptom:** Users get an unwanted default avatar (e.g. Gravatar) instead of a placeholder when they haven't set one.

### Steps

1. Go to **Database** → **Functions** and **Database** → **Triggers**
2. Look for any trigger on `auth.users` or `public.users` that auto-populates `avatar_url` on user creation
3. If one exists:
   - **Option A:** Drop the trigger (recommended if B06 fix is in app code)
   - **Option B:** Update the trigger to only set `avatar_url` when the user explicitly provides one (e.g. from OAuth metadata)

### Find and drop the trigger via SQL

```sql
-- List triggers on auth.users or public.users
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgrelid IN ('auth.users'::regclass, 'public.users'::regclass);

-- If you find a trigger like 'on_auth_user_created' that sets avatar_url,
-- drop it (replace TRIGGER_NAME with actual name):
-- DROP TRIGGER IF EXISTS TRIGGER_NAME ON auth.users;
```

---

## B10 — Scan from image error (Scans table RLS)

**Symptom:** Picking an image from the gallery to scan fails; scan save returns an error.

### Steps

1. Go to **Database** → **Policies** → **scans** table
2. Confirm these policies exist:

   - **INSERT:** Allow authenticated users to insert rows where `user_id = auth.uid()`
   - **SELECT:** Allow users to read their own scans (and possibly all scans for discovery)

### Add missing policies via SQL

```sql
-- Allow authenticated users to insert scans
CREATE POLICY "Users can insert own scans"
ON public.scans FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to read their own scans
CREATE POLICY "Users can read own scans"
ON public.scans FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Optional: Allow reading all scans for community discovery
-- CREATE POLICY "Anyone can read scans"
-- ON public.scans FOR SELECT
-- TO anon, authenticated
-- USING (true);
```

If `user_id` is nullable (anonymous scans), also add:

```sql
-- Allow anonymous inserts (user_id can be null)
CREATE POLICY "Anonymous can insert scans"
ON public.scans FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
```

---

## B14 — Reset password link is plain text (Email Template)

**Symptom:** The reset password email shows the link as raw text instead of a styled button/link.

### Steps

1. Go to **Authentication** → **Email Templates** → **Reset Password**
2. Update the **Body** to wrap the link in an anchor tag with visible styling

### Example template body

```html
<p>Click the link below to reset your password:</p>
<p>
  <a href="{{ .ConfirmationURL }}" 
     style="color: #C9A227; text-decoration: underline; font-weight: bold;">
    Reset Password
  </a>
</p>
<p>If you didn't request this, you can ignore this email.</p>
```

Or with a button-style link:

```html
<p>Click the button below to reset your password:</p>
<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 24px; background-color: #C9A227; color: white; text-decoration: none; font-weight: bold; border-radius: 8px;">
    Reset Password
  </a>
</p>
<p>If you didn't request this, you can ignore this email.</p>
```

3. Click **Save**

---

## Summary

| Bug | Area | Action |
|-----|------|--------|
| B03 | Storage → Buckets | Make sake-images (and avatars) public or add SELECT policy |
| B06 | Database → Triggers | Remove/update trigger that auto-sets avatar_url |
| B10 | Database → Policies → scans | Add INSERT/SELECT policies for scans table |
| B14 | Auth → Email Templates | Update Reset Password template with styled link |
