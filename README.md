# SakeScan - Your Vivino for Sake

A beautiful, native mobile app for scanning sake labels and discovering ratings, reviews, and purchase options.

## 🎯 Features

### ✅ Implemented (MVP v1.0)

- **📸 AI-Powered Camera Scanning**
  - Full-screen camera view with permission handling
  - Visual scanning frame with corner indicators
  - Real-time OpenAI Vision analysis of sake labels
  - Automatic database matching and creation
  - If sake not in DB, AI analyzes and adds it automatically
  - Flashlight toggle for low-light conditions
  - Haptic feedback for all interactions
  - Success notifications for new sake discoveries
  - **Scan history tracking** - All scans automatically saved locally
  - View recently scanned sake in Explore tab
  - Dedicated scan history page with timestamps

- **🔍 Sake Discovery**
  - Explore tab with searchable sake database
  - Search by sake name or brewery
  - Beautiful card-based UI with images and ratings
  - **Community Discoveries section** - See sake scanned by all users globally
  - **Recently Scanned section** - Your personal last 5 scans
  - Quick access to scan history
  - Real-time updates as users scan new sake

- **📖 Detailed Sake Information**
  - High-quality hero images
  - Comprehensive sake details (type, rice milling, alcohol content)
  - Brewery information with region
  - Tasting notes and flavor profiles
  - Food pairing recommendations
  - Average ratings with star display

- **⭐ Reviews System**
  - View community reviews
  - Rating display (1-5 stars)
  - Reviewer name and timestamp
  - "Show all reviews" expansion

- **🛒 Purchase Links**
  - Direct links to online retailers
  - Beautiful gradient CTA buttons
  - Opens in external browser

- **👤 User Profile**
  - Sign-in state management
  - Beautiful onboarding screen
  - Feature highlights for logged-out users

- **🎨 Premium Design**
  - iOS Human Interface Guidelines compliant
  - Dark mode support throughout
  - Liquid glass design elements
  - Smooth animations and transitions
  - Haptic feedback on all interactions
  - Beautiful gradients and shadows

## 📁 Project Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab navigation (4 tabs)
│   │   ├── index.tsx          # Home/Scan screen (tab 1: "HOME")
│   │   ├── explore.tsx        # Browse/search sake (tab 2: "EXPLORE")
│   │   ├── scan-camera.tsx    # Camera tab placeholder (tab 3: custom button)
│   │   ├── discover.tsx       # Saved/Favorites (tab 4: "SAVED")
│   │   └── breweries.tsx      # Breweries listing (tab 5: "BREWERIES")
│   ├── sake/
│   │   └── [id].tsx           # Dynamic sake detail screen
│   ├── brewery/
│   │   └── [id].tsx           # Dynamic brewery detail screen
│   ├── camera.tsx             # Camera scanning screen (full-screen modal)
│   ├── scan-result.tsx        # Scan result display after capture
│   ├── scan-history.tsx       # Full scan history with timestamps
│   ├── profile.tsx            # User profile & settings (accessible from top-right icon)
│   ├── welcome.tsx            # Onboarding/welcome screen
│   ├── auth.tsx               # Sign in / Sign up screen
│   ├── review.tsx             # Review submission modal
│   ├── filters.tsx            # Advanced filters modal
│   ├── search-results.tsx     # Search results screen
│   ├── privacy-settings.tsx   # Privacy settings screen
│   └── _layout.tsx            # Root layout with stack navigator
└── lib/
    ├── auth-context.tsx       # Authentication provider (Supabase Auth)
    ├── supabase-hooks.ts      # React Query hooks for Supabase
    ├── supabase.ts            # Supabase client configuration
    ├── database.types.ts      # TypeScript types for database
    └── scan-history-store.ts  # Zustand store for local scan history persistence
