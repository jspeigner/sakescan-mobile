# 🚀 Edge Function Setup Guide

This guide will help you get the AI-powered sake scanning working in your app.

## ✅ Quick Setup Checklist

### 1. Prerequisites
- [ ] Supabase project created
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] OpenAI API key with GPT-4o Vision access
- [ ] Logged into Supabase CLI (`supabase login`)

### 2. Environment Variables

**In your `.env` file (already set):**
```env
EXPO_PUBLIC_SUPABASE_URL=https://qpsdebikkmcdzddhphlk.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGc... (your anon key)
```

**In Supabase Edge Function Secrets (needs setup):**
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API
- [ ] `SUPABASE_ANON_KEY` - Same as EXPO_PUBLIC_SUPABASE_KEY above

### 3. Deploy Edge Function

```bash
# Link to your project (if not already linked)
supabase link --project-ref qpsdebikkmcdzddhphlk

# Deploy the scan-label function
supabase functions deploy scan-label

# Set the environment variables (replace with your actual values)
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 4. Verify Deployment

```bash
# Check if secrets are set
supabase secrets list

# Test the function (optional)
curl -i --location --request POST 'https://qpsdebikkmcdzddhphlk.supabase.co/functions/v1/scan-label' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"image_base64":"test"}'
```

### 5. Database Setup

The `sake` table should already exist. If not, run the migration:

```sql
CREATE TABLE IF NOT EXISTS sake (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_japanese TEXT,
  brewery TEXT NOT NULL,
  type TEXT,
  subtype TEXT,
  region TEXT,
  prefecture TEXT,
  description TEXT,
  rice_variety TEXT,
  polishing_ratio NUMERIC,
  alcohol_percentage NUMERIC,
  label_image_url TEXT,
  bottle_image_url TEXT,
  average_rating NUMERIC DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sake ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything on sake"
  ON sake
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read sake"
  ON sake
  FOR SELECT
  TO authenticated
  USING (true);
```

## 🧪 Testing the Setup

### Test 1: Check Function is Deployed
```bash
supabase functions list
```
You should see `scan-label` in the list.

### Test 2: Check Logs
```bash
# Watch logs in real-time
supabase functions logs scan-label --follow
```

### Test 3: Test in App
1. Sign in to the app (not guest mode)
2. Tap the camera button
3. Take a photo of any text (doesn't need to be sake)
4. Check the logs to see what's happening

## 🐛 Common Issues

### Issue: "Edge Function returned a non-2xx status code"

**Check logs:**
```bash
supabase functions logs scan-label
```

**Common causes:**
1. **Missing OPENAI_API_KEY**: Add it with `supabase secrets set`
2. **Invalid OpenAI key**: Verify at https://platform.openai.com/api-keys
3. **No OpenAI credits**: Add credits to your OpenAI account
4. **Database permissions**: Check RLS policies on `sake` table

### Issue: "Authentication required"

**Solution:**
- User must be signed in (not in guest mode)
- Navigate to Profile tab and sign in
- Check that JWT token is valid

### Issue: Function deployed but not responding

**Check:**
```bash
# Verify function is running
curl https://qpsdebikkmcdzddhphlk.supabase.co/functions/v1/scan-label

# Should return a CORS error or 400, not 404
```

## 📊 Monitoring

### View Recent Logs
```bash
supabase functions logs scan-label --limit 50
```

### Check Function Health
```bash
supabase functions list --format json
```

## 🔄 Updating the Function

After making changes to `/supabase/functions/scan-label/index.ts`:

```bash
# Redeploy
supabase functions deploy scan-label

# Watch logs to verify
supabase functions logs scan-label --follow
```

## 💡 Tips

1. **OpenAI Costs**: GPT-4o Vision costs ~$0.01 per image scan
2. **Rate Limits**: OpenAI has rate limits - production apps should implement queuing
3. **Image Size**: Keep images under 5MB for faster processing
4. **Caching**: Consider caching results to reduce API calls

## 📞 Getting Help

If you're still having issues:

1. Check the logs: `supabase functions logs scan-label`
2. Verify secrets are set: `supabase secrets list`
3. Test OpenAI API directly: https://platform.openai.com/playground
4. Check Supabase dashboard for function status

## ✅ Verification Checklist

Before asking for help, verify:
- [ ] Edge function is deployed
- [ ] All three secrets are set
- [ ] OpenAI API key is valid and has credits
- [ ] User is signed in (not guest)
- [ ] `sake` table exists with correct schema
- [ ] RLS policies allow service role to insert
- [ ] Logs show specific error (not just generic failure)
