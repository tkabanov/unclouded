import { TIER, type TierSlug } from "@/lib/enums/tier";

export interface PathSession {
  id: string;
  number: number;
  title: string;
  coaching_text: string;
  questions: string[];
  micro_commitment: string;
  micro_commitment_note?: string;
}

export interface CoachingPath {
  slug: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  pillar: "stability" | "performance" | "alignment" | "recovery" | "grief";
  tier: TierSlug;
  subMode?: string;
  duration: string;
  image: string;
  sessions: PathSession[];
}

export { slugifyPathName } from "@/lib/paths/pathsCatalogApi";
