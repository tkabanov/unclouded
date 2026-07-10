import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  HEADER_PROFILE_LOGOUT_LABEL,
  HEADER_PROFILE_SETTINGS_LABEL,
} from "@/lib/enums/navigation";

function avatarInitial(firstName: string | undefined, email: string | undefined): string {
  if (firstName?.trim()) return firstName.trim().charAt(0).toUpperCase();
  if (email?.trim()) return email.trim().charAt(0).toUpperCase();
  return "U";
}

export default function HeaderProfileDropdown() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const [loggingOut, setLoggingOut] = useState(false);

  const initial = avatarInitial(profile?.firstName, user?.email);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-style-ref="Button_ghost_"
          className={cn(
            bubbleStyle("Button_ghost_"),
            "rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Open profile menu"
        >
          <Avatar
            data-style-ref="Image_avatar_"
            className={cn(bubbleStyle("Image_avatar_"), "h-9 w-9")}
          >
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-50 min-w-[10rem]"
      >
        <div className="flex flex-col">
          <DropdownMenuItem asChild>
            <NavLink
              to="/settings"
              data-style-ref="Link_nav_"
              className={cn(
                bubbleStyle("Link_nav_"),
                "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5",
              )}
            >
              <Settings className="h-4 w-4" aria-hidden />
              {HEADER_PROFILE_SETTINGS_LABEL}
            </NavLink>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={loggingOut}
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout();
            }}
            className="cursor-pointer"
          >
            {HEADER_PROFILE_LOGOUT_LABEL}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
