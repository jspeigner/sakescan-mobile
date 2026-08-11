Refer to CLAUDE.md and follow instructions precisely.

## Related Repos & APIs

- **Website (sakescan.com):** `/Users/jonathanspeigner/Documents/GitHub/SakeScan` — React/Vite site, deploys to Vercel on push. Auth callback at `/auth/callback`.
- **Supabase:** Project linked via CLI. Run `supabase db push` for migrations; SQL in `supabase/migrations/`.

## Cursor Cloud specific instructions

- This is a single Expo SDK 53 / React Native app. Use `bun` (not npm). Dependencies are refreshed automatically via the startup update script (`bun install`); `postinstall` applies a native menu patch.
- Standard commands (see `package.json`): `bun run web` (Expo web dev server on port 8081 — the only runnable target in the cloud VM since there are no iOS/Android simulators), `bun run lint`, `bun run typecheck`. `bun run ios`/`bun run android` require native simulators and won't work here.
- No automated test suite exists (no `test` script, no `*.test.*`/`*.spec.*` files). Jest is installed but unused; don't assume tests exist.
- Supabase URL and anon key are hardcoded as defaults in `src/lib/supabase.ts`, so browsing/searching the live sake catalog works with no `.env` and no secrets. Only optional features need secrets: OpenAI label scanning (`EXPO_PUBLIC_OPENAI_API_KEY`) and the WineEngine cascade (`EXPO_PUBLIC_WINE_ENGINE_ENABLED` + deployed Edge Functions). Camera scanning also can't run in web/headless anyway.
- Web caveat: image/Skia-heavy screens (e.g. the sake detail page `sake/[id]`) can crash the headless Chrome renderer ("Aw, Snap! Error code: 4") in the cloud VM due to browser memory limits, even though Metro reports no JS errors. This is a browser-resource limitation of web mode, not an app bug — verify such screens natively when possible. Browse + search flows are reliable for smoke-testing.