import { useState } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  Compass,
  Settings,
  Phone,
  MessageSquare,
  ChevronDown,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useUserProfile } from "@/lib/userProfile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  SIDEBAR_MODE_LABEL,
  SIDEBAR_MODE_VALUE_PLACEHOLDER,
  SIDEBAR_NAV_BUBBLE_IDS,
  SIDEBAR_NAV_LABELS,
  SIDEBAR_NAV_ORDER,
  SIDEBAR_NAV_ROUTES,
  type SidebarNavSlug,
} from "@/lib/enums";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_ICONS: Record<SidebarNavSlug, LucideIcon> = {
  dashboard: LayoutDashboard,
  chat: MessageCircle,
  journal: BookOpen,
  paths: Compass,
  settings: Settings,
};

const navItems = SIDEBAR_NAV_ORDER.map((slug) => ({
  slug,
  bubbleId: SIDEBAR_NAV_BUBBLE_IDS[slug],
  title: SIDEBAR_NAV_LABELS[slug],
  url: SIDEBAR_NAV_ROUTES[slug],
  icon: NAV_ICONS[slug],
}));

interface AppSidebarProps {
  /** Page-level CustomElement instance id; defaults to reusable root ai_RNbBKLUe. */
  bubbleId?: string;
}

export function AppSidebar({ bubbleId = "ai_RNbBKLUe" }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile } = useUserProfile();
  const [crisisOpen, setCrisisOpen] = useState(false);

  const classificationName = profile?.results?.classification?.name;
  const roleType = profile?.roleType;
  const modeValue =
    roleType && classificationName
      ? `${roleType} • ${classificationName}`
      : SIDEBAR_MODE_VALUE_PLACEHOLDER;

  return (
    <Sidebar
      collapsible="icon"
      data-bubble-id={bubbleId}
      data-style-ref="Group_sidebar_"
      className={cn(bubbleStyle("Group_sidebar_"), "border-r-0")}
    >
      <SidebarHeader className="p-0">
        <div
          data-bubble-id="ai_RNbBHWkU"
          className={cn("flex w-full flex-col gap-4 p-4", collapsed && "items-center px-2")}
        >
          {!collapsed && (
            <div
              data-bubble-id="ai_RNbBHWkV"
              className="flex w-full flex-col gap-1 rounded-lg p-3"
              style={{ backgroundColor: "var(--color_aiRNbAaxgt_default)" }}
            >
              <p
                data-bubble-id="ai_RNbBHWkW"
                data-style-ref="Text_caption_"
                className={cn(bubbleStyle("Text_caption_"), "font-medium")}
              >
                {SIDEBAR_MODE_LABEL}
              </p>
              <p
                data-bubble-id="ai_RNbBHWkX"
                className="text-sm font-semibold leading-snug"
                style={{
                  color: "var(--color_aiRNbAaxgu_default)",
                  fontFamily: "var(--font_aiRNbAaxhX_default), sans-serif",
                }}
              >
                {modeValue}
              </p>
            </div>
          )}

          <nav
            data-bubble-id="ai_RNbBHWkY"
            className={cn("flex w-full flex-col gap-1", collapsed && "items-center")}
            aria-label="Primary"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.slug}
                to={item.url}
                end
                data-bubble-id={item.bubbleId}
                data-style-ref="Link_nav_"
                title={item.title}
                className={cn(
                  bubbleStyle("Link_nav_"),
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  collapsed && "w-9 justify-center px-0",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </SidebarHeader>

      <SidebarContent className="hidden" />

      <SidebarFooter className="p-2" data-bubble-id="bTIfa">
        {collapsed ? (
          <NavLink
            to="/dashboard"
            title="Crisis resources"
            aria-label="Crisis resources"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-[var(--color_aiRNbAaxgr_default)] transition-colors"
          >
            <LifeBuoy className="h-5 w-5" />
          </NavLink>
        ) : (
          <Collapsible open={crisisOpen} onOpenChange={setCrisisOpen}>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color_aiRNbAaxgr_default)]">
                <LifeBuoy className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 text-sm font-medium text-foreground">Crisis resources</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    crisisOpen && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="space-y-2.5 border-t border-border px-3 py-3">
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">988 Suicide &amp; Crisis Lifeline</p>
                      <a href="tel:988" className="text-xs text-primary hover:underline">
                        Call or text 988
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Crisis Text Line</p>
                      <a href="sms:741741" className="text-xs text-primary hover:underline">
                        Text HOME to 741741
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">SAMHSA Helpline</p>
                      <a href="tel:1-800-662-4357" className="text-xs text-primary hover:underline">
                        1-800-662-4357
                      </a>
                    </div>
                  </div>

                  <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Emergencies require professional help. Uncloud360 is coaching only — not therapy or medical care.
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
