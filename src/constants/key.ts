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
  finalCore: 'final_core',
  hazard: 'hazard',
  hub: 'hub',
  interruption: 'interruption',
  inventory: 'inventory',
  // Interactive inventory foundation: the developer proving-ground scene
  // and the shared modal inventory overlay.
  inventoryLab: 'inventory_lab',
  inventoryOverlay: 'inventory_overlay',
  main: 'main',
  menu: 'menu',
  opsAnnex: 'ops_annex',
  pumpHouse: 'pump_house',
  repair: 'repair',
  sideRepair: 'side_repair',
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
