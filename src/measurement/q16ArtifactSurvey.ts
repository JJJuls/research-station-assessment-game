/**
 * Q16 independent artifact-survey module state (physical-mechanics
 * session, Unit 3).
 *
 * A dedicated, scientifically isolated multi-step diligence analogue —
 * the CANDIDATE exploratory Q16 prototype the specification's remedy row
 * calls for ("a Q16-specific execution-accuracy window ... its own
 * instance/state container"). It deliberately borrows NOTHING from the
 * Q07-owned Side Repair arc or the Q01/Q02-owned inventory verification
 * (the two recorded contamination sources), and none of the generic
 * Survey Terrace route's proto events: the survey happens in its own
 * bounded area (`proto_artifact_field`), with its own state container,
 * its own proto_q16_* raw event family, and its own SA-13 opportunity
 * record.
 *
 * Participant experience (all stages, in the participant's own order):
 * review-or-ignore the field brief → navigate the bounded survey zone →
 * scan six fixed candidate sites (learnable HIGH/no-return signal) → dig
 * the flagged sites → collect three distinct specimens → place each into
 * a labelled specimen-case tray (mistakes possible and correctable) →
 * run the manifest check → report completion to the surveyor.
 *
 * Scientific safeguards implemented here:
 * - FIXED site positions, signals and yields (frozen stimuli; identical
 *   clues, distances, site count and required actions for everyone).
 * - No hidden pixel hunting: every site is a visible staked station; the
 *   case trays are labelled; the brief and notebook say exactly what to
 *   do in plain operational language.
 * - Accuracy/stage-completion/corrections/verification are the design
 *   focus; wandering time and click totals are never counted here.
 * - Scanner equivalence: a participant without the field scanner is
 *   issued one at acceptance (no inventory-dependent difficulty).
 * - This is a CANDIDATE exploratory prototype: proto_* identifiers only,
 *   no canonical names, no scoring, never an item score. A session that
 *   never takes the survey up records absence, never low diligence.
 */

export const Q16_OPPORTUNITY_ID = 'proto_q16_artifact_survey';
export const Q16_ENTRY_STATE_VERSION = 'q16-survey-v1';

export interface Q16Site {
  site_id: string;
  /** Fixed world position in the survey annex (px). */
  x: number;
  y: number;
  /** Fixed scan outcome: the artifact this site yields, or null. */
  yields: string | null;
}

/**
 * Six fixed candidate sites; three yield specimens (fixed assignment,
 * documented — formal counterbalance of site order is a possible later
 * refinement and would need its own recorded condition).
 */
export const Q16_SITES: readonly Q16Site[] = [
  { site_id: 'site_1', x: 96, y: 224, yields: null },
  { site_id: 'site_2', x: 224, y: 288, yields: 'basalt_fragment' },
  { site_id: 'site_3', x: 352, y: 192, yields: 'ice_core_segment' },
  { site_id: 'site_4', x: 480, y: 288, yields: null },
  { site_id: 'site_5', x: 608, y: 224, yields: 'sealed_biosample' },
  { site_id: 'site_6', x: 352, y: 384, yields: null },
] as const;

export interface Q16Artifact {
  artifact_id: string;
  label: string;
  icon: string;
  /** The labelled tray this specimen belongs in (fiction-transparent). */
  tray_id: string;
}

export const Q16_ARTIFACTS: readonly Q16Artifact[] = [
  {
    artifact_id: 'ice_core_segment',
    label: 'Ice Core Segment',
    icon: 'proc-icon-ice-core',
    tray_id: 'tray_cores',
  },
  {
    artifact_id: 'basalt_fragment',
    label: 'Basalt Fragment',
    icon: 'proc-icon-basalt',
    tray_id: 'tray_minerals',
  },
  {
    artifact_id: 'sealed_biosample',
    label: 'Sealed Biosample',
    icon: 'proc-icon-biosample',
    tray_id: 'tray_biology',
  },
] as const;

export interface Q16Tray {
  tray_id: string;
  label: string;
  x: number;
  y: number;
}

/** The specimen case's three labelled trays (fixed positions). */
export const Q16_TRAYS: readonly Q16Tray[] = [
  { tray_id: 'tray_cores', label: 'Cores Tray', x: 544, y: 128 },
  { tray_id: 'tray_minerals', label: 'Minerals Tray', x: 576, y: 128 },
  { tray_id: 'tray_biology', label: 'Biology Tray', x: 608, y: 128 },
] as const;

interface Q16State {
  offered: boolean;
  brief_reads: number;
  accepted: boolean;
  /** site_id -> scan result recorded ('flagged' | 'clear'). */
  scanned: Record<string, 'flagged' | 'clear'>;
  dug: string[];
  /** Artifacts lying loose at their dig site (collectable). */
  loose: string[];
  /** Physically carried artifact (single slot). */
  carried: string | null;
  /** artifact_id -> tray_id placements (correctable). */
  stored: Record<string, string>;
  /** Completed take-back corrections (restow acts). */
  corrections: number;
  /** Manifest checks run, and mismatch count at the LAST check. */
  manifest_checks: number;
  last_manifest_mismatches: number | null;
  reported: boolean;
}

