import type {
  TechnicalDirection,
  TechnicalHorizon,
  TechnicalOutcomeResult,
  TechnicalSignalStatus,
  TechnicalSignalType,
  TechnicalTimeframe,
} from "@/types/technical-signal";

export const technicalSignalMessageKeys = {
  status: (status: TechnicalSignalStatus) => `technical.status.${status}`,
  type: (signalType: TechnicalSignalType) => `technical.type.${signalType}`,
  timeframe: (timeframe: TechnicalTimeframe) => `technical.timeframe.${timeframe}`,
  horizon: (horizon: TechnicalHorizon) => `technical.horizon.${horizon}`,
  direction: (direction: TechnicalDirection) => `technical.direction.${direction}`,
  outcome: (outcome: TechnicalOutcomeResult) => `technical.outcome.${outcome}`,
};
