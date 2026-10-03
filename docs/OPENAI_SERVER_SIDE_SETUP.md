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
| Label | `supabase.functions.invoke('scan-label')` | Vision (`gpt-4o-mini`, escalate to `gpt-4o`) + catalog match + enrich |
| Label correction | same, with `back_image_base64` + optional `rejected` | Front+back Vision; demotes rejected bottle; boosts rows with `sake_label_images` |
| Menu | `supabase.functions.invoke('scan-menu')` | Vision (`gpt-4o-mini`, escalate to `gpt-4o`) → client grounds/scores |

Menu scan requires a signed-in user JWT (blocks anonymous Vision abuse).

### Wrong-sake → back-label flow

1. User taps **Wrong sake** on the scan result.
2. If ambiguous candidates exist → **Did you mean?** plus **None of these — scan back label**.
3. Otherwise (or after None of these) → prompt to scan the back label.
4. Camera opens in `correction=1` mode and calls `scan-label` with front + back images.
5. On **Confirm**, signed-in users update the scan row, upload front/back into `sake_label_images`, and write richer `scan_feedback` (including `corrected_sake_id`). Guests can re-identify locally first; catalog writes require sign-in.

Redeploy after pulling this change:

```bash
supabase functions deploy scan-label
supabase db push   # applies sake_label_images + scan correction columns
```

## Restricted key permissions (OpenAI dashboard)

- **Restricted**
- **Model capabilities / Chat Completions → Write**
- Everything else **None**
- Budget cap + alerts recommended
