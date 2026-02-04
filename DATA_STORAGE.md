# SakeScan Data Storage Architecture

## Overview

SakeScan uses a **triple storage strategy** to ensure no data is lost and all OpenAI-extracted information is preserved for current and future use.

## Storage Locations

### 1. Supabase `sake` Table (Primary Sake Database)

**Purpose**: Searchable, structured sake information accessible to all users

**Fields Stored**:
- `id` - Unique identifier (UUID)
- `name` - English sake name
- `name_japanese` - Japanese sake name (if available)
- `brewery` - Brewery name
- `type` - Main type (Junmai, Ginjo, Daiginjo, Honjozo, Other)
- `subtype` - Additional type classification
- `region` - Geographic region
- `prefecture` - Japanese prefecture
- `description` - **Rich formatted text including:**
  - Main description from OpenAI
  - Tasting notes (markdown formatted)
  - Flavor profile (comma-separated)
  - Food pairings (comma-separated)
  - Serving temperature recommendations
- `rice_variety` - Type of rice used
- `polishing_ratio` - Milling percentage
- `alcohol_percentage` - ABV
- `label_image_url` - URL to scanned label image
- `average_rating` - Community average rating
- `total_ratings` - Number of ratings
- `created_at` - When first scanned
- `updated_at` - Last modified

**Example Rich Description Format**:
```
A premium junmai daiginjo from Asahi Shuzo, known for its elegant and refined character.

**Tasting Notes:** Elegant and refined with notes of honeydew melon, white peach, and a subtle floral aroma. Silky smooth with a long, clean finish.

**Flavor Profile:** Fruity, Floral, Smooth

**Food Pairings:** Sashimi, oysters, delicate white fish, fresh fruits

**Serving Temperature:** Chilled
```

---

### 2. Supabase `scans` Table (Scan History & Raw Data)

**Purpose**: Complete audit trail of all scans with full OpenAI JSON preserved

**Fields Stored**:
- `id` - Unique scan ID (UUID)
- `user_id` - User who performed the scan
- `sake_id` - References sake in sake table (if matched)
- `scanned_image_url` - URL to the scanned image
- `ocr_raw_text` - **COMPLETE OpenAI JSON response** - Full preservation of all extracted data
- `matched` - Whether sake was successfully identified
- `created_at` - Scan timestamp

**OCR Raw Text Example** (stored as JSON string):
```json
{
  "name": "Dassai 45",
  "nameJapanese": "獺祭45",
  "brewery": "Asahi Shuzo",
  "type": "Junmai Daiginjo",
  "subtype": null,
  "prefecture": "Yamaguchi",
  "region": "Chugoku",
  "description": "Dassai 45 is a Junmai Daiginjo sake...",
  "tastingNotes": "Fruity and floral with notes of apple and pear...",
  "foodPairings": ["Sushi", "Sashimi", "Light appetizers"],
  "riceVariety": "Yamada Nishiki",
  "polishingRatio": 45,
  "alcoholPercentage": 16.0,
  "flavorProfile": ["Fruity", "Dry", "Floral", "Smooth"],
  "servingTemperature": ["Chilled"]
}
```

**Why Store Complete JSON?**
- Future-proof: Can parse new fields later without losing data
- Analysis: Can run analytics on all historical scans
- Debugging: See exactly what OpenAI returned
- Backup: Complete data preservation if sake table updated
- Research: Study AI accuracy and extraction patterns

---

### 3. Local AsyncStorage (Personal Scan History)

**Purpose**: Offline-first personal scan history with instant access

**Storage Key**: `@sakescan:scan_history`

**Data Structure**:
```typescript
interface ScannedSake {
  id: string;                    // Local scan ID
  timestamp: string;             // ISO timestamp
  imageUri?: string;             // Local image URI
  sakeInfo: {
    name: string;
    nameJapanese?: string;
    brewery: string;
    type: string;
    // ... all fields from OpenAI
  };
}
```

**Benefits**:
- Works offline - no internet needed to view history
- Instant access - no API calls required
- Privacy - stays on device until user syncs
- Persistence - survives app restarts

---

## Data Flow

### When User Scans a Sake Label:

1. **Capture** → Camera takes photo
2. **AI Analysis** → OpenAI Vision extracts all data
3. **Local Save** → Immediately save to AsyncStorage (instant)
4. **Cloud Save** → Save to Supabase in parallel:
   - Check if sake exists (by name + brewery)
   - If new: Create sake entry with rich description
   - If exists: Link to existing sake
   - Create scan record with complete JSON
5. **UI Update** → React Query invalidates cache, UI refreshes

### Data Redundancy Strategy

| Data Type | Sake Table | Scans Table | Local Storage |
|-----------|------------|-------------|---------------|
| Sake name | ✅ | ✅ (in JSON) | ✅ |
| Brewery | ✅ | ✅ (in JSON) | ✅ |
| Type/Subtype | ✅ | ✅ (in JSON) | ✅ |
| Region | ✅ | ✅ (in JSON) | ✅ |
| Description | ✅ | ✅ (in JSON) | ✅ |
| Tasting Notes | ✅ (in desc) | ✅ (in JSON) | ✅ |
| Flavor Profile | ✅ (in desc) | ✅ (in JSON) | ✅ |
| Food Pairings | ✅ (in desc) | ✅ (in JSON) | ✅ |
| Serving Temp | ✅ (in desc) | ✅ (in JSON) | ✅ |
| Rice Variety | ✅ | ✅ (in JSON) | ✅ |
| Polish Ratio | ✅ | ✅ (in JSON) | ✅ |
| Alcohol % | ✅ | ✅ (in JSON) | ✅ |
| Scan Image | ✅ (URL) | ✅ (URL) | ✅ (local URI) |
| User ID | ❌ | ✅ | ❌ |
| Scan Time | ❌ | ✅ | ✅ |

---

## Benefits of Triple Storage

### 1. **No Data Loss**
Every single field extracted by OpenAI is preserved permanently in at least 2 places (Supabase + Local)

### 2. **Future-Proof**
Complete JSON in scans table means we can:
- Add new fields to sake table without data migration
- Re-process historical scans with improved algorithms
- Train ML models on extraction patterns

### 3. **Fast & Resilient**
- Local storage = instant offline access
- Sake table = fast queries and search
- Scans table = complete audit trail

### 4. **Community Building**
- Sake table shared globally = community discovers together
- Scans table = track who found what
- Local storage = personal privacy preserved

### 5. **Analytics Ready**
- Track most scanned sake
- Identify regional trends
- Measure AI extraction accuracy
- Study user behavior patterns

---

## Database Schema Notes

### Sake Table Constraints
- `name` + `brewery` = unique constraint (prevents duplicates)
- `description` = TEXT field (no length limit for rich content)
- Automatic deduplication on insert

### Scans Table Features
- No unique constraint (multiple users can scan same sake)
- `ocr_raw_text` = TEXT field (stores full JSON)
- Linked to users table via foreign key
- Cascade delete if user deleted (GDPR compliance)

### Local Storage Limits
- AsyncStorage has ~6MB limit on iOS/Android
- Estimates: ~5,000 scans before hitting limit
- Old scans can be pruned automatically if needed

---

## Future Enhancements

### Potential New Fields
- `tasting_notes_structured` - Separate table for structured notes
- `food_pairings_table` - M:M relationship with foods
- `flavor_profile_normalized` - Standardized flavor taxonomy
- `ai_confidence_scores` - Track extraction accuracy

### Analytics Queries
```sql
-- Most scanned sake
SELECT sake.name, COUNT(scans.id) as scan_count
FROM scans JOIN sake ON scans.sake_id = sake.id
GROUP BY sake.id ORDER BY scan_count DESC;

-- Top contributors
SELECT user_id, COUNT(*) as scans
FROM scans GROUP BY user_id
ORDER BY scans DESC;

-- Regional distribution
SELECT prefecture, COUNT(*) as sake_count
FROM sake WHERE prefecture IS NOT NULL
GROUP BY prefecture;
```

---

## Summary

SakeScan's triple storage architecture ensures:
- ✅ Zero data loss from OpenAI extraction
- ✅ Fast offline-first user experience
- ✅ Community-powered global discovery
- ✅ Complete audit trail of all scans
- ✅ Future-proof for new features
- ✅ Analytics and research ready

Every detail extracted by AI is preserved forever, enabling rich community features today and powerful insights tomorrow.
