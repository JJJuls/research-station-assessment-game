const atlas = {
  player: 'player',
} as const;

const image = {
  spaceman: 'spaceman',
  tuxemon: 'tuxemon',
} as const;

const scene = {
  archive: 'archive',
  boot: 'boot',
  dock: 'dock',
  engineer: 'engineer',
  finalCore: 'final_core',
  hazard: 'hazard',
  hub: 'hub',
  interruption: 'interruption',
  inventory: 'inventory',
  main: 'main',
  menu: 'menu',
  repair: 'repair',
  sideRepair: 'side_repair',
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
