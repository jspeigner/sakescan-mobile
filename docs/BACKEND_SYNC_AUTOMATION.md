# Backend → Mobile Sync Automation

Keeps [sakescan-mobile](https://github.com/jspeigner/sakescan-mobile) aligned with the SakeScan web/backend repo ([jspeigner/Sakescan](https://github.com/jspeigner/Sakescan)).

## Architecture

```
jspeigner/Sakescan  ──PR merged / push main──►  Cursor Automation
jspeigner/sakescan-mobile                              │
                                                       ▼
                                         Multi-repo Cloud Environment
                                         (both repos cloned)
                                                       │
                                                       ▼
                                         Agent diffs backend contract +
                                         end-user features → PR on mobile
```

## One-time Cursor dashboard setup

These steps cannot be done from this repo alone — create them in Cursor:

1. **GitHub**: [Integrations](https://cursor.com/dashboard/integrations) — grant the Cursor GitHub App access to **both** `jspeigner/Sakescan` and `jspeigner/sakescan-mobile`.
2. **Environment**: [Cloud Agents → Environments](https://cursor.com/dashboard/cloud-agents#environments) — create (or edit) an environment that selects **both** repositories. Install with `bun install` in each repo root as needed. Prefer environment-scoped secrets for `EXPO_PUBLIC_*` / Supabase keys used for verification.
3. **Automation**: [New automation](https://cursor.com/automations/new)
   - **Repositories**: the multi-repo environment from step 2
   - **Triggers**:
     - Primary: **Pull request merged** on `jspeigner/Sakescan`
     - Secondary: **Push to branch** `main` on `jspeigner/Sakescan`
     - Optional: **Scheduled** daily (drift catch-up)
   - **Tools**: Pull request creation on; Slack optional
   - **Prompt**: paste the prompt in the section below
4. Activate the automation.

Docs: [Automations](https://cursor.com/docs/cloud-agent/automations.md), [Multi-repo setup](https://cursor.com/docs/cloud-agent/setup.md).

## Automation prompt (paste into Cursor)

```text
You keep sakescan-mobile in sync with jspeigner/Sakescan (web + Supabase + Vercel APIs).

Repos
1. Inspect the triggering PR/commit diff in Sakescan (and recent main if scheduled).
2. Read Sakescan/MOBILE_API.md and mobile AGENTS.md + docs/BACKEND_SYNC_AUTOMATION.md.
3. Decide impact using the sync surface below.

WHEN TO ACT (open a PR on sakescan-mobile)
- supabase/migrations or schema / RLS / RPCs that mobile queries
- Changes to MOBILE_API.md
- Vercel APIs under api/ used by mobile (upload-scan-image, contribute-scan-image, delete-account, identify-sake, search-sake, etc.)
- New or changed end-user product features on web (explore, sake detail, brewery detail, auth callback, ratings) that mobile should mirror
- Auth redirect / deep-link contract changes

WHEN TO NO-OP (do not open a PR)
- Admin-only, cron, careers, marketing/blog/SEO-only, scraper/import internals with no mobile contract change
- Pure CSS/copy on marketing pages

HOW TO UPDATE MOBILE
1. Sync types in src/lib/database.types.ts; add migrations under supabase/migrations/ when schema changes.
2. Update hooks (src/lib/supabase-hooks.ts, social-hooks.ts) and API clients (src/lib/backend-api.ts).
3. For end-user features: update screens under src/app/ and components; follow CLAUDE.md (Expo, bun, NativeWind, React Query).
4. Prefer EXPO_PUBLIC_BACKEND_URL defaulting to https://www.sakescan.com for web APIs.
5. Open ONE PR on sakescan-mobile summarizing backend changes and mobile edits. Do not drive-by rewrite Sakescan unless a shared contract cannot be absorbed on mobile alone.
6. If nothing mobile-facing changed: exit without a PR.
```

## Sync surface (mobile)

| Backend area | Mobile touchpoints |
|---|---|
| `sake` / `scans` / `breweries` columns | `src/lib/database.types.ts`, hooks, `sake/[id].tsx`, `brewery/[id].tsx` |
| `POST /api/upload-scan-image` | `src/lib/backend-api.ts`, `useCreateScan` |
| `POST /api/contribute-scan-image` | `src/lib/backend-api.ts`, `ScanResultScreen.tsx` |
| `POST /api/delete-account` | `src/app/profile.tsx` |
| `POST /api/identify-sake` (local-first + WineEngine fallback) | `src/lib/backend-api.ts`, optional path in `openai-scan.ts` via `EXPO_PUBLIC_WINE_ENGINE_ENABLED` |
| `sake_image_embeddings` / `wineengine_search_log` / match RPCs | `src/lib/database.types.ts`, `supabase/migrations/*` |
| `MOBILE_API.md` | Treat as source of truth for mobile DB/API contract |
| Edge `scan-label` / `delete-user` | `supabase/functions/*`, `openai-scan.ts` |

## Default backend URL

`EXPO_PUBLIC_BACKEND_URL=https://www.sakescan.com` (Vercel deployment of `jspeigner/Sakescan`).
