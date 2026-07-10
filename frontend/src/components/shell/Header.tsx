import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import BrandLogo from "@/components/BrandLogo";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { HEADER_NAV_LABELS, HEADER_NAV_ORDER, HEADER_NAV_ROUTES } from "@/lib/enums/navigation";
import HeaderProfileDropdown from "@/components/shell/HeaderProfileDropdown";
import HeaderLogoutButton from "@/components/shell/HeaderLogoutButton";

interface HeaderProps {
  /** Optional leading chrome (e.g. sidebar trigger in app shell). */
  leading?: ReactNode;
}

export default function Header({ leading }: HeaderProps) {
  const { user } = useAuth();
  const authenticated = Boolean(user);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
      {leading}

      <div className="flex shrink-0 items-center">
        <BrandLogo />
      </div>

      <div className="flex-1" />

      {!authenticated && (
        <nav className="hidden items-center gap-4 md:flex" aria-label="Marketing">
          <a
            href="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </a>
          <a
            href="/#coaching-modes"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Coaching Modes
          </a>
          <a
            href="/#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="/#workplace"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Workplace
          </a>
        </nav>
      )}

      {authenticated && (
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {HEADER_NAV_ORDER.map((slug) => (
            <NavLink
              key={slug}
              to={HEADER_NAV_ROUTES[slug]}
              end
              data-style-ref="Link_nav_"
              className={cn(bubbleStyle("Link_nav_"), "rounded-lg px-3 py-2 transition-colors")}
            >
              {HEADER_NAV_LABELS[slug]}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="flex shrink-0 items-center gap-2">
        {authenticated && (
          <>
            <HeaderLogoutButton />
            <HeaderProfileDropdown />
          </>
        )}
      </div>
    </header>
  );
}
