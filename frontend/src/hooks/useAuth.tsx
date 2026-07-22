import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearRecoveryAuthorization, subscribePasswordRecovery } from "@/lib/auth/recoverySession";
import {
  clearLocalAuthSession,
  resolveValidatedAuthSession,
  signOutEverywhere,
} from "@/lib/auth/sessionAuth";
import { completePasswordRecovery } from "@/lib/auth/passwordResetApi";
import { identifyUser, resetUser } from "@/lib/analytics/productAnalytics";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function applyAuthState(
  setSession: (session: Session | null) => void,
  setUser: (user: User | null) => void,
  setLoading: (loading: boolean) => void,
  session: Session | null,
  user: User | null,
) {
  setSession(session);
  setUser(user);
  setLoading(false);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeRecovery = subscribePasswordRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "SIGNED_OUT" || !nextSession) {
        resetUser();
        applyAuthState(setSession, setUser, setLoading, null, null);
        return;
      }

      const {
        data: { user: validatedUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !validatedUser) {
        await clearLocalAuthSession();
        applyAuthState(setSession, setUser, setLoading, null, null);
        return;
      }

      applyAuthState(setSession, setUser, setLoading, nextSession, validatedUser);
      identifyUser(validatedUser.id);
    });

    void resolveValidatedAuthSession().then(({ session: currentSession, user: currentUser }) => {
      applyAuthState(setSession, setUser, setLoading, currentSession, currentUser);
      if (currentUser) identifyUser(currentUser.id);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeRecovery();
    };
  }, []);

  const signOut = async () => {
    clearRecoveryAuthorization();
    resetUser();
    await signOutEverywhere();
    applyAuthState(setSession, setUser, setLoading, null, null);
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
