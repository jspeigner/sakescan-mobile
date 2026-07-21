# SakeScan iOS QA Bug Status

Source: [SakeScan IOS_QA spreadsheet](https://docs.google.com/spreadsheets/d/1Y8rss8DlWegNO-NVmtrM0PJ1hXRTsr4Iuop-amfjTXM/edit)

Updated: 2026-07-16

| BUG_ID | TITLE | STATUS | Comment |
|--------|-------|--------|---------|
| B01 | No Success Confirmation After Updating Profile Picture | Fixed | Success alert after profile/avatar save |
| B02 | Scanned and Reviewed Options Not Clickable | Fixed | Stats navigate to Scan History / Saved Rated tab |
| B03 | Dark Mode Only on Home Screen | Fixed | Theme tokens applied across Explore, Saved, Breweries, Privacy, Scan History, Review, Brewery detail; contrast tokens improved |
| B04 | No Confirmation Before Deleting Scanned Item | Fixed | Confirmation alert before delete in Scan History |
| B05 | Deleted Scan Still on Home Until Refresh | Fixed | Scan History uses Supabase scans when signed in; delete invalidates Home queries |
| B06 | Language Change Not Applied Across Modules | Fixed | Expanded i18n keys; wired tabs, privacy, scan history, review, camera info, explore/breweries titles |
| B07 | No Success Message After Clearing Scan History | Fixed | Clears Supabase + local history; success alert |
| B08 | Cleared Scan History Still on Home | Fixed | Same as B07 — query invalidation refreshes Home |
| B09 | Account Deletion Fails | Retesting | Spreadsheet STATUS dropdown; code added `delete-user` Edge Function — deploy then retest |
| B10 | Save Enabled Without Profile Changes | Fixed | Save disabled until display name/avatar changes |
| B11 | Info Icon Not Clickable on Scan Label | Fixed | Info opens help modal for label/menu modes |
| B12 | Brewery Not Found | Fixed | Exact `ilike` brewery query via `useSakeByBrewery` |
| B13 | Privacy Policy Link Not Clickable | Fixed | Opens https://sakescan.com/privacy |
| B14 | No Success After Submitting Review | Fixed | Success alert after rating create |
| B15 | No Success After Clearing All Reviews | Fixed | Deletes user ratings + success alert |
| B16 | Cleared Reviews Still Appear | Fixed | Same as B15 — ratings queries invalidated |
| B17 | Menu Icon Low Contrast on Sake Detail | Fixed | Dark circular scrim + white icon |
| B18 | Scan History Low Color Contrast | Fixed | Theme-aware colors; stronger secondary text; red delete affordance |
| B19 | Sign in with Apple Fails | In Progress | App: nonce + `ensureUserExists`. Still requires Apple provider enabled in Supabase + Apple Developer config |
| B20 | Password Reset Email Not Received | To do | App reset flow OK; verify Supabase Auth SMTP, redirect URLs, and email logs |

Spreadsheet STATUS dropdown currently allows: `To do`, `In Progress`, `Retesting` (plus grandfathered `Fixed` values for completed items).

## Deploy notes

1. Deploy delete-user function: `supabase functions deploy delete-user`
2. Confirm Apple Sign In provider + Services ID in Supabase Dashboard
3. Confirm Auth email SMTP / redirect allow list for password reset (`sakescan://auth/callback`)
