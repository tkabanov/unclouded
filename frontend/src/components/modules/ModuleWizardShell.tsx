import { type ReactNode, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import CrisisBar from "@/components/CrisisBar";
import { Button } from "@/components/ui/button";

interface ModuleWizardShellProps {
  moduleTitle: string;
  showBack?: boolean;
  onBack?: () => void;
  children: ReactNode;
}

export default function ModuleWizardShell({
  moduleTitle,
  showBack = true,
  onBack,
  children,
}: ModuleWizardShellProps) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [moduleTitle]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate("/settings?tab=profile");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CrisisBar />
      <header className="border-b border-border/60 bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="shrink-0 gap-1.5 text-muted-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <span className="w-[72px] shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-medium text-foreground">Know Yourself Deeper</p>
            <p className="truncate text-xs text-muted-foreground">{moduleTitle}</p>
          </div>
          <span className="w-[72px] shrink-0" aria-hidden />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
