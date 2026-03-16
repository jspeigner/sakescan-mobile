import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qpsdebikkmcdzddhphlk.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwc2RlYmlra21jZHpkZGhwaGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTI5MzgsImV4cCI6MjA4NTQ4ODkzOH0.A0opwU7korq5NaPPV9y4PlBC89GPTEEzgq8WALiw99g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Helper to ensure user exists in public.users table (for when DB trigger isn't set up)
export const ensureUserExists = async (userId: string, email?: string) => {
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('[ensureUserExists] Error checking user:', checkError);
    }

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email ?? null,
          display_name: email ? email.split('@')[0] : 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>);

      if (insertError) {
        console.error('[ensureUserExists] Failed to create user:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('[ensureUserExists] Unexpected error:', error);
    throw error;
  }
};

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper to get current session
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
