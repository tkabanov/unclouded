import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import CrisisBar from "@/components/CrisisBar";
import { useAuth } from "@/hooks/useAuth";
import { usePasswordRecoveryReady } from "@/hooks/usePasswordRecoveryReady";
import { completePasswordRecovery, PasswordRecoveryError } from "@/lib/auth/passwordResetApi";
import { bubbleStyle } from "@/lib/bubbleStyles";
import { toast } from "sonner";

const resetSchema = z
  .object({
    password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ResetPassword = () => {
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
  const recoveryReady = usePasswordRecoveryReady();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = resetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      await completePasswordRecovery(parsed.data.password);
      await signOut();
      toast.success("Password updated — you can sign in with your new password.");
      navigate("/");
    } catch (err: unknown) {
      if (err instanceof PasswordRecoveryError) {
        toast.error(err.message);
      } else {
        const message = err instanceof Error ? err.message : "Failed to reset password";
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loading = authLoading || submitting || recoveryReady === "loading";

  if (recoveryReady === "invalid") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <CrisisBar />

        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center gap-8 px-5 py-[100px]">
          <h1
            data-style-ref="Text_heading_1_"
            className={`text-center ${bubbleStyle("Text_heading_1_")}`}
          >
            Reset link invalid or expired
          </h1>

          <div className="flex w-full flex-col gap-6 rounded-lg border border-border p-6">
            <p className="text-base text-muted-foreground">
              This password reset link is no longer valid. Request a new link from the sign-in page.
            </p>
            <Button
              asChild
              data-style-ref="Button_primary_"
              variant="cta"
              className={`h-12 w-full text-base ${bubbleStyle("Button_primary_")}`}
            >
              <Link to="/">Back to sign in</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CrisisBar />

      <main
        className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center gap-8 px-5 py-[100px]"
      >
        <h1
          data-style-ref="Text_heading_1_"
          className={`text-center ${bubbleStyle("Text_heading_1_")}`}
        >
          Reset your password
        </h1>

        <div
          className="flex w-full flex-col gap-6 rounded-lg border border-border p-6"
        >
          <form
            id="reset-password-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="reset-password" className="text-base">
                New password
              </Label>
              <PasswordInput
                data-style-ref="Input_default_"
                id="reset-password"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={bubbleStyle("Input_default_")}
                placeholder="********"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="reset-confirm-password" className="text-base">
                Confirm new password
              </Label>
              <PasswordInput
                data-style-ref="Input_default_"
                id="reset-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={bubbleStyle("Input_default_")}
                placeholder="********"
                disabled={loading}
              />
            </div>
          </form>

          <Button
            data-style-ref="Button_primary_"
            type="submit"
            form="reset-password-form"
            variant="cta"
            className={`h-12 w-full text-base ${bubbleStyle("Button_primary_")}`}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
