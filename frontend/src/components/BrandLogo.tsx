import { cn } from "@/lib/utils";
import logoIcon from "@/assets/uncloud-icon.png";

const BrandLogo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2.5", className)}>
    <img
      src={logoIcon}
      alt="Uncloud360 logo"
      width={40}
      height={22}
      className="h-9 w-auto"
    />

    <div className="leading-tight">
      <p className="font-bold text-foreground text-lg tracking-tight">Uncloud360</p>
      <p className="text-[11px] text-muted-foreground">AI coaching · not therapy or medical advice</p>
    </div>
  </div>
);

export default BrandLogo;
