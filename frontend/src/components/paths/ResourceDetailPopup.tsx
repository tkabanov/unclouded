import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import type { ResourceListItem } from "@/lib/paths/pathsResourcesApi";
import { PATHS_RESOURCE_DETAIL_DISCLAIMER_COPY, PATHS_RESOURCE_DETAIL_LINK_LABEL_COPY } from "@/lib/paths/routes";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export interface ResourceDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ResourceListItem | null;
}

export default function ResourceDetailPopup({
  open,
  onOpenChange,
  resource,
}: ResourceDetailPopupProps) {
  const dismiss = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          data-style-ref="Group_overlay_"
        />
        <DialogPrimitive.Content
          data-style-ref="Popup_dialog_"
          className={cn(
            bubbleStyle("Popup_dialog_"),
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto",
          )}
        >
          <header
            className={cn(bubbleStyle("Group_transparent_"), "relative space-y-3 pr-8")}
          >
            <div
              className={cn(bubbleStyle("Group_transparent_"), "space-y-2")}
            >
              <div
                className={cn(
                  bubbleStyle("Group_transparent_"),
                  "flex flex-wrap items-center gap-2",
                )}
              >
                {resource?.primaryModeTag ? (
                  <span
                    className={cn(bubbleStyle("Group_badge_"), "text-xs")}
                  >
                    {resource.primaryModeTag}
                  </span>
                ) : null}
                {resource?.subModeTag ? (
                  <span
                    className={cn(bubbleStyle("Group_badge_"), "text-xs")}
                  >
                    {resource.subModeTag}
                  </span>
                ) : null}
                {resource?.sensitivityFlag ? (
                  <span
                    className={cn(bubbleStyle("Group_badge_"), "text-xs")}
                  >
                    {resource.sensitivityFlag}
                  </span>
                ) : null}
              </div>

              <h2
                data-style-ref="Text_heading_2_"
                className={cn(
                  bubbleStyle("Text_heading_2_"),
                  "text-left text-xl font-semibold text-foreground",
                )}
              >
                {resource?.title ?? "Resource"}
              </h2>
            </div>

            <button
              type="button"
              data-style-ref="Button_icon_"
              className={cn(
                bubbleStyle("Button_icon_"),
                "absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-md",
              )}
              aria-label="Close"
              onClick={dismiss}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <section
            className={cn(bubbleStyle("Group_transparent_"), "space-y-4")}
          >
            <div
              className={cn(
                bubbleStyle("Group_transparent_"),
                "flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3",
              )}
            >
              <AlertTriangle
                className={cn(bubbleStyle("Icon_muted_"), "mt-0.5 h-4 w-4 shrink-0")}
                aria-hidden
              />
              <p
                data-style-ref="Text_body_muted_"
                className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}
              >
                {PATHS_RESOURCE_DETAIL_DISCLAIMER_COPY}
              </p>
            </div>

            <div
              className={cn(bubbleStyle("Group_transparent_"), "space-y-2")}
            >
              <p
                data-style-ref="Text_label_"
                className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
              >
                Resource Content
              </p>
              <p
                data-style-ref="Text_body_muted_"
                className={cn(
                  bubbleStyle("Text_body_muted_"),
                  "whitespace-pre-wrap text-sm leading-relaxed",
                )}
              >
                {resource?.content || "No additional content available."}
              </p>
            </div>
          </section>

          <DialogFooter
            className={cn(
              bubbleStyle("Group_transparent_"),
              "flex flex-col gap-3 sm:justify-stretch",
            )}
          >
            {resource?.externalLink ? (
              <div
                className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-1")}
              >
                <p
                  data-style-ref="Text_label_"
                  className={cn(bubbleStyle("Text_label_"), "text-sm font-medium")}
                >
                  {PATHS_RESOURCE_DETAIL_LINK_LABEL_COPY}
                </p>
                <a
                  href={resource.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    bubbleStyle("Text_link_"),
                    "inline-flex items-center justify-center gap-1.5 text-sm text-primary hover:underline",
                  )}
                >
                  {resource.externalLink}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </a>
              </div>
            ) : null}
            <Button
              type="button"
              variant="cta"
              data-style-ref="Button_primary_"
              className={cn(bubbleStyle("Button_primary_"), "w-full")}
              onClick={dismiss}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
