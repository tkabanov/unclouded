import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import EntryDetailPopup from "@/components/journal/EntryDetailPopup";
import JournalEntriesTab from "@/components/journal/JournalEntriesTab";
import JournalPageContent from "@/components/journal/JournalPageContent";
import NewEntryPopup from "@/components/journal/NewEntryPopup";
import { JOURNAL_MODULE_ID } from "@/lib/journal/routes";
import {
  fetchJournalEntries,
  type JournalEntryListItem,
} from "@/lib/journal/journalEntriesApi";
import { canUseJournalAiReflection } from "@/lib/journal/journalEntitlements";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";

export default function Journal() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const canGenerateAiReflection = canUseJournalAiReflection(
    resolveCurrentTier(
      profile?.subscribed ?? false,
      profile?.tier,
      profile?.accountType,
      profile?.enterpriseTier,
    ),
  );
  const [entries, setEntries] = useState<JournalEntryListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [entryDetailOpen, setEntryDetailOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntryListItem | null>(null);
  const hasLoadedEntriesRef = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const rows = await fetchJournalEntries(user.id, profile?.onboardingData ?? null);
      setEntries(rows);
    } catch {
      toast.error("Couldn't load your journal. Please try again.");
      setEntries([]);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    const silent = hasLoadedEntriesRef.current;
    hasLoadedEntriesRef.current = true;
    void load({ silent });
  }, [load]);

  const handleEntriesChanged = useCallback(async () => {
    await refreshProfile({ silent: true });
    await load({ silent: true });
  }, [load, refreshProfile]);

  const handleEntryReflectionGenerated = useCallback(
    (updated: JournalEntryListItem) => {
      setEditingEntry(updated);
      setEntries((current) =>
        current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      );
      void refreshProfile({ silent: true });
    },
    [refreshProfile],
  );

  const openNew = () => {
    setNewEntryOpen(true);
  };

  const openEdit = (entry: JournalEntryListItem) => {
    setEditingEntry(entry);
    setEntryDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <div
        data-module-owner={JOURNAL_MODULE_ID}
        className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12"
      >
        <JournalPageContent>
          <JournalEntriesTab
            entries={entries}
            loading={loading}
            onNewEntry={openNew}
            onViewEntry={openEdit}
          />
        </JournalPageContent>
      </div>

      <NewEntryPopup
        open={newEntryOpen}
        onOpenChange={setNewEntryOpen}
        userId={user?.id ?? ""}
        onboardingData={profile?.onboardingData ?? null}
        onSaved={handleEntriesChanged}
      />

      <EntryDetailPopup
        open={entryDetailOpen}
        onOpenChange={(open) => {
          setEntryDetailOpen(open);
          if (!open) setEditingEntry(null);
        }}
        entry={editingEntry}
        userId={user?.id ?? ""}
        onboardingData={profile?.onboardingData ?? null}
        canGenerateAiReflection={canGenerateAiReflection}
        onSaved={handleEntriesChanged}
        onReflectionGenerated={handleEntryReflectionGenerated}
      />
    </DashboardLayout>
  );
}
