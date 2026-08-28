const atlas = {
  player: 'player',
} as const;

const image = {
  spaceman: 'spaceman',
  tuxemon: 'tuxemon',
} as const;

const scene = {
  archive: 'archive',
  artifactSurvey: 'artifact_survey',
  boot: 'boot',
  coolantYard: 'coolant_yard',
  // Four-zone assessment route (map foundation unit): the participant
  // route's four zone scenes. Keys double as their internal zone keys.
  diagnosticsLaboratory: 'diagnostics_laboratory',
  dock: 'dock',
  engineer: 'engineer',
  exteriorRecoveryYard: 'exterior_recovery_yard',
  field: 'field',
  // Field-actions foundation: developer proving ground for the reusable
  // scan/dig/magnet subsystem (never on the participant route).
  fieldActionsLab: 'field_actions_lab',
  finalCore: 'final_core',
  hazard: 'hazard',
  hub: 'hub',
  interruption: 'interruption',
  inventory: 'inventory',
  // Information Processing foundation: the developer proving-ground scene
  // and its three modal overlays (terminal, pipe board, diagnosis console).
  informationProcessingLab: 'information_processing_lab',
  // Interactive inventory foundation: the developer proving-ground scene
  // and the shared modal inventory overlay.
  inventoryLab: 'inventory_lab',
  inventoryOverlay: 'inventory_overlay',
  ipDiagnosisConsole: 'ip_diagnosis_console',
  ipPipeBoard: 'ip_pipe_board',
  ipSignalTerminal: 'ip_signal_terminal',
  main: 'main',
  menu: 'menu',
  // Professional pilot route: the skippable opening overlay and the station
  // map overlay (M), both modal over a paused pilot zone.
  pilotOpening: 'pilot_opening',
  pilotStationMap: 'pilot_station_map',
  pilotWorkSurface: 'pilot_work_surface',
  opsAnnex: 'ops_annex',
  pumpHouse: 'pump_house',
  repair: 'repair',
  sideRepair: 'side_repair',
  recordsWorkshop: 'records_workshop',
  stationConcourse: 'station_concourse',
  utilityBay: 'utility_bay',
  utilityCoreDeck: 'utility_core_deck',
} as const;

const tilemap = {
  tuxemon: 'tuxemon',
} as const;

export const key = {
  atlas,
  image,
  scene,
  tilemap,
} as const;
