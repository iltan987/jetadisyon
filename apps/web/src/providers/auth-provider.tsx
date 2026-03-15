'use client';

import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AuthUser } from '@repo/api/auth.types';

import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { isValidReturnPath } from '@/lib/validate-return-path';

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  setMustChangePassword: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    role: (user.app_metadata?.user_role as AuthUser['role']) ?? null,
    tenantId: (user.app_metadata?.tenant_id as string) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      sessionRef.current = session;
      setSession(session);
      setUser(session?.user ? mapUser(session.user) : null);
      setMustChangePassword(
        session?.user?.user_metadata?.must_change_password === true,
      );
      setIsLoading(false);

      if (event === 'SIGNED_OUT') {
        const pathname = window.location.pathname;
        // Don't reload if already on /login — avoids clearing form state
        if (pathname === '/login') return;
        const returnPath = pathname + window.location.search;
        const loginUrl =
          pathname !== '/'
            ? `/login?next=${encodeURIComponent(returnPath)}`
            : '/login';
        window.location.href = loginUrl;
      }

      // Cross-tab auto-login: only navigate if this tab is in the background
      if (
        event === 'SIGNED_IN' &&
        window.location.pathname === '/login' &&
        document.visibilityState === 'hidden'
      ) {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        const destination = isValidReturnPath(next) ? next : '/';
        window.location.href = destination;
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    // Invalidate server-side session before clearing local state
    const token = sessionRef.current?.access_token;
    if (token) {
      try {
        await apiClient('/auth/logout', {
          method: 'POST',
          accessToken: token,
        });
      } catch {
        // Continue with local signout even if server call fails
      }
    }
    await supabase.auth.signOut();
    sessionRef.current = null;
    setUser(null);
    setSession(null);
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      mustChangePassword,
      setMustChangePassword,
      signOut,
    }),
    [user, session, isLoading, mustChangePassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