function createInitialQ16State(): Q16State {
  return {
    offered: false,
    brief_reads: 0,
    accepted: false,
    scanned: {},
    dug: [],
    loose: [],
    carried: null,
    stored: {},
    corrections: 0,
    manifest_checks: 0,
    last_manifest_mismatches: null,
    reported: false,
  };
}

export const q16State: Q16State = createInitialQ16State();

export function getQ16Site(siteId: string): Q16Site {
  const site = Q16_SITES.find((entry) => entry.site_id === siteId);

  if (site === undefined) {
    throw new Error(`Unknown Q16 site: ${siteId}`);
  }

  return site;
}

export function getQ16Artifact(artifactId: string): Q16Artifact {
  const artifact = Q16_ARTIFACTS.find(
    (entry) => entry.artifact_id === artifactId,
  );

  if (artifact === undefined) {
    throw new Error(`Unknown Q16 artifact: ${artifactId}`);
  }

  return artifact;
}

export function getQ16Tray(trayId: string): Q16Tray {
  const tray = Q16_TRAYS.find((entry) => entry.tray_id === trayId);

  if (tray === undefined) {
    throw new Error(`Unknown Q16 tray: ${trayId}`);
  }

  return tray;
}

export function markQ16Offered() {
  q16State.offered = true;
}

export function markQ16BriefRead() {
  q16State.brief_reads += 1;
}

export function acceptQ16Survey() {
  q16State.accepted = true;
}

/** Records a scan; returns the fixed signal for the site. */
export function scanQ16Site(siteId: string): 'flagged' | 'clear' {
  const site = getQ16Site(siteId);
  const signal = site.yields !== null ? 'flagged' : 'clear';

  q16State.scanned[siteId] = signal;

  return signal;
}

export function q16SiteScanned(siteId: string): boolean {
  return q16State.scanned[siteId] !== undefined;
}

export function q16SiteDug(siteId: string): boolean {
  return q16State.dug.includes(siteId);
}

/** Digs a flagged site; the artifact appears loose at the site. */
export function digQ16Site(siteId: string): string | null {
  const site = getQ16Site(siteId);

  if (
    q16State.scanned[siteId] !== 'flagged' ||
    q16State.dug.includes(siteId) ||
    site.yields === null
  ) {
    return null;
  }

  q16State.dug.push(siteId);
  q16State.loose.push(site.yields);

  return site.yields;
}

export function collectQ16Artifact(artifactId: string): boolean {
  if (q16State.carried !== null || !q16State.loose.includes(artifactId)) {
    return false;
  }

  q16State.loose = q16State.loose.filter((entry) => entry !== artifactId);
  q16State.carried = artifactId;

  return true;
}

/** Stores the carried artifact into a tray (any tray; errors correctable). */
export function storeQ16Artifact(artifactId: string, trayId: string): boolean {
  if (q16State.carried !== artifactId) {
    return false;
  }

  getQ16Tray(trayId);
  q16State.carried = null;
  q16State.stored[artifactId] = trayId;

  return true;
}

/** Takes a stored artifact back out (correction path). */
export function restowQ16Artifact(artifactId: string): boolean {
  if (q16State.carried !== null || q16State.stored[artifactId] === undefined) {
    return false;
  }

  delete q16State.stored[artifactId];
  q16State.carried = artifactId;
  q16State.corrections += 1;

  return true;
}

/** Current manifest mismatches: missing specimens + wrong-tray placements. */
export function q16ManifestMismatches(): {
  missing: string[];
  mistrayed: string[];
} {
  const missing = Q16_ARTIFACTS.filter(
    (artifact) => q16State.stored[artifact.artifact_id] === undefined,
  ).map((artifact) => artifact.artifact_id);
  const mistrayed = Q16_ARTIFACTS.filter(
    (artifact) =>
      q16State.stored[artifact.artifact_id] !== undefined &&
      q16State.stored[artifact.artifact_id] !== artifact.tray_id,
  ).map((artifact) => artifact.artifact_id);

  return { missing, mistrayed };
}

export function runQ16ManifestCheck(): { missing: number; mistrayed: number } {
  const { missing, mistrayed } = q16ManifestMismatches();

  q16State.manifest_checks += 1;
  q16State.last_manifest_mismatches = missing.length + mistrayed.length;

  return { missing: missing.length, mistrayed: mistrayed.length };
}

/** Reporting requires at least one completed manifest check. */
export function q16ReportAvailable(): boolean {
  return (
    q16State.accepted && q16State.manifest_checks > 0 && !q16State.reported
  );
}

export function reportQ16Survey() {
  q16State.reported = true;
}

export function q16Summary() {
  const { missing, mistrayed } = q16ManifestMismatches();

  return {
    brief_reads: q16State.brief_reads,
    sites_scanned: Object.keys(q16State.scanned).length,
    sites_dug: q16State.dug.length,
    stored_count: Object.keys(q16State.stored).length,
    corrections: q16State.corrections,
    manifest_checks: q16State.manifest_checks,
    missing_at_report: missing.length,
    mistrayed_at_report: mistrayed.length,
    reported: q16State.reported,
  };
}

/** Test-only escape hatch (resetQ03State precedent). */
export function resetQ16State() {
  Object.assign(q16State, createInitialQ16State());
  q16State.scanned = {};
  q16State.dug = [];
  q16State.loose = [];
  q16State.stored = {};
}
