import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OnboardingNameProps {
  onNext: (firstName: string) => void;
}

const OnboardingName = ({ onNext }: OnboardingNameProps) => {
  const [name, setName] = useState("");

  const trimmed = name.trim();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Step 1 of 12
        </p>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            What should we call you?
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto">
            This is how your AI coach will address you throughout your sessions.
          </p>
        </div>

        <div className="max-w-sm mx-auto">
          <Input
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed) onNext(trimmed);
            }}
            className="text-center text-lg h-12"
            autoFocus
          />
        </div>

        <div className="pt-2">
          <Button
            variant="cta"
            size="lg"
            onClick={() => onNext(trimmed)}
            disabled={!trimmed}
            className="group"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingName;
