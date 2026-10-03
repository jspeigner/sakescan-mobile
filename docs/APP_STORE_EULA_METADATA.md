# App Store EULA / subscription metadata (Guideline 3.1.2)

Apple rejects auto-renewable subscription apps when the **App Description** lacks a functional Terms of Use (EULA) link.

## Required in App Store Connect metadata

For every locale’s **App Description**, include:

```text
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://www.sakescan.com/privacy
```

Also set **Privacy Policy URL** in App Information / each locale (`privacyPolicyUrl` in `store.config.json`).

If using Apple’s **standard** EULA: keep License Agreement = Apple Standard, and put the std EULA URL in the App Description (above).

If using a **custom** EULA: App Information → License Agreement → custom text (plain text), **and** still put a Terms of Use URL in the App Description.

## Sync from this repo

```bash
bunx eas-cli metadata:pull --non-interactive   # refresh local store.config.json
# edit descriptions / privacyPolicyUrl
bunx eas-cli metadata:lint --non-interactive
bunx eas-cli metadata:push --non-interactive
```

Screenshots live under `store/apple/screenshot/` (gitignored); regenerate with `metadata:pull` before pushing if needed.

## Required in the app binary

- Paywall: tappable **Terms of Use (EULA)** + **Privacy Policy**
- Profile: **Terms of Use (EULA)** row (in addition to Privacy Settings)
