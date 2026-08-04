Refer to CLAUDE.md and follow instructions precisely.

## Related Repos & APIs

- **Website (sakescan.com):** `/Users/jonathanspeigner/Documents/GitHub/SakeScan` — React/Vite site, deploys to Vercel on push. Auth callback at `/auth/callback`.
- **Supabase:** Project linked via CLI. Run `supabase db push` for migrations; SQL in `supabase/migrations/`.

## App version (TestFlight sync)

In-app Profile version must always match the TestFlight/App Store binary via `getAppVersionLabel()` (`src/lib/app-version.ts`). Never hardcode it. After EAS iOS production bumps, run `bun run version:sync && bun run version:check` and commit the synced files.

