import { type ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";
import HeaderLogoutButton from "@/components/shell/HeaderLogoutButton";
import OfflineBanner from "@/components/shell/OfflineBanner";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div
      data-style-ref="Group_transparent_"
      className={cn(bubbleStyle("Group_transparent_"), "min-h-screen flex w-full flex-col")}
    >
      <div className="w-full shrink-0">
        <OfflineBanner />
      </div>

      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4 md:px-8">
        <BrandLogo />
        <div className="flex-1" />
        <HeaderLogoutButton />
      </header>

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
