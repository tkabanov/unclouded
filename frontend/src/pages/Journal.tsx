import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import AddMilestonePopup from "@/components/journal/AddMilestonePopup";
import EditMilestonePopup from "@/components/journal/EditMilestonePopup";
import EditRelapsePopup from "@/components/journal/EditRelapsePopup";
import EntryDetailPopup from "@/components/journal/EntryDetailPopup";
import JournalEntriesTab from "@/components/journal/JournalEntriesTab";
import JournalPageContent from "@/components/journal/JournalPageContent";
import LogRelapsePopup from "@/components/journal/LogRelapsePopup";
import MilestonesTab from "@/components/journal/MilestonesTab";
import NewEntryPopup from "@/components/journal/NewEntryPopup";
import { JOURNAL_MODULE_ID } from "@/lib/journal/routes";
import {
  fetchJournalEntries,
  type JournalEntryListItem,
} from "@/lib/journal/journalEntriesApi";
import { fetchMilestones, type MilestoneListItem } from "@/lib/journal/milestonesApi";
import {
  fetchRelapseEvents,
  type RelapseEventListItem,
} from "@/lib/journal/relapseEventsApi";
import { canUseJournalAiReflection } from "@/lib/journal/journalEntitlements";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";
import { useUserProfile } from "@/lib/userProfile";
import { useAuth } from "@/hooks/useAuth";


export default function Journal() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const canGenerateAiReflection = canUseJournalAiReflection(
    resolveCurrentTier(profile?.subscribed ?? false, profile?.tier),
  );
  const [entries, setEntries] = useState<JournalEntryListItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneListItem[]>([]);
  const [relapseEvents, setRelapseEvents] = useState<RelapseEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [entryDetailOpen, setEntryDetailOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntryListItem | null>(null);

  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [editMilestoneOpen, setEditMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneListItem | null>(null);

  const [logRelapseOpen, setLogRelapseOpen] = useState(false);
  const [editRelapseOpen, setEditRelapseOpen] = useState(false);
  const [editingRelapse, setEditingRelapse] = useState<RelapseEventListItem | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchJournalEntries(user.id, profile?.onboardingData ?? null);
      setEntries(rows);
    } catch {
      toast.error("Couldn't load your journal. Please try again.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.onboardingData]);

  const loadMilestones = useCallback(async () => {
    if (!user) {
      setMilestones([]);
      setRelapseEvents([]);
      setMilestonesLoading(false);
      return;
    }

    setMilestonesLoading(true);
    try {
      const onboardingData = profile?.onboardingData ?? null;
      const [nextMilestones, nextRelapseEvents] = await Promise.all([
        fetchMilestones(user.id, onboardingData),
        fetchRelapseEvents(user.id, onboardingData),
      ]);
      setMilestones(nextMilestones);
      setRelapseEvents(nextRelapseEvents);
    } catch {
      toast.error("Couldn't load milestones. Please try again.");
      setMilestones([]);
      setRelapseEvents([]);
    } finally {
      setMilestonesLoading(false);
    }
  }, [user, profile?.onboardingData]);

  useEffect(() => {
    load();
    loadMilestones();
  }, [load, loadMilestones]);

  const handleEntriesChanged = useCallback(async () => {
    await refreshProfile();
    await load();
  }, [load, refreshProfile]);

  const handleMilestonesChanged = useCallback(async () => {
    await refreshProfile();
    await loadMilestones();
  }, [loadMilestones, refreshProfile]);

  const handleAddMilestone = () => {
    setAddMilestoneOpen(true);
  };

  const handleLogRelapse = () => {
    setLogRelapseOpen(true);
  };

  const handleEditMilestone = (milestone: MilestoneListItem) => {
    setEditingMilestone(milestone);
    setEditMilestoneOpen(true);
  };

  const handleEditRelapse = (event: RelapseEventListItem) => {
    setEditingRelapse(event);
    setEditRelapseOpen(true);
  };

  const openNew = () => {
    setNewEntryOpen(true);
  };

  const openEdit = (entry: JournalEntryListItem) => {
    setEditingEntry(entry);
    setEntryDetailOpen(true);
  };

  return (
    <DashboardLayout >
      <div
        data-module-owner={JOURNAL_MODULE_ID}
        className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12"
      >
        <JournalPageContent
          journalTab={
            <JournalEntriesTab
              entries={entries}
              loading={loading}
              onNewEntry={openNew}
              onViewEntry={openEdit}
            />
          }
          milestonesTab={
            <MilestonesTab
              milestones={milestones}
              relapseEvents={relapseEvents}
              loading={milestonesLoading}
              onAddMilestone={handleAddMilestone}
              onLogRelapse={handleLogRelapse}
              onEditMilestone={handleEditMilestone}
              onEditRelapse={handleEditRelapse}
            />
          }
        />
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
      />

      <AddMilestonePopup
        open={addMilestoneOpen}
        onOpenChange={setAddMilestoneOpen}
        userId={user?.id ?? ""}
        onboardingData={profile?.onboardingData ?? null}
        onSaved={handleMilestonesChanged}
      />

      <EditMilestonePopup
        open={editMilestoneOpen}
        onOpenChange={(open) => {
          setEditMilestoneOpen(open);
          if (!open) setEditingMilestone(null);
        }}
        milestone={editingMilestone}
        userId={user?.id ?? ""}
        onboardingData={profile?.onboardingData ?? null}
        onSaved={handleMilestonesChanged}
      />

      <LogRelapsePopup
        open={logRelapseOpen}
        onOpenChange={setLogRelapseOpen}
        userId={user?.id ?? ""}
        onboardingData={profile?.onboardingData ?? null}
        onSaved={handleMilestonesChanged}
      />

      <EditRelapsePopup
        open={editRelapseOpen}
        onOpenChange={(open) => {
          setEditRelapseOpen(open);
          if (!open) setEditingRelapse(null);
        }}
        event={editingRelapse}
        userId={user?.id ?? ""}
        onboardingData={profile?.onboardingData ?? null}
        onSaved={handleMilestonesChanged}
      />
    </DashboardLayout>
  );
}
