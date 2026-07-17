import type { ModuleDefinition } from "../moduleConfigTypes";
import { singleSelectOptions } from "./questionHelpers";

export const financialModule: ModuleDefinition = {
  slug: "financial",
  displayTitle: "Financial Reality",
  aiShortName: "Financial Reality",
  headline: "The load that affects everything and gets mentioned nowhere",
  sub: "This is practical and private. Five honest questions about money and what it's costing you beyond the financial.",
  sensitivityTier: "standard",
  presentationCopy: "A quick check-in on the layer that affects everything else",
  defaultUnlockDay: 10,
  completeFlagColumn: "moduleFinancialComplete",
  onboardingCompleteFlag: "module_financial_complete",
  estimatedMinutes: 5,
  sideEffects: [],
  questions: [
    {
      id: "fq1",
      prompt: "How would you honestly describe your financial situation right now?",
      kind: "single_select",
      fieldKey: "financialStabilitySignal",
      options: singleSelectOptions([
        { slug: "stable", label: "Stable — income covers needs with some margin and I'm not worried" },
        { slug: "strained", label: "Strained — managing but with real pressure and not much room" },
        { slug: "crisis", label: "In crisis — significant financial stress or instability that affects daily functioning" },
        { slug: "rebuilding", label: "Rebuilding — coming back from a difficult period and beginning to gain traction" },
      ]),
    },
    {
      id: "fq2",
      prompt: "How much mental bandwidth is financial stress consuming day to day?",
      kind: "single_select",
      fieldKey: "financialAnxietyLevel",
      options: singleSelectOptions([
        { slug: "low", label: "Minimal — money is not a significant source of mental noise for me right now" },
        { slug: "medium", label: "Moderate — it's there in the background most days and takes real bandwidth" },
        { slug: "high", label: "Significant — financial worry is a daily presence that affects my decisions and mood" },
      ]),
    },
    {
      id: "fq3",
      prompt: "How much control do you feel you have over your financial situation?",
      kind: "single_select",
      fieldKey: "financialAgencyLevel",
      options: singleSelectOptions([
        { slug: "in_control", label: "Real control — I'm making intentional choices and can see a path forward" },
        { slug: "somewhat", label: "Some — I'm making choices but external forces limit what I can actually do" },
        { slug: "little", label: "Very little — I feel like I'm reacting more than choosing" },
        { slug: "none", label: "None — my financial situation feels like it's happening to me completely" },
      ]),
    },
    {
      id: "fq4",
      prompt: "What is the primary source of financial stress for you right now? Select the most accurate.",
      kind: "single_select",
      fieldKey: null,
      options: singleSelectOptions([
        { slug: "debt", label: "Debt — the weight of what I owe is significant" },
        { slug: "income", label: "Income instability — inconsistent or insufficient income" },
        { slug: "unexpected", label: "Unexpected expense or crisis — something disrupted what was working" },
        { slug: "savings", label: "Lack of savings — no buffer and it creates anxiety about the future" },
        { slug: "comparison", label: "Financial comparison — I feel behind where I think I should be" },
        { slug: "not_financial", label: "It's not really financial — this module may not apply much to me right now" },
      ]),
    },
    {
      id: "fq5",
      prompt: "How does financial stress most affect you day to day?",
      kind: "single_select",
      fieldKey: null,
      options: singleSelectOptions([
        { slug: "decisions", label: "It affects my decisions — I can't think clearly about money" },
        { slug: "relationships", label: "It creates strain in my relationships — money tension is relational tension" },
        { slug: "sleep", label: "It shows up in my body — sleep, tension, physical symptoms" },
        { slug: "shame", label: "It creates shame or a sense of failure I carry" },
        { slug: "avoidance", label: "I avoid looking at it — the avoidance costs more than the actual situation" },
        { slug: "minimal", label: "It doesn't significantly affect my daily functioning right now" },
      ]),
    },
  ],
};
