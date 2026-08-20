/**
 * Item-definition catalogue for the authoritative inventory domain.
 *
 * Three layers, kept deliberately distinguishable:
 *
 * 1. LEGACY carry items — every entry of src/gameplay/items.ts
 *    GAME_ITEM_REGISTRY, mapped 1:1 with maxStack 1 so existing route
 *    logic that counts individual carried items keeps its exact
 *    semantics through the compatibility adapter.
 * 2. INVENTORY-LAB items — stackable demonstration components, samples
 *    and the two non-scored workbench recipe lines.
 * 3. M02 / M03 workstation objects — bound to their measurement
 *    namespace: they can never enter the player inventory and general
 *    items can never enter a workstation (structural separation).
 *
 * Anti-leakage rule: labels are operational fiction only — no
 * questionnaire wording, no trait language, no "tidy/organise" prompts.
 */

import { GAME_ITEM_REGISTRY } from '../gameplay/items';
import type { ItemCategory, ItemDefinition } from './model';

const LEGACY_CATEGORY: Record<string, ItemCategory> = {
  tool: 'tool',
  component: 'component',
  sample: 'sample',
  document: 'document',
  container: 'container',
};

/** Legacy gameplay items: identical ids, single-stack, existing icons. */
const LEGACY_DEFINITIONS: ItemDefinition[] = GAME_ITEM_REGISTRY.map((item) => ({
  definitionId: item.item_id,
  displayName: item.label,
  description: item.description,
  category: LEGACY_CATEGORY[item.tags[0]] ?? 'component',
  icon: item.icon,
  maxStack: 1,
  tags: item.tags,
  usable: item.tags.includes('tool'),
  droppable: true,
  discardable: false,
  recipeRoles: [],
}));

