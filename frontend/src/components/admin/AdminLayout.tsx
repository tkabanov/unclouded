import { type ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import HeaderLogoutButton from "@/components/shell/HeaderLogoutButton";
import OfflineBanner from "@/components/shell/OfflineBanner";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface AdminLayoutProps {
  children: ReactNode;
}

/** Lovable-style admin shell: sidebar + main content (OVR-048). */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div
      data-style-ref="Group_transparent_"
      className={cn(bubbleStyle("Group_transparent_"), "flex min-h-screen w-full flex-col")}
    >
      <div className="w-full shrink-0">
        <OfflineBanner />
      </div>

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center justify-end border-b border-border bg-background px-4 md:px-6">
            <HeaderLogoutButton />
          </header>
          <main className="flex-1 min-w-0 overflow-y-auto bg-muted/30">{children}</main>
        </div>
      </div>
    </div>
  );
}
