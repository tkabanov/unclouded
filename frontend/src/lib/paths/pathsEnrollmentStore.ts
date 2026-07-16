// @refresh reset
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import {
  fetchPathEnrollments,
  type PathEnrollmentListItem,
} from "@/lib/paths/pathsEnrollmentApi";

export interface PathsEnrollmentStoreValue {
  enrollments: PathEnrollmentListItem[];
  loading: boolean;
  selectedEnrollmentId: string | null;
  selectedEnrollment: PathEnrollmentListItem | null;
  selectEnrollment: (enrollmentId: string | null) => void;
  refresh: () => Promise<void>;
}

const PathsEnrollmentContext = createContext<PathsEnrollmentStoreValue | null>(null);

export function PathsEnrollmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<PathEnrollmentListItem[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setEnrollments([]);
      setSelectedEnrollmentId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchPathEnrollments(user.id, profile?.onboardingData ?? null);
      setEnrollments(rows);
      setSelectedEnrollmentId((current) => {
        if (current && rows.some((row) => row.enrollmentId === current)) {
          return current;
        }
        return rows[0]?.enrollmentId ?? null;
      });
    } catch (err) {
      console.error("Failed to load path enrollments", err);
      setEnrollments([]);
      setSelectedEnrollmentId(null);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectEnrollment = useCallback((enrollmentId: string | null) => {
    setSelectedEnrollmentId(enrollmentId);
  }, []);

  const selectedEnrollment = useMemo(
    () => enrollments.find((row) => row.enrollmentId === selectedEnrollmentId) ?? null,
    [enrollments, selectedEnrollmentId],
  );

  const value = useMemo(
    (): PathsEnrollmentStoreValue => ({
      enrollments,
      loading,
      selectedEnrollmentId,
      selectedEnrollment,
      selectEnrollment,
      refresh,
    }),
    [
      enrollments,
      loading,
      selectedEnrollmentId,
      selectedEnrollment,
      selectEnrollment,
      refresh,
    ],
  );

  return createElement(PathsEnrollmentContext.Provider, { value }, children);
}

export function useOptionalPathsEnrollmentStore(): PathsEnrollmentStoreValue | null {
  return useContext(PathsEnrollmentContext);
}

export function usePathsEnrollmentStore(): PathsEnrollmentStoreValue {
  const context = useOptionalPathsEnrollmentStore();
  if (!context) {
    throw new Error("usePathsEnrollmentStore must be used within PathsEnrollmentProvider");
  }
  return context;
}
