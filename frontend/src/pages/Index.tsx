import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Lightbulb,
  UserCircle2,
  MessageSquare,
  Lock,
  SlidersHorizontal,
  HeartPulse,
  Briefcase,
  Brain,
  Tag,
  Check,
  Building2,
  BarChart3,
  Star,
  Heart,
  Phone,
  MessageCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import CrisisBar from "@/components/CrisisBar";
import AuthDialog from "@/components/AuthDialog";
import SignupPopup from "@/components/shell/SignupPopup";
import HeaderLogoutButton from "@/components/shell/HeaderLogoutButton";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/lib/bubbleStyles";
import { useUserProfile } from "@/lib/userProfile";
import { isSettingsAdminUser } from "@/lib/settings/isSettingsAdminUser";
import { isOnboardingComplete, resolvePostAuthRoute } from "@/lib/userProfile/onboardingStatus";

/* ── shared bits ─────────────────────────────────────── */

function SectionTag({
  icon: Icon,
  children,
  className,
  ...props
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground",
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4 text-primary" />
      {children}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  children,
  highlighted,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <Card
      className={cn(
        "h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        highlighted ? "border-primary/40 ring-1 ring-primary/20 shadow-md" : "border-border"
      )}
    >
      <CardContent className="p-7 space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{children}</p>
      </CardContent>
    </Card>
  );
}

