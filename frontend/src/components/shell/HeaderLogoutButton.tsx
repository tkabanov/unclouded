import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HEADER_PROFILE_LOGOUT_LABEL } from "@/lib/enums/navigation";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

interface HeaderLogoutButtonProps {
  className?: string;
}

export default function HeaderLogoutButton({ className }: HeaderLogoutButtonProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

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
    <Button
      type="button"
      data-style-ref="Button_outline_"
      variant="outline"
      size="sm"
      disabled={loggingOut}
      className={cn(bubbleStyle("Button_outline_"), className)}
      onClick={() => void handleLogout()}
    >
      {HEADER_PROFILE_LOGOUT_LABEL}
    </Button>
  );
}
