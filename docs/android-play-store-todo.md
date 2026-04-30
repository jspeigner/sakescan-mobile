# Android Play Store Submission TODO

Last updated: 2026-04-14

This checklist is specific to the current SakeScan Expo/EAS setup.

## 1) Blockers To Fix First

- [x] Set Android application ID in `app.json`:
  - Add `expo.android.package` (example: `com.sakescan.mobile`)
  - Must be final before production release (changing later means a new app listing)
- [x] Confirm Android versioning strategy:
  - Project uses EAS remote app versioning (`eas.json` has `"appVersionSource": "remote"`)
  - `production` profile already has `autoIncrement: true` for store releases
- [x] Configure Android EAS submit profile in `eas.json`:
  - Add `submit.production.android`
  - Include Play track (`internal` first), and service account key path or server credentials
- [x] Add baseline adaptive icon config in `app.json`
  - `expo.android.adaptiveIcon` is now configured
- [ ] Verify branding assets are production-ready:
  - Add/verify `expo.android.adaptiveIcon` (`foregroundImage`, `backgroundColor`)
  - Confirm app icon, adaptive icon, splash image, and feature graphic exports for Play Console
- [ ] Publish a live privacy policy URL and add it to Play Console

## 2) Manifest + Permissions Hardening

- [ ] Confirm only required Android permissions are shipped
  - Current explicit permissions: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`
  - Camera and media permissions are requested in-app and should be validated in final manifest
- [ ] Validate Android permission prompts are accurate and shown only on feature use:
  - Camera (`src/app/camera.tsx`)
  - Media library (`src/app/camera.tsx`)
  - Location (`src/lib/location.ts`)
- [ ] Re-check iOS-only permission copy in `app.json` so product messaging is consistent across stores

## 3) Play Console Setup

- [ ] Create/verify Play app listing under the exact package name from `app.json`
- [ ] Complete store listing:
  - App name, short description, full description
  - Category, contact email, privacy policy URL
- [ ] Upload visual assets:
  - App icon (512x512)
  - Feature graphic (1024x500)
  - Phone screenshots (minimum required set)
- [ ] Complete content declarations:
  - App content questionnaire
  - Content rating questionnaire
  - Target audience + ads declaration
  - News app declaration (if applicable)
- [ ] Complete Data safety form using actual app behavior:
  - Account data (auth), user content (scans/reviews), photos/images (scan import), location (nearby flows), diagnostics/analytics (if enabled)
  - Mark collection purpose correctly (app functionality, analytics, etc.)
- [ ] Complete App access section (test account if login is required for core flows)

## 4) Build + Signing Pipeline

- [ ] Confirm EAS Android credentials are present and managed
  - Keystore must be backed up and team-accessible
- [ ] Run production Android build:
  - `bunx eas build --platform android --profile production`
- [ ] Submit to internal testing track first:
  - `bunx eas submit --platform android --profile production`
- [ ] Verify uploaded artifact in Play Console:
  - Package name, version name, version code, signing certificate

## 5) Pre-Submission QA (Real Android Devices)

- [ ] Cold start + onboarding
  - Fresh install, guest path, sign-up, sign-in, sign-out
- [ ] Scan pipeline
  - Camera permission prompt and denial/retry flow
  - Capture label and get successful result
  - Gallery import scan flow
  - Error path (offline/network failure, unsupported label)
- [ ] Data + sync
  - Scan history persists across app restarts
  - Supabase-backed content loads (explore, sake detail, profile)
- [ ] Location features
  - Permission denied/allowed behavior
  - No crashes if location unavailable
- [ ] Deep links + navigation
  - Open app links/routes from cold and warm states
- [ ] Performance + stability
  - No crashes during repeated scans
  - Memory behavior acceptable on mid-range Android hardware
- [ ] UI verification
  - Edge-to-edge layout, safe insets, keyboard overlap checks, dark mode contrast

## 6) Release Readiness Checks

- [ ] Ensure `.env` and secrets are not bundled into repo or screenshots
- [ ] Confirm legal/support links are live:
  - Privacy policy
  - Support contact
  - Terms (if required by policy)
- [ ] Final regression pass on internal track build (not local dev build)
- [ ] Roll out staged production release (start small, monitor crashes/ANRs, then ramp)

## 7) Nice-To-Have Before Public Launch

- [ ] Add Android submit automation to CI (EAS build + submit jobs)
- [ ] Add crash/ANR monitoring dashboard review checklist
- [ ] Create release checklist template per version (2.1.1, 2.1.2, etc.)

---

## Current Repo Snapshot (Already in Place)

- `eas.json` has `build.production.android.distribution = "store"`
- Expo config parses successfully (`bunx expo config --type public`)
- Camera + gallery import + location code paths are present

## Current Repo Snapshot (Missing / Needs Confirmation)

- Android submit credentials path/auth still needs to be connected for non-interactive `eas submit`
- Play Console app listing, Data safety, and policy declarations still need completion
