'use client';

import { supabase } from '@/lib/supabase';
import { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  user: any;
  role: 'admin' | 'supervisor' | null;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true, isAdmin: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'supervisor' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            setUser(null);
            setRole(null);
          }
          setLoading(false);
          return;
        }

        // Get profile/role from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (mounted) {
          setUser(session.user);
          setRole(profile?.role || 'supervisor');
        }
      } catch (error) {
        console.error('Auth error:', error);
        if (mounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkUser();

    // Listen for real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkUser();
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, isAdmin: role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
