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
- `src/lib/backend-api.ts` — Vercel HTTP APIs (scan upload, contribute, delete-account, identify-sake)
- `src/lib/openai-scan.ts` — label/menu scan
- `src/components/ScanResultScreen.tsx` — post-scan save + catalog contribute
- `src/app/sake/[id].tsx`, `src/app/brewery/[id].tsx` — detail parity with web

## Cursor Cloud specific instructions

- This is a single Expo SDK 53 / React Native app. Use `bun` (not npm). Dependencies are refreshed automatically via the startup update script (`bun install`); `postinstall` applies a native menu patch.
- Standard commands (see `package.json`): `bun run web` (Expo web dev server on port 8081 — the only runnable target in the cloud VM since there are no iOS/Android simulators), `bun run lint`, `bun run typecheck`. `bun run ios`/`bun run android` require native simulators and won't work here.
- No automated test suite exists (no `test` script, no `*.test.*`/`*.spec.*` files). Jest is installed but unused; don't assume tests exist.
- Supabase URL and anon key are hardcoded as defaults in `src/lib/supabase.ts`, so browsing/searching the live sake catalog works with no `.env` and no secrets. Only optional features need secrets: OpenAI label scanning (`EXPO_PUBLIC_OPENAI_API_KEY`) and the WineEngine / local-identify cascade (`EXPO_PUBLIC_WINE_ENGINE_ENABLED` + `POST /api/identify-sake`). Camera scanning also can't run in web/headless anyway.
- Web caveat: image/Skia-heavy screens (e.g. the sake detail page `sake/[id]`) can crash the headless Chrome renderer ("Aw, Snap! Error code: 4") in the cloud VM due to browser memory limits, even though Metro reports no JS errors. This is a browser-resource limitation of web mode, not an app bug — verify such screens natively when possible. Browse + search flows are reliable for smoke-testing.
- Multi-repo sync agents should clone both `jspeigner/Sakescan` and this repo when needed.
- Verify TypeScript with `bunx tsc --noEmit` / `bun run typecheck` when practical.
- Do not commit secrets. Use `EXPO_PUBLIC_*` env vars; restart Metro after env changes.
