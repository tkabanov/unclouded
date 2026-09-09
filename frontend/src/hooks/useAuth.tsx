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
  setSession: (updater: (prev: Session | null) => Session | null) => void,
  setUser: (updater: (prev: User | null) => User | null) => void,
  setLoading: (loading: boolean) => void,
  session: Session | null,
  user: User | null,
) {
  // Keep the previous object reference when nothing actually changed (e.g. a
  // background token refresh fired when the tab regains focus). Supabase emits a
  // fresh auth event on every visibility change; replacing `user`/`session` with a
  // new-but-equivalent object would retrigger every `useEffect([user, ...])` across
  // the app and make pages look like they "reload" whenever the tab is refocused.
  setSession((prev) => (prev?.access_token === session?.access_token ? prev : session));
  setUser((prev) => (prev?.id === user?.id ? prev : user));
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" || !nextSession) {
        resetUser();
        applyAuthState(setSession, setUser, setLoading, null, null);
        return;
      }

      // supabase-js runs this callback while holding its internal auth lock —
      // including on the session-recovery check it fires whenever the tab
      // regains focus. Awaiting another supabase.auth call (getUser) directly
      // inside the callback can deadlock against that lock, which left `loading`
      // stuck true and made every guarded page hang/flash back to a full-screen
      // spinner on tab refocus. Deferring with setTimeout runs it outside the
      // lock, per Supabase's own guidance.
      setTimeout(() => {
        void (async () => {
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
        })();
      }, 0);
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
