import { NavLink } from "@/components/NavLink";
import logoIcon from "@/assets/uncloud-icon.png";
import {
  ADMIN_MORE_NAV,
  ADMIN_NAV_PATH,
  ADMIN_PRIMARY_NAV,
  adminNavLabel,
  resolveAdminSubTab,
} from "@/lib/settings/admin/adminNav";
import { ADMIN_SUB_TAB } from "@/lib/settings/admin/adminTabStore";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  Flag,
  LayoutDashboard,
  Library,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NAV_ICONS: Record<string, LucideIcon> = {
  [ADMIN_SUB_TAB.OVERVIEW]: LayoutDashboard,
  [ADMIN_SUB_TAB.USERS]: Users,
  [ADMIN_SUB_TAB.PATHS]: BookOpen,
  [ADMIN_SUB_TAB.WORKPLACES]: Building2,
  [ADMIN_SUB_TAB.ANALYTICS]: BarChart3,
  [ADMIN_SUB_TAB.RESOURCES]: Library,
  [ADMIN_SUB_TAB.INSIGHTS]: Lightbulb,
  [ADMIN_SUB_TAB.PLANS]: ClipboardList,
  [ADMIN_SUB_TAB.OUTREACH]: Flag,
  [ADMIN_SUB_TAB.COACH_BOOKINGS]: MessageSquareText,
  [ADMIN_SUB_TAB.REASSESSMENTS]: FileText,
  [ADMIN_SUB_TAB.PROMPT_TESTS]: Sparkles,
};

function SidebarLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/admin"}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </NavLink>
  );
}

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const activeTab = resolveAdminSubTab(pathname);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-start gap-2 border-b border-border px-4 py-4">
        <img
          src={logoIcon}
          alt=""
          width={28}
          height={16}
          className="mt-0.5 h-7 w-auto shrink-0"
        />
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-sm font-semibold text-foreground">Uncloud360</p>
          <p className="text-xs text-muted-foreground">Admin console</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Admin">
        {ADMIN_PRIMARY_NAV.map((tab) => {
          const Icon = NAV_ICONS[tab] ?? LayoutDashboard;
          return (
            <SidebarLink
              key={tab}
              to={ADMIN_NAV_PATH[tab]}
              label={adminNavLabel(tab)}
              icon={Icon}
              active={activeTab === tab}
            />
          );
        })}

        <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          More
        </p>
        {ADMIN_MORE_NAV.map((tab) => {
          const Icon = NAV_ICONS[tab] ?? LayoutDashboard;
          return (
            <SidebarLink
              key={tab}
              to={ADMIN_NAV_PATH[tab]}
              label={adminNavLabel(tab)}
              icon={Icon}
              active={activeTab === tab}
            />
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
