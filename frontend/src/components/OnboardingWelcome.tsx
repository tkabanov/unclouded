import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

const OnboardingWelcome = ({ onNext, onSkip }: OnboardingWelcomeProps) => (
  <div className="flex flex-1 items-center justify-center px-4 py-12">
    <div className="max-w-xl w-full text-center space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-primary">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="18" r="2" fill="currentColor" />
          </svg>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
          Welcome. Let's understand how you're really doing.
        </h1>
      </div>

      <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
        This isn't a test. It's a way for Uncloud360 to understand how you operate under pressure
        — so your coaching actually fits your life.
      </p>

      <div className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto space-y-3">
        <p>The assessment takes about <span className="font-semibold text-foreground">10 minutes</span>.</p>
        <p>
          Your answers shape your personalized dashboard, coaching tone, and the paths recommended for you.
          You can update your profile anytime as things change.
        </p>
      </div>

      <div className="pt-4 flex flex-col items-center gap-3">
        <Button variant="cta" size="lg" onClick={onNext} className="group">
          Get started
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Skip for now
        </Button>
      </div>
    </div>
  </div>
);

export default OnboardingWelcome;
