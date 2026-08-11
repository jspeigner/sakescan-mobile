// Database types for Supabase

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          firebase_uid: string | null;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          location: string | null;
          is_guest: boolean;
          bio: string | null;
          activity_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firebase_uid?: string | null;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          is_guest?: boolean;
          bio?: string | null;
          activity_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firebase_uid?: string | null;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          is_guest?: boolean;
          bio?: string | null;
          activity_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sake: {
        Row: {
          id: string;
          name: string;
          name_japanese: string | null;
          brewery: string;
          type: string | null;
          subtype: string | null;
          region: string | null;
          prefecture: string | null;
          description: string | null;
          flavor_tags: string[] | null;
          tasting_notes: string | null;
          food_pairings: string[] | null;
          serving_temps: string[] | null;
          rice_variety: string | null;
          polishing_ratio: number | null;
          alcohol_percentage: number | null;
          smv: number | null;
          acidity: number | null;
          yeasts: string | null;
          water_source: string | null;
          filtration_method: string | null;
          base_ingredients: string | null;
          image_url: string | null;
          image_source: 'retailer' | 'user_scan' | 'web_discover' | 'admin' | string | null;
          image_quality: 't1' | 't2' | 't3' | string | null;
          image_verified_at: string | null;
          image_contributor_scan_id: string | null;
          wineengine_indexed_at: string | null;
          gallery_images: string[] | null;
          external_id: string | null;
          average_rating: number | null;
          total_ratings: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_japanese?: string | null;
          brewery: string;
          type?: string | null;
          subtype?: string | null;
          region?: string | null;
          prefecture?: string | null;
          description?: string | null;
          flavor_tags?: string[] | null;
          tasting_notes?: string | null;
          food_pairings?: string[] | null;
          serving_temps?: string[] | null;
          rice_variety?: string | null;
          polishing_ratio?: number | null;
          alcohol_percentage?: number | null;
          smv?: number | null;
          acidity?: number | null;
          yeasts?: string | null;
          water_source?: string | null;
          filtration_method?: string | null;
          base_ingredients?: string | null;
          image_url?: string | null;
          image_source?: string | null;
          image_quality?: string | null;
          image_verified_at?: string | null;
          image_contributor_scan_id?: string | null;
          wineengine_indexed_at?: string | null;
          gallery_images?: string[] | null;
          external_id?: string | null;
          average_rating?: number | null;
          total_ratings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_japanese?: string | null;
          brewery?: string;
          type?: string | null;
          subtype?: string | null;
          region?: string | null;
          prefecture?: string | null;
          description?: string | null;
          flavor_tags?: string[] | null;
          tasting_notes?: string | null;
          food_pairings?: string[] | null;
          serving_temps?: string[] | null;
          rice_variety?: string | null;
          polishing_ratio?: number | null;
          alcohol_percentage?: number | null;
          smv?: number | null;
          acidity?: number | null;
          yeasts?: string | null;
          water_source?: string | null;
          filtration_method?: string | null;
          base_ingredients?: string | null;
          image_url?: string | null;
          image_source?: string | null;
          image_quality?: string | null;
          image_verified_at?: string | null;
          image_contributor_scan_id?: string | null;
          wineengine_indexed_at?: string | null;
          gallery_images?: string[] | null;
          external_id?: string | null;
          average_rating?: number | null;
          total_ratings?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      wineengine_search_log: {
        Row: {
          id: string;
          query_sha256: string;
          query_image_url: string | null;
          source: string;
          status: string;
          top_sake_id: string | null;
          top_score: number | null;
          top_score_text: number | null;
          match_count: number;
          raw_result: unknown;
          cache_hit: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          query_sha256: string;
          query_image_url?: string | null;
          source: string;
          status: string;
          top_sake_id?: string | null;
          top_score?: number | null;
          top_score_text?: number | null;
          match_count?: number;
          raw_result?: unknown;
          cache_hit?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          query_sha256?: string;
          query_image_url?: string | null;
          source?: string;
          status?: string;
          top_sake_id?: string | null;
          top_score?: number | null;
          top_score_text?: number | null;
          match_count?: number;
          raw_result?: unknown;
          cache_hit?: boolean;
          created_at?: string;
        };
      };
      sake_image_embeddings: {
        Row: {
          sake_id: string;
          image_url: string;
          image_sha256: string;
          label_text: string | null;
          embedding: number[];
          model: string;
          updated_at: string;
        };
        Insert: {
          sake_id: string;
          image_url: string;
          image_sha256: string;
          label_text?: string | null;
          embedding: number[];
          model: string;
          updated_at?: string;
        };
        Update: {
          sake_id?: string;
          image_url?: string;
          image_sha256?: string;
          label_text?: string | null;
          embedding?: number[];
          model?: string;
          updated_at?: string;
        };
      };
      breweries: {
        Row: {
          id: string;
          name: string;
          prefecture: string | null;
          region: string | null;
          address: string | null;
          phone: string | null;
          website: string | null;
          email: string | null;
          founded_year: number | null;
          representative: string | null;
          brands: string[] | null;
          description: string | null;
          visiting_info: string | null;
          tour_available: boolean | null;
          image_url: string | null;
          gallery_images: string[] | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          prefecture?: string | null;
          region?: string | null;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          email?: string | null;
          founded_year?: number | null;
          representative?: string | null;
          brands?: string[] | null;
          description?: string | null;
          visiting_info?: string | null;
          tour_available?: boolean | null;
          image_url?: string | null;
          gallery_images?: string[] | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          prefecture?: string | null;
          region?: string | null;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          email?: string | null;
          founded_year?: number | null;
          representative?: string | null;
          brands?: string[] | null;
          description?: string | null;
          visiting_info?: string | null;
          tour_available?: boolean | null;
          image_url?: string | null;
          gallery_images?: string[] | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          sake_id: string | null;
          scanned_image_url: string | null;
          ocr_raw_text: string | null;
          matched: boolean;
          catalog_share_opt_in: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sake_id?: string | null;
          scanned_image_url?: string | null;
          ocr_raw_text?: string | null;
          matched?: boolean;
          catalog_share_opt_in?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sake_id?: string | null;
          scanned_image_url?: string | null;
          ocr_raw_text?: string | null;
          matched?: boolean;
          catalog_share_opt_in?: boolean;
          created_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          sake_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sake_id: string;
          rating: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sake_id?: string;
          rating?: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          sake_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sake_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sake_id?: string;
          created_at?: string;
        };
      };
      menu_scans: {
        Row: {
          id: string;
          user_id: string;
          preferred_flavors: string[] | null;
          budget_bias: string | null;
          city: string | null;
          item_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_flavors?: string[] | null;
          budget_bias?: string | null;
          city?: string | null;
          item_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_flavors?: string[] | null;
          budget_bias?: string | null;
          city?: string | null;
          item_count?: number;
          created_at?: string;
        };
      };
      scan_feedback: {
        Row: {
          id: string;
          user_id: string | null;
          kind: 'confirm' | 'wrong';
          sake_id: string | null;
          name: string;
          brewery: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          kind: 'confirm' | 'wrong';
          sake_id?: string | null;
          name: string;
          brewery?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          kind?: 'confirm' | 'wrong';
          sake_id?: string | null;
          name?: string;
          brewery?: string | null;
          created_at?: string;
        };
      };
      menu_scan_items: {
        Row: {
          id: string;
          menu_scan_id: string;
          sake_id: string | null;
          name: string;
          name_japanese: string | null;
          brewery: string | null;
          type: string | null;
          price: string | null;
          size: string | null;
          description: string | null;
          tasting_notes: string | null;
          flavor_profile: string[] | null;
          average_rating: number | null;
          recommendation_score: number | null;
          recommendation_tier: string | null;
          recommendation_reasons: string[] | null;
          value_label: string | null;
          value_chip: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_scan_id: string;
          sake_id?: string | null;
          name: string;
          name_japanese?: string | null;
          brewery?: string | null;
          type?: string | null;
          price?: string | null;
          size?: string | null;
          description?: string | null;
          tasting_notes?: string | null;
          flavor_profile?: string[] | null;
          average_rating?: number | null;
          recommendation_score?: number | null;
          recommendation_tier?: string | null;
          recommendation_reasons?: string[] | null;
          value_label?: string | null;
          value_chip?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_scan_id?: string;
          sake_id?: string | null;
          name?: string;
          name_japanese?: string | null;
          brewery?: string | null;
          type?: string | null;
          price?: string | null;
          size?: string | null;
          description?: string | null;
          tasting_notes?: string | null;
          flavor_profile?: string[] | null;
          average_rating?: number | null;
          recommendation_score?: number | null;
          recommendation_tier?: string | null;
          recommendation_reasons?: string[] | null;
          value_label?: string | null;
          value_chip?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      activity_events: {
        Row: {
          id: string;
          actor_id: string;
          type: string;
          sake_id: string | null;
          rating_id: string | null;
          scan_id: string | null;
          meta: Record<string, unknown>;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          type: string;
          sake_id?: string | null;
          rating_id?: string | null;
          scan_id?: string | null;
          meta?: Record<string, unknown>;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          type?: string;
          sake_id?: string | null;
          rating_id?: string | null;
          scan_id?: string | null;
          meta?: Record<string, unknown>;
          is_public?: boolean;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: string;
          activity_id: string | null;
          comment_id: string | null;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: string;
          activity_id?: string | null;
          comment_id?: string | null;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: string;
          activity_id?: string | null;
          comment_id?: string | null;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: string;
          target_id?: string;
          reason?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      list_breweries_catalog: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          name: string;
          region: string;
          sake_count: number;
          avg_rating: number | null;
          thumbnail_image_url: string | null;
        }[];
      };
      get_menu_prices_for_sake: {
        Args: { p_sake_id: string; p_limit?: number };
        Returns: {
          price: string | null;
          size: string | null;
          city: string | null;
          seen_at: string;
        }[];
      };
      get_home_feed: {
        Args: { p_limit?: number; p_cursor?: string | null };
        Returns: {
          id: string;
          actor_id: string;
          type: string;
          sake_id: string | null;
          rating_id: string | null;
          scan_id: string | null;
          meta: Record<string, unknown>;
          is_public: boolean;
          created_at: string;
          actor_display_name: string | null;
          actor_avatar_url: string | null;
          sake_name: string | null;
          sake_brewery: string | null;
          sake_type: string | null;
          sake_image_url: string | null;
          rating_value: number | null;
          review_text: string | null;
          comment_count: number;
        }[];
      };
      get_menu_scan_quota: {
        Args: Record<string, never>;
        Returns: {
          used: number;
          limit_count: number;
          month_start: string;
        }[];
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      match_sake_by_image_sha256: {
        Args: { p_sha256: string };
        Returns: {
          sake_id: string;
          image_url: string;
          label_text: string | null;
          similarity: number;
        }[];
      };
      match_sake_embeddings: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          match_threshold?: number;
        };
        Returns: {
          sake_id: string;
          image_url: string;
          label_text: string | null;
          similarity: number;
        }[];
      };
    };
  };
}

