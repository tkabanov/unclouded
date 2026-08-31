export type BookingStep = "chooseCoach" | "chooseSlot";

export type BookingMode = "manual" | "rebook" | "autoMatch";

export type BookingErrorAction = "chooseCoach" | "pickTime" | "reloadSlots";

export type BookingError = {
  code: string;
  message: string;
  action: BookingErrorAction;
};

export type PreviousCoachAvailability = {
  hasSlots: boolean;
  unavailableReason?: "inactive" | "no_slots";
};

export const SLOT_LOOKAHEAD_DAYS = 14;
