const TRAJECTORY_LANGUAGE: Record<string, string> = {
  stabilizing: "Stability is rising. The ground is getting more solid. That took something.",
  rebuilding:
    "Alignment is shifting. The gap between how you are living and what matters to you is closing.",
  gaining_momentum:
    "Performance is building. The execution is starting to match the intention.",
  across_the_board_growth:
    "All three dimensions moved forward. This is what the work looks like.",
  holding_steady:
    "Your scores are holding. Maintenance is underrated — it means you are not losing ground.",
  navigating_difficulty:
    "Some scores shifted down. Hard seasons show up in the data. This is honest information, not failure.",
  mixed_movement:
    "Different dimensions moved in different directions. That is what real life looks like.",
};

export function trajectoryLanguage(type: string | null | undefined): string | null {
  if (!type) return null;
  return TRAJECTORY_LANGUAGE[type] ?? null;
}
