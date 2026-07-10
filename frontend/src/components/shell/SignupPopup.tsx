import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";
import {
  getSignUpErrorKind,
  getSignUpErrorMessage,
  signUpWithEmailPassword,
} from "@/lib/auth/credentialsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import {
  CUSTOMER_PILLAR_LABELS,
  CUSTOMER_PILLAR_ORDER,
  type CustomerPillarSlug,
} from "@/lib/enums/customerProfile";

const step1Schema = z.object({
  name: z.string().trim().min(1, { message: "Enter your name" }).max(100),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

const step2Schema = z.object({
  timezone: z.string().min(1, { message: "Select a timezone" }),
  primaryMode: z.string().min(1, { message: "Select a coaching mode" }),
  subMode: z.string().min(1, { message: "Select a sub-mode" }),
});

const SUB_MODES: Record<CustomerPillarSlug, string[]> = {
  emotional: ["Relationships", "Grief & Loss", "General"],
  professional: ["Executive Coaching", "Career Growth", "Stress & Burnout"],
  health: ["General", "Recovery", "Health & Habits"],
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const CHECKIN_OPTIONS = ["Daily", "Every few days", "Weekly", "As needed"];

interface SignupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSwitchToLogin?: () => void;
}

const SignupPopup = ({ open, onOpenChange, onSuccess, onSwitchToLogin }: SignupPopupProps) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("");
  const [primaryMode, setPrimaryMode] = useState<CustomerPillarSlug | "">("");
  const [subMode, setSubMode] = useState("");
  const [goals, setGoals] = useState("");
  const [preferences, setPreferences] = useState("");
  const [checkinFrequency, setCheckinFrequency] = useState("");

  const resetForm = () => {
    setStep(0);
    setName("");
    setEmail("");
    setPassword("");
    setTimezone("");
    setPrimaryMode("");
    setSubMode("");
    setGoals("");
    setPreferences("");
    setCheckinFrequency("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const advanceFromStep1 = () => {
    const parsed = step1Schema.safeParse({ name, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setStep(1);
  };

  const advanceFromStep2 = () => {
    const parsed = step2Schema.safeParse({ timezone, primaryMode, subMode });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) return;

    setLoading(true);
    try {
      await signUpWithEmailPassword(email, password, {
        full_name: name.trim(),
        timezone,
        primary_pillar: primaryMode,
        sub_mode: subMode,
        goals: goals.trim(),
        preferences: preferences.trim(),
        checkin_frequency: checkinFrequency,
      });
      toast.success("Account created \u2014 let's get you set up.");
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
                  Private, AI-powered coaching \u2014 not therapy or medical advice
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div data-bubble-id="ai_RNbBHWbs" className="space-y-4">
              {step === 0 && (
                <div className="space-y-4">
                  <div data-bubble-id="ai_RNbBHWbt" className="space-y-2">
                    <Label
                      htmlFor="signup-name"
                      data-bubble-id="ai_RNbBHWbu"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Full name
                    </Label>
                    <Input
                      id="signup-name"
                      data-bubble-id="ai_RNbBHWbv"
                      data-style-ref="Input_default_"
                      autoComplete="name"
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                      placeholder="Your name"
                    />
                  </div>

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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                      placeholder="you@example.com"
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
                    <Input
                      id="signup-password"
                      data-bubble-id="ai_RNbBHWcB"
                      data-style-ref="Input_default_"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(bubbleStyle("Input_default_"), "h-12 text-base")}
                      placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                    />
                  </div>

                  <Button
                    type="button"
                    data-style-ref="Button_primary_"
                    variant="cta"
                    className={cn(bubbleStyle("Button_primary_"), "w-full h-12 text-base")}
                    onClick={advanceFromStep1}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div data-bubble-id="ai_RNbBHWcC" className="space-y-2">
                    <Label
                      htmlFor="signup-timezone"
                      data-bubble-id="ai_RNbBHWcD"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Timezone
                    </Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger
                        id="signup-timezone"
                        data-bubble-id="ai_RNbBHWcE"
                        data-style-ref="Dropdown_default_"
                        className={cn(bubbleStyle("Dropdown_default_"), "h-12")}
                      >
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div data-bubble-id="ai_RNbBHWcN" className="space-y-2">
                    <Label
                      htmlFor="signup-mode"
                      data-bubble-id="ai_RNbBHWcO"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Primary coaching mode
                    </Label>
                    <Select
                      value={primaryMode}
                      onValueChange={(v) => {
                        setPrimaryMode(v as CustomerPillarSlug);
                        setSubMode("");
                      }}
                    >
                      <SelectTrigger
                        id="signup-mode"
                        data-bubble-id="ai_RNbBHWcP"
                        data-style-ref="Dropdown_default_"
                        className={cn(bubbleStyle("Dropdown_default_"), "h-12")}
                      >
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_PILLAR_ORDER.map((slug) => (
                          <SelectItem key={slug} value={slug}>
                            {CUSTOMER_PILLAR_LABELS[slug]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div data-bubble-id="ai_RNbBHWcT" className="space-y-2">
                    <Label
                      htmlFor="signup-submode"
                      data-bubble-id="ai_RNbBHWcU"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Sub-mode
                    </Label>
                    <Select value={subMode} onValueChange={setSubMode} disabled={!primaryMode}>
                      <SelectTrigger
                        id="signup-submode"
                        data-bubble-id="ai_RNbBHWcV"
                        data-style-ref="Dropdown_default_"
                        className={cn(bubbleStyle("Dropdown_default_"), "h-12")}
                      >
                        <SelectValue placeholder="Select sub-mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {(primaryMode ? SUB_MODES[primaryMode] : []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      data-style-ref="Button_primary_"
                      variant="cta"
                      className={cn(bubbleStyle("Button_primary_"), "flex-1 h-12")}
                      onClick={advanceFromStep2}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div data-bubble-id="ai_RNbBHWcu" className="space-y-2">
                    <Label
                      htmlFor="signup-goals"
                      data-bubble-id="ai_RNbBHWcv"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Goals
                    </Label>
                    <Textarea
                      id="signup-goals"
                      data-bubble-id="ai_RNbBHWcx"
                      data-style-ref="MultiLineInput_default_"
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      className={cn(bubbleStyle("MultiLineInput_default_"), "min-h-[96px]")}
                      placeholder="What would you like to work on?"
                    />
                  </div>

                  <div data-bubble-id="ai_RNbBHWcy" className="space-y-2">
                    <Label
                      htmlFor="signup-preferences"
                      data-bubble-id="ai_RNbBHWcz"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Preferences
                    </Label>
                    <Select value={preferences} onValueChange={setPreferences}>
                      <SelectTrigger
                        id="signup-preferences"
                        data-bubble-id="ai_RNbBHWdA"
                        data-style-ref="Dropdown_default_"
                        className={cn(bubbleStyle("Dropdown_default_"), "h-12")}
                      >
                        <SelectValue placeholder="Coaching style preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct and action-oriented</SelectItem>
                        <SelectItem value="reflective">Reflective and exploratory</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div data-bubble-id="ai_RNbBHWdG" className="space-y-2">
                    <Label
                      htmlFor="signup-checkin"
                      data-bubble-id="ai_RNbBHWdH"
                      data-style-ref="Text_label_"
                      className={bubbleStyle("Text_label_")}
                    >
                      Check-in frequency
                    </Label>
                    <Select value={checkinFrequency} onValueChange={setCheckinFrequency}>
                      <SelectTrigger
                        id="signup-checkin"
                        data-bubble-id="ai_RNbBHWdI"
                        data-style-ref="Dropdown_default_"
                        className={cn(bubbleStyle("Dropdown_default_"), "h-12")}
                      >
                        <SelectValue placeholder="How often to check in" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHECKIN_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      type="submit"
                      data-bubble-id="ai_RNbBHWdM"
                      data-style-ref="Button_primary_"
                      variant="cta"
                      className={cn(bubbleStyle("Button_primary_"), "flex-1 h-12 text-base")}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                  </div>
                </div>
              )}
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
              Uncloud360 is AI-powered coaching only \u2014 not therapy or medical advice. In an emergency,
              call 988 or 911.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupPopup;
