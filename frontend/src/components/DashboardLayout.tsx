import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import OfflineBanner from "@/components/shell/OfflineBanner";
import Header from "@/components/shell/Header";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div
        data-style-ref="Group_transparent_"
        className={cn(bubbleStyle("Group_transparent_"), "min-h-screen flex w-full flex-col")}
      >
        <div className="w-full shrink-0">
          <OfflineBanner />
        </div>
        <div className="flex flex-1 min-h-0 min-w-0 w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-h-0 min-w-0">
            <Header leading={<SidebarTrigger className="mr-1 md:hidden" />} />
            <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
