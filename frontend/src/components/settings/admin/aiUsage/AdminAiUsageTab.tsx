import AiUsageLimitsPanel from "@/components/settings/admin/aiUsage/AiUsageLimitsPanel";
import AiUsageOverviewPanel from "@/components/settings/admin/aiUsage/AiUsageOverviewPanel";
import AiUsageUsersPanel from "@/components/settings/admin/aiUsage/AiUsageUsersPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** NCLDD-52 — AI Usage: spend dashboard, monthly $ limits per plan, per-user limits. */
export default function AdminAiUsageTab() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">AI Usage</h1>
        <p className="text-sm text-muted-foreground">
          Estimated AI cost and monthly limits. Basic is the Free plan.
        </p>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AiUsageOverviewPanel />
        </TabsContent>
        <TabsContent value="limits">
          <AiUsageLimitsPanel />
        </TabsContent>
        <TabsContent value="users">
          <AiUsageUsersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