```

## 🔧 Tech Stack

- **Framework**: Expo SDK 53, React Native 0.76.7
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI GPT-4o Vision for label analysis
- **Routing**: Expo Router (file-based)
- **State Management**: React Query for server state
- **Styling**: NativeWind (Tailwind for React Native)
- **Icons**: lucide-react-native
- **Camera**: expo-camera
- **Animations**: expo-linear-gradient, expo-haptics, react-native-reanimated

## 🚀 Current Status

**MVP Complete with AI Integration** ✅

The app is fully functional with:
- **Real AI-powered scanning** using OpenAI Vision API
- **Automatic database population** - scans unknown sake and adds them
- **Supabase backend** for sake database and user data
- Camera scanning with intelligent label recognition
- Sake browsing and search
- Detailed sake information
- Reviews display
- Purchase links
- Beautiful UI with dark mode

### How Scanning Works

1. User scans a sake label with camera
2. Image sent directly to OpenAI Vision API for analysis
3. OpenAI extracts comprehensive data:
   - Basic info: name, brewery, type, region, rice variety, polishing ratio, alcohol %
   - **Rich descriptive data**: tasting notes, flavor profile, food pairings, serving temperature
4. **All data saved to Supabase in two places:**
   - **Sake table**: Structured fields (name, brewery, type, etc.) + rich description with all AI insights
   - **Scans table**: Complete OpenAI JSON response in `ocr_raw_text` for full data preservation
5. **Also saved locally** to AsyncStorage for instant access (works offline)
6. User sees the sake detail page immediately with all AI-extracted data
7. Scanned sake appears in:
   - "Recently Scanned" section (personal history)
   - **"Community Discoveries" section** (global scans from all users)
8. Full scan history accessible via scan history page

**Data Storage Strategy:**
- **Sake table**: Stores structured data + rich formatted description including tasting notes, flavor profile, food pairings, and serving recommendations
- **Scans table**: Preserves complete OpenAI JSON response for future parsing or analysis
- **Local AsyncStorage**: Personal scan history for offline access
- **No data loss**: Every detail extracted by AI is preserved in the database

**Scan History Features:**
- **Triple storage system** for maximum data preservation:
  - **Sake table**: Structured + rich formatted descriptions
  - **Scans table**: Complete OpenAI JSON (all extracted data)
  - **Local AsyncStorage**: Personal history for offline access
- **Personal history**: Displays last 5 scans in Explore tab
- **Global discovery**: All users can see sake scanned by the community
- Full scan history page with timestamps ("Just now", "2h ago", "3d ago")
- Delete individual scans with swipe gesture
- Tap any scan to view full sake details again
- Works offline - scans persisted locally
- **Community building**: Every scan contributes to the global sake database
- **Rich AI data**: Tasting notes, flavor profiles, food pairings all stored

## 🔮 Future Enhancements

### Phase 2: Enhanced Recognition
- [ ] Image upload from gallery
- [ ] Multi-language label support
- [ ] Confidence scoring and manual override
- [ ] Batch scanning for multiple bottles

### Phase 3: User Features
- [ ] User authentication (email, Google, Apple)
- [ ] Write and submit reviews
- [ ] Save favorite sake
- [x] **Scan history tracking** ✅ (Completed)
- [ ] Personalized recommendations

### Phase 4: Social & Discovery
- [ ] Follow other users
- [ ] Share sake discoveries
- [ ] Sake collections/lists
- [ ] Nearby sake locations
- [ ] Sake events and tastings

## 🎨 Design Philosophy

SakeScan follows iOS Human Interface Guidelines and draws inspiration from:
- **Vivino** - Wine scanning and discovery
- **Instagram** - Clean, image-focused UI
- **Airbnb** - Detailed product pages
- **Coinbase** - Professional fintech aesthetic

Key design principles:
- Mobile-first, touch-optimized interactions
- High contrast with meaningful use of color (red accent for CTAs)
- Generous whitespace and clear hierarchy
- Smooth animations and haptic feedback
- Beautiful gradients for depth
- Dark mode as a first-class citizen

## 📱 Navigation Structure

```
Root Stack Navigator
├── index                    # Splash/Auth check
├── welcome                  # Onboarding (first launch or signed out)
├── auth                     # Sign in/Sign up
├── profile                  # User profile & settings (accessible from header icons)
│   ├── Edit Profile
│   ├── Privacy Settings
│   └── Sign Out
├── (tabs)                   # Tab Navigator (5 tabs)
│   ├── Home                 # Main scan screen with recent scans
│   │   └── → Camera         # Full-screen camera modal
│   │       └── → Sake Detail
│   ├── Explore              # Browse and search sake database
│   │   ├── → Sake Detail
│   │   └── → Search Results
│   ├── [Camera Button]      # Custom tab button (opens Camera modal)
│   ├── Saved                # User's favorites and rated sake
│   │   └── → Sake Detail
│   └── Breweries            # Breweries listing
│       └── → Brewery Detail
├── sake/[id]                # Sake detail page
│   ├── → Review Modal
│   └── → Where to Buy
├── brewery/[id]             # Brewery detail page
└── filters                  # Advanced filters modal
```

**Current Tab Bar (from left to right):**
1. **HOME** - Main scan screen with scan button
2. **EXPLORE** - Browse sake database
3. **[Camera]** - Elevated camera button (opens modal)
4. **SAVED** - Favorites and rated sake
5. **BREWERIES** - Browse sake breweries

**Top-Right Header Icons:**
- User profile icon in Home and Explore screens → Opens Profile screen

## 🎯 User Flow

1. **New User** → Lands on Welcome screen → Taps "Sign In with Email"
2. **Sign Up** → Creates account → Auto-signed in
3. **Home Screen** → Taps camera button → Scans sake label
4. **Recognition** → AI identifies sake → Navigates to detail
5. **Discovery** → Reads info, reviews → Taps "Buy at [Retailer]"
6. **Purchase** → Opens retailer site in browser

Alternative flow:
1. **Browse as Guest** → Taps "Continue as Guest" on welcome screen
2. **Explore** → Opens Explore tab → Searches "Dassai"
3. **Select** → Taps on sake card → Views detail
4. **Scan** → Tries to scan → Prompted to sign in first

## 📊 Data source

Sake catalog, images, ratings, and user data are loaded from **Supabase** (`sake`, `ratings`, `scans`, etc.). There is no bundled mock product database in the app.

## 🔐 Environment Variables

**React Native App (.env):**
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_KEY` - Supabase anon/public key (starts with `eyJ...`)
- `EXPO_PUBLIC_OPENAI_API_KEY` - OpenAI API key for client-side label scan (`openai-scan.ts`; legacy name `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY` still supported)
- `EXPO_PUBLIC_BACKEND_URL` - Optional retailer search API base URL (legacy: `EXPO_PUBLIC_VIBECODE_BACKEND_URL`)

