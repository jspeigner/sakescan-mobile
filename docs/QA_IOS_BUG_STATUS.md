# SakeScan iOS QA Bug Status

Source: [SakeScan IOS_QA spreadsheet](https://docs.google.com/spreadsheets/d/1Y8rss8DlWegNO-NVmtrM0PJ1hXRTsr4Iuop-amfjTXM/edit)

Updated: 2026-07-31 (app version 2.1.6 / build 11)

## Fixed tab (gid=0)

All B01–B16 on the **Fixed** sheet are marked Fixed / Pass in the spreadsheet.

## New Bugs tab (gid=97967247)

| BUG_ID | TITLE | STATUS | App fix | Remaining ops |
|--------|-------|--------|---------|---------------|
| B01 | Language Change Is Not Applied Across All Modules | Fixed (code) | Expanded i18n keys (en/ja/ko/zh-TW) and wired Home, Welcome, Auth, Profile, Camera, Explore, Saved, Breweries, tab free-scan alerts | Retest language switch across modules |
| B02 | Account Deletion Fails with "Failed to Delete Account" | Fixed (code) | Client now calls existing `delete_own_account` RPC (Edge Function was undeployed 404); local sign-out after delete; migration `20260731000000_delete_own_account.sql` documents/replaces RPC | Confirm RPC grants; optional `supabase functions deploy delete-user` as fallback |
| B03 | Password Reset Email Is Not Received | In Progress | Stable redirect `sakescan://auth/callback`; deep-link handler exchanges PKCE `code` and routes recovery to `/reset-password`; email normalized | Supabase Auth → Redirect URLs must include `sakescan://auth/callback`; verify SMTP / Auth email logs; website `/auth/callback` should deep-link with scheme `sakescan` |
| B04 | Sign in with Apple Fails | In Progress | Nonce + clearer misconfig errors; Apple display name → `ensureUserExists`; profile create no longer blocks Apple success | Enable Apple provider in Supabase Auth; Client IDs must include iOS bundle ID `com.sakescan` |

Spreadsheet STATUS dropdown currently allows: `To do`, `In Progress`, `Retesting` (plus grandfathered `Fixed` values).

### Suggested spreadsheet updates (New Bugs)

| BUG_ID | Status | Status Version 2.1.6 (11) | Comment |
|--------|--------|---------------------------|---------|
| B01 | Retesting | | i18n wired across major modules |
| B02 | Retesting | | Uses `delete_own_account` RPC |
| B03 | In Progress | | App redirect + PKCE fixed; confirm SMTP/redirect allow list |
| B04 | In Progress | | App nonce OK; enable Apple provider + Client IDs in Supabase |

## Deploy notes

1. RPC `delete_own_account` already exists remotely; migration is for drift protection: `supabase db push`
2. Optional: `supabase functions deploy delete-user` (fallback only)
3. Auth → Redirect URLs: `sakescan://auth/callback`, `sakescan://reset-password`, `https://www.sakescan.com/auth/callback`
4. Auth → Providers → Apple: enable + set Client IDs to `com.sakescan` (and Services ID if using web)
5. Confirm Auth email delivery (SMTP / rate limits / spam) for password reset