/** Inventory Lab demonstration items (stackable; local inv-icon-* art). */
const LAB_DEFINITIONS: ItemDefinition[] = [
  {
    definitionId: 'fuse_contact',
    displayName: 'Fuse Contact',
    description:
      'Silvered relay contact pin. Two are consumed when fusing a relay cartridge.',
    category: 'component',
    icon: 'inv-icon-fuse-contact',
    maxStack: 8,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: ['ingredient:fused_relay_cartridge'],
  },
  {
    definitionId: 'relay_housing',
    displayName: 'Relay Housing',
    description:
      'Empty relay cartridge shell. Accepts a pair of fuse contacts at the workbench.',
    category: 'component',
    icon: 'inv-icon-relay-housing',
    maxStack: 2,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: ['ingredient:fused_relay_cartridge'],
  },
  {
    definitionId: 'fused_relay_cartridge',
    displayName: 'Fused Relay Cartridge',
    description:
      'Assembled relay cartridge, contacts fused and seated. Bench-tested spare.',
    category: 'component',
    icon: 'inv-icon-fused-cartridge',
    maxStack: 2,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: ['output:fused_relay_cartridge'],
  },
  {
    definitionId: 'sample_vial',
    displayName: 'Sample Vial',
    description:
      'Open collection vial. Needs a seal cap before transport or archive.',
    category: 'sample',
    icon: 'inv-icon-sample-vial',
    maxStack: 4,
    tags: ['sample'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: ['ingredient:sealed_sample'],
  },
  {
    definitionId: 'seal_cap',
    displayName: 'Seal Cap',
    description:
      'Sterile crimp cap. Seals one sample vial at the workbench press.',
    category: 'component',
    icon: 'inv-icon-seal-cap',
    maxStack: 8,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: ['ingredient:sealed_sample'],
  },
  {
    definitionId: 'sealed_sample',
    displayName: 'Sealed Sample',
    description:
      'Capped and pressure-sealed sample vial, ready for the archive rack.',
    category: 'sample',
    icon: 'inv-icon-sealed-sample',
    maxStack: 4,
    tags: ['sample'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: ['output:sealed_sample'],
  },
  {
    definitionId: 'field_ration',
    displayName: 'Field Ration',
    description: 'Standard crew ration block. Keeps a long shift moving.',
    category: 'consumable',
    icon: 'inv-icon-field-ration',
    maxStack: 10,
    tags: ['consumable'],
    usable: true,
    droppable: true,
    discardable: true,
    recipeRoles: [],
  },
  {
    definitionId: 'wire_spool',
    displayName: 'Wire Spool',
    description: 'Insulated signal wire, twenty metres per spool.',
    category: 'component',
    icon: 'inv-icon-wire-spool',
    maxStack: 6,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: [],
  },
  {
    definitionId: 'insulation_wrap',
    displayName: 'Insulation Wrap',
    description: 'Thermal wrap sleeve for exposed line sections.',
    category: 'component',
    icon: 'inv-icon-insulation-wrap',
    maxStack: 6,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: [],
  },
  {
    definitionId: 'spare_gasket',
    displayName: 'Spare Gasket',
    description: 'Nitrile gasket ring, mixed-bore service stock.',
    category: 'component',
    icon: 'inv-icon-spare-gasket',
    maxStack: 8,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: [],
  },
  {
    definitionId: 'filter_cell',
    displayName: 'Filter Cell',
    description: 'Replaceable particulate filter cell for bench extractors.',
    category: 'component',
    icon: 'inv-icon-filter-cell',
    maxStack: 4,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: [],
  },
  {
    definitionId: 'beacon_cell',
    displayName: 'Beacon Cell',
    description: 'Sealed chemical cell for route marker beacons.',
    category: 'component',
    icon: 'inv-icon-beacon-cell',
    maxStack: 4,
    tags: ['component'],
    usable: false,
    droppable: true,
    discardable: true,
    recipeRoles: [],
  },
];

/* ------------------------------------------------------------------ *
 * M02 — Incident Filing Workstation documents (12, three cases)
 * ------------------------------------------------------------------ */

export interface M02DocumentSpec {
  definitionId: string;
  /** Short document code shown on the icon (e.g. 'D-04'). */
  code: string;
  /** The case this document belongs to per the filing reference. */
  caseId: 'IR-7' | 'IR-12' | 'IR-19';
}

export const M02_CASE_IDS = ['IR-7', 'IR-12', 'IR-19'] as const;

/**
 * Standardised contents: four documents per case. Codes are deliberately
 * NOT grouped by case in code order, so correct filing requires reading
 * the visible filing reference, not pattern-matching consecutive codes.
 */
export const M02_DOCUMENTS: readonly M02DocumentSpec[] = [
  { definitionId: 'm02_doc_01', code: 'D-01', caseId: 'IR-12' },
  { definitionId: 'm02_doc_02', code: 'D-02', caseId: 'IR-7' },
  { definitionId: 'm02_doc_03', code: 'D-03', caseId: 'IR-19' },
  { definitionId: 'm02_doc_04', code: 'D-04', caseId: 'IR-7' },
  { definitionId: 'm02_doc_05', code: 'D-05', caseId: 'IR-12' },
  { definitionId: 'm02_doc_06', code: 'D-06', caseId: 'IR-19' },
  { definitionId: 'm02_doc_07', code: 'D-07', caseId: 'IR-19' },
  { definitionId: 'm02_doc_08', code: 'D-08', caseId: 'IR-7' },
  { definitionId: 'm02_doc_09', code: 'D-09', caseId: 'IR-12' },
  { definitionId: 'm02_doc_10', code: 'D-10', caseId: 'IR-19' },
  { definitionId: 'm02_doc_11', code: 'D-11', caseId: 'IR-7' },
  { definitionId: 'm02_doc_12', code: 'D-12', caseId: 'IR-12' },
] as const;

const M02_DEFINITIONS: ItemDefinition[] = M02_DOCUMENTS.map((doc) => ({
  definitionId: doc.definitionId,
  displayName: `Incident Sheet ${doc.code}`,
  description: `Single incident record sheet ${doc.code}. Case assignment is listed on the filing reference.`,
  category: 'record',
  icon: `inv-icon-m02-doc`,
  maxStack: 1,
  tags: ['m02_record'],
  usable: false,
  droppable: false,
  discardable: false,
  recipeRoles: [],
  boundNamespace: 'm02',
}));

/* ------------------------------------------------------------------ *
 * M03 — residual objects (five standardised types, shared by A and B)
 * ------------------------------------------------------------------ */

export const M03_RESIDUAL_IDS = [
  'm03_spent_cartridge',
  'm03_offcut_strip',
  'm03_used_stencil',
  'm03_spent_swab',
  'm03_tray_liner',
] as const;

const M03_LABELS: Record<(typeof M03_RESIDUAL_IDS)[number], [string, string]> =
  {
    m03_spent_cartridge: [
      'Spent Press Cartridge',
      'Empty press feed cartridge left by the last cycle.',
    ],
    m03_offcut_strip: [
      'Offcut Strip',
      'Trimmed backing strip from the press run.',
    ],
    m03_used_stencil: [
      'Used Stencil',
      'Single-use alignment stencil from the press bed.',
    ],
    m03_spent_swab: ['Spent Swab', 'Used cleaning swab from the platen wipe.'],
    m03_tray_liner: [
      'Tray Liner',
      'Disposable liner sheet from the output tray.',
    ],
  };

const M03_DEFINITIONS: ItemDefinition[] = M03_RESIDUAL_IDS.map((id) => ({
  definitionId: id,
  displayName: M03_LABELS[id][0],
  description: M03_LABELS[id][1],
  category: 'residue',
  icon: `inv-icon-${id.replace(/_/g, '-')}`,
  maxStack: 1,
  tags: ['m03_residue'],
  usable: false,
  droppable: false,
  discardable: false,
  recipeRoles: [],
  boundNamespace: 'm03',
}));

/* ------------------------------------------------------------------ *
 * Catalogue access
 * ------------------------------------------------------------------ */

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  ...LEGACY_DEFINITIONS,
  ...LAB_DEFINITIONS,
  ...M02_DEFINITIONS,
  ...M03_DEFINITIONS,
];

const DEFINITION_INDEX = new Map(
  ITEM_DEFINITIONS.map((definition) => [definition.definitionId, definition]),
);

export function getItemDefinition(definitionId: string): ItemDefinition {
  const definition = DEFINITION_INDEX.get(definitionId);

  if (definition === undefined) {
    throw new Error(`Unknown inventory item definition: ${definitionId}`);
  }

  return definition;
}

export function isKnownItemDefinition(definitionId: string): boolean {
  return DEFINITION_INDEX.has(definitionId);
}
