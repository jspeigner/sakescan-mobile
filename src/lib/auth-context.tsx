import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase, ensureUserExists } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

// Required for Google Auth to work on web
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; }>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session with error handling and timeout
    const initAuth = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (isMounted && result && 'data' in result) {
          setSession(result.data.session);
          setUser(result.data.session?.user ?? null);
        }
      } catch (error) {
        console.log('[Auth] Initial session check failed:', error);
        // Continue without session - user can still use app as guest
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsGuest(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        try {
          await ensureUserExists(data.user.id, email);
        } catch (userError) {
          console.error('[Auth] Failed to ensure user exists:', userError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        try {
          await ensureUserExists(data.user.id, email);
        } catch (userError) {
          console.error('[Auth] Failed to ensure user exists:', userError);
        }
      }
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://sakescan.com/auth/callback',
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (data.user) setUser(data.user);
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS');
    }

    setIsLoading(true);
    try {
      console.log('[Auth] Starting Apple Sign In...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Auth] Apple credential received:', !!credential.identityToken);

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using the Apple identity token
      console.log('[Auth] Sending to Supabase...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      console.log('[Auth] Supabase response:', { data: !!data, error: error?.message });

      if (error) throw error;

      // Update user metadata with full name if provided (Apple only sends this on first sign-in)
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');

        if (fullName) {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              given_name: credential.fullName.givenName,
              family_name: credential.fullName.familyName,
            },
          });
        }
      }
    } catch (error: unknown) {
      console.log('[Auth] Apple Sign In error:', error);
      // Handle user cancellation gracefully
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, don't throw
        setIsLoading(false);
        return;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      console.log('[Auth] Starting Google Sign In...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'vibecode://auth/callback',
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      console.log('[Auth] OAuth URL received:', !!data.url);

      if (data.url) {
        // Open the OAuth URL in an in-app browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'vibecode://auth/callback'
        );

        console.log('[Auth] Browser result:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('[Auth] Callback URL received');
          // Parse the callback URL to extract tokens
          // PKCE flow returns code in query params, implicit returns tokens in hash
          const url = new URL(result.url);
          
          // Check for PKCE flow (code in query string)
          const code = url.searchParams.get('code');
          if (code) {
            console.log('[Auth] Exchanging code for session...');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            console.log('[Auth] Session exchange successful');
            return;
          }

          // Fallback to implicit flow (tokens in hash)
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('[Auth] Setting session from tokens...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;
            console.log('[Auth] Session set successfully');
          } else {
            throw new Error('No authentication tokens received');
          }
        } else if (result.type === 'cancel') {
          // User cancelled, just return
          return;
        }
      }
    } catch (error) {
      console.log('[Auth] Google Sign In error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsGuest(false);
    setIsLoading(false);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        refreshUser,
        signOut,
        continueAsGuest,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