export type BreweryCatalogRow =
  Database['public']['Functions']['list_breweries_catalog']['Returns'][number];

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Sake = Database['public']['Tables']['sake']['Row'];
export type Brewery = Database['public']['Tables']['breweries']['Row'];
export type Scan = Database['public']['Tables']['scans']['Row'];
export type Rating = Database['public']['Tables']['ratings']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];

/** True when catalog image is missing or weak (t2/t3/null) — prompt catalog share. */
export function sakeNeedsCatalogImage(sake: Pick<Sake, 'image_url' | 'image_quality'> | null | undefined): boolean {
  if (!sake) return true;
  if (!sake.image_url) return true;
  const q = sake.image_quality?.toLowerCase() ?? null;
  return q === null || q === 't2' || q === 't3';
}
export type MenuScan = Database['public']['Tables']['menu_scans']['Row'];
export type MenuScanItem = Database['public']['Tables']['menu_scan_items']['Row'];
export type ScanFeedback = Database['public']['Tables']['scan_feedback']['Row'];
export type MenuPriceSighting =
  Database['public']['Functions']['get_menu_prices_for_sake']['Returns'][number];

// Extended types with relations
export interface SakeWithRatings extends Sake {
  ratings?: (Rating & { users: Pick<User, 'display_name' | 'avatar_url'> })[];
}

