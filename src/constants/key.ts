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
  dock: 'dock',
  engineer: 'engineer',
  field: 'field',
  finalCore: 'final_core',
  hazard: 'hazard',
  hub: 'hub',
  interruption: 'interruption',
  inventory: 'inventory',
  main: 'main',
  menu: 'menu',
  opsAnnex: 'ops_annex',
  repair: 'repair',
  sideRepair: 'side_repair',
  utilityBay: 'utility_bay',
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
