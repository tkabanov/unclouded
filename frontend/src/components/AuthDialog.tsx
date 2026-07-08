import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

const credentialsSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToSignup?: () => void;
}

const AuthDialog = ({ open, onOpenChange, onSuccess, onSwitchToSignup }: AuthDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Welcome back.");
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message.toLowerCase().includes("invalid login")) {
        toast.error("Incorrect email or password.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-bubble-id="ai_RNbBHWbR"
        data-style-ref="Popup_dialog_"
        className={cn(
          bubbleStyle("Popup_dialog_"),
          "sm:max-w-md border-0 p-0 gap-0 shadow-none [&>button.absolute]:hidden",
        )}
      >
        <div
          data-style-ref="Group_overlay_"
          className={cn(bubbleStyle("Group_overlay_"), "space-y-5")}
        >
          <div data-bubble-id="ai_RNbBHWbT" className="relative space-y-2 text-left">
            <div data-bubble-id="ai_RNbBHWbU" className="pr-10">
              <DialogHeader className="space-y-2 p-0 text-left">
                <DialogTitle
                  data-bubble-id="ai_RNbBHWbV"
                  data-style-ref="Text_heading_2_"
                  className={cn(bubbleStyle("Text_heading_2_"), "text-3xl font-bold tracking-tight")}
                >
                  Welcome back
                </DialogTitle>
                <DialogDescription
                  data-bubble-id="ai_RNbBHWbW"
                  data-style-ref="Text_small_"
                  className={cn(bubbleStyle("Text_small_"), "text-base text-muted-foreground")}
                >
                  Private, AI-powered coaching — not therapy or medical advice
                </DialogDescription>
              </DialogHeader>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-bubble-id="ai_RNbBHWbX"
              data-style-ref="Button_icon_"
              className={cn(bubbleStyle("Button_icon_"), "absolute right-0 top-0 h-8 w-8")}
              onClick={() => onOpenChange(false)}
              aria-label="Close login popup"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div data-bubble-id="ai_RNbBHWbZ" className="space-y-4">
              <div data-bubble-id="ai_RNbBHWba" className="space-y-2">
                <Label
                  htmlFor="login-email"
                  data-bubble-id="ai_RNbBHWbb"
                  data-style-ref="Text_label_"
                  className={bubbleStyle("Text_label_")}
                >
                  Email
                </Label>
                <Input
                  id="login-email"
                  data-bubble-id="ai_RNbBHWbc"
                  data-style-ref="Input_default_"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                  placeholder="you@example.com"
                />
              </div>

              <div data-bubble-id="ai_RNbBHWbd" className="space-y-2">
                <Label
                  htmlFor="login-password"
                  data-bubble-id="ai_RNbBHWbe"
                  data-style-ref="Text_label_"
                  className={bubbleStyle("Text_label_")}
                >
                  Password
                </Label>
                <Input
                  id="login-password"
                  data-bubble-id="ai_RNbBHWbf"
                  data-style-ref="Input_default_"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              data-bubble-id="ai_RNbBHWbg"
              data-style-ref="Button_primary_"
              variant="cta"
              className={cn(bubbleStyle("Button_primary_"), "w-full h-12 text-base")}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div data-bubble-id="ai_RNbBHWbh" className="space-y-3 text-center">
            {onSwitchToSignup && (
              <button
                type="button"
                data-bubble-id="ai_RNbBHWbi"
                data-style-ref="Button_link_"
                className={cn(
                  bubbleStyle("Button_link_"),
                  "text-sm font-semibold text-primary hover:underline",
                )}
                onClick={() => {
                  onOpenChange(false);
                  onSwitchToSignup();
                }}
              >
                New here? Create an account
              </button>
            )}
            <p
              data-bubble-id="ai_RNbBHWbj"
              data-style-ref="Text_disclaimer_"
              className={cn(bubbleStyle("Text_disclaimer_"), "text-xs text-muted-foreground leading-relaxed")}
            >
              Uncloud360 is AI-powered coaching only — not therapy or medical advice. In an emergency,
              call 988 or 911.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
