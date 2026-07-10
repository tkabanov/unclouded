import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Gift, MessageSquare, Phone, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useUserProfile } from "@/lib/userProfile";
import { fetchResources, type ResourceListItem } from "@/lib/paths/pathsResourcesApi";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/paths/ResourceCard";

export interface PathsResourcesPanelProps {
  className?: string;
  onViewResource?: (resource: ResourceListItem) => void;
}

interface PinnedCrisisCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
}

function PinnedCrisisCard({ title, description, icon, href }: PinnedCrisisCardProps) {
  const TitleTag = href ? "a" : "span";

  return (
    <article
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex h-full flex-col gap-3 p-5")}
    >
      <div className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-3")}>
        <div className={cn(bubbleStyle("Group_transparent_"), "inline-flex shrink-0")}>
          <span
            className={cn(
              bubbleStyle("Icon_primary_"),
              "inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10",
            )}
            aria-hidden
          >
            {icon}
          </span>
        </div>
        <TitleTag
          {...(href ? { href } : {})}
          className={cn(
            bubbleStyle("Text_heading_3_"),
            "text-base font-semibold text-foreground",
            href && "hover:text-primary",
          )}
        >
          {title}
        </TitleTag>
      </div>

      <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}>{description}</p>

      <div className={cn(bubbleStyle("Group_transparent_"), "mt-auto inline-flex items-center gap-1.5")}>
        <Gift className={cn(bubbleStyle("Icon_primary_"), "h-3.5 w-3.5")} aria-hidden />
        <span className={cn(bubbleStyle("Group_badge_primary_"), "text-xs")}>Always Free</span>
      </div>
    </article>
  );
}

export default function PathsResourcesPanel({ className, onViewResource }: PathsResourcesPanelProps) {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ResourceListItem[]>([]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchResources(profile?.onboardingData ?? null);
      setResources(rows);
    } catch (err) {
      console.error("Failed to load paths resources", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.onboardingData]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  return (
    <div className={cn("flex w-full flex-col gap-8", className)}>
      <section className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}>
        <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
          <Shield className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")} aria-hidden />
          <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}>
            Always Available — Crisis & Safety
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PinnedCrisisCard
            title="988 Suicide & Crisis Lifeline"
            description="Call or text 988 anytime. Free, confidential crisis counseling available 24/7."
            icon={<Phone className="h-4 w-4" />}
            href="tel:988"
          />
          <PinnedCrisisCard
            title="Crisis Text Line"
            description="Text HOME to 741741. Connect with a trained crisis counselor via text message."
            icon={<MessageSquare className="h-4 w-4" />}
            href="sms:741741?body=HOME"
          />
          <PinnedCrisisCard
            title="SAMHSA National Helpline"
            description="Call 1-800-662-4357. Treatment referral and information service for mental health and substance use."
            icon={<Phone className="h-4 w-4" />}
            href="tel:18006624357"
          />
        </div>
      </section>

      <section className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}>
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}>
          Resource Library
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading ? (
            <>
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </>
          ) : resources.length === 0 ? (
            <p className={cn(bubbleStyle("Text_body_muted_"), "col-span-full text-sm")}>
              No resources available yet.
            </p>
          ) : (
            resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onView={onViewResource} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
