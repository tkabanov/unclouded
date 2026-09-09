import type { ModuleAnswerFieldKey } from "../moduleFieldKeys";
import type { ModuleSlug } from "../moduleSlugs";

export type ModuleResultsCopy = {
  headline: string;
  lead: string;
  /** Answer slug (or stringified value for numeric/boolean fields) -> one qualitative sentence. */
  reflections: Partial<Record<ModuleAnswerFieldKey, Record<string, string>>>;
  /** 2-4 bullets derived from Build Brief §9 "WHAT THIS UNLOCKS" for this module. */
  whatThisUnlocks: string[];
};

export const MODULE_RESULTS_CONTENT: Record<ModuleSlug, ModuleResultsCopy> = {
  identity: {
    headline: "Your Identity Lens results",
    lead: "Who you believe you are shapes everything else — here's what came through in your answers.",
    reflections: {
      identitySelfWorthSource: {
        performance_based: "Right now your sense of worth tends to track with what you achieve and produce.",
        approval_based: "You tend to feel good about yourself when you're validated by the people around you.",
        inherent: "Your sense of worth holds steady — it doesn't move much with what you do or what others think.",
        unclear: "Where your worth comes from isn't fully clear to you yet, and that's worth paying attention to.",
      },
      identityNarrativeType: {
        growth: "When setbacks hit, you tend to treat them as information you can learn from and adjust to.",
        fixed: "Setbacks tend to confirm a belief you already hold about your limits.",
        mixed: "Your response to setbacks varies — sometimes you recover the story, sometimes it sticks.",
        unclear: "You're not yet sure what story takes over when things go wrong.",
      },
      identityRoleFusionScore: {
        "1": "Who you are feels separate from what you do — your role isn't carrying much of your identity.",
        "2": "Your role is part of you, but it isn't most of you.",
        "3": "Your role is a significant part of how you see yourself right now.",
        "4": "You're struggling to separate who you are from what you do.",
        "5": "Right now you don't know who you are outside of this role.",
      },
      identityPressureOrigin: {
        self_set: "The standards you hold yourself to are ones you built — they reflect your own values.",
        family: "Your standards trace back to your upbringing — often unstated, deeply felt expectations.",
        culture: "Your standards were shaped by your environment — career norms, peers, social comparison.",
        survival: "Your standards formed as a way to stay safe, be loved, or manage hard circumstances.",
        unclear: "Where your standards came from isn't clear yet — they're just the water you swim in.",
      },
    },
    whatThisUnlocks: [
      "Gidget shifts from coaching your behavior to coaching the belief underneath it.",
      "Reframes move from tactical to identity-level.",
      "Self-worth source now shapes how goals are framed and how setbacks are addressed.",
      "Confidence Architecture path unlocked.",
    ],
  },
  relational: {
    headline: "Your Relational Blueprint results",
    lead: "How you connect — and how you protect yourself — based on what you shared.",
    reflections: {
      attachmentSignal: {
        anxious: "When a relationship feels uncertain, your instinct is to reach out and resolve it quickly.",
        avoidant: "When a relationship feels strained, your instinct is to create space and process on your own.",
        secure: "When things feel uncertain, you tend to stay present and trust it can work through.",
        disorganized: "Your response to relational strain varies unpredictably — sometimes reaching out, sometimes shutting down.",
      },
      conflictPattern: {
        avoid: "In real conflict, you tend to minimize it or let it go without full resolution.",
        escalate: "In real conflict, you tend to engage directly — sometimes more intensely than you intended.",
        collapse: "In real conflict, you tend to agree or apologize quickly to restore peace, even when you don't mean it.",
        engage: "In real conflict, you tend to stay present with the discomfort and work toward resolution.",
      },
      supportSeekingCapacity: {
        high: "Asking for help feels natural to you — you reach out and can receive support well.",
        medium: "Asking for help is possible but takes real effort for you.",
        low: "Asking for help is very difficult — you'd rather handle things alone.",
        blocked: "Asking for help feels close to impossible — like failure or real risk.",
      },
      intimacySafetyLevel: {
        safe: "In your closest relationship, you feel very safe — fully yourself without editing.",
        mixed: "In your closest relationship, you feel mostly safe but hold some things back.",
        unsafe: "In your closest relationship, you feel mostly unsafe — like you need to manage how you appear.",
        absent: "Right now you don't have a primary close relationship in your life.",
      },
    },
    whatThisUnlocks: [
      "Gidget adjusts directness based on your attachment signal.",
      "Avoidant patterns get more space; anxious patterns get more reassurance before challenge.",
      "Boundary work and communication coaching activated.",
      "The system stops assuming a support network exists when yours is thin.",
    ],
  },
  history: {
    headline: "Your History & Context results",
    lead: "What shaped you is still shaping you — held gently, and entirely yours.",
    reflections: {
      traumaActivationLevel: {
        low: "Your past feels largely processed and isn't especially present in how you function now.",
        present: "There are things from your past that still influence you in ways you notice.",
        active: "There are experiences that are still very much alive in how you respond and function.",
        unsure: "You haven't thought about your past in these terms before, and that's okay.",
      },
      griefLoadLevel: {
        low: "What you've lost feels relatively integrated or distant right now.",
        moderate: "There are losses you haven't fully sat with, and they still surface sometimes.",
        high: "Grief feels like a layer underneath many other things for you right now.",
        unsure: "This isn't a lens you've used to look at your life before — and now you have.",
      },
      priorSupportType: {
        therapy: "Therapy or counseling has been part of your path, and it helped.",
        therapy_mixed: "You've tried therapy or counseling, with mixed or limited results.",
        coaching: "Coaching or similar support has helped you before.",
        coaching_mixed: "You've tried coaching or similar support, with limited results.",
        none: "You haven't worked with professional support before.",
        open: "You haven't worked with support formally, but you're open to it.",
      },
      significantEvents12mo: {
        major_loss: "The past 12 months included the death of someone significant or the end of a major relationship.",
        health_event: "The past 12 months included a significant health diagnosis, illness, or injury.",
        job_change: "The past 12 months included a major career change, job loss, or financial disruption.",
        living_change: "The past 12 months included a significant move or housing change.",
        family_change: "The past 12 months included a birth, family crisis, or major family change.",
        none: "The past 12 months have been relatively stable for you.",
      },
    },
    whatThisUnlocks: [],
  },
  financial: {
    headline: "Your Financial Reality results",
    lead: "The load that affects everything and gets mentioned nowhere — named honestly.",
    reflections: {
      financialStabilitySignal: {
        stable: "Right now your income covers your needs with some margin, and you're not carrying much worry about it.",
        strained: "You're managing, but with real financial pressure and not much room.",
        crisis: "You're navigating significant financial stress or instability that affects your daily functioning.",
        rebuilding: "You're coming back from a difficult financial period and starting to gain traction.",
      },
      financialAnxietyLevel: {
        low: "Money isn't taking up much of your mental bandwidth right now.",
        medium: "Financial stress sits in the background most days and takes real bandwidth.",
        high: "Financial worry is a daily presence that affects your decisions and mood.",
      },
      financialAgencyLevel: {
        in_control: "You're making intentional financial choices and can see a path forward.",
        somewhat: "You're making financial choices, but external forces limit what you can actually do.",
        little: "You feel like you're reacting to your finances more than choosing.",
        none: "Your financial situation feels like it's happening to you, not something you're steering.",
      },
    },
    whatThisUnlocks: [
      "Gidget removes resource-intensive recommendations when financial load is high.",
      "Financial stress acknowledgment is added to session language.",
      "Financial Stress Navigation path surfaced.",
      "Practical prioritization coaching emphasized over aspirational goal work.",
    ],
  },
  body: {
    headline: "Your Body's Story results",
    lead: "What your body is carrying and trying to tell you — not about fitness, about signal.",
    reflections: {
      sleepQualitySignal: {
        good: "You're sleeping well and waking rested most days.",
        fair: "Your nights are inconsistent — sometimes restful, sometimes not.",
        poor: "Your sleep has been disrupted, insufficient, or consistently unrestorative.",
      },
      chronicPainFlag: {
        yes_significant: "Chronic pain or a physical condition significantly shapes how you move through most days.",
        yes_manageable: "You're living with a physical condition that's present but manageable.",
        sometimes: "You experience intermittent flare-ups or symptoms that vary.",
        no: "Physical health isn't a significant daily challenge for you right now.",
        true: "Physical health is currently shaping how you move through your days.",
        false: "Physical health isn't a significant daily challenge for you right now.",
      },
      hormonalContextType: {
        yes_perimenopause: "You're navigating perimenopause or menopause, and it's affecting how you function.",
        yes_postpartum: "You're within 18 months postpartum, and it's part of your current context.",
        yes_other: "You're navigating a significant hormonal or health transition right now.",
        no: "You're not in a significant hormonal transition right now.",
      },
      bodyRelationship: {
        connected: "You listen to your body, and it generally feels like an ally.",
        neutral: "Your body is just there for you — you don't think about it much.",
        disconnected: "You feel cut off from physical signals or awareness right now.",
        conflicted: "There's tension, judgment, or frustration in how you relate to your body.",
      },
      substancePatternSignal: {
        none: "Alcohol or substance use isn't a relevant concern for you right now.",
        managed: "You use alcohol or similar substances and feel in control of it.",
        watching: "You've noticed your use creeping up and you're keeping an eye on it.",
        concerning: "You're aware your relationship with alcohol or substances isn't serving you well.",
      },
    },
    whatThisUnlocks: [
      "Somatic check-ins added to sessions.",
      "Energy expectations calibrated to your actual physical baseline.",
      "Hormonal context informs how Gidget interprets energy crashes and mood.",
      "Body-based grounding practices added, with a path surfaced when your body relationship is disconnected.",
    ],
  },
  meaning: {
    headline: "Your What Holds You results",
    lead: "What gives you meaning, and what you reach for when things get hard.",
    reflections: {
      purposeClarity: {
        clear: "You know what you're here for, and it guides how you live most days.",
        searching: "You sense there's something more, and you're still finding it.",
        lost: "You've lost the thread of what your life is for right now.",
        rebuilding: "You had clarity before, and you're working to reconnect with it.",
      },
      spiritualFrameworkPresent: {
        true: "You have a spiritual or meaning-making framework you draw on.",
        false: "You're not currently drawing on a spiritual or faith framework.",
      },
      spiritualFrameworkType: {
        active: "Your spiritual or faith framework is active and real in your daily life.",
        background: "Your spiritual or faith framework is present, more in the background than the foreground.",
        complicated: "Your relationship to the framework you grew up with has changed significantly.",
        no: "You don't have a spiritual or faith framework right now.",
        exploring: "You're actively working through what you believe right now.",
      },
      belongingLevel: {
        strong: "You have real belonging to something larger than yourself, and it matters to how you function.",
        moderate: "You have some connection to something larger, but it doesn't feel deep or consistent.",
        weak: "You feel mostly unconnected from anything larger than your immediate life.",
        absent: "You feel genuinely isolated from any sense of community or shared purpose right now.",
      },
      pressureReach: {
        faith: "When things get hard, you reach for faith or spiritual practice.",
        people: "When things get hard, you reach for people — connection, someone who knows you.",
        work: "When things get hard, you reach for work or productivity.",
        substances: "When things get hard, you reach for substances or numbing to take the edge off.",
        avoidance: "When things get hard, you tend to pull back and hope it passes.",
        solitude: "When things get hard, you go inward and process alone.",
      },
    },
    whatThisUnlocks: [
      "Purpose language incorporated into session framing.",
      "Goals connected to meaning.",
      "Faith-aware coaching activated where relevant.",
      "Community building surfaced as a coaching goal when belonging is weak or absent.",
      "Purpose Discovery and Life Direction Reset paths surfaced.",
    ],
  },
};
