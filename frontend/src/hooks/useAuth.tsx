import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { completePasswordRecovery } from "@/lib/auth/passwordResetApi";
import { clearRecoveryAuthorization, subscribePasswordRecovery } from "@/lib/auth/recoverySession";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeRecovery = subscribePasswordRecovery();

    // Register listener first, then hydrate the existing session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeRecovery();
    };
  }, []);

  const signOut = async () => {
    clearRecoveryAuthorization();
    await supabase.auth.signOut();
  };

  const resetPassword = async (newPassword: string) => {
    await completePasswordRecovery(newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
