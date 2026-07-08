import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Gift, MessageSquare, Phone, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useUserProfile } from "@/lib/userProfile";
import {
  fetchResources,
  type ResourceListItem,
} from "@/lib/paths/pathsResourcesApi";
import {
  PATHS_CRISIS_CARD_988_BADGE_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_BADGE_ICON_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_BADGE_TEXT_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_DESC_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_ICON_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_ICON_ROW_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_ICON_WRAP_BUBBLE_ID,
  PATHS_CRISIS_CARD_988_TITLE_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_BADGE_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_BADGE_ICON_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_BADGE_TEXT_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_DESC_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_ICON_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_ICON_ROW_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_ICON_WRAP_BUBBLE_ID,
  PATHS_CRISIS_CARD_SAMHSA_TITLE_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_BADGE_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_BADGE_ICON_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_BADGE_TEXT_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_DESC_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_ICON_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_ICON_ROW_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_ICON_WRAP_BUBBLE_ID,
  PATHS_CRISIS_CARD_TEXTLINE_TITLE_BUBBLE_ID,
  PATHS_PINNED_CARDS_GRID_BUBBLE_ID,
  PATHS_PINNED_HEADER_BUBBLE_ID,
  PATHS_PINNED_HEADER_ICON_BUBBLE_ID,
  PATHS_PINNED_HEADER_TITLE_BUBBLE_ID,
  PATHS_PINNED_SECTION_BUBBLE_ID,
  PATHS_RESOURCES_INTRO_BUBBLE_ID,
  PATHS_RESOURCES_INTRO_TITLE_BUBBLE_ID,
  PATHS_RESOURCES_RG_BUBBLE_ID,
} from "@/lib/paths/routes";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/paths/ResourceCard";

export interface PathsResourcesPanelProps {
  className?: string;
  onViewResource?: (resource: ResourceListItem) => void;
}

interface PinnedCrisisCardProps {
  cardId: string;
  iconRowId: string;
  iconWrapId?: string;
  iconId: string;
  titleId: string;
  title: string;
  descId: string;
  description: string;
  badgeId: string;
  badgeIconId: string;
  badgeTextId: string;
  icon: ReactNode;
  href?: string;
}

function PinnedCrisisCard({
  cardId,
  iconRowId,
  iconWrapId,
  iconId,
  titleId,
  title,
  descId,
  description,
  badgeId,
  badgeIconId,
  badgeTextId,
  icon,
  href,
}: PinnedCrisisCardProps) {
  const TitleTag = href ? "a" : "span";

  return (
    <article
      data-bubble-id={cardId}
      data-style-ref="Group_card_"
      className={cn(bubbleStyle("Group_card_"), "flex h-full flex-col gap-3 p-5")}
    >
      <div
        data-bubble-id={iconRowId}
        className={cn(bubbleStyle("Group_transparent_"), "flex items-start gap-3")}
      >
        <div
          {...(iconWrapId ? { "data-bubble-id": iconWrapId } : {})}
          className={cn(bubbleStyle("Group_transparent_"), "inline-flex shrink-0")}
        >
          <span
            data-bubble-id={iconId}
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
          data-bubble-id={titleId}
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

      <p
        data-bubble-id={descId}
        className={cn(bubbleStyle("Text_body_muted_"), "text-sm leading-relaxed")}
      >
        {description}
      </p>

      <div
        data-bubble-id={badgeId}
        className={cn(bubbleStyle("Group_transparent_"), "mt-auto inline-flex items-center gap-1.5")}
      >
        <Gift
          data-bubble-id={badgeIconId}
          className={cn(bubbleStyle("Icon_primary_"), "h-3.5 w-3.5")}
          aria-hidden
        />
        <span
          data-bubble-id={badgeTextId}
          className={cn(bubbleStyle("Group_badge_primary_"), "text-xs")}
        >
          Always Free
        </span>
      </div>
    </article>
  );
}

