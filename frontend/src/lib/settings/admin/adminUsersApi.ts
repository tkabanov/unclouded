import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctionErrors";
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserTypeSlug,
} from "@/lib/settings/admin/adminUserType";

type ListResponse = {
  ok?: boolean;
  error?: string;
  users?: AdminUserListItem[];
};

type DetailResponse = {
  ok?: boolean;
  error?: string;
  user?: AdminUserDetail;
};

type SetActiveResponse = {
  ok?: boolean;
  error?: string;
  userId?: string;
  isActive?: boolean;
};

async function invokeAdminUsers(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  const payload = (data ?? {}) as Record<string, unknown>;

  if (payload.ok !== true) {
    throw new Error(getEdgeFunctionErrorMessage(data, error, "Couldn't load admin users."));
  }

  return payload;
}

export type AdminUsersListFilters = {
  search?: string;
  typeFilter?: AdminUserTypeSlug | "all";
  statusFilter?: "active" | "deactivated" | "all";
  /** When set, only profiles linked to this workplace. */
  workplaceId?: string;
};

export async function fetchAdminUsersList(
  filters: AdminUsersListFilters = {},
): Promise<AdminUserListItem[]> {
  const payload = (await invokeAdminUsers({
    action: "list",
    search: filters.search ?? "",
    typeFilter: filters.typeFilter ?? "all",
    statusFilter: filters.statusFilter ?? "all",
    ...(filters.workplaceId ? { workplaceId: filters.workplaceId } : {}),
  })) as ListResponse;

  return payload.users ?? [];
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const payload = (await invokeAdminUsers({
    action: "get",
    userId,
  })) as DetailResponse;

  if (!payload.user) {
    throw new Error("User not found.");
  }

  return payload.user;
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<void> {
  await invokeAdminUsers({
    action: "setActive",
    userId,
    isActive,
  });
}

/** Admin-only Kota's Read preview for a user (no booking, no email). */
export async function generateAdminPreCoachingBrief(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-kota-read", {
    body: { mode: "adminUser", userId },
  });
  const payload = (data ?? {}) as {
    ok?: boolean;
    brief?: string;
    kotaRead?: string;
    error?: string;
  };

  if (payload.ok !== true) {
    throw new Error(
      getEdgeFunctionErrorMessage(data, error, "Couldn't generate pre-coaching brief."),
    );
  }

  const brief = (payload.brief ?? payload.kotaRead ?? "").trim();
  if (!brief) {
    throw new Error("Empty brief returned.");
  }
  return brief;
}