**Supabase Edge Function Secrets:**
You need to set these in your Supabase dashboard (Settings → Edge Functions → Manage secrets):
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key (same as above)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (from Supabase dashboard API settings)
- `OPENAI_API_KEY` - Your OpenAI API key for GPT-4o Vision

**Important: For local testing:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Email Auth", **disable "Enable email confirmations"**
3. This allows immediate sign-in after sign-up without email verification

## 🚀 Deploying the Edge Function

The scan-label Edge Function needs to be deployed to Supabase. To deploy:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref qpsdebikkmcdzddhphlk
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy scan-label
   ```

5. **Set the secrets** (replace with your actual keys):
   ```bash
   supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   supabase secrets set OPENAI_API_KEY=your_openai_key_here
   ```

Alternatively, you can set secrets via the Supabase dashboard:
- Go to: Settings → Edge Functions → Manage secrets

## 🔧 Troubleshooting

### Camera Scan Returns "Scan Not Available" Error

**Symptoms:**
- Error message: "The AI scanning feature needs to be set up"
- Console shows: "Edge Function returned a non-2xx status code"

**Causes & Solutions:**

1. **Edge Function Not Deployed**
   ```bash
   # Deploy the scan-label function
   supabase functions deploy scan-label
   ```

2. **Missing Environment Variables**

   Check if all secrets are set in Supabase:
   ```bash
   supabase secrets list
   ```

   You should see:
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

   If missing, set them:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-proj-...
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   supabase secrets set SUPABASE_ANON_KEY=eyJhbGc...
   ```

3. **OpenAI API Key Invalid or Out of Credits**
   - Verify your OpenAI API key at https://platform.openai.com/api-keys
   - Check if you have available credits
   - Make sure the key has access to GPT-4o Vision

4. **Database Permissions**
   - Ensure the `sake` table exists in your Supabase database
   - Check Row Level Security (RLS) policies allow inserts with service role

**Quick Check:**
View logs in real-time while scanning:
```bash
supabase functions logs scan-label --follow
```

### Authentication Issues

**"Sign In Required" when trying to scan:**
- User needs to be authenticated (not guest mode)
- Navigate to Profile tab and sign in
- Or sign in from Welcome screen

**"Invalid JWT" errors:**
- Session may have expired
- Sign out and sign back in
- Check that `EXPO_PUBLIC_SUPABASE_KEY` is set correctly in `.env`

### Other Common Issues

**App crashes on camera screen:**
- Check camera permissions are granted
- Test on physical device (camera doesn't work in some simulators)

**Scan saves but no sake details:**
- Edge Function deployed but returned error
- Check Edge Function logs for specific error
- Verify OpenAI API response in logs

## 📝 Notes

- Camera scanning uses OpenAI GPT-4o Vision for real label analysis
- **All OpenAI data stored in Supabase** - Every detail is preserved:
  - Structured data in sake table (searchable fields)
  - Rich formatted description with tasting notes, flavors, pairings
  - Complete JSON in scans.ocr_raw_text for full data preservation
- **Community-powered discovery** - Users can see sake scanned by others
- Unknown sake automatically added to Supabase database with all AI insights
- Database grows organically as users scan new labels
- **Triple storage system**: Sake table + Scans table + Local AsyncStorage
- React Query manages all server state with automatic caching and updates
- Scans work offline and sync when connection restored
- No data loss - every field extracted by AI is saved to the database

## 🐛 Known Issues

None currently! 🎉

## 📄 License

Proprietary - SakeScan
