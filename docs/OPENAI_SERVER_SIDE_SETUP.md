# Server-side OpenAI for SakeScan (label + menu)

## Add your new restricted key (once)

Never put this in `.env` as `EXPO_PUBLIC_*`. Set it as a Supabase Edge secret:

```bash
supabase link --project-ref qpsdebikkmcdzddhphlk
supabase secrets set OPENAI_API_KEY='sk-proj-YOUR_NEW_KEY'
supabase secrets list
```

Or: Supabase Dashboard → Project Settings → Edge Functions → Secrets → `OPENAI_API_KEY`.

Also ensure these exist (usually already set):
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deploy functions

```bash
supabase functions deploy scan-label
supabase functions deploy scan-menu
```

## What the app does

| Scan | Client | Server |
|------|--------|--------|
| Label | `supabase.functions.invoke('scan-label')` | Vision (`gpt-4o-mini`) + catalog match + enrich |
| Menu | `supabase.functions.invoke('scan-menu')` | Vision (`gpt-4o-mini`, escalate to `gpt-4o`) → client grounds/scores |

Menu scan requires a signed-in user JWT (blocks anonymous Vision abuse).

## Restricted key permissions (OpenAI dashboard)

- **Restricted**
- **Model capabilities / Chat Completions → Write**
- Everything else **None**
- Budget cap + alerts recommended
