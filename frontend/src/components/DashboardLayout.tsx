import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import OfflineBanner from "@/components/shell/OfflineBanner";
import Header from "@/components/shell/Header";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface DashboardLayoutProps {
  children: ReactNode;
  /** Page root bubble id (e.g. bTHDT on dashboard). */
  pageBubbleId?: string;
  /** Page-level header CustomElement instance id. */
  headerBubbleId?: string;
  /** Page-level sidebar CustomElement instance id. */
  sidebarBubbleId?: string;
}

export default function DashboardLayout({
  children,
  pageBubbleId,
  headerBubbleId,
  sidebarBubbleId,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div
        {...(pageBubbleId ? { "data-bubble-id": pageBubbleId } : {})}
        data-style-ref="Group_transparent_"
        className={cn(bubbleStyle("Group_transparent_"), "min-h-screen flex w-full flex-col")}
      >
        <div data-bubble-id="bTHvM0" className="w-full shrink-0">
          <OfflineBanner />
        </div>
        <div className="flex flex-1 min-h-0 min-w-0 w-full">
          <AppSidebar bubbleId={sidebarBubbleId} />
          <div className="flex flex-1 flex-col min-h-0 min-w-0">
            <Header
              bubbleId={headerBubbleId}
              leading={<SidebarTrigger className="mr-1 md:hidden" />}
            />
            <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
