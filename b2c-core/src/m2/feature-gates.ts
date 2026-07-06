export interface M2GateState {
  materializeEnabled: boolean;
  acceptanceEnabled: boolean;
}

export function readM2GateState(): M2GateState {
  const enabled = process.env.B2C_ENABLE_M2 === "1";
  return {
    materializeEnabled: enabled,
    acceptanceEnabled: enabled,
  };
}