export default function PathsResourcesPanel({
  className,
  onViewResource,
}: PathsResourcesPanelProps) {
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
      <section
        data-bubble-id={PATHS_PINNED_SECTION_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}
      >
        <div
          data-bubble-id={PATHS_PINNED_HEADER_BUBBLE_ID}
          className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}
        >
          <Shield
            data-bubble-id={PATHS_PINNED_HEADER_ICON_BUBBLE_ID}
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-bubble-id={PATHS_PINNED_HEADER_TITLE_BUBBLE_ID}
            className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
          >
            Always Available — Crisis & Safety
          </h2>
        </div>

        <div
          data-bubble-id={PATHS_PINNED_CARDS_GRID_BUBBLE_ID}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <PinnedCrisisCard
            cardId={PATHS_CRISIS_CARD_988_BUBBLE_ID}
            iconRowId={PATHS_CRISIS_CARD_988_ICON_ROW_BUBBLE_ID}
            iconWrapId={PATHS_CRISIS_CARD_988_ICON_WRAP_BUBBLE_ID}
            iconId={PATHS_CRISIS_CARD_988_ICON_BUBBLE_ID}
            titleId={PATHS_CRISIS_CARD_988_TITLE_BUBBLE_ID}
            title="988 Suicide & Crisis Lifeline"
            descId={PATHS_CRISIS_CARD_988_DESC_BUBBLE_ID}
            description="Call or text 988 anytime. Free, confidential crisis counseling available 24/7."
            badgeId={PATHS_CRISIS_CARD_988_BADGE_BUBBLE_ID}
            badgeIconId={PATHS_CRISIS_CARD_988_BADGE_ICON_BUBBLE_ID}
            badgeTextId={PATHS_CRISIS_CARD_988_BADGE_TEXT_BUBBLE_ID}
            icon={<Phone className="h-4 w-4" />}
            href="tel:988"
          />
          <PinnedCrisisCard
            cardId={PATHS_CRISIS_CARD_TEXTLINE_BUBBLE_ID}
            iconRowId={PATHS_CRISIS_CARD_TEXTLINE_ICON_ROW_BUBBLE_ID}
            iconWrapId={PATHS_CRISIS_CARD_TEXTLINE_ICON_WRAP_BUBBLE_ID}
            iconId={PATHS_CRISIS_CARD_TEXTLINE_ICON_BUBBLE_ID}
            titleId={PATHS_CRISIS_CARD_TEXTLINE_TITLE_BUBBLE_ID}
            title="Crisis Text Line"
            descId={PATHS_CRISIS_CARD_TEXTLINE_DESC_BUBBLE_ID}
            description="Text HOME to 741741. Connect with a trained crisis counselor via text message."
            badgeId={PATHS_CRISIS_CARD_TEXTLINE_BADGE_BUBBLE_ID}
            badgeIconId={PATHS_CRISIS_CARD_TEXTLINE_BADGE_ICON_BUBBLE_ID}
            badgeTextId={PATHS_CRISIS_CARD_TEXTLINE_BADGE_TEXT_BUBBLE_ID}
            icon={<MessageSquare className="h-4 w-4" />}
            href="sms:741741?body=HOME"
          />
          <PinnedCrisisCard
            cardId={PATHS_CRISIS_CARD_SAMHSA_BUBBLE_ID}
            iconRowId={PATHS_CRISIS_CARD_SAMHSA_ICON_ROW_BUBBLE_ID}
            iconWrapId={PATHS_CRISIS_CARD_SAMHSA_ICON_WRAP_BUBBLE_ID}
            iconId={PATHS_CRISIS_CARD_SAMHSA_ICON_BUBBLE_ID}
            titleId={PATHS_CRISIS_CARD_SAMHSA_TITLE_BUBBLE_ID}
            title="SAMHSA National Helpline"
            descId={PATHS_CRISIS_CARD_SAMHSA_DESC_BUBBLE_ID}
            description="Call 1-800-662-4357. Treatment referral and information service for mental health and substance use."
            badgeId={PATHS_CRISIS_CARD_SAMHSA_BADGE_BUBBLE_ID}
            badgeIconId={PATHS_CRISIS_CARD_SAMHSA_BADGE_ICON_BUBBLE_ID}
            badgeTextId={PATHS_CRISIS_CARD_SAMHSA_BADGE_TEXT_BUBBLE_ID}
            icon={<Phone className="h-4 w-4" />}
            href="tel:18006624357"
          />
        </div>
      </section>

      <section
        data-bubble-id={PATHS_RESOURCES_INTRO_BUBBLE_ID}
        className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-4")}
      >
        <h2
          data-bubble-id={PATHS_RESOURCES_INTRO_TITLE_BUBBLE_ID}
          className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}
        >
          Resource Library
        </h2>

        <div
          data-bubble-id={PATHS_RESOURCES_RG_BUBBLE_ID}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
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
              <ResourceCard
                key={resource.resourceId}
                resource={resource}
                onViewResource={onViewResource}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
