import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";
import {
  getSignUpErrorKind,
  getSignUpErrorMessage,
  signUpWithEmailPassword,
} from "@/lib/auth/credentialsApi";
import {
  buildPendingAttributionProperties,
  trackProductEvent,
} from "@/lib/analytics/productAnalytics";
import {
  buildSignupPlanMetadata,
  clearPendingSignupPlan,
  peekPendingSignupPlan,
} from "@/lib/share/planAttribution";
import {
  buildSignupReferralMetadata,
  clearPendingReferralCode,
  peekPendingReferralCode,
} from "@/lib/share/referralAttribution";
import {
  buildSignupUtmMetadata,
  clearPendingUtmParams,
  peekPendingUtmParams,
} from "@/lib/share/utmAttribution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

const signupSchema = z
  .object({
    email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface SignupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToLogin?: () => void;
}

const SignupPopup = ({ open, onOpenChange, onSuccess, onSwitchToLogin }: SignupPopupProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = signupSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const referralCode = peekPendingReferralCode();
    const utmParams = peekPendingUtmParams();
    const signupPlan = peekPendingSignupPlan();
    const metadata = {
      ...buildSignupReferralMetadata(referralCode),
      ...buildSignupUtmMetadata(utmParams),
      ...buildSignupPlanMetadata(signupPlan),
    };
    try {
      await signUpWithEmailPassword(
        parsed.data.email,
        parsed.data.password,
        Object.keys(metadata).length > 0 ? metadata : undefined,
      );
      clearPendingReferralCode();
      clearPendingUtmParams();
      clearPendingSignupPlan();
      trackProductEvent("signup_completed", buildPendingAttributionProperties());
      toast.success("Account created — let's get you set up.");
      handleOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(getSignUpErrorMessage(err));
      if (getSignUpErrorKind(err) === "already_registered" && onSwitchToLogin) {
        handleOpenChange(false);
        onSwitchToLogin();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-bubble-id="ai_RNbBHWbk"
        data-style-ref="Popup_dialog_"
        className={cn(
          bubbleStyle("Popup_dialog_"),
          "sm:max-w-lg border-0 p-0 gap-0 shadow-none max-h-[90vh] overflow-y-auto [&>button.absolute]:hidden",
        )}
      >
        <div
          data-style-ref="Group_overlay_"
          className={cn(bubbleStyle("Group_overlay_"), "space-y-5")}
        >
          <div data-bubble-id="ai_RNbBHWbm" className="relative space-y-2 text-left">
            <div data-bubble-id="ai_RNbBHWbn" className="pr-10">
              <DialogHeader className="space-y-2 p-0 text-left">
                <DialogTitle
                  data-bubble-id="ai_RNbBHWbo"
                  data-style-ref="Text_heading_2_"
                  className={cn(bubbleStyle("Text_heading_2_"), "text-3xl font-bold tracking-tight")}
                >
                  Create your account
                </DialogTitle>
                <DialogDescription
                  data-bubble-id="ai_RNbBHWbp"
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
              data-bubble-id="ai_RNbBHWbq"
              data-style-ref="Button_icon_"
              className={cn(bubbleStyle("Button_icon_"), "absolute right-0 top-0 h-8 w-8")}
              onClick={() => handleOpenChange(false)}
              aria-label="Close signup popup"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            <div data-bubble-id="ai_RNbBHWbs" className="space-y-4">
              <div data-bubble-id="ai_RNbBHWbw" className="space-y-2">
                <Label
                  htmlFor="signup-email"
                  data-bubble-id="ai_RNbBHWbx"
                  data-style-ref="Text_label_"
                  className={bubbleStyle("Text_label_")}
                >
                  Email
                </Label>
                <Input
                  id="signup-email"
                  data-bubble-id="ai_RNbBHWby"
                  data-style-ref="Input_default_"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <div data-bubble-id="ai_RNbBHWbz" className="space-y-2">
                <Label
                  htmlFor="signup-password"
                  data-bubble-id="ai_RNbBHWcA"
                  data-style-ref="Text_label_"
                  className={bubbleStyle("Text_label_")}
                >
                  Password
                </Label>
                <PasswordInput
                  id="signup-password"
                  data-bubble-id="ai_RNbBHWcB"
                  data-style-ref="Input_default_"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password" className={bubbleStyle("Text_label_")}>
                  Confirm password
                </Label>
                <PasswordInput
                  id="signup-confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                data-bubble-id="ai_RNbBHWdM"
                data-style-ref="Button_primary_"
                variant="cta"
                className={cn(bubbleStyle("Button_primary_"), "w-full h-12 text-base")}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </div>
          </form>

          <div data-bubble-id="ai_RNbBHWdN" className="space-y-3 text-center">
            {onSwitchToLogin && (
              <button
                type="button"
                data-bubble-id="ai_RNbBHWdO"
                data-style-ref="Button_link_"
                className={cn(
                  bubbleStyle("Button_link_"),
                  "text-sm font-semibold text-primary hover:underline",
                )}
                onClick={() => {
                  handleOpenChange(false);
                  onSwitchToLogin();
                }}
              >
                Already have an account? Sign in
              </button>
            )}
            <p
              data-bubble-id="ai_RNbBHWdP"
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

export default SignupPopup;
