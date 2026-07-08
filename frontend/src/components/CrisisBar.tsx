import { Phone } from "lucide-react";

const CrisisBar = () => (
  <div className="w-full bg-primary text-primary-foreground py-2.5 px-4 text-center text-sm font-medium tracking-wide">
    <span className="inline-flex items-center gap-2 flex-wrap justify-center">
      <Phone className="h-3.5 w-3.5" />
      In a crisis? Call <a href="tel:988" className="underline font-bold">988</a> or text <span className="font-bold">HOME</span> to <a href="sms:741741" className="underline font-bold">741741</a>
      <span className="mx-1">—</span>
      Uncloud360 is coaching only, not emergency care.
    </span>
  </div>
);

export default CrisisBar;
