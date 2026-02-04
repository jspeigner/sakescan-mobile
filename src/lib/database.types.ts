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
          rice_variety: string | null;
          polishing_ratio: number | null;
          alcohol_percentage: number | null;
          smv: number | null;
          acidity: number | null;
          label_image_url: string | null;
          bottle_image_url: string | null;
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
          rice_variety?: string | null;
          polishing_ratio?: number | null;
          alcohol_percentage?: number | null;
          smv?: number | null;
          acidity?: number | null;
          label_image_url?: string | null;
          bottle_image_url?: string | null;
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
          rice_variety?: string | null;
          polishing_ratio?: number | null;
          alcohol_percentage?: number | null;
          smv?: number | null;
          acidity?: number | null;
          label_image_url?: string | null;
          bottle_image_url?: string | null;
          average_rating?: number | null;
          total_ratings?: number;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sake_id?: string | null;
          scanned_image_url?: string | null;
          ocr_raw_text?: string | null;
          matched?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sake_id?: string | null;
          scanned_image_url?: string | null;
          ocr_raw_text?: string | null;
          matched?: boolean;
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
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Sake = Database['public']['Tables']['sake']['Row'];
export type Scan = Database['public']['Tables']['scans']['Row'];
export type Rating = Database['public']['Tables']['ratings']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];

// Extended types with relations
export interface SakeWithRatings extends Sake {
  ratings?: (Rating & { users: Pick<User, 'display_name' | 'avatar_url'> })[];
}

export interface ScanWithSake extends Scan {
  sake?: Pick<Sake, 'id' | 'name' | 'brewery' | 'type' | 'label_image_url' | 'average_rating'> | null;
}

export interface RatingWithSake extends Rating {
  sake?: Pick<Sake, 'name' | 'brewery' | 'type' | 'label_image_url'>;
}

export interface RatingWithUser extends Rating {
  users?: Pick<User, 'display_name' | 'avatar_url'>;
}

export interface FavoriteWithSake extends Favorite {
  sake?: Pick<Sake, 'name' | 'brewery' | 'type' | 'label_image_url' | 'average_rating'>;
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

export interface ScanLabelResponse {
  success: boolean;
  extracted?: ExtractedSakeInfo;
  matched_sake?: Sake | null;
  scan_id?: string;
  message: string;
  is_new?: boolean;
}
