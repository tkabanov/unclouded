import { cn } from "@/lib/utils";
import logoIcon from "@/assets/uncloud-icon.png";

const BrandLogo = ({ className }: { className?: string }) => (
  <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
    <img
      src={logoIcon}
      alt="Uncloud360 logo"
      width={40}
      height={22}
      className="h-9 w-auto shrink-0"
    />

    <div className="min-w-0 leading-tight">
      <p className="truncate font-bold text-foreground text-lg tracking-tight">Uncloud360</p>
      <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
        AI coaching · not therapy or medical advice
      </p>
    </div>
  </div>
);

export default BrandLogo;
