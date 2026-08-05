Refer to CLAUDE.md and follow instructions precisely.

## Related Repos & APIs

- **Website / backend (sakescan.com):** [jspeigner/Sakescan](https://github.com/jspeigner/Sakescan) — React/Vite site on Vercel. Source of truth for shared Supabase schema, `MOBILE_API.md`, and HTTP APIs under `/api/*`. Local checkout path on some machines: `/Users/jonathanspeigner/Documents/GitHub/SakeScan`. Auth callback: `/auth/callback`.
- **Supabase:** Project linked via CLI. Run `supabase db push` for migrations; SQL in `supabase/migrations/`.
- **Backend base URL (mobile):** `EXPO_PUBLIC_BACKEND_URL` → default `https://www.sakescan.com`.

## Backend → mobile sync

When the Sakescan web/backend repo changes schema, RPCs, Edge/HTTP APIs, or end-user product features, update this mobile app to match.

Full playbook + Cursor Automation setup: [docs/BACKEND_SYNC_AUTOMATION.md](docs/BACKEND_SYNC_AUTOMATION.md).

### Sync rules for agents

1. Treat `jspeigner/Sakescan/MOBILE_API.md` as the mobile-facing DB/API contract.
2. **Always sync:** migrations/schema, RPCs, `MOBILE_API.md`, mobile-used `/api/*` routes, explore/sake/brewery/auth/rating end-user features.
3. **Ignore:** admin, cron, careers, marketing/blog-only, scrapers with no contract change.
4. Prefer feature parity for end-user product surfaces (not admin). Mobile may stay ahead on social/menu-scan features that web does not have.
5. Open PRs on `sakescan-mobile`; do not rewrite the web repo unless a shared contract cannot be fixed on mobile alone.
6. Use `bun` for scripts; follow CLAUDE.md for Expo/React Native patterns.

### Key mobile integration files

- `src/lib/database.types.ts` — hand-maintained Supabase types
- `src/lib/supabase-hooks.ts` / `social-hooks.ts` — queries & mutations
- `src/lib/backend-api.ts` — Vercel HTTP APIs (scan upload, contribute, delete-account)
- `src/lib/openai-scan.ts` — label/menu scan
- `src/components/ScanResultScreen.tsx` — post-scan save + catalog contribute
- `src/app/sake/[id].tsx`, `src/app/brewery/[id].tsx` — detail parity with web

## Cursor Cloud specific instructions

- Multi-repo sync agents should clone both `jspeigner/Sakescan` and this repo.
- Verify TypeScript with `bunx tsc --noEmit` when practical.
- Do not commit secrets. Use `EXPO_PUBLIC_*` env vars; restart Metro after env changes.
