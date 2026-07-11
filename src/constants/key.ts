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
  hub: 'hub',
  inventory: 'inventory',
  main: 'main',
  menu: 'menu',
  repair: 'repair',
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
