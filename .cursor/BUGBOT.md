# SakeScan Bugbot review rules

Project context for automated PR review. SakeScan is an Expo SDK 53 / React Native 0.79 app
(TypeScript strict mode, `bun`, NativeWind + Tailwind v3, Expo Router, React Query, Supabase).
Flag violations of the rules below with a short explanation and, where possible, a suggested fix.
These rules mirror the conventions in `CLAUDE.md`; treat `CLAUDE.md` and `AGENTS.md` as authoritative
context when reviewing.

## Blocking bugs (must flag)

- **Secrets / keys committed.** Flag any hardcoded API key, service-role key, OpenAI key, or
  password added in a diff. Supabase *anon* URL/key defaults in `src/lib/supabase.ts` are
  intentional; do not flag those, but flag any new service-role key, `OPENAI_API_KEY`, or
  `WINEENGINE_*` credential value checked into the repo.
- **Node-only APIs in React Native.** Flag imports from `buffer`, `fs`, `path`, `crypto` (Node),
  or other Node built-ins in `src/**`. RN has no Node runtime; use RN/Expo equivalents.
- **Deprecated Expo camera import.** Flag `import { Camera } from 'expo-camera'`. Must use
  `CameraView` (and `useCameraPermissions`) from `expo-camera`.
- **Unhandled Supabase errors.** Flag Supabase queries/mutations whose `{ data, error }` result
  ignores `error`, or `await`ed calls with no error handling. Surface failures to the user.
- **Missing required object properties.** TypeScript strict mode is on — flag object literals
  passed where the type requires more fields, and unchecked non-null assertions (`!`) on values
  that can be null/undefined. Prefer optional chaining `?.` and nullish coalescing `??`.

## Non-blocking issues (flag as suggestions)

- **`TouchableOpacity` instead of `Pressable`.** Prefer `Pressable`.
- **`Alert.alert(...)` for user prompts.** Prefer the app's custom modal components.
- **`useState` without an explicit type argument** for arrays/objects (e.g. `useState([])`).
  Require `useState<Type[]>([])`.
- **React Query not using the object API.** Flag `useQuery(key, fn)` / positional args; require
  `useQuery({ queryKey, queryFn })` and `useMutation({ mutationFn })`. No manual `setIsLoading`
  patterns — wrap async work in `useMutation`.
- **Zustand selectors that return non-primitives or whole store.** Require narrow selectors
  (e.g. `useStore(s => s.foo)`); do not call store methods inside selectors.
- **`className` on components that don't support it.** `CameraView`, `LinearGradient`, and
  `Animated` components must use the inline `style` prop, not `className`.
- **`SafeAreaView` / safe-area hooks imported from `react-native`.** Import from
  `react-native-safe-area-context`.
- **Horizontal `ScrollView` without `style={{ flexGrow: 0 }}`** inside flex containers (it will
  expand vertically).
- **`TODO` / `FIXME` left in production code paths under `src/`.**

## Scope / style

- New screens belong in `src/app/` (Expo Router file-based routing); reusable UI in
  `src/components/`; utilities in `src/lib/`.
- Do not introduce a local mock sake/brewery database — catalog data comes from Supabase.
- Do not flag the intentional embedded Supabase anon defaults in `src/lib/supabase.ts`.