export interface ScanWithSake extends Scan {
  sake?: Pick<Sake, 'id' | 'name' | 'brewery' | 'type' | 'image_url' | 'average_rating'> | null;
}

export interface RatingWithSake extends Rating {
  sake?: Pick<Sake, 'name' | 'brewery' | 'type' | 'image_url'>;
}

export interface RatingWithUser extends Rating {
  users?: Pick<User, 'display_name' | 'avatar_url'>;
}

export interface FavoriteWithSake extends Favorite {
  sake?: Pick<Sake, 'name' | 'brewery' | 'type' | 'image_url' | 'average_rating'>;
}

// API response types
export interface ExtractedSakeInfo {
  name: string;
  name_japanese?: string;
  brewery?: string;
  brewery_japanese?: string;
  type?: string;
  subtype?: string;
  prefecture?: string;
  polish_rate?: string;
  alcohol_percentage?: string;
  confidence: number;
  raw_text?: string;
}

export interface ScanLabelCandidate {
  id: string;
  name: string;
  brewery: string;
  name_japanese?: string | null;
  type?: string | null;
  image_url?: string | null;
  polishing_ratio?: number | null;
  score: number;
}

export interface ScanLabelResponse {
  success: boolean;
  extracted?: ExtractedSakeInfo | Record<string, unknown>;
  matched_sake?: Sake | null;
  sakeId?: string | null;
  candidates?: ScanLabelCandidate[];
  confidence?: number;
  scanQualityHint?: 'high' | 'medium' | 'low';
  qualityReasons?: string[];
  ambiguous?: boolean;
  enrichment?: Record<string, unknown> | null;
  scan_id?: string;
  message: string;
  is_new?: boolean;
}
