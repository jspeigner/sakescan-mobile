Refer to CLAUDE.md and follow instructions precisely.

## Related Repos & APIs

- **Website (sakescan.com):** `/Users/jonathanspeigner/Documents/GitHub/SakeScan` — React/Vite site, deploys to Vercel on push. Auth callback at `/auth/callback`.
- **Supabase:** Project linked via CLI. Run `supabase db push` for migrations; SQL in `supabase/migrations/`.

## Cursor Cloud specific instructions

- **Package manager:** `bun` (installed at `~/.bun/bin`, on PATH via `~/.bashrc`). Use `bun`, never `npm`. Scripts are in `package.json`.
- **Standard commands (see `package.json`):** `bun run lint` (expo lint), `bun run typecheck` (`tsc --noEmit`), `bun run web` / `bun start`. There is no unit-test suite (jest is present but no `*.test.*` files or `test` script), so lint + typecheck are the automated checks.
- **Running/testing on the cloud VM:** This is an Expo React Native mobile app with no iOS/Android simulator available on Linux, so use the **web** target (`bun run web`) to exercise the app in a browser. Metro serves on port `8081`.
- **Supabase works out of the box:** `src/lib/supabase.ts` embeds a default project URL + anon key, so browsing/searching the sake catalog, viewing sake detail pages, and guest mode all work with **no `.env`**. Only label scanning (OpenAI Vision) needs extra secrets — set `EXPO_PUBLIC_OPENAI_API_KEY` in a root `.env` (see README "Environment Variables"); restart Metro after changing env vars.
- **Known web caveat:** On the web target in this constrained VM, the **Explore tab** (`/explore`) and **search-results** (`/search-results`) pages crash the browser renderer ("Aw, Snap! Error code 4"). The Home screen, guest auth, and `sake/[id]` detail pages render fine and load real Supabase data. Prefer the Home → sake-detail flow for web smoke tests; the crash appears web/VM-specific, not a general app bug.