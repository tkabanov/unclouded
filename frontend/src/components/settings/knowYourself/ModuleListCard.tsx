import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { toast } from "sonner";



import ModuleStatusBadge from "@/components/settings/knowYourself/ModuleStatusBadge";

import { Button } from "@/components/ui/button";

import {

  Tooltip,

  TooltipContent,

  TooltipProvider,

  TooltipTrigger,

} from "@/components/ui/tooltip";

import { useAuth } from "@/hooks/useAuth";

import type { ModuleListItem } from "@/lib/modules/moduleListState";

import { formatDaysUntilUnlockLabel } from "@/lib/modules/moduleListState";

import { offerUserModuleRefresh } from "@/lib/modules/moduleRefreshApi";

import { bubbleStyle } from "@/styles";

import { cn } from "@/lib/utils";



interface ModuleListCardProps {

  item: ModuleListItem;

  onRefreshOffered?: () => Promise<void> | void;

}



export default function ModuleListCard({ item, onRefreshOffered }: ModuleListCardProps) {

  const navigate = useNavigate();

  const { user } = useAuth();

  const isCompleted = item.status === "completed";

  const isAvailable = item.status === "available";

  const isRefreshAvailable = item.status === "refresh_available";

  const isLocked = item.status === "locked";

  const isSensitive = item.sensitivityTier === "high";



  const handleUserRefresh = async () => {

    if (!user) return;

    try {

      const offered = await offerUserModuleRefresh(user.id, [item.slug]);

      if (offered.length === 0) {

        toast.info("Complete this module first before refreshing.");

        return;

      }

      await onRefreshOffered?.();

      navigate(`/settings/know-yourself/${item.slug}`);

    } catch (error) {

      console.error(error);

      toast.error("Could not start refresh. Please try again.");

    }

  };



  return (

    <li

      className={cn(

        bubbleStyle("Group_card_"),

        "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",

      )}

    >

      <div className="min-w-0 flex-1 space-y-2">

        <div className="flex flex-wrap items-center gap-2">

          <p className="font-medium text-foreground">{item.displayTitle}</p>

          <ModuleStatusBadge status={item.status} />

          {isSensitive ? (

            <TooltipProvider>

              <Tooltip>

                <TooltipTrigger asChild>

                  <span

                    className="inline-flex text-muted-foreground"

                    aria-label="Contains sensitive content"

                  >

                    <AlertTriangle className="h-4 w-4" aria-hidden />

                  </span>

                </TooltipTrigger>

                <TooltipContent>Contains sensitive content</TooltipContent>

              </Tooltip>

            </TooltipProvider>

          ) : null}

        </div>

        <p className="text-sm text-muted-foreground">{item.presentationCopy}</p>

        {isLocked ? (

          <p className="text-xs text-muted-foreground">

            {formatDaysUntilUnlockLabel(item.daysUntilUnlock)}

          </p>

        ) : null}

      </div>



      <div className="flex shrink-0 items-center gap-2">

        {isCompleted ? (

          <>

            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">

              <CheckCircle2 className="h-4 w-4" aria-hidden />

              Completed

            </span>

            <Button type="button" variant="outline" size="sm" onClick={() => void handleUserRefresh()}>

              Refresh

            </Button>

          </>

        ) : isRefreshAvailable ? (

          <Button asChild variant="default" size="sm">

            <Link to={`/settings/know-yourself/${item.slug}`}>Refresh</Link>

          </Button>

        ) : isAvailable ? (

          <Button asChild variant="default" size="sm">

            <Link to={`/settings/know-yourself/${item.slug}`}>Start</Link>

          </Button>

        ) : (

          <Button variant="outline" size="sm" disabled>

            {formatDaysUntilUnlockLabel(item.daysUntilUnlock)}

          </Button>

        )}

      </div>

    </li>

  );

}