/* ── page ────────────────────────────────────────────── */

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const authenticated = Boolean(user);
  const { profile, loading: profileLoading } = useUserProfile();
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const destination = () => resolvePostAuthRoute(profile);

  const appEntryLabel = isSettingsAdminUser(profile?.roleType)
    ? "Go to Admin Console"
    : isOnboardingComplete(profile)
      ? "Go to Dashboard"
      : "Continue Onboarding";

  const goToApp = () => {
    if (profileLoading) return;
    navigate(destination());
  };

  const start = (mode: "signin" | "signup" = "signup") => {
    if (user) {
      navigate(resolvePostAuthRoute(profile));
      return;
    }
    if (mode === "signin") {
      setSignupOpen(false);
      setLoginOpen(true);
    } else {
      setLoginOpen(false);
      setSignupOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setLoginOpen(false);
    setSignupOpen(false);
    setRedirecting(true);
  };

  // After a successful auth action, wait for the profile to hydrate, then route.
  useEffect(() => {
    if (redirecting && user && !profileLoading) {
      navigate(destination());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirecting, user, profileLoading, profile]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CrisisBar />

      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <BrandLogo />
          <nav
            className="hidden items-center gap-4 md:flex"
            aria-label="Marketing"
          >
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </a>
            <a
              href="#coaching-modes"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Coaching Modes
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <a
              href="#workplace"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Workplace
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {authenticated ? (
              <>
                <Button
                  data-style-ref="Button_primary_"
                  variant="cta"
                  size="sm"
                  disabled={profileLoading}
                  className={bubbleStyle("Button_primary_")}
                  onClick={goToApp}
                >
                  {appEntryLabel}
                </Button>
                <HeaderLogoutButton />
              </>
            ) : (
              <>
                <Button
                  data-style-ref="Button_outline_"
                  variant="outline"
                  size="sm"
                  className={bubbleStyle("Button_outline_")}
                  onClick={() => start("signin")}
                >
                  Log In
                </Button>
                <Button
                  data-style-ref="Button_primary_"
                  variant="cta"
                  size="sm"
                  className={bubbleStyle("Button_primary_")}
                  onClick={() => start("signup")}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section
          data-style-ref="Group_hero_"
          className={cn("relative overflow-hidden", bubbleStyle("Group_hero_"))}
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-[10%] bottom-[-20%] h-[360px] w-[360px] rounded-full bg-accent/40 blur-3xl" />
          </div>
          <div
            className="mx-auto max-w-4xl px-4 py-20 text-center md:py-28 md:px-8"
          >
            <div className="mb-8 flex justify-center">
              <SectionTag
                icon={ShieldCheck}
                data-style-ref="Group_badge_"
                className={bubbleStyle("Group_badge_")}
              >
                Private · AI-Powered · Coaching Only
              </SectionTag>
            </div>
            <h1
              data-style-ref="Text_heading_1_"
              className={bubbleStyle("Text_heading_1_")}
            >
              Find clarity.
              <br />
              <span className="bg-gradient-brand bg-clip-text text-transparent">Move forward.</span>
            </h1>
            <p
              data-style-ref="Text_body_muted_"
              className={cn("mx-auto mt-7 max-w-2xl", bubbleStyle("Text_body_muted_"))}
            >
              Uncloud360 is your private AI coaching companion — helping you grow professionally,
              emotionally, and personally. Not therapy. Not medical advice. Just clear, intelligent
              coaching built around you.
            </p>
            <div
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              {authenticated ? (
                <Button
                  data-style-ref="Button_primary_"
                  variant="cta"
                  size="lg"
                  disabled={profileLoading}
                  className={cn("group w-full sm:w-auto", bubbleStyle("Button_primary_"))}
                  onClick={goToApp}
                >
                  {appEntryLabel}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button
                  data-style-ref="Button_primary_"
                  variant="cta"
                  size="lg"
                  className={cn("group w-full sm:w-auto", bubbleStyle("Button_primary_"))}
                  onClick={() => start("signup")}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
              <Button
                data-style-ref="Button_outline_"
                variant="outline"
                size="lg"
                className={cn("w-full sm:w-auto", bubbleStyle("Button_outline_"))}
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t border-border/60 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-5 flex justify-center">
                <SectionTag icon={Lightbulb}>How It Works</SectionTag>
              </div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Coaching built for real life</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Uncloud360 learns your goals, adapts to your mode, and delivers intelligent coaching —
                all while keeping your data completely private. Your employer never sees your personal
                conversations or journal entries.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <FeatureCard icon={UserCircle2} title="Set your mode">
                Choose your primary coaching focus — Life &amp; Health, Professional, or Emotional — and
                pick a sub-mode that fits where you are right now.
              </FeatureCard>
              <FeatureCard icon={MessageSquare} title="Chat, journal, grow">
                Talk to your AI coach, keep a private journal, complete guided paths, and log daily
                check-ins. Everything adapts to your current focus and history.
              </FeatureCard>
              <FeatureCard icon={Lock} title="Your data stays yours">
                All personal entries are private to you. If your employer sponsors your account, they
                only ever see anonymized, aggregate-level trends — never your individual data.
              </FeatureCard>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-foreground">
                <span className="font-semibold">Coaching only, not therapy or medical advice.</span>{" "}
                Uncloud360's AI is designed to support your growth and resilience — not to diagnose,
                treat, or replace professional mental health care. Crisis resources are always available.
              </p>
            </div>
          </div>
        </section>

        {/* Coaching Modes */}
        <section id="coaching-modes" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-5 flex justify-center">
              <SectionTag icon={SlidersHorizontal}>Coaching Modes</SectionTag>
            </div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              One app, every dimension of growth
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Switch between modes at any time. Your history travels with you — only the focus and tone
              shift to match where you are.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: HeartPulse,
                title: "Life & Health",
                desc: "Build sustainable habits, navigate recovery, manage your wellness journey, and develop the routines that support a fuller life.",
                subs: ["General", "Recovery", "Health & Habits"],
              },
              {
                icon: Briefcase,
                title: "Professional",
                desc: "Accelerate your career, sharpen your executive presence, manage workplace stress, and navigate the complexities of modern professional life.",
                subs: ["Executive Coaching", "Career Growth", "Stress & Burnout"],
                highlighted: true,
              },
              {
                icon: Brain,
                title: "Emotional",
                desc: "Process grief, strengthen your relationships, develop emotional resilience, and build the inner clarity that helps you show up fully in every area of life.",
                subs: ["Relationships", "Grief & Loss", "General"],
              },
            ].map((mode) => (
              <Card
                key={mode.title}
                className={cn(
                  "h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                  mode.highlighted ? "border-primary ring-1 ring-primary/30 shadow-md" : "border-border"
                )}
              >
                <CardContent className="p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                      <mode.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{mode.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{mode.desc}</p>
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-foreground">Sub-modes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mode.subs.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border/60 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-5 flex justify-center">
                <SectionTag icon={Tag}>Pricing</SectionTag>
              </div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Simple, transparent pricing</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Start free. Upgrade when you're ready. All plans include crisis resources and a
                coaching-only AI that respects your privacy.
              </p>
            </div>

            <div className="mt-12 grid items-start gap-6 md:grid-cols-3">
              {/* Free */}
              <Card className="h-full">
                <CardContent className="p-7 space-y-5">
                  <span className="inline-flex rounded-full bg-accent px-4 py-1 text-sm font-semibold text-secondary-foreground">
                    Free
                  </span>
                  <div>
                    <span className="text-4xl font-extrabold text-foreground">$0</span>
                    <span className="text-muted-foreground"> /month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Everything you need to get started with AI coaching.</p>
                  <ul className="space-y-3 pt-1">
                    {["AI coaching chat (limited)", "Daily check-ins & journal", "Free guided paths", "Crisis resources always available"].map(
                      (f) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      )
                    )}
                  </ul>
                  {!authenticated && (
                    <Button
                      data-style-ref="Button_outline_"
                      variant="outline"
                      className={cn("w-full", bubbleStyle("Button_outline_"))}
                      onClick={() => start("signup")}
                    >
                      Get Started Free
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Pro */}
              <Card className="h-full border-transparent bg-primary text-primary-foreground shadow-xl md:-translate-y-3">
                <CardContent className="p-7 space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary-foreground px-3 py-1 text-xs font-bold text-primary">
                      Pro
                    </span>
                    <span className="text-sm font-semibold">Most Popular</span>
                  </div>
                  <div>
                    <span className="text-4xl font-extrabold">$29</span>
                    <span className="opacity-80"> /month</span>
                  </div>
                  <p className="text-sm opacity-90">Deeper coaching, more paths, and richer insights.</p>
                  <ul className="space-y-3 pt-1">
                    {["Unlimited AI coaching chat", "All guided paths & resources", "AI journal reflections", "Advanced insights & milestones", "Priority support"].map(
                      (f) => (
                        <li key={f} className="flex items-center gap-3 text-sm">
                          <Check className="h-4 w-4 shrink-0" />
                          {f}
                        </li>
                      )
                    )}
                  </ul>
                  {!authenticated && (
                    <Button
                      data-style-ref="Button_primary_"
                      className={cn(
                        "w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90",
                        bubbleStyle("Button_primary_"),
                      )}
                      onClick={() => start("signup")}
                    >
                      Start Pro
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Premium */}
              <Card className="h-full">
                <CardContent className="p-7 space-y-5">
                  <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                    Premium
                  </span>
                  <div>
                    <span className="text-4xl font-extrabold text-foreground">$49</span>
                    <span className="text-muted-foreground"> /month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">The most comprehensive coaching experience available.</p>
                  <ul className="space-y-3 pt-1">
                    {["Everything in Pro", "Premium-exclusive paths & content", "Deep personalization engine", "Early access to new features"].map(
                      (f) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {f}
                        </li>
                      )
                    )}
                  </ul>
                  {!authenticated && (
                    <Button
                      data-style-ref="Button_outline_"
                      variant="outline"
                      className={cn("w-full", bubbleStyle("Button_outline_"))}
                      onClick={() => start("signup")}
                    >
                      Start Premium
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Workplace */}
        <section id="workplace" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-5 flex justify-center">
              <SectionTag icon={Building2}>Workplace</SectionTag>
            </div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Coaching as an employee benefit</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Partner with Uncloud360 to give your team private, AI-powered coaching that supports
              resilience, focus, and growth — without compromising individual privacy.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <FeatureCard icon={Lock} title="Total employee privacy">
              Personal conversations, journal entries, and check-ins are completely private. Employers
              never see individual records — guaranteed.
            </FeatureCard>
            <FeatureCard icon={BarChart3} title="Anonymized team insights">
              Leadership receives aggregate wellness trends and engagement metrics — no names, no
              drill-down. Understand your team without surveilling them.
            </FeatureCard>
            <FeatureCard icon={Star} title="Pro access for your whole team">
              Workplace-linked employees automatically receive Pro-tier access to all coaching modes,
              guided paths, journal AI reflections, and advanced insights.
            </FeatureCard>
          </div>

          {!authenticated && (
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                data-style-ref="Button_primary_"
                variant="cta"
                className={bubbleStyle("Button_primary_")}
                onClick={() => start("signup")}
              >
                Contact Us About Workplace
              </Button>
              <Button
                data-style-ref="Button_outline_"
                variant="outline"
                className={bubbleStyle("Button_outline_")}
                onClick={() => start("signup")}
              >
                Request a Demo
              </Button>
            </div>
          )}
        </section>

        {/* Crisis resources */}
        <section className="bg-accent/40">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center md:px-8">
            <Heart className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-primary md:text-3xl">
              Crisis resources are always free and always available
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              Uncloud360 is AI coaching only — not therapy, not emergency care. If you or someone you
              know is in crisis, please reach out to a professional immediately.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Phone, title: "988 Suicide & Crisis Lifeline", action: "Call or text 988", note: "Available 24/7, free and confidential", href: "tel:988" },
                { icon: MessageCircle, title: "Crisis Text Line", action: "Text HOME to 741741", note: "Free 24/7 crisis counseling via text", href: "sms:741741" },
                { icon: Plus, title: "SAMHSA Helpline", action: "1-800-662-4357", note: "Substance use & mental health referrals", href: "tel:1-800-662-4357" },
              ].map((c) => (
                <Card key={c.title} className="h-full">
                  <CardContent className="p-6 text-center space-y-2">
                    <c.icon className="mx-auto h-6 w-6 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    <a href={c.href} className="block text-sm font-bold text-primary hover:underline">
                      {c.action}
                    </a>
                    <p className="text-xs text-muted-foreground">{c.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center md:flex-row md:px-8 md:text-left">
          <BrandLogo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Uncloud360. AI coaching only — not therapy or medical advice.
          </p>
        </div>
      </footer>

      <AuthDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={handleAuthSuccess}
        onSwitchToSignup={() => setSignupOpen(true)}
      />
      <SignupPopup
        open={signupOpen}
        onOpenChange={setSignupOpen}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={() => setLoginOpen(true)}
      />
    </div>
  );
};

export default Index;
