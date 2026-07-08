import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddPlanPopup from "@/components/settings/admin/AddPlanPopup";
import {
  ADMIN_ADD_PLAN_BTN_BUBBLE_ID,
  ADMIN_PLAN_CARD_ACTIONS_BUBBLE_ID,
  ADMIN_PLAN_CARD_NAME_BUBBLE_ID,
  ADMIN_PLAN_CARD_TEMPLATE_BUBBLE_ID,
  ADMIN_PLAN_DELETE_BTN_BUBBLE_ID,
  ADMIN_PLAN_EDIT_BTN_BUBBLE_ID,
  ADMIN_PLANS_GRID_BUBBLE_ID,
  ADMIN_PLANS_TITLE_BUBBLE_ID,
  ADMIN_PLANS_TOOLBAR_BUBBLE_ID,
  ADMIN_TAB_PLANS_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  createAdminPlan,
  deleteAdminPlan,
  fetchAdminPlans,
  formatPlanPrice,
  getPlanTierLabel,
  updateAdminPlan,
  type AdminPlanRecord,
} from "@/lib/settings/admin/adminPlansApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminPlansTab() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<AdminPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<AdminPlanRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editPlan !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditPlan(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setPlans(await fetchAdminPlans(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load plans.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminPlan>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editPlan) {
          await updateAdminPlan(user.id, editPlan.planId, form);
          toast.success("Plan updated.");
        } else {
          await createAdminPlan(user.id, form);
          toast.success("Plan created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save plan.");
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editPlan, reload, user],
  );

  const handleDelete = useCallback(
    async (plan: AdminPlanRecord) => {
      if (!user || plan.isStatic || busy) return;
      setBusy(true);
      try {
        await deleteAdminPlan(user.id, plan.planId);
        await reload();
        toast.success("Plan deleted.");
      } catch {
        toast.error("Couldn't delete plan.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  if (loading) {
    return (
      <div data-bubble-id={ADMIN_TAB_PLANS_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading plans…
      </div>
    );
  }

  return (
    <div data-bubble-id={ADMIN_TAB_PLANS_BUBBLE_ID} className="flex flex-col gap-4">
      <div
        data-bubble-id={ADMIN_PLANS_TOOLBAR_BUBBLE_ID}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3 data-bubble-id={ADMIN_PLANS_TITLE_BUBBLE_ID} className={bubbleStyle("Text_heading_3_")}>
          Subscription plans
        </h3>
        <Button
          type="button"
          data-bubble-id={ADMIN_ADD_PLAN_BTN_BUBBLE_ID}
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add plan
        </Button>
      </div>

      <div data-bubble-id={ADMIN_PLANS_GRID_BUBBLE_ID} className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.planId}
            data-bubble-id={ADMIN_PLAN_CARD_TEMPLATE_BUBBLE_ID}
            className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 data-bubble-id={ADMIN_PLAN_CARD_NAME_BUBBLE_ID} className="font-semibold">
                  {plan.name}
                </h4>
                <p className="text-2xl font-bold">{formatPlanPrice(plan)}</p>
              </div>
              <Badge variant="secondary">{getPlanTierLabel(plan.planId)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
            <ul className="space-y-1 text-sm">
              {plan.features.slice(0, 3).map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <div
              data-bubble-id={ADMIN_PLAN_CARD_ACTIONS_BUBBLE_ID}
              className="flex justify-end gap-2"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-bubble-id={ADMIN_PLAN_EDIT_BTN_BUBBLE_ID}
                disabled={plan.isStatic || busy}
                onClick={() => setEditPlan(plan)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-bubble-id={ADMIN_PLAN_DELETE_BTN_BUBBLE_ID}
                disabled={plan.isStatic || busy}
                onClick={() => void handleDelete(plan)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AddPlanPopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editPlanId={editPlan?.planId ?? null}
        initialForm={
          editPlan
            ? {
                name: editPlan.name,
                price: editPlan.price,
                description: editPlan.description,
                features: editPlan.features.join("\n"),
              }
            : null
        }
      />
    </div>
  );
}
