'use client';

import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AuthUser } from '@repo/api/auth.types';

import { createClient } from '@/lib/supabase/client';

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? mapUser(session.user) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, session, isLoading, signOut }),
    [user, session, isLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
