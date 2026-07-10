import { useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { requestPasswordResetEmail } from "@/lib/auth/passwordResetApi";
import {
  authCredentialsSchema,
  authEmailSchema,
  getSignInErrorMessage,
  signInWithEmailPassword,
} from "@/lib/auth/credentialsApi";
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

const forgotPasswordEmailSchema = authEmailSchema;

type AuthDialogStep = "login" | "forgot-password";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToSignup?: () => void;
}

const PASSWORD_RESET_SENT_MESSAGE =
  "If an account exists for that email, we sent a password reset link.";

const AuthDialog = ({ open, onOpenChange, onSuccess, onSwitchToSignup }: AuthDialogProps) => {
  const [step, setStep] = useState<AuthDialogStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetFormState = () => {
    setStep("login");
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetFormState();
    }
    onOpenChange(nextOpen);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = authCredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailPassword(parsed.data.email, parsed.data.password);
      toast.success("Welcome back.");
      resetFormState();
      onSuccess();
    } catch (err: unknown) {
      toast.error(getSignInErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = forgotPasswordEmailSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetEmail(parsed.data.email);
      toast.success(PASSWORD_RESET_SENT_MESSAGE);
      resetFormState();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isForgotPassword = step === "forgot-password";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
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
          <div className="relative space-y-2 text-left">
            <div className="pr-10">
              <DialogHeader className="space-y-2 p-0 text-left">
                <DialogTitle
                  data-style-ref="Text_heading_2_"
                  className={cn(bubbleStyle("Text_heading_2_"), "text-3xl font-bold tracking-tight")}
                >
                  {isForgotPassword ? "Reset your password" : "Welcome back"}
                </DialogTitle>
                <DialogDescription
                  data-style-ref="Text_small_"
                  className={cn(bubbleStyle("Text_small_"), "text-base text-muted-foreground")}
                >
                  {isForgotPassword
                    ? "Enter your email and we'll send you a reset link."
                    : "Private, AI-powered coaching — not therapy or medical advice"}
                </DialogDescription>
              </DialogHeader>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-style-ref="Button_icon_"
              className={cn(bubbleStyle("Button_icon_"), "absolute right-0 top-0 h-8 w-8")}
              onClick={() => handleOpenChange(false)}
              aria-label="Close login popup"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="forgot-email"
                  data-style-ref="Text_label_"
                  className={bubbleStyle("Text_label_")}
                >
                  Email
                </Label>
                <Input
                  id="forgot-email"
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

              <Button
                type="submit"
                data-style-ref="Button_primary_"
                variant="cta"
                className={cn(bubbleStyle("Button_primary_"), "w-full h-12 text-base")}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>

              <button
                type="button"
                data-style-ref="Button_link_"
                className={cn(
                  bubbleStyle("Button_link_"),
                  "flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline",
                )}
                onClick={() => setStep("login")}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-email"
                    data-style-ref="Text_label_"
                    className={bubbleStyle("Text_label_")}
                  >
                    Email
                  </Label>
                  <Input
                    id="login-email"
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="login-password"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      data-style-ref="Button_link_"
                      className={cn(
                        bubbleStyle("Button_link_"),
                        "text-sm font-semibold text-primary hover:underline",
                      )}
                      onClick={() => setStep("forgot-password")}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    data-style-ref="Input_default_"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                data-style-ref="Button_primary_"
                variant="cta"
                className={cn(bubbleStyle("Button_primary_"), "w-full h-12 text-base")}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          )}

          {!isForgotPassword && (
            <div className="space-y-3 text-center">
              {onSwitchToSignup && (
                <button
                  type="button"
                  data-style-ref="Button_link_"
                  className={cn(
                    bubbleStyle("Button_link_"),
                    "text-sm font-semibold text-primary hover:underline",
                  )}
                  onClick={() => {
                    handleOpenChange(false);
                    onSwitchToSignup();
                  }}
                >
                  New here? Create an account
                </button>
              )}
              <p
                data-style-ref="Text_disclaimer_"
                className={cn(
                  bubbleStyle("Text_disclaimer_"),
                  "text-xs text-muted-foreground leading-relaxed",
                )}
              >
                Uncloud360 is AI-powered coaching only — not therapy or medical advice. In an emergency,
                call 988 or 911.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
