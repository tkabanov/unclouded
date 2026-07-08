import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import BrandLogo from "@/components/BrandLogo";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  HEADER_NAV_BUBBLE_IDS,
  HEADER_NAV_LABELS,
  HEADER_NAV_ORDER,
  HEADER_NAV_ROUTES,
} from "@/lib/enums/navigation";
import HeaderProfileDropdown from "@/components/shell/HeaderProfileDropdown";

interface HeaderProps {
  /** Optional leading chrome (e.g. sidebar trigger in app shell). */
  leading?: ReactNode;
  /** Page-level CustomElement instance id; defaults to reusable root ai_RNbBKLUc. */
  bubbleId?: string;
}

export default function Header({ leading, bubbleId = "ai_RNbBKLUc" }: HeaderProps) {
  const { user } = useAuth();
  const authenticated = Boolean(user);

  return (
    <header
      data-bubble-id={bubbleId}
      className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4"
    >
      {leading}

      <div data-bubble-id="ai_RNbBHWao" className="flex shrink-0 items-center">
        <BrandLogo />
      </div>

      <div className="flex-1" />

      {!authenticated && (
        <nav
          data-bubble-id="ai_RNbBHWau"
          className="hidden items-center gap-4 md:flex"
          aria-label="Marketing"
        >
          {/* Logged-out marketing links — visible on Index when Header is reused (SHELL-04). */}
        </nav>
      )}

      {authenticated && (
        <nav
          data-bubble-id="ai_RNbBHWaz"
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {HEADER_NAV_ORDER.map((slug) => (
            <NavLink
              key={slug}
              to={HEADER_NAV_ROUTES[slug]}
              end
              data-bubble-id={HEADER_NAV_BUBBLE_IDS[slug]}
              data-style-ref="Link_nav_"
              className={cn(
                bubbleStyle("Link_nav_"),
                "rounded-lg px-3 py-2 transition-colors",
              )}
            >
              {HEADER_NAV_LABELS[slug]}
            </NavLink>
          ))}
        </nav>
      )}

      <div data-bubble-id="ai_RNbBHWbE" className="flex shrink-0 items-center gap-2">
        {authenticated && <HeaderProfileDropdown />}
      </div>
    </header>
  );
}
