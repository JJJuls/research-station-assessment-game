/**
 * Field-actions foundation barrel (scan / dig / magnet recovery).
 *
 * Pure models first (signal, targets, dig surface, deck), then the
 * scene-facing controllers, telemetry and the three provisional
 * measurement-window adapters. Scenes and specs import from here.
 */

export type {
  DigControllerConfig,
  DigRecord,
  DigRefusal,
} from './digController';
export { DIG_ACTION_DURATION_MS, DigController } from './digController';
export type {
  BuriedObject,
  DigCellState,
  DigResolution,
  DigZone,
  DugCellRecord,
} from './digSurfaceRegistry';
export { DIG_CELL_SIZE, DigSurfaceRegistry } from './digSurfaceRegistry';
export type { FieldActionLogPayload } from './fieldActionLog';
export {
  emitFieldActionLog,
  installFieldActionLogSink,
  resetFieldActionLogSink,
} from './fieldActionLog';
export type { SecondaryFieldActionSuffix } from './fieldActionTelemetry';
export {
  logSecondaryFieldAction,
  SECONDARY_FIELD_ACTION_EVENT_TYPES,
  SECONDARY_FIELD_ACTION_SUFFIXES,
  setFieldActionTelemetryScene,
} from './fieldActionTelemetry';
export type { FieldCacheCollectResult, FieldCacheEntry } from './fieldCache';
export { FieldCacheManager } from './fieldCache';
export type { FieldTarget, TargetReading } from './fieldTargetRegistry';
export { FieldTargetRegistry } from './fieldTargetRegistry';
export type {
  MagnetDeckForm,
  MagnetDeckState,
  MagnetOutcome,
  MagnetOutcomeTier,
  MagnetPullResult,
} from './magnetDeck';
export {
  drawMagnetPull,
  ensureMagnetDeckForm,
  MAGNET_DECK_FORMS,
  magnetDeckDepleted,
  magnetDeckState,
  resetMagnetDeck,
} from './magnetDeck';
export type {
  MagnetCycleRecord,
  MagnetLockSource,
  MagnetPhase,
  MagnetWinchConfig,
} from './magnetWinchController';
export { MagnetWinchController } from './magnetWinchController';
export type {
  M23FieldRecoveryExitStatus,
  M23FieldRecoveryForm,
} from './opportunities/m23FieldRecovery';
export {
  closeM23FieldRecoveryWindow,
  m23FieldRecoveryState,
  m23FieldRecoverySummary,
  m23FieldRecoveryWindowOpen,
  M23FR_DETECTION_RADIUS,
  M23FR_ENTRY_STATE_VERSION,
  M23FR_EVENT_TYPES,
  M23FR_FORMS,
  M23FR_OPPORTUNITY_ID,
  M23FR_SCAN_CONTEXT,
  M23FR_TARGET_ID,
  M23FR_WINDOW_ID,
  markM23FieldRecoveryCompleted,
  markM23FieldRecoveryTechnicalFailure,
  noteM23FieldRecoveryDig,
  noteM23FieldRecoveryInterruption,
  noteM23FieldRecoveryInvalidAction,
  noteM23FieldRecoveryScan,
  openM23FieldRecoveryWindow,
  resetM23FieldRecoveryState,
} from './opportunities/m23FieldRecovery';
export type { M24MagnetUtilityExitStatus } from './opportunities/m24MagnetUtility';
export {
  closeM24MagnetUtilityWindow,
  m24MagnetUtilityState,
  m24MagnetUtilitySummary,
  m24MagnetUtilityWindowOpen,
  M24MU_DEPLETION_STATEMENT,
  M24MU_ENTRY_STATE_VERSION,
  M24MU_EVENT_TYPES,
  M24MU_OPPORTUNITY_ID,
  M24MU_WINDOW_ID,
  markM24MagnetUtilityAlternativeActivity,
  markM24MagnetUtilityDepletionAcknowledged,
  markM24MagnetUtilityDepletionShown,
  markM24MagnetUtilityTechnicalFailure,
  noteM24MagnetUtilityCycle,
  openM24MagnetUtilityWindow,
  resetM24MagnetUtilityState,
} from './opportunities/m24MagnetUtility';
export type {
  M26DepletedSearchExitStatus,
  M26DepletedSearchPhase,
} from './opportunities/m26DepletedSearch';
export {
  closeM26DepletedSearchWindow,
  m26DepletedSearchPhase,
  m26DepletedSearchState,
  m26DepletedSearchSummary,
  m26DepletedSearchWindowOpen,
  M26DS_CONTROL_CELL,
  M26DS_CONTROL_DETECTION_RADIUS,
  M26DS_CONTROL_FORM,
  M26DS_CONTROL_SCAN_CONTEXT,
  M26DS_CONTROL_TARGET_ID,
  M26DS_ENTRY_STATE_VERSION,
  M26DS_EVENT_TYPES,
  M26DS_FUTILE_SCAN_CONTEXT,
  M26DS_FUTILITY_STATEMENT,
  M26DS_OPPORTUNITY_ID,
  M26DS_WINDOW_ID,
  markM26DepletedSearchAlternativeActivity,
  markM26DepletedSearchControlCompleted,
  markM26DepletedSearchFutilityAcknowledged,
  markM26DepletedSearchFutilityShown,
  markM26DepletedSearchTechnicalFailure,
  noteM26DepletedSearchDig,
  noteM26DepletedSearchScan,
  openM26DepletedSearchWindow,
  resetM26DepletedSearchState,
} from './opportunities/m26DepletedSearch';
export type { ScanControllerConfig, ScanRecord } from './scanController';
export { ScanController } from './scanController';
export type { SignalCategory, SignalTrend } from './signalModel';
export {
  categorizeSignal,
  compareSignalTrend,
  computeSignalStrength,
  SCAN_ACTION_DURATION_MS,
  SCAN_COOLDOWN_MS,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_DETECTION_RADIUS,
  SIGNAL_TREND_LABELS,
} from './signalModel';
