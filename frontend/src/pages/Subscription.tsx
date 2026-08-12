import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import SettingsSubscriptionTab from "@/components/settings/SettingsSubscriptionTab";
import { cn } from "@/lib/utils";

export default function Subscription() {
  return (
    <DashboardLayout>
      <div className={cn("mx-auto w-full max-w-6xl px-4 pb-10 pt-8 md:px-8")}>
        <div className="flex w-full flex-col gap-6">
          <Link
            to="/dashboard"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>

          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Plans &amp; subscription
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Upgrade, downgrade, or cancel anytime. Cancellations remain active through the end of
              your current billing period.
            </p>
          </header>

          <SettingsSubscriptionTab />
        </div>
      </div>
    </DashboardLayout>
  );
}
