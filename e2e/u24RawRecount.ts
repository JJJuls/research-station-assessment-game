/*
 * U24 Part C — independent raw-event recount of Station 080 M01–M26
 * (RC-1 = a, RC-2 = a, RC-3 = b).
 *
 * Author: Part C analyst, model claude-opus-5-5, fresh context.
 * Written from the approved rule documents only (v1: rules snapshot 1 at
 * revision 060758c; v2: reconciled against rules snapshot 2 at revision
 * 287dcc6 — register §5.410–§5.412, addendum "U24 RL-4" / "U24 completion
 * S2" / "S3"; the frozen reload-correction rulings and the owner decisions
 * of 25 October 2026). No production code, extractor, register
 * twin or production output was read. Every rule is cited in RECOUNT_SPEC
 * (see RECOUNT-SPEC-CITATIONS.md for file:line citations).
 *
 * Imports: none (node: built-ins only are permitted; none is needed).
 *
 * Conventions used throughout:
 *  - `raw_events` are the current page load (addendum §1; REG §5.290 (a):
 *    the extractor reads the current page load's raw events only).
 *  - `prior_page_load_events` are NEVER current-load evidence (r3 §2
 *    direction (g); brief §2). They are read in exactly two places, each
 *    named by its rule: the M25 case-3 delay covariate (the earlier closure
 *    record; r3 §6; D-3 = P; owner decision of 25 October 2026; REG §5.411
 *    (2)), and the D-7 (i) carry-forward of the six RL-4 rows M14, M15, M16,
 *    M18, M19, M20 (a U / M marker of the family in an earlier load keeps
 *    the absence unestablished; REG §5.410 "recorded for Part C"), which can
 *    only withhold an A class, never add evidence.
 *  - A page load is "reloaded" iff its page_load_index > 1 (REG §5.406:
 *    a load whose context says reloaded while its page index is 1 is not
 *    classified).
 *  - The reload class of every occasion (H / A / U / M, or malformed) is
 *    recomputed here from the load's own logged check record(s), whose
 *    fields are event-level raw data (brief §2), by the class order of
 *    REG §5.405 / addendum §2 "U24 RL-0" with D-6 (i), D-7 (i), R-1 and
 *    RL-1C decision A.
 *  - `reason` is the analyst's own code, never production text.
 */

// ---------------------------------------------------------------- types

export interface RecountEvent {
  event_type: string;
  sequence?: unknown;
  page_load_index?: unknown;
  game_session_id?: unknown;
  timestamp?: unknown;
  metadata?: Record<string, unknown>;
  [k: string]: unknown;
}
export interface RecountInput {
  raw_events: readonly RecountEvent[];
  prior_page_load_events: readonly RecountEvent[];
  page_load_index: number;
  game_session_id: string;
}
export interface RecountRecord {
  item: string;
  feature_id: string;
  role: 'primary' | 'companion' | 'sensitivity';
  value: unknown;
  numerator: number | null;
  denominator: number | null;
  disposition: string;
  reason: string | null;
  components?: Record<string, unknown>;
  citation: string;
}
export interface RecountSpecEntry {
  item: string;
  feature_id: string;
  role: string;
  families: readonly string[];
  eligibility: string;
  numerator: string;
  denominator: string;
  missing_rule: string;
  page_load_treatment: string;
  citations: readonly string[];
}

type Md = Record<string, unknown>;
type Role = 'primary' | 'companion' | 'sensitivity';

// ---------------------------------------------------------------- helpers

const isObj = (v: unknown): v is Md =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const md = (e: RecountEvent | undefined | null): Md =>
  e && isObj(e.metadata) ? (e.metadata as Md) : {};
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const bool = (v: unknown): boolean | null =>
  typeof v === 'boolean' ? v : null;
const arr = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);

/** REG §5.259: a usable sequence is a safe integer of at least 1. */
const usableSeq = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 1;
const seqOf = (e: RecountEvent): number | null =>
  usableSeq(e.sequence) ? (e.sequence as number) : null;

function stableJson(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']';
  if (isObj(v)) {
    return (
      '{' +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + stableJson(v[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(v === undefined ? null : v);
}

interface SeqCheck {
  ok: boolean;
  missing: number[]; // indexes (in the family list) of events without a usable sequence
  shared: number[]; // sequences shared by two or more events
  identicalDuplicates: number; // records identical in every field (M23 S2 only)
}

/** REG §5.259 / §5.284: every family event of the load carries a usable,
 * unique sequence; gaps are normal. */
function checkSeq(evs: readonly RecountEvent[]): SeqCheck {
  const missing: number[] = [];
  const seen = new Map<number, string[]>();
  evs.forEach((e, i) => {
    const s = seqOf(e);
    if (s === null) missing.push(i);
    else {
      const list = seen.get(s) ?? [];
      list.push(stableJson(e));
      seen.set(s, list);
    }
  });
  const shared: number[] = [];
  let identicalDuplicates = 0;
  for (const [s, list] of seen) {
    if (list.length > 1) {
      shared.push(s);
      if (list.every((x) => x === list[0]))
        identicalDuplicates += list.length - 1;
    }
  }
  return {
    ok: missing.length === 0 && shared.length === 0,
    missing,
    shared,
    identicalDuplicates,
  };
}

/** Order events by sequence when every one is usable; otherwise keep the
 * logged array order (the order is then not verifiable, and rows that read
 * order fail their integrity check before they use it). */
function ordered(evs: readonly RecountEvent[]): RecountEvent[] {
  const all = evs.map((e, i) => ({ e, i }));
  if (all.every(({ e }) => seqOf(e) !== null)) {
    all.sort(
      (a, b) => (seqOf(a.e) as number) - (seqOf(b.e) as number) || a.i - b.i,
    );
  }
  return all.map(({ e }) => e);
}

const before = (
  a: RecountEvent | undefined,
  b: RecountEvent | undefined,
): boolean => {
  if (!a || !b) return false;
  const sa = seqOf(a);
  const sb = seqOf(b);
  return sa !== null && sb !== null && sa < sb;
};

interface Fam {
  prefix: string;
  /** current-load family events, check records excluded (r3 §2: the
   * record is not task evidence), ordered */
  evs: RecountEvent[];
  /** current-load check records of the family */
  checks: RecountEvent[];
  /** every current-load family event, check records included (for the
   * §5.259 sequence convention, which covers every family event) */
  all: RecountEvent[];
}

function family(
  input: RecountInput,
  prefix: string,
  extraPrefixes: readonly string[] = [],
): Fam {
  const all = ordered(
    input.raw_events.filter(
      (e) =>
        typeof e?.event_type === 'string' &&
        (e.event_type.startsWith(prefix) ||
          extraPrefixes.some((p) => e.event_type.startsWith(p))),
    ),
  );
  const checks = all.filter(
    (e) => e.event_type === prefix + 'prior_load_checked',
  );
  const evs = all.filter((e) => e.event_type !== prefix + 'prior_load_checked');
  return { prefix, evs, checks, all };
}

const sfx = (f: Fam, e: RecountEvent): string =>
  e.event_type.startsWith(f.prefix)
    ? e.event_type.slice(f.prefix.length)
    : e.event_type;
const ofType = (f: Fam, s: string): RecountEvent[] =>
  f.evs.filter((e) => sfx(f, e) === s);
const firstOf = (f: Fam, s: string): RecountEvent | undefined =>
  f.evs.find((e) => sfx(f, e) === s);

// ---------------------------------------------------------------- reload classes

type ReloadClass = 'A' | 'H' | 'U' | 'M';

interface OccClass {
  cls: ReloadClass;
  basis: string; // no_check | duplicate_checks | whole_check_contradiction | occasion_contradiction | opening_found | discontinuous | established | not_established
}

interface Classification {
  reloaded: boolean;
  checkCount: number;
  /** a single record naming another load, or lacking an expected occasion */
  malformed: boolean;
  /** the records' content agrees (null without a record) */
  checkCoherent: boolean | null;
  historyLevelU: boolean;
  firstLoadCheck: boolean;
  occ: Record<string, OccClass>;
  record: Md | null;
  /** §5.290 (a) check-record part of exposure_record_consistent */
  exposureRecordConsistentCheckPart: boolean;
}

const OCC_DEFAULT = '_';

/**
 * Classify every occasion of a family for this load (r3 §2–§3; REG §5.404
 * readings (a)–(e) as confirmed by R-1, §5.405 class order; addendum §2
 * "U24 RL-0"; D-6 (i); D-7 (i) carried in the record's own
 * `prior_opening_absence_established`).
 */
function classify(
  input: RecountInput,
  f: Fam,
  occasions: readonly string[] | null,
): Classification {
  const occs = occasions && occasions.length ? occasions : [OCC_DEFAULT];
  const reloaded = input.page_load_index > 1;
  const res: Classification = {
    reloaded,
    checkCount: f.checks.length,
    malformed: false,
    checkCoherent: null,
    historyLevelU: false,
    firstLoadCheck: false,
    occ: {},
    record: null,
    exposureRecordConsistentCheckPart: true,
  };
  if (!reloaded) {
    if (f.checks.length > 0) {
      res.firstLoadCheck = true; // flagged, establishes nothing (§5.404 (e))
      res.exposureRecordConsistentCheckPart = false;
    }
    return res;
  }
  const setAll = (cls: ReloadClass, basis: string) => {
    for (const o of occs) res.occ[o] = { cls, basis };
  };
  if (f.checks.length === 0) {
    res.historyLevelU = true;
    setAll('U', 'no_check');
    return res;
  }
  if (f.checks.length >= 2) {
    // D-6 (i): two or more records establish nothing, even when they agree.
    res.historyLevelU = true;
    res.exposureRecordConsistentCheckPart = false;
    const heads = f.checks.map((c) => stableJson(headFlags(md(c), occasions)));
    res.checkCoherent = heads.every((h) => h === heads[0]);
    setAll('U', 'duplicate_checks');
    return res;
  }
  const r = md(f.checks[0]);
  res.record = r;
  const recPli = r.page_load_index;
  if (recPli !== input.page_load_index) {
    res.malformed = true; // §5.404 (d): a record naming another page load
  }
  const map = isObj(r.occasions) ? (r.occasions as Md) : null;
  if (occasions && occasions.length) {
    if (!map || occasions.some((o) => !isObj(map[o]))) res.malformed = true; // expected occasion missing
  }
  if (res.malformed) {
    res.exposureRecordConsistentCheckPart = false;
    setAll('U', 'malformed');
    return res;
  }
  const continuous = r.history_continuous === true;
  const found = r.prior_opening_found === true;
  const established = r.prior_opening_absence_established === true;
  const priorCount = num(r.prior_page_load_event_count);
  // §5.290 (a) checkCoherent: established while not continuous, while an
  // opening was found, or with no earlier record.
  let coherent = !(
    established &&
    (!continuous || found || priorCount === 0 || priorCount === null)
  );
  if (occasions && occasions.length && map) {
    // §5.404 (c): row flags must summarise the WHOLE occasion map.
    const vals = Object.values(map).filter(isObj) as Md[];
    const anyFound = vals.some((v) => v.prior_opening_found === true);
    const allEst =
      vals.length > 0 &&
      vals.every(
        (v) =>
          v.prior_opening_absence_established === true &&
          v.prior_opening_found !== true,
      );
    if (found !== anyFound) coherent = false;
    if (established !== allEst) coherent = false;
  }
  res.checkCoherent = coherent;
  if (!coherent) {
    res.exposureRecordConsistentCheckPart = false;
    setAll('M', 'whole_check_contradiction');
    return res;
  }
  for (const o of occs) {
    const ov: Md = occasions && occasions.length && map ? (map[o] as Md) : r;
    const oFound = ov.prior_opening_found === true;
    const oEst = ov.prior_opening_absence_established === true;
    if (oFound && oEst)
      res.occ[o] = { cls: 'M', basis: 'occasion_contradiction' };
    else if (oFound)
      res.occ[o] = { cls: 'H', basis: 'opening_found' }; // R-1: H even beside a discontinuous history
    else if (!continuous) res.occ[o] = { cls: 'U', basis: 'discontinuous' };
    else if (oEst) res.occ[o] = { cls: 'A', basis: 'established' };
    else res.occ[o] = { cls: 'U', basis: 'not_established' }; // D-7 (i) carry-forward lands here
  }
  if (!continuous) res.historyLevelU = true;
  return res;
}

function headFlags(r: Md, occasions: readonly string[] | null): unknown {
  const keys = [
    'page_load_index',
    'history_continuous',
    'prior_opening_found',
    'prior_opening_absence_established',
    'prior_page_load_event_count',
  ];
  const o: Md = {};
  for (const k of keys) o[k] = r[k];
  if (occasions && isObj(r.occasions)) o.occasions = r.occasions;
  return o;
}

/** Hold-back markers: the family's technical_failure whose detail begins
 * "reload" (REG §4 "Unit 14" M03/M04, M02: "the reload marker is
 * recognised by the wording of its detail"; addendum §2 "U24 RL-0" prefixes). */
interface Marker {
  ev: RecountEvent;
  occasion: string | null;
  kind: 'H' | 'U' | 'M' | 'joint' | 'review' | 'unknown';
  detail: string;
}
function markers(
  f: Fam,
  occKey: (m: Md) => string | null = (m) => str(m.occasion),
  suffixes: readonly string[] = ['technical_failure'],
): Marker[] {
  const out: Marker[] = [];
  for (const e of f.evs) {
    if (!suffixes.includes(sfx(f, e))) continue;
    const m = md(e);
    const d = str(m.detail) ?? '';
    if (!d.startsWith('reload')) continue;
    let kind: Marker['kind'] = 'unknown';
    if (
      d.startsWith('reload after administration') ||
      d.startsWith('reload after the offer')
    )
      kind = 'H';
    else if (d.startsWith('reload with an unverified earlier state'))
      kind = 'U';
    else if (d.startsWith('reload with a contradictory earlier check'))
      kind = 'M';
    else if (d.startsWith('reload with a joint hold-back')) kind = 'joint';
    else if (d.startsWith('reload after a review closure')) kind = 'review';
    out.push({ ev: e, occasion: occKey(m), kind, detail: d });
  }
  return out;
}

/**
 * D-7 (i) recomputed from the earlier loads, for the six RL-4 rows only
 * (M14, M15, M16, M18, M19, M20): REG §5.410 records for Part C that "the
 * recount recomputes it from `prior_page_load_events`: a U / M marker of the
 * family in an earlier load keeps the absence unestablished" (an H marker
 * never does; ADD "U24 RL-4"). This is the only use of the earlier loads
 * besides the M25 case-3 delay; it never adds evidence to the current load,
 * it can only withhold an A class. Returns true when it changed the class.
 */
function priorCarryForward(
  input: RecountInput,
  prefix: string,
  c: Classification,
): boolean {
  if (!c.reloaded) return false;
  const oc = c.occ[OCC_DEFAULT];
  if (!oc || oc.cls !== 'A') return false;
  const carried = input.prior_page_load_events.some((e) => {
    if (e.event_type !== prefix + 'technical_failure') return false;
    const d = str(md(e).detail) ?? '';
    return (
      d.startsWith('reload with an unverified earlier state') ||
      d.startsWith('reload with a contradictory earlier check')
    );
  });
  if (carried)
    c.occ[OCC_DEFAULT] = {
      cls: 'U',
      basis: 'carry_forward_recomputed_from_prior_loads',
    };
  return carried;
}

// ---------------------------------------------------------------- record builder

interface Ctx {
  input: RecountInput;
}

function mk(
  spec: RecountSpecEntry,
  value: unknown,
  numerator: number | null,
  denominator: number | null,
  disposition: string,
  reason: string | null,
  components?: Record<string, unknown>,
): RecountRecord {
  const r: RecountRecord = {
    item: spec.item,
    feature_id: spec.feature_id,
    role: spec.role as Role,
    value,
    numerator,
    denominator,
    disposition,
    reason,
    citation: spec.feature_id,
  };
  if (components && Object.keys(components).length) r.components = components;
  return r;
}

/** the zero-denominator / empty shapes of r3 §5: "null / null" (early
 * returns) and "null / 0" (the zero-denominator path). */
const NN = { v: null, n: null, d: null } as const;

function reloadCheckComponent(c: Classification): Md {
  return {
    page_reloaded: c.reloaded,
    checked: c.checkCount > 0,
    check_count: c.checkCount,
    check_coherent: c.checkCoherent,
    check_malformed: c.malformed,
    history_level_uncertain: c.historyLevelU,
    classes: Object.fromEntries(
      Object.entries(c.occ).map(([k, v]) => [k, v.cls]),
    ),
  };
}

// ---------------------------------------------------------------- shared occasion-row machinery
//
// The "occasion rows" (M01, M03, M04, M12, and the per-occasion parts of
// M05, M10, M11, M21, M22) share the reload treatment of r3 §5:
//  - an A occasion takes its first-load reading (column B);
//  - an H / U / M occasion is held (HB): never a zero, never in the
//    denominator; beside an observed sibling the row is `interrupted` with
//    the observed value kept (the S-F2 representation, addendum line 40;
//    r3 §5 "HB+OBS");
//  - RL-1C decision A: without a check, a presented, unopened occasion is
//    U (`no_check`) and held; a genuinely unreached occasion keeps the
//    F5 / absentFeature reading (for the occasion rows: held — "after a
//    reload an occasion without evidence in the current load reads as held
//    back", REG §4 "Unit 14" M03 / M04, §5.188, the M01 rule);
//  - with a check, an unopened occasion that is not A reads held even
//    without a marker (REG §5.405 reading (d); §5.407 reading (d),
//    confirmed by RL-2 closeout ruling 2);
//  - with a marker, the marker's existing precedence stands (REG §5.406
//    (2)); without one, a current-load observation counts and the
//    diagnostic `exposure_record_consistent` is cleared when the
//    occasion's own record found an earlier opening (RL-1C decision B).

interface HoldInfo {
  held: boolean;
  basis: string | null; // e.g. "H:opening_found", "U:no_check", "marker:H"
}

function holdFor(
  c: Classification,
  occ: string,
  markersOfOcc: Marker[],
  openedInLoad: boolean,
  presentedInLoad: boolean,
  hasAnyEvidence: boolean,
  opts: { unreachedHeldWithoutCheck: boolean } = {
    unreachedHeldWithoutCheck: true,
  },
): HoldInfo {
  if (markersOfOcc.length > 0)
    return { held: true, basis: 'marker:' + markersOfOcc[0].kind };
  if (!c.reloaded) return { held: false, basis: null };
  const oc = c.occ[occ];
  if (!oc) return { held: false, basis: null };
  if (openedInLoad) return { held: false, basis: null };
  if (c.checkCount === 0) {
    if (presentedInLoad) return { held: true, basis: 'U:no_check' }; // RL-1C decision A
    if (!hasAnyEvidence && opts.unreachedHeldWithoutCheck)
      return { held: true, basis: 'F5:no_current_evidence' };
    return { held: false, basis: null };
  }
  if (oc.cls === 'A') return { held: false, basis: null };
  return { held: true, basis: oc.cls + ':' + oc.basis };
}

function exposureDiagnostics(
  c: Classification,
  occs: readonly string[],
  openedInLoad: (o: string) => boolean,
): {
  exposure_record_consistent: boolean;
  exposure_record_inconsistent_occasions: string[];
} | null {
  // RL-1C decision B: emitted only after a reload or beside a check.
  if (!c.reloaded && c.checkCount === 0) return null;
  const bad: string[] = [];
  for (const o of occs) {
    const oc = c.occ[o];
    if (oc && oc.cls === 'H' && openedInLoad(o)) bad.push(o);
  }
  return {
    exposure_record_consistent:
      c.exposureRecordConsistentCheckPart && bad.length === 0,
    exposure_record_inconsistent_occasions: bad,
  };
}

// ================================================================ M01

const S_M01_P: RecountSpecEntry = {
  item: 'M01',
  feature_id: 'm01_planned_jobs',
  role: 'primary',
  families: ['proto_m01_batch_'],
  eligibility:
    'per occasion o1 / o2 (metadata.occasion): an occasion is observed when its plan_snapshot (the board at the first job press) exists and its window is closed (completed, or completed by the review because the snapshot exists); opened with a snapshot and the window still open = open (pending); opened, closed without a snapshot = opened-unobserved; presented, never opened = declined occasion; nothing = not presented',
  numerator:
    'sum over observed occasions of the jobs placed on the SEQUENCE board at the plan_snapshot (count of non-null slots), cross-checked with plan_snapshot.planned_jobs and with window_closed.raw_components.planned_jobs (any disagreement => technical_failure)',
  denominator:
    '3 x observed occasions (planned denominator 6); one observed occasion => incomplete on 3',
  missing_rule:
    'no observed occasion => null: declined (named on the route, never opened), not_presented (nothing), pending (a batch open), opened-unobserved => no_eligible_event null/0 (r3 §5 column B; the U5 text says voluntary_stop: recorded as a documents conflict, see GAPS.md G-M01-1); a malformed check => technical_failure',
  page_load_treatment:
    "reloaded: per-occasion class from the load's own check record; A => first-load reading; H/U/M or a hold-back marker => held (HB): HB+OBS interrupted x/3 (value kept), HB with nothing observed interrupted null/null; without a check a presented unopened occasion is U (RL-1C A) and an unreached one is held (F5); exposure diagnostics after a reload or beside a check (RL-1C B)",
  citations: [
    'REG:6429-6487',
    'ADD:1888',
    'ADD:1620-1695',
    'R3:159-176',
    'REG:14222-14289',
    'REG:14343-14481',
    'REG:7560-7569',
  ],
};
const S_M01_C: RecountSpecEntry = {
  item: 'M01',
  feature_id: 'm01_plan_structure',
  role: 'companion',
  families: ['proto_m01_batch_'],
  eligibility:
    'per occasion: an entry once the occasion was presented; the observed structure from the plan_snapshot, job_done and window_closed records of an observed occasion; markers for a declined / pending / held occasion',
  numerator: 'n/a (structured value)',
  denominator: 'n/a',
  missing_rule:
    'null when never presented; markers {declined} / {pending} / {interrupted} (a held occasion { occasion, interrupted: true }, REG §5.409 (n))',
  page_load_treatment:
    'held occasions marked interrupted; the companion keeps its own disposition beside the S-F2 primary (REG §5.409 (n))',
  citations: ['REG:6470-6474', 'REG:14908-14920'],
};

function m01(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m01_batch_');
  const OCCS = ['o1', 'o2'] as const;
  const c = classify(input, f, OCCS as unknown as string[]);
  const mk1 = markers(f);
  type St = 'OBS' | 'OPEN' | 'OU' | 'DEC' | 'NOP';
  interface Occ {
    o: string;
    st: St;
    x: number | null;
    disagree: boolean;
    opened: boolean;
    presented: boolean;
    any: boolean;
    snapshot: Md | null;
    closed: RecountEvent | undefined;
    jobs: RecountEvent[];
  }
  const occ: Record<string, Occ> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const opened = evs.some((e) => sfx(f, e) === 'opportunity_opened');
    const presented = evs.some((e) => sfx(f, e) === 'presented');
    const snapEv = evs.find((e) => sfx(f, e) === 'plan_snapshot');
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    const snapshot = snapEv ? md(snapEv) : null;
    let x: number | null = null;
    let disagree = false;
    if (snapshot) {
      const slots = arr(snapshot.slots);
      const counted = slots
        ? slots.filter((s) => s !== null && s !== undefined).length
        : null;
      const logged = num(snapshot.planned_jobs);
      x = counted ?? logged;
      if (counted !== null && logged !== null && counted !== logged)
        disagree = true;
      const rc = closed ? md(closed).raw_components : undefined;
      if (
        isObj(rc) &&
        num(rc.planned_jobs) !== null &&
        x !== null &&
        num(rc.planned_jobs) !== x
      )
        disagree = true;
    }
    let st: St = 'NOP';
    if (opened) {
      if (!closed) st = 'OPEN';
      else st = snapshot ? 'OBS' : 'OU';
    } else if (presented) st = 'DEC';
    occ[o] = {
      o,
      st,
      x,
      disagree,
      opened,
      presented,
      any: evs.length > 0,
      snapshot,
      closed,
      jobs: evs.filter((e) => sfx(f, e) === 'job_done'),
    };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS) {
    holds[o] = holdFor(
      c,
      o,
      mk1.filter((m) => m.occasion === o),
      occ[o].opened,
      occ[o].presented,
      occ[o].any,
    );
  }
  const diag = exposureDiagnostics(
    c,
    OCCS as unknown as string[],
    (o) => occ[o].opened,
  );
  const baseComp = (): Md => {
    const comp: Md = {
      occasions_observed: OCCS.filter(
        (o) => !holds[o].held && occ[o].st === 'OBS',
      ),
      occasions_opened_unobserved: OCCS.filter(
        (o) => !holds[o].held && occ[o].st === 'OU',
      ),
      occasions_declined: OCCS.filter(
        (o) => !holds[o].held && occ[o].st === 'DEC',
      ),
      occasions_interrupted: OCCS.filter((o) => holds[o].held),
      planned_by_occasion: Object.fromEntries(
        OCCS.map((o) => [
          o,
          holds[o].held ? null : occ[o].st === 'OBS' ? occ[o].x : null,
        ]),
      ),
      snapshot_agrees: !OCCS.some((o) => occ[o].disagree),
    };
    if (diag) Object.assign(comp, diag);
    return comp;
  };

  let p: RecountRecord;
  const heldOccs = OCCS.filter((o) => holds[o].held);
  const obs = OCCS.filter((o) => !holds[o].held && occ[o].st === 'OBS');
  if (c.reloaded && c.malformed) {
    p = mk(
      S_M01_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
      baseComp(),
    );
  } else if (OCCS.some((o) => occ[o].disagree)) {
    p = mk(
      S_M01_P,
      null,
      null,
      null,
      'technical_failure',
      'snapshot_disagrees_with_recount',
      baseComp(),
    );
  } else if (heldOccs.length > 0) {
    const reason =
      'held:' + heldOccs.map((o) => o + '=' + holds[o].basis).join(',');
    if (obs.length > 0) {
      const x = obs.reduce((s, o) => s + (occ[o].x as number), 0);
      p = mk(S_M01_P, x, x, 3 * obs.length, 'interrupted', reason, baseComp());
    } else {
      p = mk(S_M01_P, NN.v, NN.n, NN.d, 'interrupted', reason, baseComp());
    }
  } else {
    // first-load reading (also every A occasion of a reloaded load)
    const open = OCCS.filter((o) => occ[o].st === 'OPEN');
    const ou = OCCS.filter((o) => occ[o].st === 'OU');
    const dec = OCCS.filter((o) => occ[o].st === 'DEC');
    if (open.length > 0) {
      p = mk(S_M01_P, null, null, null, 'pending', 'batch_open', baseComp());
    } else if (obs.length === 2) {
      const x = obs.reduce((s, o) => s + (occ[o].x as number), 0);
      p = mk(S_M01_P, x, x, 6, 'observed', null, baseComp());
    } else if (obs.length === 1) {
      const x = occ[obs[0]].x as number;
      p = mk(
        S_M01_P,
        x,
        x,
        3,
        'incomplete',
        'one_occasion_observed',
        baseComp(),
      );
    } else if (ou.length > 0) {
      p = mk(
        S_M01_P,
        null,
        null,
        0,
        'no_eligible_event',
        'opened_left_before_first_job:doc_conflict_G-M01-1',
        baseComp(),
      );
    } else if (dec.length > 0) {
      p = mk(
        S_M01_P,
        null,
        null,
        null,
        'declined',
        'presented_never_opened',
        baseComp(),
      );
    } else {
      p = mk(
        S_M01_P,
        null,
        null,
        null,
        c.reloaded ? 'not_presented' : 'not_presented',
        'never_presented',
        baseComp(),
      );
    }
  }

  // companion: per-occasion structure
  const entry = (o: string): unknown => {
    const v = occ[o];
    if (holds[o].held) return { occasion: o, interrupted: true };
    if (v.st === 'NOP') return null;
    if (v.st === 'DEC') return { occasion: o, declined: true };
    if (v.st === 'OPEN') return { occasion: o, pending: true };
    if (v.st === 'OU') return { occasion: o, observed: false };
    const s = v.snapshot as Md;
    const snapForm = md(
      f.evs.find(
        (e) => md(e).occasion === o && sfx(f, e) === 'opportunity_opened',
      ),
    );
    const form = isObj(snapForm.entry_state_snapshot)
      ? ((snapForm.entry_state_snapshot as Md).form ?? null)
      : null;
    const execution = v.jobs.map((e) => md(e).job_id ?? null);
    const planOrder = arr(s.plan_order) ?? [];
    let adherence: number | null = null;
    if (planOrder.length > 0) {
      let k = 0;
      for (let i = 0; i < planOrder.length && i < execution.length; i++)
        if (planOrder[i] === execution[i]) k++;
      adherence = k / planOrder.length;
    }
    return {
      occasion: o,
      form,
      planned_jobs: v.x,
      plan_order: planOrder,
      plan_dependency_violations: arr(s.plan_dependency_violations) ?? [],
      plan_adherence: adherence,
      execution_order: execution,
      jobs_done: v.jobs.length,
      dependency_errors: f.evs.filter(
        (e) => md(e).occasion === o && sfx(f, e) === 'dependency_error',
      ).length,
      placements: f.evs.filter(
        (e) => md(e).occasion === o && sfx(f, e) === 'card_placed',
      ).length,
    };
  };
  const value: Record<string, unknown> = { o1: entry('o1'), o2: entry('o2') };
  let cDisp: string;
  let cVal: unknown = value;
  if (p.disposition === 'technical_failure') {
    cDisp = 'technical_failure';
    cVal = null;
  } else if (value.o1 === null && value.o2 === null) {
    cDisp = p.disposition;
    cVal = null;
  } else if (OCCS.some((o) => !holds[o].held && occ[o].st === 'OBS'))
    cDisp = 'observed';
  else cDisp = p.disposition;
  const comp = mk(
    S_M01_C,
    cVal,
    null,
    null,
    cDisp,
    cDisp === p.disposition ? p.reason : null,
  );
  return [p, comp];
}

// ================================================================ M02

const S_M02_P: RecountSpecEntry = {
  item: 'M02',
  feature_id: 'm02_correct_first_retrievals',
  role: 'primary',
  families: ['proto_m02_workspace_'],
  eligibility:
    'requests answered in the current load (request_answered, first answer only); a request_inaccessible request is excluded',
  numerator:
    'requests whose FIRST answer is the requested case (answer_kind pick with picked_case = requested_case); CANNOT LOCATE is incorrect; correctness recomputed and compared with the logged correct flag',
  denominator:
    'requests answered (planned 6); six answered => observed, fewer => incomplete with censored',
  missing_rule:
    'none answered => null: no_eligible_event (never handed over) / voluntary_stop (handed over); presented never opened => declined; never presented => not_presented; open at export => pending; any disagreement (requested case vs its request_presented, which must precede, vs the assigned order at its position, the answer vs the window record, the logged correct flag, a second answer) => technical_failure; a non-reload technical_failure record => technical_failure on all three rows',
  page_load_treatment:
    "reloaded: class from the load's check; H/U/M or a marker => interrupted (all three rows); A => first-load reading; no check + presented unopened => U interrupted; no check + nothing => interrupted (absentFeature); a reload marker beside an opening of this load => technical_failure (the row's technical-failure branch, RL-1C (2))",
  citations: [
    'REG:7186-7218',
    'ADD:1889',
    'REG:8398-8409',
    'REG:8418-8424',
    'REG:8442-8444',
    'REG:8877-8892',
    'ADD:1620-1695',
    'R3:254',
    'REG:14354-14400',
  ],
};
const S_M02_LAT: RecountSpecEntry = {
  item: 'M02',
  feature_id: 'm02_retrieval_latency',
  role: 'companion',
  families: ['proto_m02_workspace_'],
  eligibility:
    "per request of the assigned order: status answered / presented_not_answered / not_presented / inaccessible with the answer's focused_ms",
  numerator: 'n/a (per-request list)',
  denominator: 'n/a',
  missing_rule:
    'null with the primary and with its disposition; incomplete with it; censored with the primary',
  page_load_treatment: 'as the primary',
  citations: ['REG:7205-7215', 'REG:8425-8432'],
};
const S_M02_LAY: RecountSpecEntry = {
  item: 'M02',
  feature_id: 'm02_filing_layout',
  role: 'companion',
  families: ['proto_m02_workspace_'],
  eligibility:
    'observed once the workspace was handed over and closed, read from the handed_over event itself, whatever happened to the requests',
  numerator: 'n/a (layout description)',
  denominator: 'n/a',
  missing_rule:
    'never handed over => null; a non-reload technical_failure record or a reload hold voids it; an answers disagreement does not void it',
  page_load_treatment: 'as the primary for H/U/M',
  citations: ['REG:7205-7218', 'REG:8433-8436'],
};

function m02(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m02_workspace_');
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT);
  const opened = ofType(f, 'opportunity_opened');
  const presented = ofType(f, 'presented');
  const closed = firstOf(f, 'window_closed');
  const handed = firstOf(f, 'handed_over');
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const hold = holdFor(
    c,
    OCC_DEFAULT,
    mks,
    opened.length > 0,
    presented.length > 0,
    f.evs.length > 0,
  );
  const diag = exposureDiagnostics(c, [OCC_DEFAULT], () => opened.length > 0);
  const diagComp = diag
    ? { exposure_record_consistent: diag.exposure_record_consistent }
    : {};

  const snap = isObj(md(opened[0]).entry_state_snapshot)
    ? (md(opened[0]).entry_state_snapshot as Md)
    : {};
  const assigned = arr(snap.assigned_order) ?? [];
  const presentedReq = ofType(f, 'request_presented');
  const answered = ofType(f, 'request_answered');
  const inaccessible = ofType(f, 'request_inaccessible');
  const defects: string[] = [];
  const seenIdx = new Set<number>();
  let correct = 0;
  let nAns = 0;
  const perReq: Md[] = [];
  const winReqs = isObj(md(closed).raw_components)
    ? arr((md(closed).raw_components as Md).requests)
    : null;
  for (const a of answered) {
    const m = md(a);
    const idx = num(m.request_index);
    if (idx === null) {
      defects.push('answer_without_request_index');
      continue;
    }
    if (seenIdx.has(idx)) {
      defects.push('second_answer_request_' + idx);
      continue;
    }
    seenIdx.add(idx);
    const pres = presentedReq.find((p) => num(md(p).request_index) === idx);
    if (!pres || !before(pres, a))
      defects.push('answer_without_preceding_presentation_' + idx);
    else if (md(pres).requested_case !== m.requested_case)
      defects.push('requested_case_disagrees_presentation_' + idx);
    if (assigned.length && assigned[idx] !== m.requested_case)
      defects.push('requested_case_disagrees_assigned_order_' + idx);
    const kind = str(m.answer_kind);
    const rec =
      kind === 'pick' &&
      m.picked_case !== null &&
      m.picked_case !== undefined &&
      m.picked_case === m.requested_case;
    if (bool(m.correct) !== null && bool(m.correct) !== rec)
      defects.push('correct_flag_disagrees_' + idx);
    if (winReqs) {
      const w = winReqs.find(
        (r) => isObj(r) && num((r as Md).request_index) === idx,
      ) as Md | undefined;
      if (
        w &&
        ((w.answer_kind !== undefined && w.answer_kind !== kind) ||
          (w.correct !== undefined && w.correct !== rec))
      )
        defects.push('window_record_disagrees_' + idx);
    }
    nAns++;
    if (rec) correct++;
    perReq.push({
      request_index: idx,
      status: 'answered',
      focused_ms: num(m.focused_ms),
      input_mode: m.input_mode ?? null,
    });
  }
  const rc = isObj(md(closed).raw_components)
    ? (md(closed).raw_components as Md)
    : null;
  if (
    rc &&
    num(rc.requests_inaccessible) !== null &&
    num(rc.requests_inaccessible) !== inaccessible.length
  )
    defects.push('inaccessible_count_disagrees');
  if (
    rc &&
    num(rc.correct_first_retrievals) !== null &&
    num(rc.correct_first_retrievals) !== correct
  )
    defects.push('window_correct_count_disagrees');
  const latList = (): Md[] => {
    const n = Math.max(6, assigned.length);
    const out: Md[] = [];
    for (let i = 0; i < n; i++) {
      const got = perReq.find((r) => r.request_index === i);
      if (got) out.push(got);
      else if (inaccessible.some((e) => num(md(e).request_index) === i))
        out.push({
          request_index: i,
          status: 'inaccessible',
          focused_ms: null,
        });
      else if (presentedReq.some((e) => num(md(e).request_index) === i))
        out.push({
          request_index: i,
          status: 'presented_not_answered',
          focused_ms: null,
        });
      else
        out.push({
          request_index: i,
          status: 'not_presented',
          focused_ms: null,
        });
    }
    return out;
  };
  const layoutValue = (): Md | null => {
    if (!handed) return null;
    const h = md(handed);
    return {
      case_location_at_close: h.case_location_at_close ?? null,
      tray_labels: h.tray_labels ?? null,
      untraceable_case_count: h.untraceable_case_count ?? null,
      misfile_count: h.misfile_count ?? null,
      duplicate_count: h.duplicate_count ?? null,
      cases_left_on_intake: h.cases_left_on_intake ?? null,
      move_count: h.move_count ?? null,
      label_changes: h.label_changes ?? null,
    };
  };
  const out = (
    pd: string,
    preason: string | null,
    pv: number | null,
    pn: number | null,
    pdn: number | null,
    comps: Md,
    lat: { v: unknown; d: string },
    lay: { v: unknown; d: string; r?: string | null },
  ): RecountRecord[] => [
    mk(S_M02_P, pv, pn, pdn, pd, preason, { ...comps, ...diagComp }),
    mk(S_M02_LAT, lat.v, null, null, lat.d, lat.d === pd ? preason : null),
    mk(S_M02_LAY, lay.v, null, null, lay.d, lay.r ?? null),
  ];
  if (c.reloaded && c.malformed) {
    const r = 'check_record_malformed';
    return out(
      'technical_failure',
      r,
      null,
      null,
      null,
      {},
      { v: null, d: 'technical_failure' },
      { v: null, d: 'technical_failure', r },
    );
  }
  if (hold.held) {
    if (mks.length > 0 && opened.length > 0) {
      const r = 'reload_marker_beside_opening';
      return out(
        'technical_failure',
        r,
        null,
        null,
        null,
        {},
        { v: null, d: 'technical_failure' },
        { v: null, d: 'technical_failure', r },
      );
    }
    const r = 'held:' + hold.basis;
    return out(
      'interrupted',
      r,
      null,
      null,
      null,
      {},
      { v: null, d: 'interrupted' },
      { v: null, d: 'interrupted', r },
    );
  }
  if (faults.length > 0) {
    const r = 'technical_failure_record';
    return out(
      'technical_failure',
      r,
      null,
      null,
      null,
      {},
      { v: null, d: 'technical_failure' },
      { v: null, d: 'technical_failure', r },
    );
  }
  const layout = layoutValue();
  const layRow = (pd: string): { v: unknown; d: string; r?: string | null } => {
    if (!handed) return { v: null, d: pd, r: 'never_handed_over' };
    if (!closed) return { v: layout, d: 'pending', r: 'workspace_open' };
    return { v: layout, d: 'observed' };
  };
  const comps: Md = {
    requests_planned: 6,
    requests_answered: nAns,
    requests_inaccessible: inaccessible.length,
    recount_agrees: defects.length === 0,
  };
  if (defects.length > 0) {
    return out(
      'technical_failure',
      'record_disagrees:' + defects[0],
      null,
      null,
      null,
      { ...comps, defects },
      { v: null, d: 'technical_failure' },
      layRow('technical_failure'),
    );
  }
  if (opened.length === 0) {
    const d = presented.length > 0 ? 'declined' : 'not_presented';
    const r =
      presented.length > 0 ? 'presented_never_opened' : 'never_presented';
    return out(
      d,
      r,
      null,
      null,
      null,
      comps,
      { v: null, d },
      { v: null, d, r },
    );
  }
  if (!closed) {
    return out(
      'pending',
      'workspace_open',
      null,
      null,
      null,
      comps,
      { v: null, d: 'pending' },
      layRow('pending'),
    );
  }
  if (nAns === 0) {
    const d = handed ? 'voluntary_stop' : 'no_eligible_event';
    const r = handed ? 'handed_over_none_answered' : 'never_handed_over';
    return out(d, r, null, null, 0, comps, { v: null, d }, layRow(d));
  }
  const planned = 6 - inaccessible.length;
  const d = nAns >= planned ? 'observed' : 'incomplete';
  return out(
    d,
    d === 'incomplete' ? 'fewer_than_planned_answered' : null,
    correct,
    correct,
    nAns,
    comps,
    { v: latList(), d },
    layRow(d),
  );
}

// ================================================================ M03

const S_M03_P: RecountSpecEntry = {
  item: 'M03',
  feature_id: 'm03_tools_restored',
  role: 'primary',
  families: ['proto_m03tools_'],
  eligibility:
    "per occasion o1 / o2: observed when opportunity_opened and first_departure occur once each and in that order with the occasion's own three tools in the entry snapshot and in the record (U14-C); tools out with the panel open = pending; state_at_system_close by the review = censored, by a stop = technical failure; unreachable tools = technical failure (excluded); a panel surfaced but the run never completed = no eligible event; presented never opened = declined",
  numerator:
    "sum over observed occasions of the tools whose final container after the tool_moved events between opportunity_opened and first_departure is the occasion's home rack (never-moved tools on the work surface), compared tool by tool with first_departure.tools and its tools_restored / move_count (any disagreement voids the row)",
  denominator: '3 x observed occasions (planned 6)',
  missing_rule:
    'none observed => null with precedence interrupted > technical_failure > no_eligible_event > declined (REG §5.177); not_presented null/null; declined, no_eligible_event, interrupted on the null/0 path (r3 §5 M03)',
  page_load_treatment:
    'reloaded: held occasions (class H/U/M, marker, or F5 / RL-1C A without a check) => interrupted (null/0 with nothing observed; value kept beside an observed occasion); A => first-load; a surfaced panel counts as presented for the no-check rule (REG §5.406 (k))',
  citations: [
    'REG:6811-6931',
    'REG:6139-6175',
    'ADD:1890',
    'REG:8656-8670',
    'REG:8712-8722',
    'R3:182-195',
    'REG:14354-14433',
  ],
};
const S_M03_C: RecountSpecEntry = {
  item: 'M03',
  feature_id: 'm03_object_states',
  role: 'companion',
  families: ['proto_m03tools_'],
  eligibility:
    "per occasion with a record: status, the tools' records, moves, exposure, departure input mode, reachability, stage at the open, taught movement and its input mode, press cycles, panel opens, presented_by; a system-closed occasion keeps tools_in_home_at_system_close apart",
  numerator: 'n/a (structured value)',
  denominator: 'n/a',
  missing_rule:
    'observed whenever an occasion left a record (REG §5.189); an occasion never presented is null in the value (REG §5.193)',
  page_load_treatment: 'held occasions marked held',
  citations: ['REG:6901-6905', 'REG:8723-8727', 'REG:8751-8763'],
};

function m03(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m03tools_');
  const OCCS = ['o1', 'o2'];
  const c = classify(input, f, OCCS);
  const mks = markers(f);
  type St = 'OBS' | 'PENDING' | 'CR' | 'TF' | 'NE' | 'DEC' | 'NOP';
  interface O {
    st: St;
    x: number | null;
    disagree: string | null;
    opened: boolean;
    presented: boolean;
    any: boolean;
    evs: RecountEvent[];
  }
  const occ: Record<string, O> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const openedL = evs.filter((e) => sfx(f, e) === 'opportunity_opened');
    const deps = evs.filter((e) => sfx(f, e) === 'first_departure');
    const sys = evs.find((e) => sfx(f, e) === 'state_at_system_close');
    const surfaced = evs.some((e) => sfx(f, e) === 'surface_opened');
    const presented = evs.some((e) => sfx(f, e) === 'presented') || surfaced;
    const faults = evs.filter(
      (e) =>
        sfx(f, e) === 'technical_failure' &&
        !(str(md(e).detail) ?? '').startsWith('reload'),
    );
    let st: St = 'NOP';
    let x: number | null = null;
    let disagree: string | null = null;
    const snap =
      openedL[0] && isObj(md(openedL[0]).entry_state_snapshot)
        ? (md(openedL[0]).entry_state_snapshot as Md)
        : null;
    const unreachable = snap
      ? (arr(snap.reachability) ?? []).some(
          (r) => isObj(r) && (r as Md).reachable === false,
        )
      : false;
    if (openedL.length > 0) {
      if (unreachable || faults.length > 0) st = 'TF';
      else if (deps.length > 0) {
        // U14-C completed-occasion conditions
        const op = openedL[0];
        const dep = deps[0];
        const tools = snap ? (arr(snap.tools) ?? []) : [];
        const home = snap ? str(snap.home) : null;
        if (openedL.length !== 1 || deps.length !== 1 || !before(op, dep))
          disagree = 'opening_departure_order';
        else if (tools.length !== 3 || new Set(tools).size !== 3)
          disagree = 'snapshot_tools';
        else {
          const moves = evs.filter(
            (e) =>
              sfx(f, e) === 'tool_moved' && before(op, e) && before(e, dep),
          );
          const loc: Record<string, string | null> = {};
          const cnt: Record<string, number> = {};
          for (const t of tools) {
            loc[String(t)] = null;
            cnt[String(t)] = 0;
          }
          for (const mv of moves) {
            const m = md(mv);
            const t = str(m.object_id);
            if (!t || !(t in loc)) {
              disagree = 'move_names_unknown_tool';
              break;
            }
            loc[t] = str(m.to_container);
            cnt[t]++;
          }
          const dm = md(dep);
          const recTools = arr(dm.tools) ?? [];
          if (!disagree) {
            if (recTools.length !== 3) disagree = 'record_tools';
            for (const rt of recTools) {
              if (!isObj(rt)) {
                disagree = 'record_tools';
                break;
              }
              const t = str(rt.object_id);
              if (!t || !(t in loc)) {
                disagree = 'record_tool_unknown';
                break;
              }
              const expectHome = loc[t] !== null && loc[t] === home;
              if (rt.in_home !== undefined && rt.in_home !== expectHome)
                disagree = 'record_in_home_disagrees';
              if (
                loc[t] !== null &&
                rt.container !== undefined &&
                rt.container !== loc[t]
              )
                disagree = 'record_container_disagrees';
              if (rt.moves !== undefined && rt.moves !== cnt[t])
                disagree = 'record_moves_disagree';
            }
          }
          x = Object.values(loc).filter((l) => l !== null && l === home).length;
          if (
            !disagree &&
            num(dm.tools_restored) !== null &&
            num(dm.tools_restored) !== x
          )
            disagree = 'tools_restored_disagrees';
          if (
            !disagree &&
            num(dm.move_count) !== null &&
            num(dm.move_count) !== moves.length
          )
            disagree = 'move_count_disagrees';
        }
        st = 'OBS';
      } else if (sys) {
        const reason = str(md(sys).close_reason) ?? '';
        st = reason.includes('review') ? 'CR' : 'TF';
      } else st = 'PENDING';
    } else if (surfaced) st = 'NE';
    else if (presented) st = 'DEC';
    occ[o] = {
      st,
      x,
      disagree,
      opened: openedL.length > 0,
      presented,
      any: evs.length > 0,
      evs,
    };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS)
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      occ[o].opened,
      occ[o].presented,
      occ[o].any,
    );
  // M03: a held occasion is held before its departure (REG §5.406 (2)): an
  // occasion with a marker and an observation keeps the held status.
  const diag = exposureDiagnostics(c, OCCS, (o) => occ[o].opened);
  const comp: Md = diag ? { ...diag } : {};
  const live = OCCS.filter((o) => !holds[o].held);
  const obs = live.filter((o) => occ[o].st === 'OBS');
  const disagreeing = OCCS.filter((o) => occ[o].disagree);
  let p: RecountRecord;
  if (c.reloaded && c.malformed)
    p = mk(
      S_M03_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
      comp,
    );
  else if (disagreeing.length > 0)
    p = mk(
      S_M03_P,
      null,
      null,
      null,
      'technical_failure',
      'occasions_disagreeing:' +
        disagreeing.map((o) => o + ':' + occ[o].disagree).join(','),
      comp,
    );
  else {
    const held = OCCS.filter((o) => holds[o].held);
    const pend = live.filter((o) => occ[o].st === 'PENDING');
    const x = obs.reduce((s, o) => s + (occ[o].x as number), 0);
    const heldReason = held.length
      ? 'held:' + held.map((o) => o + '=' + holds[o].basis).join(',')
      : null;
    if (pend.length > 0 && held.length === 0)
      p = mk(
        S_M03_P,
        null,
        null,
        null,
        'pending',
        'tools_out_panel_open',
        comp,
      );
    else if (obs.length === 2) p = mk(S_M03_P, x, x, 6, 'observed', null, comp);
    else if (obs.length === 1) {
      const other = OCCS.find((o) => o !== obs[0]) as string;
      if (holds[other].held)
        p = mk(S_M03_P, x, x, 3, 'interrupted', heldReason, {
          ...comp,
          censored: true,
        });
      else if (occ[other].st === 'CR')
        p = mk(
          S_M03_P,
          x,
          x,
          3,
          'incomplete',
          'other_occasion_closed_at_review',
          { ...comp, censored: true },
        );
      else
        p = mk(S_M03_P, x, x, 3, 'incomplete', 'one_occasion_observed', comp);
    } else {
      const sts = live.map((o) => occ[o].st);
      if (held.length > 0 || sts.includes('CR'))
        p = mk(
          S_M03_P,
          null,
          null,
          0,
          'interrupted',
          heldReason ?? 'closed_at_review',
          comp,
        );
      else if (sts.includes('TF'))
        p = mk(
          S_M03_P,
          null,
          null,
          0,
          'technical_failure',
          'unreachable_tools_or_stopped_panel',
          comp,
        );
      else if (sts.includes('NE'))
        p = mk(
          S_M03_P,
          null,
          null,
          0,
          'no_eligible_event',
          'panel_opened_run_never_completed',
          comp,
        );
      else if (sts.includes('DEC'))
        p = mk(S_M03_P, null, null, 0, 'declined', 'listed_never_opened', comp);
      else
        p = mk(
          S_M03_P,
          null,
          null,
          null,
          'not_presented',
          'never_presented',
          comp,
        );
    }
  }
  // companion
  const entry = (o: string): unknown => {
    const v = occ[o];
    if (holds[o].held) return { occasion: o, status: 'held_after_reload' };
    if (!v.any) return null;
    const op = v.evs.find((e) => sfx(f, e) === 'opportunity_opened');
    const snap =
      op && isObj(md(op).entry_state_snapshot)
        ? (md(op).entry_state_snapshot as Md)
        : {};
    const dep = v.evs.find((e) => sfx(f, e) === 'first_departure');
    const sys = v.evs.find((e) => sfx(f, e) === 'state_at_system_close');
    const pc = v.evs.find((e) => sfx(f, e) === 'practice_completed');
    const so = v.evs.find((e) => sfx(f, e) === 'surface_opened');
    const statusMap: Record<St, string> = {
      OBS: 'observed',
      PENDING: 'pending',
      CR: 'closed_at_review',
      TF: 'technical_failure',
      NE: 'run_not_completed',
      DEC: 'declined',
      NOP: 'not_presented',
    };
    return {
      occasion: o,
      status: statusMap[v.st],
      tools: dep ? (md(dep).tools ?? null) : null,
      tools_restored: v.st === 'OBS' ? v.x : null,
      moves: v.evs.filter((e) => sfx(f, e) === 'tool_moved').length,
      exposure_focused_ms: dep ? num(md(dep).focused_ms) : null,
      departure_input_mode: dep ? (md(dep).input_mode ?? null) : null,
      reachability: snap.reachability ?? null,
      stage_at_open: snap.stage ?? null,
      taught_movement_moves: pc ? (md(pc).moves_needed ?? null) : null,
      taught_movement_input_mode: snap.practice_input_mode ?? null,
      press_cycles: v.evs.filter((e) => sfx(f, e) === 'press_cycle').length,
      panel_opens: v.evs.filter((e) => sfx(f, e) === 'surface_opened').length,
      presented_by: (so ? md(so).presented_by : snap.presented_by) ?? null,
      tools_in_home_at_system_close: sys
        ? (md(sys).tools_in_home ?? md(sys).tools_restored ?? null)
        : null,
    };
  };
  const value = { o1: entry('o1'), o2: entry('o2') };
  let cd: string;
  let cv: unknown = value;
  if (
    p.disposition === 'technical_failure' &&
    (c.malformed || disagreeing.length > 0)
  ) {
    cd = 'technical_failure';
    cv = null;
  } else if (
    OCCS.some(
      (o) =>
        !holds[o].held &&
        occ[o].any &&
        occ[o].st !== 'NOP' &&
        occ[o].st !== 'DEC',
    )
  )
    cd = 'observed';
  else if (value.o1 === null && value.o2 === null) {
    cd = p.disposition;
    cv = null;
  } else cd = p.disposition;
  return [
    p,
    mk(S_M03_C, cv, null, null, cd, cd === p.disposition ? p.reason : null),
  ];
}

// ================================================================ M04

const S_M04_P: RecountSpecEntry = {
  item: 'M04',
  feature_id: 'm04_undisposed_pieces',
  role: 'primary',
  families: ['proto_m04_cutting_'],
  eligibility:
    "per job o1 / o2: observed when its own opportunity_opened, job_run and first_departure occur once each and in that order, job_run names exactly the job's three pieces, and the acts on those pieces between the cut and the departure replay without contradiction (U14-C); a cut without its departure = pending; state_at_review = censored; unreachable pieces / a fault = technical failure (excluded); `listed` is never required",
  numerator:
    'sum over observed jobs of (3 - pieces of the job disposed between job_run and first_departure), a carried piece counted undisposed; compared piece by piece with first_departure (disposed_ids, pieces_disposed, carried_piece, pieces_lying, undisposed_at_departure); any disagreement voids the row',
  denominator: '3 x observed jobs (planned 6)',
  missing_rule:
    'no job run => null not_presented (null/null; also when only listed); every job run closed by the system or held => null interrupted (null/0, censored); a job closed by the review beside an observed one => incomplete, censored; unreachable pieces => technical_failure',
  page_load_treatment:
    'reloaded: own class per job from the check; joint hold-back (R-2): an A job is held whenever the other job is held (effectively H beside an H, otherwise U); reload_jobs reports own and effective classes; without a check a presentation (listed or presented) unopened is U and an unreached job F5-held; held beside observed => interrupted with the value kept; B2 (a dependent job cut anyway) keeps its current reading and reports joint_hold_back_bypassed',
  citations: [
    'REG:6933-7089',
    'REG:6139-6160',
    'ADD:1891',
    'REG:8627-8632',
    'REG:8656-8670',
    'REG:8712-8722',
    'R3:197-208',
    'REG:14198-14203',
    'REG:14247-14256',
    'REG:14401-14406',
    'ADD:1644-1657',
    'ROD:1C-q2',
  ],
};
const S_M04_C: RecountSpecEntry = {
  item: 'M04',
  feature_id: 'm04_job_values',
  role: 'companion',
  families: ['proto_m04_cutting_'],
  eligibility:
    "per job with a record: status, undisposed at the departure and its recount, the state at the review apart, disposed ids, carried piece, pieces lying, closing trigger and station, stage at the cut, focused time to the first disposal, exposure, pick-ups with origins, put-backs, refused presses, later disposals, the cut's input mode; v4: the per-job lists of the two flags pickups_by_station_press / disposed_by_or_after_station_press (object ids; a pick-up with origin station_press:<id>, a disposal before the departure issued by such a press or following such a pick-up; REG §5.193, §5.184). A job never run (listed only) has no record (null)",
  numerator: 'n/a (structured value)',
  denominator: 'n/a',
  missing_rule:
    "null with the primary's disposition when no job has a record in this load (v4: a job never run, or a held job, which by §5.188 has no current-load evidence); observed whenever a job left a record (REG §5.189)",
  page_load_treatment:
    "a held job beside a job with a current-load record is marked held (not stated; GAPS G-M04-3); every job held or never run => null with the primary's disposition",
  citations: [
    'REG:7014-7033',
    'ADD:1891',
    'REG:8696-8700',
    'REG:8717-8727',
    'REG:8760-8761',
  ],
};

function m04(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m04_cutting_');
  const JOBS = ['o1', 'o2'];
  const c = classify(input, f, JOBS);
  const mks = markers(f);
  const listed = ofType(f, 'listed').length > 0;
  type St = 'OBS' | 'PENDING' | 'CR' | 'TF' | 'NOP';
  interface J {
    st: St;
    x: number | null;
    disagree: string | null;
    opened: boolean;
    presented: boolean;
    any: boolean;
    evs: RecountEvent[];
    pickupsStation: string[];
    disposedStation: string[];
  }
  const job: Record<string, J> = {};
  for (const o of JOBS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const openedL = evs.filter((e) => sfx(f, e) === 'opportunity_opened');
    const runs = evs.filter((e) => sfx(f, e) === 'job_run');
    const deps = evs.filter((e) => sfx(f, e) === 'first_departure');
    const review = evs.find((e) => sfx(f, e) === 'state_at_review');
    const faults = evs.filter(
      (e) =>
        sfx(f, e) === 'technical_failure' &&
        !(str(md(e).detail) ?? '').startsWith('reload'),
    );
    let st: St = 'NOP';
    let x: number | null = null;
    let disagree: string | null = null;
    const pickupsStation: string[] = [];
    const disposedStation: string[] = [];
    if (runs.length > 0 || openedL.length > 0) {
      if (faults.length > 0) st = 'TF';
      else if (deps.length > 0) {
        st = 'OBS';
        const op = openedL[0];
        const run = runs[0];
        const dep = deps[0];
        const snap =
          op && isObj(md(op).entry_state_snapshot)
            ? (md(op).entry_state_snapshot as Md)
            : {};
        const pieces = (arr(md(run).pieces) ?? []).map(String);
        const defined = (arr(snap.pieces) ?? []).map(String);
        if (
          openedL.length !== 1 ||
          runs.length !== 1 ||
          deps.length !== 1 ||
          !before(op, run) ||
          !before(run, dep)
        )
          disagree = 'opening_run_departure_order';
        else if (
          pieces.length !== 3 ||
          new Set(pieces).size !== 3 ||
          (defined.length &&
            stableJson([...pieces].sort()) !== stableJson([...defined].sort()))
        )
          disagree = 'job_run_pieces';
        else {
          const state: Record<string, 'lying' | 'hand' | 'disposed'> = {};
          for (const pc of pieces) state[pc] = 'lying';
          const stationPicked = new Set<string>(); // per job (declared inside this job's block)
          for (const e of evs) {
            if (!before(run, e) || !before(e, dep)) continue;
            const s = sfx(f, e);
            if (
              s !== 'piece_picked_up' &&
              s !== 'piece_put_back' &&
              s !== 'piece_disposed'
            )
              continue;
            const pc = str(md(e).object_id);
            if (!pc || !(pc in state)) continue; // another job's piece, or an unrecognised object (REG §5.216, carried forward)
            const origin = str(md(e).origin) ?? '';
            if (s === 'piece_picked_up') {
              if (
                state[pc] !== 'lying' ||
                Object.values(state).includes('hand')
              ) {
                disagree = 'replay_pickup_contradiction';
                break;
              }
              state[pc] = 'hand';
              if (origin.startsWith('station_press')) {
                pickupsStation.push(pc);
                stationPicked.add(pc);
              }
            } else if (s === 'piece_put_back') {
              if (state[pc] !== 'hand') {
                disagree = 'replay_put_back_contradiction';
                break;
              }
              state[pc] = 'lying';
            } else {
              if (state[pc] !== 'hand') {
                disagree = 'replay_disposal_contradiction';
                break;
              }
              state[pc] = 'disposed';
              if (origin.startsWith('station_press') || stationPicked.has(pc))
                disposedStation.push(pc);
            }
          }
          const disposed = Object.keys(state).filter(
            (k) => state[k] === 'disposed',
          );
          const carried =
            Object.keys(state).find((k) => state[k] === 'hand') ?? null;
          x = 3 - disposed.length;
          const dm = md(dep);
          if (!disagree) {
            const ids = (arr(dm.disposed_ids) ?? []).map(String);
            if (new Set(ids).size !== ids.length)
              disagree = 'disposed_ids_repeat';
            else if (
              stableJson([...ids].sort()) !== stableJson([...disposed].sort())
            )
              disagree = 'disposed_ids_disagree';
            else if (
              num(dm.pieces_disposed) !== null &&
              num(dm.pieces_disposed) !== disposed.length
            )
              disagree = 'pieces_disposed_disagrees';
            else if ((dm.carried_piece ?? null) !== carried)
              disagree = 'carried_piece_disagrees';
            else if (
              num(dm.pieces_lying) !== null &&
              num(dm.pieces_lying) !== 3 - disposed.length - (carried ? 1 : 0)
            )
              disagree = 'pieces_lying_disagrees';
            else if (
              num(dm.undisposed_at_departure) !== null &&
              num(dm.undisposed_at_departure) !== x
            )
              disagree = 'undisposed_disagrees';
          }
        }
      } else if (review) st = 'CR';
      else st = 'PENDING';
    }
    const presented = listed || evs.some((e) => sfx(f, e) === 'presented');
    job[o] = {
      st,
      x,
      disagree,
      opened: openedL.length > 0,
      presented,
      any: evs.length > 0 || listed,
      evs,
      pickupsStation,
      disposedStation,
    };
  }
  // own holds then the joint hold-back (R-2)
  const own: Record<string, HoldInfo> = {};
  for (const o of JOBS) {
    const ownMk = mks.filter((m) => m.occasion === o && m.kind !== 'joint');
    own[o] = holdFor(c, o, ownMk, job[o].opened, job[o].presented, job[o].any);
  }
  const eff: Record<
    string,
    {
      held: boolean;
      cls: string | null;
      joint: boolean;
      heldWith: string | null;
      bypassed: boolean;
    }
  > = {};
  for (const o of JOBS) {
    const other = JOBS.find((x) => x !== o) as string;
    const jointMk = mks.some((m) => m.occasion === o && m.kind === 'joint');
    if (own[o].held) {
      const ob = own[o].basis ?? '';
      const cls =
        c.occ[o]?.cls ?? (ob.startsWith('marker:') ? ob.slice(7) : 'U');
      eff[o] = {
        held: true,
        cls,
        joint: false,
        heldWith: null,
        bypassed: false,
      };
    } else if (own[other].held && c.reloaded) {
      const otherCls = c.occ[other]?.cls ?? null;
      const effCls =
        otherCls === 'H' || own[other].basis === 'marker:H' ? 'H' : 'U';
      const bypassed = job[o].opened;
      // a dependent job's current-load reading is kept (B2 open); with its own joint marker it reads held
      eff[o] = {
        held: !bypassed || jointMk,
        cls: effCls,
        joint: true,
        heldWith: other,
        bypassed,
      };
    } else {
      eff[o] = {
        held: jointMk,
        cls: jointMk ? 'U' : null,
        joint: jointMk,
        heldWith: jointMk ? other : null,
        bypassed: false,
      };
    }
  }
  const diag = exposureDiagnostics(
    c,
    JOBS,
    (o) => job[o].opened && !eff[o].joint,
  );
  const comps: Md = {
    cutter_listed: listed,
    jobs_not_run: JOBS.filter((o) => job[o].st === 'NOP'),
    pickups_by_station_press: JOBS.reduce(
      (s, o) => s + job[o].pickupsStation.length,
      0,
    ),
    disposed_by_or_after_station_press: JOBS.reduce(
      (s, o) => s + job[o].disposedStation.length,
      0,
    ),
  };
  if (diag) Object.assign(comps, diag);
  if (c.reloaded || c.checkCount > 0) {
    const rec = c.record;
    const occMap = rec && isObj(rec.occasions) ? (rec.occasions as Md) : {};
    comps.reload_jobs = Object.fromEntries(
      JOBS.map((o) => {
        const ov = isObj(occMap[o]) ? (occMap[o] as Md) : {};
        return [
          o,
          {
            own_class: c.occ[o]?.cls ?? null,
            own_basis: c.occ[o]?.basis ?? null,
            effective_class: eff[o].held ? eff[o].cls : 'A',
            administration_permitted: !eff[o].held && !own[o].held,
            joint_hold_back: eff[o].joint,
            held_with: eff[o].heldWith,
            prior_opening_found: ov.prior_opening_found ?? null,
            prior_opening_absence_established:
              ov.prior_opening_absence_established ?? null,
            prior_opening_sequences: ov.prior_opening_sequences ?? null,
            joint_hold_back_bypassed: eff[o].bypassed,
          },
        ];
      }),
    );
  }
  const live = JOBS.filter((o) => !eff[o].held);
  const obs = live.filter((o) => job[o].st === 'OBS');
  const disagreeing = JOBS.filter((o) => job[o].disagree);
  const held = JOBS.filter((o) => eff[o].held);
  const heldReason = held.length
    ? 'held:' +
      held
        .map(
          (o) =>
            o + '=' + (eff[o].joint ? 'joint:' + eff[o].cls : own[o].basis),
        )
        .join(',')
    : null;
  let p: RecountRecord;
  if (c.reloaded && c.malformed)
    p = mk(
      S_M04_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
      comps,
    );
  else if (disagreeing.length > 0)
    p = mk(
      S_M04_P,
      null,
      null,
      null,
      'technical_failure',
      'jobs_disagreeing:' +
        disagreeing.map((o) => o + ':' + job[o].disagree).join(','),
      comps,
    );
  else {
    const x = obs.reduce((s, o) => s + (job[o].x as number), 0);
    const pend = live.filter((o) => job[o].st === 'PENDING');
    const run = live.filter((o) => job[o].st !== 'NOP');
    if (pend.length > 0 && held.length === 0)
      p = mk(
        S_M04_P,
        null,
        null,
        null,
        'pending',
        'cut_without_departure',
        comps,
      );
    else if (obs.length === 2)
      p = mk(S_M04_P, x, x, 6, 'observed', null, comps);
    else if (obs.length === 1) {
      const other = JOBS.find((o) => o !== obs[0]) as string;
      if (eff[other].held)
        p = mk(S_M04_P, x, x, 3, 'interrupted', heldReason, {
          ...comps,
          censored: true,
        });
      else if (job[other].st === 'CR')
        p = mk(S_M04_P, x, x, 3, 'incomplete', 'other_job_closed_at_review', {
          ...comps,
          censored: true,
        });
      else p = mk(S_M04_P, x, x, 3, 'incomplete', 'one_job_observed', comps);
    } else if (held.length > 0 || run.some((o) => job[o].st === 'CR')) {
      const tf = run.some((o) => job[o].st === 'TF');
      if (tf && held.length === 0 && !run.some((o) => job[o].st === 'CR'))
        p = mk(
          S_M04_P,
          null,
          null,
          0,
          'technical_failure',
          'unreachable_pieces_or_fault',
          comps,
        );
      else
        p = mk(
          S_M04_P,
          null,
          null,
          0,
          'interrupted',
          heldReason ?? 'every_job_closed_by_system',
          { ...comps, censored: true },
        );
    } else if (run.some((o) => job[o].st === 'TF'))
      p = mk(
        S_M04_P,
        null,
        null,
        0,
        'technical_failure',
        'unreachable_pieces_or_fault',
        comps,
      );
    else
      p = mk(
        S_M04_P,
        null,
        null,
        null,
        'not_presented',
        listed ? 'listed_no_job_run' : 'no_job_run',
        comps,
      );
  }
  // companion
  const entry = (o: string): unknown => {
    const j = job[o];
    if (eff[o].held)
      return {
        job: o,
        status: 'held_after_reload',
        joint_hold_back: eff[o].joint,
      };
    // v4: a job never run has no record ("a job never run is not presented,
    // also when the work orders listed the coupons", ADD:1891; REG:7015)
    if (!j.evs.length || j.st === 'NOP') return null;
    const run = j.evs.find((e) => sfx(f, e) === 'job_run');
    const dep = j.evs.find((e) => sfx(f, e) === 'first_departure');
    const review = j.evs.find((e) => sfx(f, e) === 'state_at_review');
    const op = j.evs.find((e) => sfx(f, e) === 'opportunity_opened');
    const snap =
      op && isObj(md(op).entry_state_snapshot)
        ? (md(op).entry_state_snapshot as Md)
        : {};
    const statusMap: Record<St, string> = {
      OBS: 'observed',
      PENDING: 'pending',
      CR: 'closed_at_review',
      TF: 'technical_failure',
      NOP: 'not_run',
    };
    return {
      job: o,
      status: statusMap[j.st],
      undisposed_at_departure: dep
        ? (md(dep).undisposed_at_departure ?? null)
        : null,
      undisposed_recount: j.st === 'OBS' ? j.x : null,
      state_at_review: review ? md(review) : null,
      disposed_ids: dep ? (md(dep).disposed_ids ?? null) : null,
      carried_piece: dep ? (md(dep).carried_piece ?? null) : null,
      pieces_lying: dep ? (md(dep).pieces_lying ?? null) : null,
      closing_trigger: dep ? (md(dep).trigger ?? null) : null,
      closing_station: dep ? (md(dep).detail ?? null) : null,
      stage_at_cut: snap.stage ?? null,
      first_disposal_focused_ms: dep
        ? (md(dep).first_disposal_focused_ms ?? null)
        : null,
      exposure_focused_ms: dep ? (md(dep).focused_ms ?? null) : null,
      pickups: j.evs
        .filter((e) => sfx(f, e) === 'piece_picked_up')
        .map((e) => ({
          object_id: md(e).object_id ?? null,
          origin: md(e).origin ?? null,
        })),
      put_backs: j.evs.filter((e) => sfx(f, e) === 'piece_put_back').length,
      refused_presses: j.evs.filter((e) => sfx(f, e) === 'press_refused')
        .length,
      later_disposals: j.evs.filter((e) => sfx(f, e) === 'late_disposal')
        .length,
      cut_input_mode: run ? (md(run).input_mode ?? null) : null,
      // v4: the per-job lists of the two station-press flags are in the
      // companion (REG:8760-8761, §5.193; REG:7023-7026, REG:8696-8700, §5.184)
      pickups_by_station_press: [...j.pickupsStation],
      disposed_by_or_after_station_press: [...j.disposedStation],
    };
  };
  const value = { o1: entry('o1'), o2: entry('o2') };
  // v4: a held job has no record in this load (§5.188: a job without
  // evidence in the current load reads as held back, REG:8717-8719); with no
  // job holding a current-load record the companion is null with the
  // primary's disposition (REG:7032-7033)
  const noCurrentRecord = JOBS.every(
    (o) => eff[o].held || value[o as 'o1' | 'o2'] === null,
  );
  let cd: string;
  let cv: unknown = value;
  if (
    p.disposition === 'technical_failure' &&
    (c.malformed || disagreeing.length > 0)
  ) {
    cd = 'technical_failure';
    cv = null;
  } else if (noCurrentRecord) {
    cd = p.disposition;
    cv = null;
  } else if (JOBS.some((o) => !eff[o].held && job[o].st !== 'NOP'))
    cd = 'observed';
  else cd = p.disposition;
  return [
    p,
    mk(S_M04_C, cv, null, null, cd, cd === p.disposition ? p.reason : null),
  ];
}

// ================================================================ M05

const S_M05_P: RecountSpecEntry = {
  item: 'M05',
  feature_id: 'm05_start_latency',
  role: 'primary',
  families: ['proto_m05_start_'],
  eligibility:
    'per ACCEPTED occasion o1 / o2 (offer_answered.accepted true); a declined occasion is excluded; status from the act events: started (a started event), deferred, exited (with detail), cap (cap_reached), interrupted (an accepted open occasion closed by the review), open otherwise',
  numerator:
    'none (a per-occasion object, never summed or averaged; numerator and denominator null)',
  denominator: 'none',
  missing_rule:
    'observed when at least one accepted occasion carries a status; pending while an accepted occasion is open (the observed value kept) and when an offer is presented and unanswered with nothing else; declined when every offered job was declined; not_presented when no offer; a record claiming a start without its started event, or a start event under another status => technical_failure; row censored when any occasion is cap / interrupted / open',
  page_load_treatment:
    "reloaded: M05 stage 3 is the answer's opportunity_opened (RL-2 reading (a)); H/U/M or a marker => held: HB alone interrupted null, HB + an observed occasion interrupted with the map kept; without a check an offer presented and unanswered is U (RL-1C A) and an unreached occasion F5-held; A => first-load reading (OBS + NOP observed)",
  citations: [
    'REG:6489-6582',
    'ADD:1892',
    'R3:238-250',
    'REG:14538-14571',
    'REG:14594-14600',
    'ADD:1697-1752',
  ],
};
const S_M05_C: RecountSpecEntry = {
  item: 'M05',
  feature_id: 'm05_acceptance_exposure',
  role: 'companion',
  families: ['proto_m05_start_'],
  eligibility:
    'per offered occasion: offer presentations and refused presses, answer position and latency, eligibility and wait_before_eligible_ms, distance_px_at_eligibility, exposure, excluded ms by cause, control views, first control view, refused surface presses, start input mode, work completion, late start, closure reason',
  numerator: 'n/a (structured value)',
  denominator: 'n/a',
  missing_rule:
    'null when never offered; {declined} / {pending} / {interrupted} markers',
  page_load_treatment: 'held occasions marked interrupted',
  citations: ['REG:6560-6565'],
};

function m05(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m05_start_');
  const OCCS = ['o1', 'o2'];
  const c = classify(input, f, OCCS);
  const mks = markers(f);
  interface O {
    offered: boolean;
    answered: boolean;
    accepted: boolean | null;
    opened: boolean;
    status: string | null; // started | deferred | exited | cap | interrupted | open
    latF: number | null;
    latW: number | null;
    expF: number | null;
    censored: boolean;
    closure: string | null;
    defect: string | null;
    any: boolean;
    evs: RecountEvent[];
  }
  const occ: Record<string, O> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const pres = evs.some((e) => sfx(f, e) === 'presented');
    const ans = evs.find((e) => sfx(f, e) === 'offer_answered');
    const opened = evs.some((e) => sfx(f, e) === 'opportunity_opened');
    const accepted = ans ? bool(md(ans).accepted) : null;
    const started = evs.find((e) => sfx(f, e) === 'started');
    const deferred = evs.find((e) => sfx(f, e) === 'deferred');
    const exited = evs.find((e) => sfx(f, e) === 'exited');
    const cap = evs.find((e) => sfx(f, e) === 'cap_reached');
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    let status: string | null = null;
    let closure: string | null = null;
    let censored = false;
    // the first terminal act decides the status (a start after any closure is a late start)
    const terminal = [started, deferred, exited, cap]
      .filter((e): e is RecountEvent => !!e)
      .sort((a, b) => (seqOf(a) ?? 0) - (seqOf(b) ?? 0))[0];
    if (accepted === true) {
      if (terminal === started && started) {
        status = 'started';
        closure = 'completed';
      } else if (terminal === deferred && deferred) {
        status = 'deferred';
        closure = 'voluntary_stop';
      } else if (terminal === exited && exited) {
        status = 'exited';
        closure = 'route_departure';
      } else if (terminal === cap && cap) {
        status = 'cap';
        closure = 'cap';
        censored = true;
      } else if (closed) {
        status = 'interrupted';
        closure = 'closed_at_review';
        censored = true;
      } else {
        status = 'open';
        censored = true;
      }
    }
    let defect: string | null = null;
    const rc =
      closed && isObj(md(closed).raw_components)
        ? (md(closed).raw_components as Md)
        : null;
    if (rc && rc.status === 'started' && !started)
      defect = 'record_claims_start_without_event';
    if (
      started &&
      rc &&
      rc.status !== undefined &&
      rc.status !== null &&
      rc.status !== 'started' &&
      terminal === started
    )
      defect = 'start_event_under_other_status';
    occ[o] = {
      offered: pres || !!ans,
      answered: !!ans,
      accepted,
      opened,
      status,
      latF:
        status === 'started' && started
          ? num(md(started).latency_focused_ms)
          : null,
      latW:
        status === 'started' && started
          ? num(md(started).latency_wall_ms)
          : null,
      expF: rc
        ? num(rc.exposure_focused_ms)
        : status === 'started' && started
          ? num(md(started).latency_focused_ms)
          : null,
      censored,
      closure,
      defect,
      any: evs.length > 0,
      evs,
    };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS) {
    // RL-2: stage 3 is the answer's opportunity_opened; "presented" for the no-check rule = an offer presented
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      occ[o].opened,
      occ[o].offered && !occ[o].answered,
      occ[o].any,
    );
  }
  const live = OCCS.filter((o) => !holds[o].held);
  const accepted = live.filter((o) => occ[o].accepted === true);
  const mapEntry = (o: string): Md => ({
    status: occ[o].status,
    latency_focused_ms: occ[o].latF,
    latency_wall_ms: occ[o].latW,
    exposure_focused_ms: occ[o].expF,
    censored: occ[o].censored,
    closure_reason: occ[o].closure,
  });
  const valueMap = (): Md => {
    const v: Md = {};
    for (const o of accepted) v[o] = mapEntry(o);
    for (const o of OCCS)
      if (holds[o].held)
        v[o] = {
          status: 'interrupted',
          latency_focused_ms: null,
          latency_wall_ms: null,
          exposure_focused_ms: null,
          censored: true,
          closure_reason: null,
        };
    return v;
  };
  const comps: Md = {
    accepted_occasions: accepted,
    observed_occasions: accepted.filter((o) => occ[o].status !== 'open'),
    declined_occasions: live.filter((o) => occ[o].accepted === false),
    pending_occasions: accepted.filter((o) => occ[o].status === 'open'),
    interrupted_occasions: OCCS.filter(
      (o) => holds[o].held || occ[o].status === 'interrupted',
    ),
    status_by_occasion: Object.fromEntries(
      OCCS.map((o) => [o, holds[o].held ? 'interrupted' : occ[o].status]),
    ),
    starters: accepted.filter((o) => occ[o].status === 'started').length,
    non_starters: accepted.filter(
      (o) => occ[o].status !== 'started' && occ[o].status !== 'open',
    ).length,
    started_event_agrees: !OCCS.some((o) => occ[o].defect),
  };
  const held = OCCS.filter((o) => holds[o].held);
  let p: RecountRecord;
  const withStatus = accepted.filter(
    (o) => occ[o].status !== null && occ[o].status !== 'open',
  );
  if (c.reloaded && c.malformed)
    p = mk(
      S_M05_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
      comps,
    );
  else if (OCCS.some((o) => occ[o].defect))
    p = mk(
      S_M05_P,
      null,
      null,
      null,
      'technical_failure',
      'started_event_disagrees',
      comps,
    );
  else if (held.length > 0) {
    const reason =
      'held:' + held.map((o) => o + '=' + holds[o].basis).join(',');
    if (withStatus.length > 0)
      p = mk(S_M05_P, valueMap(), null, null, 'interrupted', reason, {
        ...comps,
        censored: true,
      });
    else p = mk(S_M05_P, null, null, null, 'interrupted', reason, comps);
  } else if (accepted.some((o) => occ[o].status === 'open')) {
    p = mk(
      S_M05_P,
      withStatus.length > 0 ? valueMap() : null,
      null,
      null,
      'pending',
      'accepted_occasion_open',
      { ...comps, censored: true },
    );
  } else if (withStatus.length > 0) {
    const cens = accepted.some((o) => occ[o].censored);
    p = mk(
      S_M05_P,
      valueMap(),
      null,
      null,
      'observed',
      null,
      cens ? { ...comps, censored: true } : comps,
    );
  } else if (live.some((o) => occ[o].offered && !occ[o].answered)) {
    p = mk(
      S_M05_P,
      null,
      null,
      null,
      'pending',
      'offered_never_answered',
      comps,
    );
  } else if (live.some((o) => occ[o].accepted === false)) {
    p = mk(
      S_M05_P,
      null,
      null,
      null,
      'declined',
      'every_offer_declined',
      comps,
    );
  } else {
    p = mk(S_M05_P, null, null, null, 'not_presented', 'no_offer', comps);
  }
  // companion
  const entry = (o: string): unknown => {
    const v = occ[o];
    if (holds[o].held) return { occasion: o, interrupted: true };
    if (!v.offered) return null;
    if (v.accepted === false) return { occasion: o, declined: true };
    if (!v.answered || v.status === 'open')
      return { occasion: o, pending: true };
    const ans = v.evs.find((e) => sfx(f, e) === 'offer_answered');
    const el = v.evs.find((e) => sfx(f, e) === 'eligible');
    const cps = v.evs.filter((e) => sfx(f, e) === 'control_presented');
    const st = v.evs.find((e) => sfx(f, e) === 'started');
    const late = v.evs.find((e) => sfx(f, e) === 'late_start');
    const wc = v.evs.find((e) => sfx(f, e) === 'work_completed');
    const closed = v.evs.find((e) => sfx(f, e) === 'window_closed');
    const rc =
      closed && isObj(md(closed).raw_components)
        ? (md(closed).raw_components as Md)
        : {};
    return {
      occasion: o,
      offer_presentations: ans ? (md(ans).presentations ?? null) : null,
      offer_refused_presses: v.evs.filter(
        (e) => sfx(f, e) === 'offer_press_refused',
      ).length,
      answer_option_position: ans ? (md(ans).option_position ?? null) : null,
      offer_latency_ms: ans ? (md(ans).offer_latency_ms ?? null) : null,
      eligible: !!el,
      wait_before_eligible_ms: el
        ? (md(el).wait_before_eligible_ms ?? null)
        : null,
      distance_px_at_eligibility: el ? (md(el).distance_px ?? null) : null,
      exposure_focused_ms: rc.exposure_focused_ms ?? null,
      exposure_wall_ms: rc.exposure_wall_ms ?? null,
      excluded_ms: rc.excluded_ms ?? (st ? (md(st).excluded_ms ?? null) : null),
      control_views: cps.length,
      first_control_view_focused_ms: cps[0]
        ? (md(cps[0]).focused_ms ?? null)
        : null,
      refused_surface_presses: v.evs.filter(
        (e) => sfx(f, e) === 'press_refused',
      ).length,
      start_input_mode: st ? (md(st).input_mode ?? null) : null,
      work_completed: !!wc,
      late_start: late
        ? {
            after: md(late).after ?? null,
            since_closure_ms: md(late).since_closure_ms ?? null,
          }
        : null,
      closure_reason: v.closure,
    };
  };
  const value = { o1: entry('o1'), o2: entry('o2') };
  let cd: string;
  let cv: unknown = value;
  if (p.disposition === 'technical_failure') {
    cd = 'technical_failure';
    cv = null;
  } else if (value.o1 === null && value.o2 === null) {
    cd = p.disposition;
    cv = null;
  } else if (OCCS.some((o) => !holds[o].held && occ[o].answered))
    cd = 'observed';
  else cd = p.disposition;
  return [
    p,
    mk(S_M05_C, cv, null, null, cd, cd === p.disposition ? p.reason : null),
  ];
}

// ================================================================ M06

const S_M06_P: RecountSpecEntry = {
  item: 'M06',
  feature_id: 'm06_unique_correct_orders',
  role: 'primary',
  families: ['proto_m06_orders_'],
  eligibility:
    'the one work period of the current load (period_begun); orders from order_presented (order_index, line)',
  numerator:
    "distinct order_index with an order_dispatched whose line equals the presented order's line (re-checked against the form) and whose focused_ms <= 60000; compared with each dispatch's correct flag and with period_ended / window record counts (disagreement => technical_failure)",
  denominator:
    'none: the fixed 60 s focused budget (numerator = count, denominator null)',
  missing_rule:
    'never begun: ready screen shown and Begin never pressed => declined; practice abandoned => no_eligible_event (both at the closure; pending while open); presented never opened => declined; not presented => not_presented; period open => pending; a review-closed open period => incomplete with the count, censored (REG §5.63, superseding "observed + censored")',
  page_load_treatment:
    'reloaded: class from the check; H/U/M => interrupted; a marker is read only while nothing was opened in this load (REG §5.406 (2)); no check + presented unopened => U interrupted; no check + nothing => interrupted',
  citations: [
    'REG:6584-6660',
    'ADD:1893',
    'REG:7898-7903',
    'REG:7924-7927',
    'REG:7942-7946',
    'R3:254',
    'REG:14354-14400',
  ],
};
const S_M06_C: RecountSpecEntry = {
  item: 'M06',
  feature_id: 'm06_work_period_detail',
  role: 'companion',
  families: ['proto_m06_orders_'],
  eligibility: 'a begun work period',
  numerator:
    'n/a (first_pass_accuracy = first-pass correct / attempted orders, null when nothing attempted)',
  denominator: 'n/a',
  missing_rule:
    'null with a technical-failure primary (REG §5.66) and with a null primary',
  page_load_treatment: 'as the primary',
  citations: ['REG:6629-6634', 'REG:7924-7927'],
};

function m06(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m06_orders_');
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT);
  const opened = ofType(f, 'opportunity_opened').length > 0;
  const presented = ofType(f, 'presented').length > 0;
  const hold = holdFor(
    c,
    OCC_DEFAULT,
    opened ? [] : mks,
    opened,
    presented,
    f.evs.length > 0,
  );
  const diag = exposureDiagnostics(c, [OCC_DEFAULT], () => opened);
  const diagComp = diag
    ? { exposure_record_consistent: diag.exposure_record_consistent }
    : {};
  const closed = firstOf(f, 'window_closed');
  const begun = firstOf(f, 'period_begun');
  const ended = firstOf(f, 'period_ended');
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const pres = new Map<number, unknown>();
  for (const e of ofType(f, 'order_presented')) {
    const i = num(md(e).order_index);
    if (i !== null && !pres.has(i)) pres.set(i, md(e).line);
  }
  const disp = ofType(f, 'order_dispatched');
  const defects: string[] = [];
  const correctSet = new Set<number>();
  const attempted = new Set<number>();
  let firstPass = 0;
  let rework = 0;
  let invalid = 0;
  for (const d of disp) {
    const m = md(d);
    const i = num(m.order_index);
    if (i === null || !pres.has(i)) {
      defects.push('dispatch_without_presented_order');
      continue;
    }
    const ok = stableJson(m.line) === stableJson(pres.get(i));
    if (bool(m.correct) !== null && bool(m.correct) !== ok)
      defects.push('correct_flag_disagrees_' + i);
    attempted.add(i);
    const att = num(m.attempt);
    if (att !== null && att > 1) rework++;
    if (!ok) invalid++;
    if (att === 1 && ok) firstPass++;
    const fm = num(m.focused_ms);
    if (ok && fm !== null && fm <= 60000) correctSet.add(i);
  }
  const n = correctSet.size;
  const rc =
    closed && isObj(md(closed).raw_components)
      ? (md(closed).raw_components as Md)
      : null;
  if (
    ended &&
    num(md(ended).unique_correct_orders) !== null &&
    num(md(ended).unique_correct_orders) !== n
  )
    defects.push('period_ended_count_disagrees');
  if (
    rc &&
    num(rc.unique_correct_orders) !== null &&
    num(rc.unique_correct_orders) !== n
  )
    defects.push('window_count_disagrees');
  const stopKind = ended ? str(md(ended).stop_kind) : null;
  const comps: Md = {
    budget_ms: 60000,
    recount_agrees: defects.length === 0,
    practice_passed: ofType(f, 'practice_passed').length > 0,
    ready_shown: ofType(f, 'ready_shown').length > 0,
    refused_presses: ofType(f, 'press_refused').length,
    ...diagComp,
  };
  const detail = (): Md => ({
    first_pass_correct: firstPass,
    orders_attempted: attempted.size,
    first_pass_accuracy: attempted.size > 0 ? firstPass / attempted.size : null,
    rework_dispatches: rework,
    invalid_dispatches: invalid,
    orders_skipped: ofType(f, 'order_skipped').length,
    orders_handled: ended ? (md(ended).orders_handled ?? null) : null,
    actual_stop_focused_ms: ended
      ? (md(ended).actual_stop_focused_ms ?? null)
      : null,
    stop_kind: stopKind,
    practice_attempts: ofType(f, 'practice_dispatched').length,
    refused_presses: ofType(f, 'press_refused').length,
    token_presses: ofType(f, 'token_pressed').length,
    clears: ofType(f, 'buffer_cleared').length,
    reference_consults: ofType(f, 'reference_consulted').length,
    typed_lines: ofType(f, 'line_typed').length,
    buffer_discarded_at_end: ended
      ? (md(ended).buffer_discarded ?? null)
      : null,
    orders: disp.map((d) => ({
      order_index: md(d).order_index ?? null,
      attempt: md(d).attempt ?? null,
      correct: md(d).correct ?? null,
      focused_ms: md(d).focused_ms ?? null,
    })),
  });
  const two = (
    pd: string,
    r: string | null,
    v: number | null,
    comp: Md,
    withDetail: boolean,
  ): RecountRecord[] => [
    mk(S_M06_P, v, v, null, pd, r, comp),
    mk(
      S_M06_C,
      withDetail ? detail() : null,
      null,
      null,
      pd,
      withDetail ? null : r,
    ),
  ];
  if (c.reloaded && c.malformed)
    return two(
      'technical_failure',
      'check_record_malformed',
      null,
      comps,
      false,
    );
  if (hold.held)
    return two('interrupted', 'held:' + hold.basis, null, comps, false);
  if (faults.length > 0 || defects.length > 0)
    return two(
      'technical_failure',
      defects.length
        ? 'record_disagrees:' + defects[0]
        : 'technical_failure_record',
      null,
      comps,
      false,
    );
  if (!opened) {
    return presented
      ? two('declined', 'listed_never_opened', null, comps, false)
      : two('not_presented', 'never_presented', null, comps, false);
  }
  if (!begun) {
    if (!closed)
      return two(
        'pending',
        'console_open_period_not_begun',
        null,
        comps,
        false,
      );
    if (comps.ready_shown)
      return two(
        'declined',
        'ready_shown_begin_never_pressed',
        null,
        { ...comps, censor_reason: 'work period never begun' },
        false,
      );
    return two(
      'no_eligible_event',
      'practice_not_passed',
      null,
      { ...comps, censor_reason: 'work period never begun' },
      false,
    );
  }
  if (!ended || stopKind === 'review') {
    if (!closed && !ended)
      return two('pending', 'period_open', null, comps, false);
    return two(
      'incomplete',
      'review_closed_open_period',
      n,
      {
        ...comps,
        censored: true,
        exposure_focused_ms: ended
          ? (md(ended).actual_stop_focused_ms ?? null)
          : null,
      },
      true,
    );
  }
  return two('observed', null, n, comps, true);
}

// ================================================================ M07 (re-transcribed independently of the Part A recount)

const S_M07_P: RecountSpecEntry = {
  item: 'M07',
  feature_id: 'm07_stages_completed',
  role: 'primary',
  families: ['proto_m07_calibration_'],
  eligibility:
    "an ENTERED project (opportunity_opened, written only by the participant's opening) closed at the closing milestone (window_closed: completed at 6/6 or closed_at_review)",
  numerator:
    "distinct stages recounted from stage_advanced (1..6, in order; a duplicate, out-of-order or over-6 stage => technical_failure), compared with the closure record's stages_completed (disagreement => technical_failure); an entered project left at 0 is an observed 0",
  denominator: '6 (planned denominator 6; fraction)',
  missing_rule:
    'never presented => not_presented; end presented, never opened => pending (presented_not_entered) until the review, then no_eligible_event (presented_not_entered, closed_at_review); opened, not closed => pending; integrity on the first-load reading: every family record (the check included) m07-calibration-v2 (v1 => technical_failure "superseded administration"), the M07 opportunity id, a usable distinct sequence',
  page_load_treatment:
    'v4: an event stamped with another page_load_index (its own envelope field) is excluded from the row, never a technical failure (REG §5.374); then precedence: a check record whose page_load_index FIELD names another load => technical_failure; the kit\'s hold-back (detail "reload…") with no opening => interrupted with its kind (prior_opening / unverified_history / prior_review_closure); a hold-back of no known kind or two hold-backs => technical_failure; ONE check establishing the absence (established, continuous, no opening found, >= 1 earlier record) => read as a first load; any other reloaded load => interrupted ("absence not established"), also when the bench ran (opened_after_unestablished_absence)',
  citations: [
    'REG:249-443',
    'ADD:1472-1562',
    'REG:13219-13225',
    'REG:13253-13318',
    'REG:13319-13380',
    'R3:379',
  ],
};
const S_M07_C: RecountSpecEntry = {
  item: 'M07',
  feature_id: 'm07_returns',
  role: 'companion',
  families: ['proto_m07_calibration_'],
  eligibility: 'the voluntary `returned` records of the current load',
  numerator: 'count of returned records (never in the primary value)',
  denominator: 'n/a',
  missing_rule: 'null with the primary',
  page_load_treatment: 'as the primary',
  citations: ['REG:369-371', 'ADD:1542-1543'],
};

function m07(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  // v4: "Records stamped with another page_load_index are excluded from the
  // row (current page load only), never a technical failure" (REG:13219-13225,
  // §5.374, M07); the check record's own page_load_index FIELD naming another
  // load stays a technical-integrity failure (the same entry; REG:378-380)
  const f0 = family(input, 'proto_m07_calibration_');
  const stamped = (e: RecountEvent): boolean =>
    typeof e.page_load_index !== 'number' ||
    e.page_load_index === input.page_load_index;
  const f: Fam = {
    prefix: f0.prefix,
    evs: f0.evs.filter(stamped),
    checks: f0.checks.filter(stamped),
    all: f0.all.filter(stamped),
  };
  const reloaded = input.page_load_index > 1;
  const opened = ofType(f, 'opportunity_opened');
  const returnedN = ofType(f, 'returned').length;
  const hold = f.evs.filter(
    (e) =>
      sfx(f, e) === 'technical_failure' &&
      (str(md(e).detail) ?? '').startsWith('reload'),
  );
  const kindOf = (d: string): string | null =>
    d.startsWith('reload after administration')
      ? 'prior_opening'
      : d.startsWith('reload with an unverified earlier state')
        ? 'unverified_history'
        : d.startsWith('reload after a review closure')
          ? 'prior_review_closure'
          : null;
  const chk = f.checks;
  const one = chk.length === 1 ? md(chk[0]) : null;
  const established =
    !!one &&
    one.prior_opening_absence_established === true &&
    one.history_continuous === true &&
    one.prior_opening_found !== true &&
    (num(one.prior_page_load_event_count) ?? 0) >= 1;
  const selfContradictory =
    !!one &&
    one.prior_opening_absence_established === true &&
    (one.history_continuous !== true ||
      one.prior_opening_found === true ||
      (num(one.prior_page_load_event_count) ?? 0) < 1);
  let erc = true;
  if (chk.length >= 2) erc = false;
  if (!reloaded && chk.length > 0) erc = false;
  if (selfContradictory) erc = false;
  if (hold.length === 1 && one) {
    const k = kindOf(str(md(hold[0]).detail) ?? '');
    if (
      (k === 'prior_opening' || k === 'unverified_history') &&
      one.prior_opening_absence_established === true
    )
      erc = false;
    if (
      k === 'prior_review_closure' &&
      one.prior_opening_absence_established !== true
    )
      erc = false;
  }
  if (reloaded && opened.length > 0 && !established) erc = false;
  const reloadCheck: Md = {
    page_reloaded: reloaded,
    checked: chk.length > 0,
    prior_opening_found: one ? (one.prior_opening_found ?? null) : null,
    prior_end_presented_found: one
      ? (one.prior_end_presented_found ?? null)
      : null,
    history_continuous: one ? (one.history_continuous ?? null) : null,
    prior_opening_absence_established: one
      ? (one.prior_opening_absence_established ?? null)
      : null,
  };
  const base: Md = {
    administration_version: 'm07-calibration-v2',
    stages_planned: 6,
    errors: 'not_defined',
    reload_check: reloadCheck,
    exposure_record_consistent: erc,
  };
  const both = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    comps: Md,
  ): RecountRecord[] => [
    mk(S_M07_P, v, n, dn, d, r, { ...base, ...comps }),
    mk(
      S_M07_C,
      v === null ? null : returnedN,
      null,
      null,
      d,
      v === null ? r : null,
    ),
  ];
  // reload precedence (Unit 24-A (4))
  if (chk.some((cr) => md(cr).page_load_index !== input.page_load_index))
    return both(
      'technical_failure',
      'check_record_describes_another_load',
      null,
      null,
      null,
      {},
    );
  if (hold.length > 0 && opened.length === 0) {
    if (hold.length > 1)
      return both(
        'technical_failure',
        'two_hold_back_records',
        null,
        null,
        null,
        {},
      );
    const k = kindOf(str(md(hold[0]).detail) ?? '');
    if (!k)
      return both(
        'technical_failure',
        'hold_back_of_unknown_kind',
        null,
        null,
        null,
        {},
      );
    return both('interrupted', 'held_back:' + k, null, null, null, {
      held_back_after_reload: true,
      hold_back_kind: k,
    });
  }
  if (reloaded && !(chk.length === 1 && established)) {
    return both(
      'interrupted',
      'absence_of_earlier_opening_not_established',
      null,
      null,
      null,
      opened.length > 0 ? { opened_after_unestablished_absence: true } : {},
    );
  }
  // first-load reading with its integrity (§5.259 / §5.284 / §5.372)
  for (const e of f.all) {
    const m = md(e);
    const v = str(m.entry_state_version);
    if (v === 'm07-calibration-v1')
      return both(
        'technical_failure',
        'superseded_administration_m07-calibration-v1',
        null,
        null,
        null,
        {},
      );
    if (v !== 'm07-calibration-v2')
      return both(
        'technical_failure',
        'unknown_administration_version',
        null,
        null,
        null,
        {},
      );
    if (m.opportunity_id !== 'proto_m07_calibration_project')
      return both(
        'technical_failure',
        'another_opportunity',
        null,
        null,
        null,
        {},
      );
  }
  const sc = checkSeq(f.all);
  if (!sc.ok)
    return both(
      'technical_failure',
      sc.missing.length ? 'event_without_usable_sequence' : 'shared_sequence',
      null,
      null,
      null,
      {},
    );
  const presented =
    ofType(f, 'end_presented').length > 0 || ofType(f, 'presented').length > 0;
  const closed = firstOf(f, 'window_closed');
  if (opened.length === 0) {
    if (!presented && !closed)
      return both('not_presented', 'never_presented', null, null, null, {
        exposure: 'not_presented',
      });
    if (!closed)
      return both('pending', 'presented_not_entered', null, null, null, {
        exposure: 'presented_not_entered',
      });
    if (!presented)
      return both('not_presented', 'never_presented', null, null, null, {
        exposure: 'not_presented',
      });
    return both(
      'no_eligible_event',
      'presented_not_entered',
      null,
      null,
      null,
      { exposure: 'presented_not_entered', closure_reason: 'closed_at_review' },
    );
  }
  if (opened.length > 1)
    return both('technical_failure', 'opened_twice', null, null, null, {});
  // stage recount
  let expect = 1;
  for (const e of ofType(f, 'stage_advanced')) {
    const s = num(md(e).stage);
    if (s === null || s !== expect || s > 6)
      return both(
        'technical_failure',
        'duplicate_out_of_order_or_over_6_stage',
        null,
        null,
        null,
        {},
      );
    expect++;
  }
  const stages = expect - 1;
  if (!closed)
    return both('pending', 'opened_not_closed', null, null, null, {
      exposure: 'entered',
      stages_completed: stages,
    });
  const rc = isObj(md(closed).raw_components)
    ? (md(closed).raw_components as Md)
    : null;
  if (
    rc &&
    num(rc.stages_completed) !== null &&
    num(rc.stages_completed) !== stages
  )
    return both(
      'technical_failure',
      'closure_disagrees_with_recount',
      null,
      null,
      null,
      {},
    );
  const comps: Md = {
    exposure: 'entered',
    stages_completed: stages,
    completion: stages === 6,
    returns: returnedN,
    departure_state: rc ? (rc.departure_state ?? null) : null,
    closure_reason: stages === 6 ? 'completed' : 'closed_at_review',
  };
  return both('observed', null, stages, stages, 6, comps);
}

// ================================================================ M08

const S_M08_P: RecountSpecEntry = {
  item: 'M08',
  feature_id: 'm08_work_choice_fraction',
  role: 'primary',
  families: ['proto_m08_effort_'],
  eligibility:
    'valid choices = choice_made records of the current load (Sort = work / Stand by = rest), one per slot (epoch); a Work choice cut off before its slot ran is a valid choice (REG §5.12)',
  numerator: 'Work choices',
  denominator: 'valid choices (6 planned; fewer => incomplete)',
  missing_rule:
    'no choice => null voluntary_stop once the console was opened and closed (pending while open); presented, never opened => declined; briefing never reached => not_presented',
  page_load_treatment:
    'reloaded: class from the check; H/U/M => interrupted; a marker is read only while nothing was opened (REG §5.406 (2)); no check + presented unopened => U interrupted; no check + nothing => interrupted',
  citations: [
    'REG:6233-6267',
    'ADD:1895',
    'REG:7607-7618',
    'R3:254',
    'REG:14354-14400',
  ],
};
const S_M08_C: RecountSpecEntry = {
  item: 'M08',
  feature_id: 'm08_work_choice_by_benefit',
  role: 'companion',
  families: ['proto_m08_effort_'],
  eligibility:
    'the valid choices split by the displayed benefit level (benefit_units 1 / 3)',
  numerator: 'Work choices per level',
  denominator: 'valid choices per level',
  missing_rule:
    "null with the primary's disposition at zero valid choices; incomplete below three valid choices per level",
  page_load_treatment: 'as the primary',
  citations: ['REG:6255-6256'],
};

function m08(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m08_effort_');
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT);
  const opened = ofType(f, 'opportunity_opened').length > 0;
  const presented = ofType(f, 'presented').length > 0;
  const hold = holdFor(
    c,
    OCC_DEFAULT,
    opened ? [] : mks,
    opened,
    presented,
    f.evs.length > 0,
  );
  const diag = exposureDiagnostics(c, [OCC_DEFAULT], () => opened);
  const diagComp = diag
    ? { exposure_record_consistent: diag.exposure_record_consistent }
    : {};
  const closed = firstOf(f, 'window_closed');
  const seen = new Set<string>();
  const choices: Md[] = [];
  for (const e of ofType(f, 'choice_made')) {
    const m = md(e);
    const key = String(m.epoch ?? choices.length);
    if (seen.has(key)) continue; // one choice per slot
    seen.add(key);
    choices.push(m);
  }
  const work = choices.filter((m) => m.choice === 'work').length;
  const valid = choices.length;
  const level = (b: number) => {
    const xs = choices.filter((m) => num(m.benefit_units) === b);
    return {
      numerator: xs.filter((m) => m.choice === 'work').length,
      denominator: xs.length,
    };
  };
  const two = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
  ): RecountRecord[] => {
    const comps: Md = {
      work_choices: work,
      valid_choices: valid,
      choices_planned: 6,
      ...diagComp,
    };
    const p = mk(S_M08_P, v, n, dn, d, r, comps);
    let cr: RecountRecord;
    if (v === null || valid === 0) cr = mk(S_M08_C, null, null, null, d, r);
    else {
      const l1 = level(1);
      const l3 = level(3);
      const cd =
        l1.denominator < 3 || l3.denominator < 3
          ? 'incomplete'
          : d === 'incomplete'
            ? 'incomplete'
            : 'observed';
      cr = mk(
        S_M08_C,
        { benefit_1: l1, benefit_3: l3 },
        null,
        null,
        cd,
        cd === 'incomplete' ? 'fewer_than_three_valid_per_level' : null,
      );
    }
    return [p, cr];
  };
  if (c.reloaded && c.malformed)
    return two('technical_failure', 'check_record_malformed', null, null, null);
  if (hold.held)
    return two('interrupted', 'held:' + hold.basis, null, null, null);
  if (!opened)
    return presented
      ? two('declined', 'presented_never_opened', null, null, null)
      : two('not_presented', 'briefing_never_reached', null, null, null);
  if (valid === 0)
    return closed
      ? two('voluntary_stop', 'no_choice', null, null, null)
      : two('pending', 'console_open', null, null, null);
  if (!closed && valid < 6)
    return two('pending', 'console_open', null, null, null);
  if (valid < 6)
    return two('incomplete', 'fewer_than_six_valid_choices', work, work, valid);
  return two('observed', null, work, work, valid);
}

// ================================================================ M09

const S_M09_P: RecountSpecEntry = {
  item: 'M09',
  feature_id: 'm09_due_checks_fulfilled',
  role: 'primary',
  families: ['proto_m09_checks_'],
  eligibility:
    'checks of the ONE accepted duty (offer_answered answer accept): a check is eligible when opened with access (check_window_opened.access.available true) and closed by a reading (reason read) or by leaving the Concourse (left_concourse); a check censored at the review, opened without access or never opened is outside the denominator',
  numerator:
    'eligible checks with exactly one check_fulfilled inside their window (between its check_window_opened and check_window_closed), compared with the closure snapshot; uncredited and late readings never enter',
  denominator:
    'eligible checks (3 planned; fewer => incomplete with the value)',
  missing_rule:
    'declined => declined; offer unanswered => no_eligible_event; never offered => not_presented; duty open => pending; contradictory evidence (a duplicate or out-of-order opening, an act outside its window or before acceptance, a second credited outcome, a snapshot disagreement, an unknown version) or an accepted duty whose family events lack usable unique sequences (REG §5.259) => technical_failure',
  page_load_treatment:
    "reloaded: stage 3 = the offer's presentation (RL-2 reading (a), confirmed by closeout ruling 1); H/U/M or a marker => interrupted; A => first-load; no check + presented unanswered => U interrupted; no check + nothing => interrupted",
  citations: [
    'REG:5485-5545',
    'REG:5628-5661',
    'REG:5424-5449',
    'ADD:126-158',
    'ADD:228-243',
    'ADD:1896',
    'REG:9761-9800',
    'REG:14538-14571',
    'REG:14703-14714',
    'ADD:1697-1752',
  ],
};

function m09(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m09_checks_');
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT);
  const presented = ofType(f, 'presented').length > 0;
  const ans = firstOf(f, 'offer_answered');
  const hold = holdFor(
    c,
    OCC_DEFAULT,
    mks,
    presented && !!ans,
    presented && !ans,
    f.evs.length > 0,
  );
  const one = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    comps: Md = {},
  ) => [mk(S_M09_P, v, n, dn, d, r, comps)];
  if (c.reloaded && c.malformed)
    return one('technical_failure', 'check_record_malformed', null, null, null);
  if (hold.held)
    return one('interrupted', 'held:' + hold.basis, null, null, null);
  if (!presented && !ans)
    return one('not_presented', 'never_offered', null, null, null);
  if (!ans)
    return one('no_eligible_event', 'offer_unanswered', null, null, null);
  const answer = str(md(ans).answer);
  if (answer === 'decline')
    return one('declined', 'duty_declined', null, null, null);
  if (answer !== 'accept')
    return one('technical_failure', 'unknown_answer', null, null, null);
  // accepted duty: the order is read only when it can be verified (REG §5.259)
  const sc = checkSeq(f.all);
  if (!sc.ok)
    return one(
      'technical_failure',
      sc.missing.length
        ? 'event_without_usable_sequence'
        : 'two_events_share_a_sequence',
      null,
      null,
      null,
    );
  for (const e of f.all)
    if (str(md(e).entry_state_version) !== 'm09-watch-checks-v1')
      return one('technical_failure', 'unknown_version', null, null, null);
  const closedDuty = firstOf(f, 'window_closed');
  const opens = ofType(f, 'check_window_opened');
  const closes = ofType(f, 'check_window_closed');
  const fulfils = ofType(f, 'check_fulfilled');
  const defects: string[] = [];
  let eligible = 0;
  let fulfilled = 0;
  const perCheck: Md[] = [];
  for (const k of [1, 2, 3]) {
    const op = opens.filter((e) => num(md(e).check_index) === k);
    const cl = closes.filter((e) => num(md(e).check_index) === k);
    const fu = fulfils.filter((e) => num(md(e).check_index) === k);
    if (op.length > 1) defects.push('duplicate_opening_' + k);
    if (op[0] && !before(ans, op[0]))
      defects.push('opening_before_acceptance_' + k);
    if (k > 1) {
      const prevOpen = opens.find((e) => num(md(e).check_index) === k - 1);
      if (op[0] && (!prevOpen || !before(prevOpen, op[0])))
        defects.push('out_of_order_opening_' + k);
    }
    if (!op[0]) {
      if (fu.length || cl.length) defects.push('act_outside_window_' + k);
      perCheck.push({ check_index: k, status: 'never_opened' });
      continue;
    }
    const inWin = fu.filter(
      (e) => before(op[0], e) && (!cl[0] || before(e, cl[0])),
    );
    if (fu.length !== inWin.length)
      defects.push('fulfilment_outside_window_' + k);
    if (inWin.length > 1) defects.push('second_credited_outcome_' + k);
    if (cl.length > 1) defects.push('duplicate_closure_' + k);
    const access = isObj(md(op[0]).access)
      ? (md(op[0]).access as Md).available === true
      : false;
    const reason = cl[0] ? str(md(cl[0]).reason) : null;
    const outcome = cl[0] ? str(md(cl[0]).outcome) : null;
    const ok = inWin.length === 1;
    if (
      cl[0] &&
      outcome !== null &&
      reason !== 'review' &&
      (outcome === 'fulfilled') !== ok
    )
      defects.push('closure_outcome_disagrees_' + k);
    const isElig = access && (reason === 'read' || reason === 'left_concourse');
    if (isElig) {
      eligible++;
      if (ok) fulfilled++;
    }
    perCheck.push({
      check_index: k,
      status: cl[0]
        ? isElig
          ? ok
            ? 'fulfilled'
            : 'missed'
          : reason === 'review'
            ? 'censored'
            : 'no_access'
        : 'open',
      access_available: access,
    });
  }
  const rc =
    closedDuty && isObj(md(closedDuty).raw_components)
      ? (md(closedDuty).raw_components as Md)
      : null;
  if (rc) {
    const snapChecks = arr(rc.checks) ?? [];
    for (const sc2 of snapChecks) {
      if (!isObj(sc2)) continue;
      const k = num(sc2.check_index);
      const pc = perCheck.find((x) => x.check_index === k);
      if (pc && sc2.outcome !== undefined) {
        const recountOutcome =
          pc.status === 'fulfilled'
            ? 'fulfilled'
            : pc.status === 'missed'
              ? 'missed'
              : pc.status === 'censored'
                ? 'censored'
                : null;
        if (recountOutcome !== null && sc2.outcome !== recountOutcome)
          defects.push('snapshot_disagrees_check_' + k);
      }
    }
  }
  const comps: Md = {
    checks: perCheck,
    observations_share_one_duty: true,
    administration_version: 'm09-watch-checks-v1',
  };
  if (defects.length)
    return one(
      'technical_failure',
      'contradictory_evidence:' + defects[0],
      null,
      null,
      null,
      { ...comps, defects },
    );
  if (!closedDuty) return one('pending', 'duty_open', null, null, null, comps);
  if (eligible === 0)
    return one(
      'no_eligible_event',
      'no_eligible_check:gap_G-M09-1',
      null,
      null,
      0,
      comps,
    );
  return one(
    eligible < 3 ? 'incomplete' : 'observed',
    eligible < 3 ? 'fewer_than_three_checks_reached' : null,
    fulfilled,
    fulfilled,
    eligible,
    comps,
  );
}

// ================================================================ M10

const S_M10_P: RecountSpecEntry = {
  item: 'M10',
  feature_id: 'm10_obligations_fulfilled',
  role: 'primary',
  families: ['proto_m10_delivery_'],
  eligibility:
    "per delivery d1 / d2: accepted (offer_answered accept) and accessible (a person_present record of the recipient or of the permitted delegate whose sequence follows BOTH the acceptance and the delivery's opportunity_opened); an accepted delivery with no presence record is inaccessible and excluded",
  numerator:
    "deliveries handed to their recipient (handed_over to the recipient, the delivery's own object) + deliveries left with the permitted delegate after the delegate's stated acceptance (delegate_accepted, then delegated with the delivery's own object), before the delivery's closure; late acts never enter",
  denominator:
    'accepted, accessible deliveries (conditional; complete at any size above zero); a delivery still carried at the station-record closure is an observed non-fulfilment when accessible',
  missing_rule:
    "none accepted and some declined => declined; none answered, or none accessible => no_eligible_event; never offered => not_presented; a delivery still open => pending; contradictory / malformed evidence (a presence before acceptance or opening, a duplicate or out-of-order opening, a handover to the wrong person or with the wrong object, a delegation with the wrong object or without the delegate's acceptance, a snapshot disagreement, an unknown version) or an accepted delivery whose events lack usable unique sequences => technical_failure",
  page_load_treatment:
    "reloaded: per delivery, stage 3 = the offer's presentation; H/U/M or a marker => held: interrupted with the other delivery's value kept (censored); with a check an unreached non-A delivery reads held (closeout ruling 2); without a check an offer presented and unanswered is U, an unreached delivery keeps not_presented beside the other; a held delivery is never counted as offered or pending",
  citations: [
    'REG:5547-5601',
    'REG:5628-5661',
    'REG:5451-5483',
    'REG:5424-5449',
    'ADD:160-226',
    'ADD:228-243',
    'ADD:1897',
    'R3:252',
    'REG:14538-14600',
    'REG:14714-14723',
    'ADD:1697-1752',
  ],
};

function m10(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m10_delivery_');
  const OCCS = ['d1', 'd2'];
  const occOf = (m: Md) => str(m.delivery) ?? str(m.occasion);
  const c = classify(input, f, OCCS);
  const mks = markers(f, occOf);
  const OBJ: Record<string, string> = {
    d1: 'm10_calibration_key_card',
    d2: 'm10_yard_logbook',
  };
  interface D {
    st: 'NOP' | 'UNANS' | 'DEC' | 'ACC';
    accessible: boolean;
    fulfilled: 'direct' | 'delegated' | null;
    open: boolean;
    defect: string | null;
    presented: boolean;
    answered: boolean;
    any: boolean;
  }
  const dl: Record<string, D> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => occOf(md(e)) === o);
    const all = f.all.filter((e) => occOf(md(e)) === o);
    const pres = evs.find((e) => sfx(f, e) === 'presented');
    const ans = evs.find((e) => sfx(f, e) === 'offer_answered');
    const opens = evs.filter((e) => sfx(f, e) === 'opportunity_opened');
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    const presence = evs.filter((e) => sfx(f, e) === 'person_present');
    let defect: string | null = null;
    let st: D['st'] = 'NOP';
    if (ans)
      st =
        str(md(ans).answer) === 'accept'
          ? 'ACC'
          : str(md(ans).answer) === 'decline'
            ? 'DEC'
            : 'UNANS';
    else if (pres) st = 'UNANS';
    if (st !== 'ACC' && presence.length > 0)
      defect = 'presence_without_acceptance';
    let accessible = false;
    let fulfilled: D['fulfilled'] = null;
    if (st === 'ACC') {
      const sc = checkSeq(all);
      if (!sc.ok)
        defect = sc.missing.length
          ? 'event_without_usable_sequence'
          : 'two_events_share_a_sequence';
      else {
        if (
          all.some(
            (e) => str(md(e).entry_state_version) !== 'm10-deliveries-v1',
          )
        )
          defect = 'unknown_version';
        if (opens.length > 1) defect = 'duplicate_opening';
        const op = opens[0];
        if (!op || !before(ans, op))
          defect = defect ?? 'opening_missing_or_before_acceptance';
        const recipient = str(md(pres).recipient);
        const delegate = str(md(pres).permitted_delegate);
        for (const p of presence) {
          if (!before(ans, p) || !before(op, p))
            defect = defect ?? 'presence_before_acceptance_or_opening';
          const role = str(md(p).role);
          const person = str(md(p).person);
          if (
            (role === 'recipient' && person === recipient) ||
            (role === 'delegate' && person === delegate)
          ) {
            if (!closed || before(p, closed)) accessible = true;
          }
        }
        const ho = evs.filter((e) => sfx(f, e) === 'handed_over');
        const dg = evs.filter((e) => sfx(f, e) === 'delegated');
        const da = evs.filter((e) => sfx(f, e) === 'delegate_accepted');
        for (const h of ho) {
          if (str(md(h).to) !== recipient || str(md(h).object) !== OBJ[o])
            defect = defect ?? 'handover_wrong_person_or_object';
          if (!before(op, h)) defect = defect ?? 'act_before_opening';
        }
        for (const g of dg) {
          if (str(md(g).object) !== OBJ[o])
            defect = defect ?? 'delegation_wrong_object';
          if (str(md(g).to) !== delegate)
            defect = defect ?? 'delegation_wrong_person';
          if (!da.some((a) => before(a, g)))
            defect = defect ?? 'delegation_without_stated_acceptance';
        }
        if (ho.length + dg.length > 1)
          defect = defect ?? 'second_credited_outcome';
        const act = [...ho, ...dg].sort(
          (a, b) => (seqOf(a) ?? 0) - (seqOf(b) ?? 0),
        )[0];
        if (act && (!closed || before(act, closed)))
          fulfilled = sfx(f, act) === 'handed_over' ? 'direct' : 'delegated';
        const rc =
          closed && isObj(md(closed).raw_components)
            ? (md(closed).raw_components as Md)
            : null;
        if (rc && rc.answer !== undefined && rc.answer !== 'accept')
          defect = defect ?? 'snapshot_disagrees';
      }
    }
    dl[o] = {
      st,
      accessible,
      fulfilled,
      open: st === 'ACC' && !closed,
      defect,
      presented: !!pres,
      answered: !!ans,
      any: evs.length > 0,
    };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS)
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      dl[o].answered,
      dl[o].presented && !dl[o].answered,
      dl[o].any,
      { unreachedHeldWithoutCheck: false },
    );
  // with a check, a non-A delivery that was presented in this load counts as held only when unanswered;
  // a delivery whose offer was presented AND answered in this load is current-load evidence.
  const live = OCCS.filter((o) => !holds[o].held);
  const one = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    comps: Md = {},
  ) => [mk(S_M10_P, v, n, dn, d, r, comps)];
  const elig = live.filter(
    (o) => dl[o].st === 'ACC' && dl[o].accessible && !dl[o].open,
  );
  const direct = elig.filter((o) => dl[o].fulfilled === 'direct').length;
  const delegated = elig.filter((o) => dl[o].fulfilled === 'delegated').length;
  const comps: Md = {
    direct,
    delegated,
    accepted: live.filter((o) => dl[o].st === 'ACC'),
    accessible: live.filter((o) => dl[o].st === 'ACC' && dl[o].accessible),
    held_deliveries: OCCS.filter((o) => holds[o].held),
  };
  if (c.reloaded && c.malformed)
    return one('technical_failure', 'check_record_malformed', null, null, null);
  const bad = OCCS.find((o) => !holds[o].held && dl[o].defect);
  if (bad)
    return one(
      'technical_failure',
      'contradictory_evidence:' + bad + ':' + dl[bad].defect,
      null,
      null,
      null,
      comps,
    );
  const held = OCCS.filter((o) => holds[o].held);
  if (held.length) {
    const reason =
      'held:' + held.map((o) => o + '=' + holds[o].basis).join(',');
    if (elig.length > 0)
      return one(
        'interrupted',
        reason,
        direct + delegated,
        direct + delegated,
        elig.length,
        { ...comps, censored: true },
      );
    return one('interrupted', reason, null, null, null, comps);
  }
  if (live.some((o) => dl[o].open))
    return one('pending', 'delivery_open', null, null, null, comps);
  if (elig.length > 0)
    return one(
      'observed',
      null,
      direct + delegated,
      direct + delegated,
      elig.length,
      comps,
    );
  const acc = live.filter((o) => dl[o].st === 'ACC');
  if (acc.length > 0)
    return one('no_eligible_event', 'none_accessible', null, null, 0, comps);
  if (
    live.some((o) => dl[o].st === 'DEC') &&
    !live.some((o) => dl[o].st === 'UNANS')
  )
    return one(
      'declined',
      'none_accepted_some_declined',
      null,
      null,
      null,
      comps,
    );
  if (live.some((o) => dl[o].st === 'DEC'))
    return one(
      'declined',
      'none_accepted_some_declined',
      null,
      null,
      null,
      comps,
    );
  if (live.some((o) => dl[o].st === 'UNANS'))
    return one('no_eligible_event', 'none_answered', null, null, null, comps);
  return one('not_presented', 'never_offered', null, null, null, comps);
}

// ================================================================ M11

const S_M11_P: RecountSpecEntry = {
  item: 'M11',
  feature_id: 'm11_unresolved_custodies',
  role: 'primary',
  families: ['proto_m11_custody_'],
  eligibility:
    'per occasion lab / yard: an accepted (offer_answered.accepted true), accessible (offer_answered.accessible true) custody; untaken (lapsed) and refused loans are outside the denominator',
  numerator:
    "custodies unresolved at the first departure (no `resolved` record before the occasion's first `departed`); late handovers are companions only",
  denominator:
    'accepted accessible custodies (0-2; conditional, complete at any size above zero)',
  missing_rule:
    'declined when every loan was refused or left untaken; no_eligible_event when no accepted loan could be carried (inaccessible); pending while a custody is open; not_presented when no briefing offered',
  page_load_treatment:
    "reloaded: stage 3 = the model's offer_presented (closeout ruling 1); H/U/M or a marker => held: interrupted, the other occasion's value kept; with a check an unreached non-A occasion reads held (closeout ruling 2); without a check an offer presented and unanswered is U; an unreached occasion keeps not_presented beside the other; a held loan is never counted as offered or pending",
  citations: [
    'REG:6269-6323',
    'ADD:1898',
    'R3:252',
    'REG:14538-14600',
    'REG:14714-14723',
    'ADD:1697-1752',
  ],
};
const S_M11_C: RecountSpecEntry = {
  item: 'M11',
  feature_id: 'm11_custody_records',
  role: 'companion',
  families: ['proto_m11_custody_'],
  eligibility:
    "per occasion: offer, answer, lapse, accessibility (v4: the answer's own offer_answered.accessible, the accessibility the eligibility reads, REG:6293-6300; null without an answer), resolution before departure with method and recipient, owner and return-point encounters while carrying, late handover",
  numerator: 'n/a (structured value)',
  denominator: 'n/a',
  missing_rule:
    "observed whenever an offer closed in this load (declined included); null only with a null primary and no closed offer (v4: applied also when every occasion is held, an earlier load's closed offer never being current-load evidence)",
  page_load_treatment:
    "a held occasion beside an occasion whose offer closed in this load is marked held (not stated; GAPS G-M11-2); with a null primary and no offer closed in this load => null with the primary's disposition",
  citations: ['REG:6293-6310'],
};

function m11(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m11_custody_');
  const OCCS = ['lab', 'yard'];
  const c = classify(input, f, OCCS);
  const mks = markers(f);
  interface O {
    offered: boolean;
    answered: boolean;
    accepted: boolean;
    refused: boolean;
    lapsed: boolean;
    accessible: boolean;
    unresolved: boolean | null;
    open: boolean;
    any: boolean;
    evs: RecountEvent[];
  }
  const occ: Record<string, O> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const offered = evs.some(
      (e) => sfx(f, e) === 'offer_presented' || sfx(f, e) === 'presented',
    );
    const ans = evs.find((e) => sfx(f, e) === 'offer_answered');
    const lapsed = evs.some((e) => sfx(f, e) === 'offer_lapsed');
    const accepted = !!ans && md(ans).accepted === true;
    const refused = !!ans && md(ans).accepted === false;
    const accessible = accepted && md(ans).accessible === true;
    const dep = evs.find((e) => sfx(f, e) === 'departed');
    const res = evs.find((e) => sfx(f, e) === 'resolved');
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    let unresolved: boolean | null = null;
    let open = false;
    if (accessible) {
      if (res && (!dep || before(res, dep))) unresolved = false;
      else if (dep) unresolved = true;
      else if (closed) unresolved = !res;
      else open = true;
    }
    occ[o] = {
      offered,
      answered: !!ans || lapsed,
      accepted,
      refused,
      lapsed,
      accessible,
      unresolved,
      open,
      any: evs.length > 0,
      evs,
    };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS)
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      occ[o].answered,
      occ[o].offered && !occ[o].answered,
      occ[o].any,
      { unreachedHeldWithoutCheck: false },
    );
  const live = OCCS.filter((o) => !holds[o].held);
  const elig = live.filter((o) => occ[o].accessible && !occ[o].open);
  const unres = elig.filter((o) => occ[o].unresolved === true).length;
  const held = OCCS.filter((o) => holds[o].held);
  let p: RecountRecord;
  if (c.reloaded && c.malformed)
    p = mk(
      S_M11_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
    );
  else if (held.length) {
    const reason =
      'held:' + held.map((o) => o + '=' + holds[o].basis).join(',');
    p = elig.length
      ? mk(S_M11_P, unres, unres, elig.length, 'interrupted', reason, {
          censored: true,
        })
      : mk(S_M11_P, null, null, null, 'interrupted', reason);
  } else if (live.some((o) => occ[o].open))
    p = mk(S_M11_P, null, null, null, 'pending', 'custody_open');
  else if (elig.length)
    p = mk(S_M11_P, unres, unres, elig.length, 'observed', null);
  else if (live.some((o) => occ[o].accepted))
    p = mk(
      S_M11_P,
      null,
      null,
      0,
      'no_eligible_event',
      'accepted_loan_inaccessible',
    );
  else if (live.some((o) => occ[o].refused || occ[o].lapsed))
    p = mk(
      S_M11_P,
      null,
      null,
      null,
      'declined',
      'every_loan_refused_or_untaken',
    );
  else if (live.some((o) => occ[o].offered))
    p = mk(S_M11_P, null, null, null, 'pending', 'offer_open');
  else p = mk(S_M11_P, null, null, null, 'not_presented', 'no_briefing_offer');
  const entry = (o: string): unknown => {
    const v = occ[o];
    if (holds[o].held) return { occasion: o, interrupted: true };
    if (!v.offered) return null;
    const ans = v.evs.find((e) => sfx(f, e) === 'offer_answered');
    const res = v.evs.find((e) => sfx(f, e) === 'resolved');
    const late = v.evs.find((e) => sfx(f, e) === 'late_resolved');
    return {
      occasion: o,
      offered: true,
      answer: ans
        ? md(ans).accepted === true
          ? 'accepted'
          : 'refused'
        : v.lapsed
          ? 'lapsed'
          : null,
      lapsed: v.lapsed,
      // v4: the record's own accessibility (REG:6293-6300), not the
      // eligibility flag (accepted AND accessible) v1-v3 wrote here
      accessible: ans
        ? typeof md(ans).accessible === 'boolean'
          ? md(ans).accessible
          : null
        : null,
      resolved_before_departure: v.accessible ? v.unresolved === false : null,
      resolution: res
        ? { method: md(res).method ?? null, to: md(res).to ?? null }
        : null,
      owner_encounters_while_carrying: v.evs.filter(
        (e) => sfx(f, e) === 'owner_available',
      ).length,
      return_point_encounters_while_carrying: v.evs.filter(
        (e) => sfx(f, e) === 'return_point_available',
      ).length,
      late_handover: late ? (md(late).to ?? true) : null,
    };
  };
  const value = { lab: entry('lab'), yard: entry('yard') };
  let cd = p.disposition;
  let cv: unknown = value;
  if (p.disposition === 'technical_failure') cv = null;
  else if (live.some((o) => occ[o].answered)) cd = 'observed';
  // v4: "null only with a null primary and no closed offer" (REG:6309-6310):
  // held occasions closed no offer in this load
  else if (p.value === null) cv = null;
  return [
    p,
    mk(S_M11_C, cv, null, null, cd, cd === p.disposition ? p.reason : null),
  ];
}

// ================================================================ M12

const S_M12_P: RecountSpecEntry = {
  item: 'M12',
  feature_id: 'm12_fields_verified',
  role: 'primary',
  families: ['proto_m12_check_'],
  eligibility:
    'per packet o1 / o2: a RELEASED product (released record) is observed; a released product with nothing judged is an observed 0; a packet opened and never released is missing (closed at the review: censored), never 0',
  numerator:
    'sum over released products of the distinct field ids with a field_judged (matches / differs) before the release; compared with released.fields_judged and the window record (disagreement => technical_failure on both rows)',
  denominator:
    '3 x released products (planned 6); one released => incomplete on 3',
  missing_rule:
    'no product released => null: declined (presented never opened), not_presented, pending (a packet open with nothing released), no_eligible_event null/0 (every opened packet closed without a release); a released product beside a review-closed one => incomplete, censored',
  page_load_treatment:
    'identical in structure to M01 (r3 §5 M12): HB+OBS interrupted x/3; HB with nothing observed interrupted null/null; A => first-load; RL-1C decision A and diagnostics',
  citations: [
    'REG:6662-6737',
    'ADD:1899',
    'R3:178-180',
    'REG:14354-14433',
    'ADD:1620-1695',
  ],
};
const S_M12_C: RecountSpecEntry = {
  item: 'M12',
  feature_id: 'm12_detection_and_correction',
  role: 'companion',
  families: ['proto_m12_check_'],
  eligibility:
    'per released product: fields checked / judged, judgements correct, judgement accuracy, faulty field checked / judged, fault detected (faulty field judged "differs"), correction attempted, correction successful (entered value equals the reference; null when not attempted), unnecessary corrections, refused presses, keypad openings, abandoned corrections; v4: per-field records (field_id, field_index, checked, judgement, judgement latency = the first judgement\'s latency_ms, refused presses, keypad openings, abandoned corrections); "actions" is named but not defined at the event level and is not emitted (GAPS G-M12-1)',
  numerator: 'n/a (structured value)',
  denominator: 'n/a',
  missing_rule: 'null with the primary',
  page_load_treatment: 'as the primary',
  citations: ['REG:94', 'REG:6716-6721'],
};

function m12(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m12_check_');
  const OCCS = ['o1', 'o2'];
  const c = classify(input, f, OCCS);
  const mks = markers(f);
  type St = 'REL' | 'OPEN' | 'OU' | 'DEC' | 'NOP';
  interface O {
    st: St;
    x: number | null;
    disagree: boolean;
    opened: boolean;
    presented: boolean;
    any: boolean;
    evs: RecountEvent[];
  }
  const occ: Record<string, O> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const opened = evs.some((e) => sfx(f, e) === 'opportunity_opened');
    const presented = evs.some((e) => sfx(f, e) === 'presented');
    const rel = evs.find((e) => sfx(f, e) === 'released');
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    let st: St = 'NOP';
    let x: number | null = null;
    let disagree = false;
    if (opened) {
      if (rel) {
        st = 'REL';
        x = new Set(
          evs
            .filter((e) => sfx(f, e) === 'field_judged' && before(e, rel))
            .map((e) => String(md(e).field_id)),
        ).size;
        if (
          num(md(rel).fields_judged) !== null &&
          num(md(rel).fields_judged) !== x
        )
          disagree = true;
        const rc =
          closed && isObj(md(closed).raw_components)
            ? (md(closed).raw_components as Md)
            : null;
        if (rc && num(rc.fields_judged) !== null && num(rc.fields_judged) !== x)
          disagree = true;
      } else st = closed ? 'OU' : 'OPEN';
    } else if (presented) st = 'DEC';
    occ[o] = { st, x, disagree, opened, presented, any: evs.length > 0, evs };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS)
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      occ[o].opened,
      occ[o].presented,
      occ[o].any,
    );
  const diag = exposureDiagnostics(c, OCCS, (o) => occ[o].opened);
  const comp: Md = diag ? { ...diag } : {};
  const held = OCCS.filter((o) => holds[o].held);
  const live = OCCS.filter((o) => !holds[o].held);
  const rel = live.filter((o) => occ[o].st === 'REL');
  const x = rel.reduce((s, o) => s + (occ[o].x as number), 0);
  let p: RecountRecord;
  if (c.reloaded && c.malformed)
    p = mk(
      S_M12_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
      comp,
    );
  else if (OCCS.some((o) => occ[o].disagree))
    p = mk(
      S_M12_P,
      null,
      null,
      null,
      'technical_failure',
      'record_disagrees_with_recount',
      { ...comp, recount_agrees: false },
    );
  else if (held.length) {
    const reason =
      'held:' + held.map((o) => o + '=' + holds[o].basis).join(',');
    p = rel.length
      ? mk(S_M12_P, x, x, 3 * rel.length, 'interrupted', reason, comp)
      : mk(S_M12_P, null, null, null, 'interrupted', reason, comp);
  } else if (rel.length === 2)
    p = mk(S_M12_P, x, x, 6, 'observed', null, {
      ...comp,
      recount_agrees: true,
    });
  else if (rel.length === 1) {
    const other = OCCS.find((o) => o !== rel[0]) as string;
    p = mk(
      S_M12_P,
      x,
      x,
      3,
      'incomplete',
      occ[other].st === 'OU'
        ? 'other_packet_closed_at_review'
        : 'one_product_released',
      occ[other].st === 'OU'
        ? { ...comp, censored: true, recount_agrees: true }
        : { ...comp, recount_agrees: true },
    );
  } else if (live.some((o) => occ[o].st === 'OPEN'))
    p = mk(
      S_M12_P,
      null,
      null,
      null,
      'pending',
      'packet_open_nothing_released',
      comp,
    );
  else if (live.some((o) => occ[o].st === 'OU'))
    p = mk(
      S_M12_P,
      null,
      null,
      0,
      'no_eligible_event',
      'opened_closed_without_release',
      comp,
    );
  else if (live.some((o) => occ[o].st === 'DEC'))
    p = mk(
      S_M12_P,
      null,
      null,
      null,
      'declined',
      'presented_never_opened',
      comp,
    );
  else
    p = mk(S_M12_P, null, null, null, 'not_presented', 'never_presented', comp);
  // companion: null with the primary
  if (p.value === null)
    return [p, mk(S_M12_C, null, null, null, p.disposition, p.reason)];
  const product = (o: string): Md => {
    const evs = occ[o].evs;
    const relE = evs.find((e) => sfx(f, e) === 'released') as RecountEvent;
    const pre = evs.filter((e) => before(e, relE) || e === relE);
    const checked = new Set(
      pre
        .filter((e) => sfx(f, e) === 'field_checked')
        .map((e) => String(md(e).field_id)),
    );
    const judged = pre.filter((e) => sfx(f, e) === 'field_judged');
    const firstJ = new Map<string, Md>();
    for (const j of judged)
      if (!firstJ.has(String(md(j).field_id)))
        firstJ.set(String(md(j).field_id), md(j));
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    const rc =
      closed && isObj(md(closed).raw_components)
        ? (md(closed).raw_components as Md)
        : {};
    let faulty: string | null = null;
    for (const [id, j] of firstJ) if (j.faulty_field === true) faulty = id;
    if (faulty === null && typeof rc.faulty_field_id === 'string')
      faulty = rc.faulty_field_id;
    const corr = pre.filter((e) => sfx(f, e) === 'correction_entered');
    const corrFaulty = corr.filter((e) => String(md(e).field_id) === faulty);
    const correct = [...firstJ.values()].filter(
      (j) => j.judgement_correct === true,
    ).length;
    return {
      fields_checked: checked.size,
      fields_judged: firstJ.size,
      judgements_correct: correct,
      judgement_accuracy: firstJ.size ? correct / firstJ.size : null,
      faulty_field_checked: faulty !== null && checked.has(faulty),
      faulty_field_judged:
        faulty !== null && firstJ.has(faulty)
          ? (firstJ.get(faulty)?.judgement ?? null)
          : null,
      fault_detected:
        faulty !== null && firstJ.get(faulty)?.judgement === 'differs',
      correction_attempted: corrFaulty.length > 0,
      correction_successful:
        corrFaulty.length > 0 ? md(corrFaulty[0]).correct === true : null,
      unnecessary_corrections: corr.filter(
        (e) => String(md(e).field_id) !== faulty,
      ).length,
      refused_presses: evs.filter((e) => sfx(f, e) === 'press_refused').length,
      keypad_openings: evs.filter((e) => sfx(f, e) === 'keypad_opened').length,
      abandoned_corrections: evs.filter(
        (e) => sfx(f, e) === 'correction_abandoned',
      ).length,
      // v4: the register's per-field records "with judgement latency,
      // refused presses, keypad openings, abandoned corrections"
      // (REG:6719-6721); v1-v3 omitted them. One record per field named by
      // a field event; an act without a field_id stays in the product counts.
      fields: perField(evs, pre, firstJ),
    };
  };
  const perField = (
    evs: RecountEvent[],
    pre: RecountEvent[],
    firstJ: Map<string, Md>,
  ): Md[] => {
    const ids = new Map<string, number | null>();
    for (const e of evs) {
      const id = md(e).field_id;
      if (typeof id !== 'string' && typeof id !== 'number') continue;
      const k = String(id);
      const ix = num(md(e).field_index);
      if (!ids.has(k) || (ids.get(k) === null && ix !== null)) ids.set(k, ix);
    }
    const ofField = (k: string, s: string) =>
      evs.filter((e) => sfx(f, e) === s && String(md(e).field_id) === k);
    return [...ids.entries()]
      .sort(
        (a, b) =>
          (a[1] ?? Number.MAX_SAFE_INTEGER) - (b[1] ?? Number.MAX_SAFE_INTEGER),
      )
      .map(([k, ix]) => {
        const j = firstJ.get(k);
        return {
          field_id: k,
          field_index: ix,
          checked: pre.some(
            (e) =>
              sfx(f, e) === 'field_checked' && String(md(e).field_id) === k,
          ),
          judgement: j ? (j.judgement ?? null) : null,
          judgement_latency_ms: j ? num(j.latency_ms) : null,
          refused_presses: ofField(k, 'press_refused').length,
          keypad_openings: ofField(k, 'keypad_opened').length,
          abandoned_corrections: ofField(k, 'correction_abandoned').length,
        };
      });
  };
  const v: Md = {};
  for (const o of rel) v[o] = product(o);
  return [p, mk(S_M12_C, v, null, null, p.disposition, p.reason)];
}

// ================================================================ IP series engine (M13, M14, M15, M16)
//
// One immutable first response per item, no feedback before the last one,
// a completion record, optional review closure / stop, a fault record.
// Reload: H / U / M without an opening of the load => interrupted (read
// before any position is compared); one coherent check establishing the
// absence => read exactly as a first load (REG §5.290 (a); addendum §2
// "U17" / "U18" / "U19"); D-6 (i) applied (r3 §8 RL-4; GAPS G-IP-2); a
// reloaded load WITH its own opening keeps its ordinary row at snapshot 1
// (REG §5.290 (a) limitation (2), review F7 (i)) with the check flags
// beside it (GAPS G-IP-1).

interface SeriesItem {
  id: string;
  index: number; // global 1..N
  group?: string;
  key?: string | null; // content key option id (null = not recomputable)
  options?: string[];
  contentVersion?: string;
}
interface SeriesCfg {
  spec: RecountSpecEntry;
  prefix: string;
  version: string;
  opportunity: string;
  openSuffix: string;
  itemField: string;
  presentSuffix: string;
  items: SeriesItem[];
  groups?: {
    suffix: string;
    field: string;
    order: string[];
    contentVersion?: Record<string, string>;
  };
  cannotKind: string;
  reviewSuffix: string;
  stopSuffix?: string;
  briefed: boolean; // a `presented` briefing record exists for the row
  nee: (
    opened: boolean,
    s: { answered: number; evs: (sfx: string) => RecountEvent[] },
  ) => string;
  extra?: (
    f: Fam,
    opened: RecountEvent,
    answers: Map<string, RecountEvent>,
  ) => string[];
  holdBackNeedsPriorExposureFlag?: boolean;
  /** an RL-4 row (M14, M15, M16): D-7 (i) recomputed from the earlier loads (REG §5.410) */
  rl4?: boolean;
}

interface SeriesOut {
  disposition: string;
  reason: string | null;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  components: Md;
  answers: Map<string, RecountEvent>;
}

function runSeries(input: RecountInput, cfg: SeriesCfg): SeriesOut {
  const f = family(input, cfg.prefix);
  const reloaded = input.page_load_index > 1;
  const c = classify(input, f, null);
  if (cfg.rl4) priorCarryForward(input, cfg.prefix, c);
  const opened = ofType(f, cfg.openSuffix);
  const presentedBrief = cfg.briefed ? ofType(f, 'presented') : [];
  const mks = f.evs.filter(
    (e) =>
      sfx(f, e) === 'technical_failure' &&
      (str(md(e).detail) ?? '').startsWith('reload') &&
      (!cfg.holdBackNeedsPriorExposureFlag || md(e).prior_exposure === true),
  );
  const oc = c.occ[OCC_DEFAULT];
  const checkOne = c.checkCount === 1 && !c.malformed ? c.record : null;
  // §5.290 (a) exposure_record_consistent
  let erc = c.exposureRecordConsistentCheckPart;
  if (
    checkOne &&
    mks.length > 0 &&
    checkOne.prior_opening_absence_established === true
  )
    erc = false;
  if (checkOne && checkOne.prior_opening_found === true && opened.length > 0)
    erc = false;
  const reloadCheck: Md = {
    page_reloaded: reloaded,
    checked: f.checks.length > 0,
    prior_opening_found: checkOne
      ? (checkOne.prior_opening_found ?? null)
      : null,
    prior_briefing_found: checkOne
      ? (checkOne.prior_briefing_found ?? null)
      : null,
    history_continuous: checkOne ? (checkOne.history_continuous ?? null) : null,
    prior_opening_absence_established: checkOne
      ? (checkOne.prior_opening_absence_established ?? null)
      : null,
    class: oc ? oc.cls : null,
    class_basis: oc ? oc.basis : null,
  };
  const comps: Md = {
    reload_check: reloadCheck,
    exposure_record_consistent: erc,
    observations_share_one_episode: true,
  };
  const answers = new Map<string, RecountEvent>();
  const out = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    extra: Md = {},
  ): SeriesOut => ({
    disposition: d,
    reason: r,
    value: v,
    numerator: n,
    denominator: dn,
    components: { ...comps, ...extra },
    answers,
  });
  // reload precedence (read before any position is compared)
  if (reloaded && c.malformed)
    return out('technical_failure', 'check_record_malformed', null, null, null);
  if (reloaded && opened.length === 0) {
    if (mks.length > 0)
      return out('interrupted', 'held_back_after_reload', null, null, null, {
        held_back_after_reload: true,
      });
    if (!oc || oc.cls !== 'A')
      return out(
        'interrupted',
        'absence_of_earlier_opening_not_established:' +
          (oc ? oc.cls + ':' + oc.basis : 'none'),
        null,
        null,
        null,
      );
  }
  if (!reloaded && mks.length > 0 && opened.length === 0)
    return out(
      'interrupted',
      'held_back_marker_on_first_load',
      null,
      null,
      null,
    );
  // integrity (shared by every path that reads positions)
  const defects: string[] = [];
  const sc = checkSeq(f.all);
  if (!sc.ok)
    defects.push(
      sc.missing.length
        ? 'event_without_usable_sequence'
        : 'two_events_share_a_sequence',
    );
  for (const e of f.all) {
    const m = md(e);
    if (
      m.entry_state_version !== undefined &&
      m.entry_state_version !== cfg.version
    ) {
      defects.push('unknown_or_mismatched_version');
      break;
    }
    if (
      m.opportunity_id !== undefined &&
      m.opportunity_id !== cfg.opportunity
    ) {
      defects.push('another_opportunity');
      break;
    }
  }
  const completion = ofType(f, 'first_responses_completed');
  const review = ofType(f, cfg.reviewSuffix);
  const stop = cfg.stopSuffix ? ofType(f, cfg.stopSuffix) : [];
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const windowClosed = firstOf(f, 'window_closed');
  const items = cfg.items;
  const byId = new Map(items.map((it) => [it.id, it]));
  // presentations
  if (cfg.groups) {
    const gp = ofType(f, cfg.groups.suffix);
    const seenG: string[] = [];
    for (const g of gp) {
      const gid = str(md(g)[cfg.groups.field]);
      if (!gid || !cfg.groups.order.includes(gid))
        defects.push('unknown_group');
      else if (seenG.includes(gid)) defects.push('group_presented_twice');
      else {
        if (cfg.groups.order[seenG.length] !== gid)
          defects.push('group_out_of_assigned_order');
        if (
          cfg.groups.contentVersion &&
          md(g).content_version !== cfg.groups.contentVersion[gid]
        )
          defects.push('group_content_version_mismatch');
        seenG.push(gid);
      }
    }
  }
  const pres = ofType(f, cfg.presentSuffix);
  const presented = new Map<string, RecountEvent>();
  for (const p of pres) {
    const id = str(md(p)[cfg.itemField]);
    const it = id ? byId.get(id) : undefined;
    if (!it) {
      defects.push('unknown_item_presented');
      continue;
    }
    if (presented.has(it.id)) {
      defects.push('item_presented_twice');
      continue;
    }
    if (presented.size !== it.index - 1)
      defects.push('item_out_of_assigned_order');
    if (
      it.contentVersion &&
      md(p).content_version !== undefined &&
      md(p).content_version !== it.contentVersion
    )
      defects.push('content_version_mismatch');
    const prev = items.find((x) => x.index === it.index - 1);
    if (prev) {
      const pa = ofType(f, 'first_response').find(
        (e) => md(e)[cfg.itemField] === prev.id,
      );
      if (!pa || !before(pa, p))
        defects.push('item_presented_before_previous_first_response');
    }
    if (opened[0] && !before(opened[0], p))
      defects.push('presentation_before_opening');
    presented.set(it.id, p);
  }
  let correct = 0;
  let cannot = 0;
  for (const r of ofType(f, 'first_response')) {
    const m = md(r);
    const id = str(m[cfg.itemField]);
    const it = id ? byId.get(id) : undefined;
    if (!it) {
      defects.push('first_response_unknown_item');
      continue;
    }
    if (answers.has(it.id)) {
      defects.push('second_first_response');
      continue;
    }
    const p = presented.get(it.id);
    if (!p || !before(p, r))
      defects.push('first_response_without_presentation');
    if (m.phase !== undefined && m.phase !== 'measurement')
      defects.push('first_response_outside_measurement');
    if (completion[0] && before(completion[0], r))
      defects.push('first_response_after_completion');
    if (typeof m.correct !== 'boolean') defects.push('non_boolean_correct');
    const kind = str(m.response_kind);
    let rec: boolean | null = null;
    if (kind === cfg.cannotKind) {
      cannot++;
      if (m.correct === true) defects.push('cannot_response_marked_correct');
      if ('option_id' in m && m.option_id !== null)
        defects.push('cannot_response_carries_option');
      rec = false;
    } else if (kind === 'option' || kind === 'layout') {
      if (kind === 'option') {
        if (it.options && !it.options.includes(String(m.option_id)))
          defects.push('option_of_another_item');
        if (it.key !== undefined && it.key !== null)
          rec = m.option_id === it.key;
      } else {
        if (!isObj(m.board)) defects.push('layout_without_usable_board');
        rec = bool(m.correct); // re-validation of the board is not recountable (GAPS G-M13-1)
      }
    } else defects.push('unknown_response_kind');
    if (
      it.key !== undefined &&
      it.key !== null &&
      m.key_option_id !== undefined &&
      m.key_option_id !== it.key
    )
      defects.push('key_option_id_disagrees_with_content');
    if (rec !== null && typeof m.correct === 'boolean' && m.correct !== rec)
      defects.push('correct_flag_contradicts_key');
    if (rec === true) correct++;
    answers.set(it.id, r);
  }
  const N = items.length;
  if (answers.size === N && completion.length === 0)
    defects.push('all_answered_without_completion_snapshot');
  if (completion.length > 1) defects.push('completion_twice');
  if (completion[0]) {
    if (answers.size < N) defects.push('completion_with_fewer_answers');
    const cm = md(completion[0]);
    for (const k of [
      'correct_first_decisions',
      'correct_first_predictions',
      'correct_first_applications',
      'first_solutions',
    ]) {
      if (num(cm[k]) !== null && num(cm[k]) !== correct)
        defects.push('snapshot_disagrees_with_recount');
    }
  }
  for (const rs of ofType(f, 'results_shown'))
    if (!completion[0] || !before(completion[0], rs))
      defects.push('results_before_completion');
  if (cfg.prefix === 'proto_m13_networks_') {
    for (const e of f.evs)
      if (
        sfx(f, e).startsWith('practice_') &&
        (!completion[0] || !before(completion[0], e))
      )
        defects.push('practice_before_completion');
  }
  if (cfg.extra && opened[0]) defects.push(...cfg.extra(f, opened[0], answers));
  if (opened.length > 1) defects.push('opened_twice');
  const answered = answers.size;
  const omissions = {
    unanswered_ids: items
      .filter((it) => presented.has(it.id) && !answers.has(it.id))
      .map((it) => it.id),
    unpresented_ids: items
      .filter((it) => !presented.has(it.id))
      .map((it) => it.id),
  };
  const ansComps: Md = {
    answered,
    planned: N,
    cannot_count: cannot,
    omissions,
  };
  if (defects.length)
    return out(
      'technical_failure',
      'integrity:' + defects[0],
      null,
      null,
      null,
      { ...ansComps, integrity_defect: [...new Set(defects)] },
    );
  const briefed = presentedBrief.length > 0;
  if (opened.length === 0) {
    const neverReason = briefed
      ? 'briefed_not_opened'
      : 'not_briefed_not_opened';
    const reviewClosed =
      !!windowClosed && str(md(windowClosed).exit_state) === 'closed_at_review';
    if (!briefed)
      return out('not_presented', 'never_presented', null, null, null, {
        never_opened_reason: cfg.briefed ? neverReason : null,
      });
    if (reviewClosed)
      return out('no_eligible_event', 'briefed_not_opened', null, null, null, {
        never_opened_reason: neverReason,
        censored: true,
        closure_reason: 'closed_at_review',
      });
    return out('pending', 'briefed_not_opened', null, null, null, {
      never_opened_reason: neverReason,
    });
  }
  if (completion[0])
    return out('observed', null, correct, correct, answered, {
      ...ansComps,
      closure_reason: 'completed',
    });
  if (faults.length)
    return out(
      'technical_failure',
      'fault_in_first_response_phase',
      null,
      null,
      null,
      ansComps,
    );
  const closedBy = review[0]
    ? 'closed_at_review'
    : stop[0]
      ? 'voluntary_stop'
      : null;
  if (!closedBy)
    return out(
      'pending',
      answered ? 'series_open_with_answers' : 'series_open',
      null,
      null,
      null,
      ansComps,
    );
  if (answered > 0)
    return out(
      'incomplete',
      'closed_before_all_answered',
      correct,
      correct,
      answered,
      { ...ansComps, censored: true, closure_reason: closedBy },
    );
  if (closedBy === 'voluntary_stop')
    return out('voluntary_stop', 'stopped_without_answer', null, null, null, {
      ...ansComps,
      closure_reason: closedBy,
    });
  return out(
    'no_eligible_event',
    cfg.nee(true, { answered, evs: (s) => ofType(f, s) }),
    null,
    null,
    0,
    { ...ansComps, censored: true, closure_reason: closedBy },
  );
}

// ================================================================ M13

const S_M13_P: RecountSpecEntry = {
  item: 'M13',
  feature_id: 'm13_first_solutions',
  role: 'primary',
  families: ['proto_m13_networks_'],
  eligibility:
    'networks n1 -> n2 -> n3 with a first_response in the current load (a confirmed layout or a confirmed CANNOT SOLVE)',
  numerator:
    'networks whose first response is a layout the shared validator accepts; the recount reads the logged `correct` flag (the validator and piece geometry are not in the rule documents: GAPS G-M13-1) and checks it for type, CANNOT SOLVE never correct',
  denominator: 'networks with a first response (planned 3)',
  missing_rule:
    'none answered => null: not_presented (never opened), voluntary_stop (stopped), no_eligible_event (closed at the review, censored), pending (phase open), technical_failure (a fault in the first-response phase, or contradictory / unverifiable scored evidence: the addendum U16 list incl. the §5.259 sequence convention); 1-2 answers stopped or closed at the review => incomplete, censored',
  page_load_treatment:
    'a hold-back is read only from a record with prior_exposure true and a detail beginning "reload"; reloaded without an opening and without an established check => interrupted; M13 has no presentation record, so RL-1C decision A does not apply',
  citations: [
    'REG:4864-5175',
    'ADD:245-350',
    'ADD:1900',
    'REG:9947-9956',
    'REG:14354-14433',
    'ADD:1669-1680',
  ],
};

function m13(ctx: Ctx): RecountRecord[] {
  const r = runSeries(ctx.input, {
    spec: S_M13_P,
    prefix: 'proto_m13_networks_',
    version: 'm13-networks-v1',
    opportunity: 'proto_m13_network_series',
    openSuffix: 'series_opened',
    itemField: 'network_id',
    presentSuffix: 'network_presented',
    items: [
      { id: 'n1', index: 1, contentVersion: 'm13-n1-opposite-v1', key: null },
      { id: 'n2', index: 2, contentVersion: 'm13-n2-adjacent-v1', key: null },
      { id: 'n3', index: 3, contentVersion: 'm13-n3-same-side-v1', key: null },
    ],
    cannotKind: 'cannot_solve',
    reviewSuffix: 'series_closed_at_review',
    stopSuffix: 'series_stopped',
    briefed: false,
    nee: () => 'opened_closed_at_review_no_answer',
    holdBackNeedsPriorExposureFlag: true,
    extra: (f, op) => {
      const d: string[] = [];
      const form = md(op).form_id;
      for (const e of f.evs)
        if (md(e).form_id !== undefined && md(e).form_id !== form)
          d.push('form_changes');
      for (const e of ofType(f, 'first_response').concat(
        ofType(f, 'network_presented'),
      )) {
        const m = md(e);
        const idx = ['n1', 'n2', 'n3'].indexOf(String(m.network_id)) + 1;
        if (
          idx > 0 &&
          (m.network_index !== idx ||
            m.trial_id !== 'm13_network_' + m.network_id)
        )
          d.push('network_index_or_trial_mismatch');
      }
      return d;
    },
  });
  // the never-opened M13 bench reads not_presented (no briefing record)
  if (r.disposition === 'pending' && r.reason === 'briefed_not_opened')
    r.disposition = 'not_presented';
  return [
    mk(
      S_M13_P,
      r.value,
      r.numerator,
      r.denominator,
      r.disposition,
      r.reason,
      r.components,
    ),
  ];
}

// ================================================================ M14

const S_M14_P: RecountSpecEntry = {
  item: 'M14',
  feature_id: 'm14_correct_first_integrations',
  role: 'primary',
  families: ['proto_m14_integration_'],
  eligibility:
    'decisions p1_d1..p2_d3 (fixed order) with a first_response in the current load (a confirmed option or CANNOT SOLVE)',
  numerator:
    'decisions whose first response is the content key (p1_d1_a, p1_d2_b, p1_d3_d, p2_d1_b, p2_d2_c, p2_d3_c), recomputed and compared with the correct flag, key_option_id and the completion snapshot',
  denominator: 'decisions with a first response (planned 6)',
  missing_rule:
    'never briefed and never opened => not_presented; briefed never opened => pending (briefed_not_opened), at the review closure no_eligible_event (briefed_not_opened, censored); opened, unanswered at the review => no_eligible_event (orientation_only / opened_no_first_response); 1-5 answered at the review => incomplete, censored; open => pending; the addendum U17 integrity list => technical_failure; never declined',
  page_load_treatment:
    'interrupted > technical_failure > pending > closed outcomes; a reloaded load without its own opening => interrupted unless its single coherent check establishes the absence (D-6 (i), REG §5.410: exactly ONE coherent record); an H / U / M hold-back marker (class prefix in its detail) is read only in a load without an opening (held_back_after_reload); D-7 (i) recomputed from prior_page_load_events: a U / M marker of the family in an earlier load keeps the absence unestablished, an H marker never does (REG §5.410 "recorded for Part C")',
  citations: [
    'REG:4628-4863',
    'REG:4470-4626',
    'ADD:352-528',
    'ADD:1901',
    'REG:10244-10260',
    'REG:10451-10530',
    'R3:386-389',
    'ROD:D-6',
    'ROD:D-7',
    'REG:14962-15061',
    'ADD:1817-1843',
  ],
};

function m14(ctx: Ctx): RecountRecord[] {
  const keys: Record<string, string> = {
    p1_d1: 'p1_d1_a',
    p1_d2: 'p1_d2_b',
    p1_d3: 'p1_d3_d',
    p2_d1: 'p2_d1_b',
    p2_d2: 'p2_d2_c',
    p2_d3: 'p2_d3_c',
  };
  const ids = ['p1_d1', 'p1_d2', 'p1_d3', 'p2_d1', 'p2_d2', 'p2_d3'];
  const r = runSeries(ctx.input, {
    spec: S_M14_P,
    prefix: 'proto_m14_integration_',
    version: 'm14-integration-v1',
    opportunity: 'proto_m14_integration_series',
    rl4: true,
    openSuffix: 'opportunity_opened',
    itemField: 'decision_id',
    presentSuffix: 'decision_presented',
    items: ids.map((id, i) => ({
      id,
      index: i + 1,
      group: id.slice(0, 2),
      key: keys[id],
      options: ['a', 'b', 'c', 'd'].map((x) => id + '_' + x),
      contentVersion: id.startsWith('p1') ? 'm14-p1-v1' : 'm14-p2-v1',
    })),
    groups: {
      suffix: 'packet_presented',
      field: 'packet_id',
      order: ['p1', 'p2'],
      contentVersion: { p1: 'm14-p1-v1', p2: 'm14-p2-v1' },
    },
    cannotKind: 'cannot_solve',
    reviewSuffix: 'series_closed_at_review',
    briefed: true,
    nee: (_o, s) =>
      s.evs('orientation_acknowledged').length
        ? 'opened_no_first_response'
        : 'orientation_only',
    extra: (f) => {
      const d: string[] = [];
      for (const e of ofType(f, 'decision_presented')) {
        const pid = str(md(e).packet_id);
        const gp = ofType(f, 'packet_presented').find(
          (g) => md(g).packet_id === pid,
        );
        if (!gp || !before(gp, e)) d.push('decision_before_its_packet');
        if (str(md(e).decision_id)?.slice(0, 2) !== pid)
          d.push('decision_of_another_packet');
      }
      return d;
    },
  });
  return [
    mk(
      S_M14_P,
      r.value,
      r.numerator,
      r.denominator,
      r.disposition,
      r.reason,
      r.components,
    ),
  ];
}

// ================================================================ M15

const S_M15_P: RecountSpecEntry = {
  item: 'M15',
  feature_id: 'm15_correct_first_predictions',
  role: 'primary',
  families: ['proto_m15_systems_'],
  eligibility:
    "questions s1_q1, s1_q2, s2_q1, s2_q2 (fixed order; a box's questions only after its wiring_recorded) with a first_response in the current load",
  numerator:
    'questions whose first response is the content key (s1_q1_c, s1_q2_b, s2_q1_b, s2_q2_c), recomputed and compared with the correct flag, key_option_id and the completion snapshot; an answer counts whatever wiring or tests',
  denominator: 'questions with a first response (planned 4)',
  missing_rule:
    'as M14, with the review-closure reasons orientation_only / no_wiring_recorded / wiring_only_no_first_response; 1-3 answered and open => pending; never declined',
  page_load_treatment: 'as M14',
  citations: [
    'REG:3905-4468',
    'ADD:530-726',
    'ADD:1902',
    'R3:386-389',
    'ROD:D-6',
    'ROD:D-7',
    'REG:14962-15061',
    'ADD:1817-1843',
    'REG:15132-15236',
    'ADD:1870-1882',
  ],
};

function m15(ctx: Ctx): RecountRecord[] {
  const keys: Record<string, string> = {
    s1_q1: 's1_q1_c',
    s1_q2: 's1_q2_b',
    s2_q1: 's2_q1_b',
    s2_q2: 's2_q2_c',
  };
  const ids = ['s1_q1', 's1_q2', 's2_q1', 's2_q2'];
  const r = runSeries(ctx.input, {
    spec: S_M15_P,
    prefix: 'proto_m15_systems_',
    version: 'm15-systems-v1',
    opportunity: 'proto_m15_systems_series',
    rl4: true,
    openSuffix: 'opportunity_opened',
    itemField: 'question_id',
    presentSuffix: 'question_presented',
    items: ids.map((id, i) => ({
      id,
      index: i + 1,
      group: id.slice(0, 2),
      key: keys[id],
      options: ['a', 'b', 'c'].map((x) => id + '_' + x),
      contentVersion: id.startsWith('s1') ? 'm15-s1-v1' : 'm15-s2-v1',
    })),
    groups: {
      suffix: 'box_presented',
      field: 'box_id',
      order: ['s1', 's2'],
      contentVersion: { s1: 'm15-s1-v1', s2: 'm15-s2-v1' },
    },
    cannotKind: 'cannot_solve',
    reviewSuffix: 'series_closed_at_review',
    briefed: true,
    nee: (_o, s) =>
      s.evs('wiring_recorded').length
        ? 'wiring_only_no_first_response'
        : s.evs('box_presented').length
          ? 'no_wiring_recorded'
          : 'orientation_only',
    extra: (f, _op, answers) => {
      const d: string[] = [];
      for (const q of ofType(f, 'question_presented')) {
        const box = str(md(q).question_id)?.slice(0, 2) ?? '';
        const w = ofType(f, 'wiring_recorded').find(
          (e) =>
            (str(md(e).box_id) ?? '') === box &&
            ['option', 'cannot_tell'].includes(String(md(e).response_kind)),
        );
        if (!w || !before(w, q)) d.push('question_before_its_box_wiring');
      }
      const b2 = ofType(f, 'box_presented').find((e) => md(e).box_id === 's2');
      if (b2)
        for (const q of ['s1_q1', 's1_q2'])
          if (!answers.has(q) || !before(answers.get(q), b2))
            d.push('box_presented_before_earlier_box_answered');
      return d;
    },
  });
  return [
    mk(
      S_M15_P,
      r.value,
      r.numerator,
      r.denominator,
      r.disposition,
      r.reason,
      r.components,
    ),
  ];
}

// ================================================================ M16

const S_M16_P: RecountSpecEntry = {
  item: 'M16',
  feature_id: 'm16_correct_first_applications',
  role: 'primary',
  families: ['proto_m16_handling_'],
  eligibility:
    "vials m16_v1..m16_v6 (fixed order, only after teaching_closed) with a first_response in the current load (a confirmed drawer or DON'T KNOW)",
  numerator:
    'vials whose first response is the content key (m16_v1_d1, m16_v2_d3, m16_v3_d4, m16_v4_d1, m16_v5_d4, m16_v6_d2), recomputed and compared with the correct flag, key_option_id and the completion snapshot',
  denominator: 'vials with a first response (planned 6)',
  missing_rule:
    "as M14 with the reasons intro_only / teaching_only / teaching_closed_no_first_response; the entry snapshot's declared task definition (six known vial records once each, four options in order, the content key; vials_planned 6; assigned_vial_order m16_v1..v6) validated => technical_failure otherwise; never declined",
  page_load_treatment: 'as M14',
  citations: [
    'REG:3295-3903',
    'REG:3106-3293',
    'ADD:728-927',
    'ADD:1903',
    'R3:386-389',
    'ROD:D-6',
    'ROD:D-7',
    'REG:14962-15061',
    'ADD:1817-1843',
    'REG:15132-15236',
    'ADD:1870-1882',
  ],
};

function m16(ctx: Ctx): RecountRecord[] {
  const keyN = [1, 3, 4, 1, 4, 2];
  const ids = [1, 2, 3, 4, 5, 6].map((k) => 'm16_v' + k);
  const r = runSeries(ctx.input, {
    spec: S_M16_P,
    prefix: 'proto_m16_handling_',
    version: 'm16-handling-v1',
    opportunity: 'proto_m16_handling_series',
    rl4: true,
    openSuffix: 'opportunity_opened',
    itemField: 'vial_id',
    presentSuffix: 'vial_presented',
    items: ids.map((id, i) => ({
      id,
      index: i + 1,
      key: id + '_d' + keyN[i],
      options: [1, 2, 3, 4].map((x) => id + '_d' + x),
    })),
    cannotKind: 'dont_know',
    reviewSuffix: 'series_closed_at_review',
    briefed: true,
    nee: (_o, s) =>
      s.evs('teaching_closed').length
        ? 'teaching_closed_no_first_response'
        : s.evs('example_viewed').length
          ? 'teaching_only'
          : 'intro_only',
    extra: (f, op) => {
      const d: string[] = [];
      const snap = isObj(md(op).entry_state_snapshot)
        ? (md(op).entry_state_snapshot as Md)
        : {};
      if (snap.form_id !== 'm16-form-1') d.push('entry_snapshot_form_unknown');
      if (snap.rule_version !== 'm16-rule-v1')
        d.push('entry_snapshot_rule_unknown');
      if (snap.vials_planned !== 6) d.push('vials_planned_not_6');
      if (stableJson(snap.assigned_vial_order) !== stableJson(ids))
        d.push('assigned_vial_order_not_exact');
      const recs = arr(snap.vials);
      if (!recs || recs.length !== 6)
        d.push('declared_task_definition_not_six_records');
      else {
        const seen = new Set<string>();
        for (const v of recs) {
          if (!isObj(v)) {
            d.push('declared_task_definition_non_record');
            continue;
          }
          const vid = str(v.vial_id);
          const i = vid ? ids.indexOf(vid) : -1;
          if (i < 0) d.push('declared_unknown_vial');
          else if (seen.has(vid as string)) d.push('declared_vial_twice');
          else {
            seen.add(vid as string);
            if (
              stableJson(v.option_ids) !==
              stableJson([1, 2, 3, 4].map((x) => vid + '_d' + x))
            )
              d.push('declared_options_disagree');
            if (v.key_option_id !== vid + '_d' + keyN[i])
              d.push('declared_key_disagrees');
          }
        }
      }
      const tc = ofType(f, 'teaching_closed')[0];
      for (const v of ofType(f, 'vial_presented'))
        if (!tc || !before(tc, v)) d.push('vial_before_teaching_closed');
      for (const e of ofType(f, 'vial_presented').concat(
        ofType(f, 'first_response'),
      ))
        if (md(e).form_id !== undefined && md(e).form_id !== 'm16-form-1')
          d.push('form_id_mismatch');
      return d;
    },
  });
  return [
    mk(
      S_M16_P,
      r.value,
      r.numerator,
      r.denominator,
      r.disposition,
      r.reason,
      r.components,
    ),
  ];
}

// ================================================================ M17

const S_M17_P: RecountSpecEntry = {
  item: 'M17',
  feature_id: 'm17_criterion_trial',
  role: 'primary',
  families: ['proto_m17_trials_'],
  eligibility:
    'the learning-phase first responses (trial_submitted with phase learning; one SUBMIT of exactly two operators per trial); a response is correct when the logged goal_reached is true (the definition of a correct response is owner question §5.88: GAPS G-M17-2)',
  numerator:
    "criterion_trial = the learning trial (phase_index) ending the first run of three consecutive correct first responses; compared with the completed / stopped summary's criterion_run_trial (disagreement, or a record without phase or outcome => technical_failure on both rows)",
  denominator: 'none (value {criterion_trial, attained})',
  missing_rule:
    'attained => observed (also after an early exit, complete_sequence false); twelve learning responses without attainment => {12, false} observed + censored; fewer without attainment and the series stopped => incomplete (null, partial sequence in the components); open => pending; never opened => not_presented; criterion values not to be read until §5.87-§5.88 are decided',
  page_load_treatment:
    'reloaded: class from the M17 check (stage 3 window_opened, no stage 1 or 2); H/U/M or a marker => interrupted; A => first-load (nothing => not_presented); M17 has no presentation record, so RL-1C decision A does not apply',
  citations: [
    'REG:6739-6809',
    'ADD:1904',
    'REG:99',
    'REG:8030-8049',
    'REG:14762-14846',
    'ADD:1754-1803',
  ],
};
const S_M17_C: RecountSpecEntry = {
  item: 'M17',
  feature_id: 'm17_sequence_baseline_transfer',
  role: 'companion',
  families: ['proto_m17_trials_'],
  eligibility: 'the trial_submitted records of the current load',
  numerator:
    'n/a (the baseline 2 / learning 12 / transfer 2 first-response sequences, feedback exposures, reference sequences shown, help consults, demonstration reviews, complete_sequence, per-trial records)',
  denominator: 'n/a',
  missing_rule:
    'technical_failure with the primary; null with a null primary that has no submitted trial',
  page_load_treatment: 'as the primary',
  citations: ['REG:6787-6789', 'ADD:1904'],
};

function m17(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m17_trials_');
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT);
  const opened = ofType(f, 'window_opened').length > 0;
  const hold = holdFor(c, OCC_DEFAULT, mks, opened, false, f.evs.length > 0, {
    unreachedHeldWithoutCheck: false,
  });
  const subs = ofType(f, 'trial_submitted');
  const summary = ofType(f, 'completed')[0] ?? ofType(f, 'stopped')[0];
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const seq: Record<string, boolean[]> = {
    baseline: [],
    learning: [],
    transfer: [],
  };
  let bad = false;
  for (const s of subs) {
    const m = md(s);
    const ph = str(m.phase);
    if (!ph || !(ph in seq) || typeof m.goal_reached !== 'boolean') {
      bad = true;
      continue;
    }
    seq[ph].push(m.goal_reached);
  }
  let crit: number | null = null;
  for (let i = 2; i < seq.learning.length; i++) {
    if (seq.learning[i] && seq.learning[i - 1] && seq.learning[i - 2]) {
      crit = i + 1;
      break;
    }
  }
  const complete =
    seq.baseline.length === 2 &&
    seq.learning.length === 12 &&
    seq.transfer.length === 2;
  const summaryDisagrees =
    !!summary &&
    md(summary).criterion_run_trial !== undefined &&
    (md(summary).criterion_run_trial ?? null) !== crit;
  const compVal = (): Md => ({
    sequence: {
      baseline: seq.baseline,
      learning: seq.learning,
      transfer: seq.transfer,
    },
    feedback_exposures: ofType(f, 'feedback_presented').length,
    reference_sequences_shown: ofType(f, 'feedback_presented').filter(
      (e) => md(e).reference_shown === true,
    ).length,
    help_consults: ofType(f, 'help_consulted').length,
    demonstration_reviews: ofType(f, 'demonstration_viewed').length,
    complete_sequence: complete,
    trials: subs.map((s) => ({
      trial_index: md(s).trial_index ?? null,
      phase: md(s).phase ?? null,
      phase_index: md(s).phase_index ?? null,
      goal_reached: md(s).goal_reached ?? null,
    })),
  });
  const two = (
    d: string,
    r: string | null,
    v: unknown,
    n: number | null,
    comps: Md,
    cd?: string,
  ): RecountRecord[] => {
    const p = mk(S_M17_P, v, n, null, d, r, comps);
    if (
      d === 'technical_failure' ||
      d === 'interrupted' ||
      d === 'not_presented' ||
      subs.length === 0
    )
      return [p, mk(S_M17_C, null, null, null, d, r)];
    return [
      p,
      mk(
        S_M17_C,
        compVal(),
        null,
        null,
        cd ??
          (complete ? 'observed' : d === 'pending' ? 'pending' : 'incomplete'),
        null,
      ),
    ];
  };
  if (c.reloaded && c.malformed)
    return two('technical_failure', 'check_record_malformed', null, null, {});
  if (hold.held)
    return two('interrupted', 'held:' + hold.basis, null, null, {});
  if (!opened)
    return two(
      'not_presented',
      c.reloaded ? 'established_absence_not_opened' : 'never_opened',
      null,
      null,
      {},
    );
  if (bad || summaryDisagrees)
    return two(
      'technical_failure',
      bad ? 'record_without_phase_or_outcome' : 'module_record_disagrees',
      null,
      null,
      { recount_agrees: false },
    );
  if (faults.length) return two('technical_failure', 'fault', null, null, {});
  const comps: Md = {
    recount_agrees: true,
    complete_sequence: complete,
    learning_responses: seq.learning.length,
  };
  if (crit !== null)
    return two(
      'observed',
      null,
      { criterion_trial: crit, attained: true },
      crit,
      {
        ...comps,
        included_ids: Array.from(
          { length: crit },
          (_, i) => 'learning_' + (i + 1),
        ),
      },
    );
  if (seq.learning.length >= 12)
    return two(
      'observed',
      'censored_twelve_without_attainment',
      { criterion_trial: 12, attained: false },
      12,
      { ...comps, censored: true },
    );
  if (!summary) return two('pending', 'series_open', null, null, comps);
  return two('incomplete', 'early_exit_without_attainment', null, null, {
    ...comps,
    partial_sequence: seq.learning,
  });
}

// ================================================================ M18

const S_M18_P: RecountSpecEntry = {
  item: 'M18',
  feature_id: 'm18_correct_first_diagnoses',
  role: 'primary',
  families: ['proto_m18_cases_'],
  eligibility:
    'cases m18_c1..c3 with an attributable earliest first_response of slot diagnosis written before any closure (an option or CANNOT SOLVE)',
  numerator:
    'cases whose first diagnosis is the keyed part (m18_c1_p3, m18_c2_p4, m18_c3_p2), recomputed and compared with the correct flag, key_option_id and the closure snapshot, each comparison with its scope',
  denominator: 'cases with a diagnosis first response (planned 3)',
  missing_rule:
    'open => pending (also with three parts and a step pending); at the review each row by its own count: 3 observed (not censored), 1-2 incomplete censored, 0 no_eligible_event (intro_only / case_presented_no_response); never briefed never opened => not_presented; briefed never opened => pending, at the review no_eligible_event (briefed_not_opened, censored); defect scopes shared / slot / uncertain (D-U20-1 item 11) => technical_failure on the rows the scope names; never declined',
  page_load_treatment:
    'as M14 (RL-4, REG §5.410), incl. the D-7 (i) recomputation; exposure_record_consistent false for two or more records, a first-load, contradictory or malformed record, or a found opening beside an opening of this load',
  citations: [
    'REG:2216-2988',
    'REG:2989-3104',
    'ADD:929-1169',
    'ADD:1905',
    'R3:386-389',
    'ROD:D-6',
    'ROD:D-7',
    'REG:14962-15061',
    'ADD:1817-1843',
  ],
};
const S_M18_C: RecountSpecEntry = {
  item: 'M18',
  feature_id: 'm18_correct_consequence_predictions',
  role: 'companion',
  families: ['proto_m18_cases_'],
  eligibility:
    "cases with an attributable earliest first_response of slot prediction (after the case's step_presented)",
  numerator:
    'cases whose first prediction is the keyed answer of the ACTUAL case whatever part was recorded (m18_c1_s2, m18_c2_s1, m18_c3_s4)',
  denominator: 'cases with a prediction first response (planned 3)',
  missing_rule:
    "as the primary; at the review with 0 predictions: diagnosis_only when parts exist, otherwise the primary's reason",
  page_load_treatment: 'as the primary',
  citations: ['REG:2640-2660', 'ADD:1906', 'ADD:1061-1169'],
};

function m18(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m18_cases_');
  const reloaded = input.page_load_index > 1;
  const c = classify(input, f, null);
  priorCarryForward(input, 'proto_m18_cases_', c);
  const oc = c.occ[OCC_DEFAULT];
  const opened = ofType(f, 'opportunity_opened');
  const mks = f.evs.filter(
    (e) =>
      sfx(f, e) === 'technical_failure' &&
      (str(md(e).detail) ?? '').startsWith('reload'),
  );
  const CASES = ['m18_c1', 'm18_c2', 'm18_c3'];
  const PART: Record<string, string> = {
    m18_c1: 'm18_c1_p3',
    m18_c2: 'm18_c2_p4',
    m18_c3: 'm18_c3_p2',
  };
  const STEP: Record<string, string> = {
    m18_c1: 'm18_c1_s2',
    m18_c2: 'm18_c2_s1',
    m18_c3: 'm18_c3_s4',
  };
  const one = (
    pd: string,
    pr: string | null,
    pv: number | null,
    pdn: number | null,
    cd: string,
    cr: string | null,
    cv: number | null,
    cdn: number | null,
    comps: Md = {},
  ): RecountRecord[] => [
    mk(S_M18_P, pv, pv, pdn, pd, pr, comps),
    mk(S_M18_C, cv, cv, cdn, cd, cr, comps),
  ];
  if (reloaded && c.malformed)
    return one(
      'technical_failure',
      'check_record_malformed',
      null,
      null,
      'technical_failure',
      'check_record_malformed',
      null,
      null,
    );
  if (reloaded && opened.length === 0) {
    if (mks.length)
      return one(
        'interrupted',
        'held_back_after_reload',
        null,
        null,
        'interrupted',
        'held_back_after_reload',
        null,
        null,
      );
    if (!oc || oc.cls !== 'A') {
      const r =
        'absence_of_earlier_opening_not_established:' +
        (oc ? oc.cls + ':' + oc.basis : 'none');
      return one('interrupted', r, null, null, 'interrupted', r, null, null);
    }
  }
  const shared: string[] = [];
  const slotDef: Record<string, string[]> = { diagnosis: [], prediction: [] };
  let uncertain = false;
  const sc = checkSeq(f.all);
  if (!sc.ok) shared.push('sequence');
  for (const e of f.all) {
    const m = md(e);
    if (
      (m.entry_state_version !== undefined &&
        m.entry_state_version !== 'm18-cases-v1') ||
      (m.opportunity_id !== undefined &&
        m.opportunity_id !== 'proto_m18_cases_series')
    ) {
      shared.push('version_or_opportunity');
      break;
    }
  }
  for (const s of [
    'case_presented',
    'test_run',
    'step_presented',
    'first_response',
    'first_responses_completed',
  ]) {
    for (const e of ofType(f, s))
      if (
        md(e).form_id !== 'm18-form-1' ||
        md(e).content_version !== 'm18-content-v1'
      )
        shared.push('form_or_content_version_' + s);
  }
  if (opened.length > 1) shared.push('board_opened_twice');
  if (opened[0]) {
    const snap = isObj(md(opened[0]).entry_state_snapshot)
      ? (md(opened[0]).entry_state_snapshot as Md)
      : {};
    const req: [string, unknown][] = [
      ['form_id', 'm18-form-1'],
      ['content_version', 'm18-content-v1'],
      ['cases_planned', 3],
      ['responses_per_case', 2],
      ['prediction_target', 'actual_case'],
      ['tests', 'on_request_unlimited'],
      ['tests_close', 'at_part_record'],
      ['step_after', 'part_record'],
      ['cannot_solve_available', true],
      ['feedback', 'after_all_first_responses'],
      ['stop_control', false],
    ];
    for (const [k, v] of req)
      if (snap[k] !== v) shared.push('declaration_' + k);
    if (stableJson(snap.assigned_case_order) !== stableJson(CASES))
      shared.push('declaration_assigned_case_order');
    const recs = arr(snap.cases);
    if (!recs || recs.length !== 3) shared.push('declaration_cases');
    else
      for (const r of recs) {
        if (!isObj(r) || !CASES.includes(String(r.case_id))) {
          shared.push('declaration_cases');
          continue;
        }
        const cid = String(r.case_id);
        const k = cid.slice(-1);
        if (
          stableJson(r.test_ids) !==
          stableJson(['ta', 'tb', 'tc'].map((t) => `m18_c${k}_${t}`))
        )
          shared.push('declaration_tests');
        if (
          stableJson(r.part_option_ids) !==
          stableJson([1, 2, 3, 4].map((t) => `m18_c${k}_p${t}`))
        )
          shared.push('declaration_part_options');
        if (
          stableJson(r.step_option_ids) !==
          stableJson([1, 2, 3, 4].map((t) => `m18_c${k}_s${t}`))
        )
          shared.push('declaration_step_options');
        if (
          r.key_part_option_id !== PART[cid] ||
          r.key_step_option_id !== STEP[cid]
        )
          shared.push('declaration_keys');
      }
  }
  const intro = firstOf(f, 'intro_acknowledged');
  const presented = new Map<string, RecountEvent>();
  const resp: Record<string, Map<string, RecountEvent>> = {
    diagnosis: new Map(),
    prediction: new Map(),
  };
  const closure = ofType(f, 'series_closed_at_review')[0];
  const completion = ofType(f, 'first_responses_completed');
  for (const p of ofType(f, 'case_presented')) {
    const cid = str(md(p).case_id);
    if (!cid || !CASES.includes(cid)) {
      shared.push('unknown_case_presented');
      continue;
    }
    if (presented.has(cid)) {
      shared.push('case_presented_twice');
      continue;
    }
    if (CASES[presented.size] !== cid) shared.push('case_out_of_order');
    if (!intro || !before(intro, p))
      shared.push('case_before_card_acknowledged');
    if (closure && before(closure, p)) shared.push('case_after_closure');
    const k = CASES.indexOf(cid);
    if (k > 0) {
      const prevPred = ofType(f, 'first_response').find(
        (e) => md(e).case_id === CASES[k - 1] && md(e).slot === 'prediction',
      );
      if (!prevPred || !before(prevPred, p))
        shared.push('case_before_previous_step_answer');
    }
    presented.set(cid, p);
  }
  for (const r of ofType(f, 'first_response')) {
    const m = md(r);
    const cid = str(m.case_id);
    const slot = str(m.slot);
    if (
      !cid ||
      !CASES.includes(cid) ||
      (slot !== 'diagnosis' && slot !== 'prediction')
    ) {
      uncertain = true;
      continue;
    }
    const kind = str(m.response_kind);
    const optPrefix = slot === 'diagnosis' ? cid + '_p' : cid + '_s';
    if (
      kind === 'option' &&
      typeof m.option_id === 'string' &&
      !m.option_id.startsWith(optPrefix) &&
      /^m18_c\d_[ps]\d$/.test(m.option_id)
    ) {
      uncertain = true;
      continue;
    }
    if (m.phase !== 'measurement' && !(closure && before(closure, r))) {
      uncertain = true;
      continue;
    }
    if (closure && before(closure, r)) {
      slotDef[slot].push('response_after_closure');
      continue;
    }
    if (resp[slot].has(cid)) {
      slotDef[slot].push('second_record_for_case_and_slot');
      continue;
    }
    // sequencing (shared)
    if (slot === 'diagnosis') {
      const pp = presented.get(cid);
      if (!pp || !before(pp, r))
        shared.push('diagnosis_without_or_before_case_presentation');
    } else {
      const d = ofType(f, 'first_response').find(
        (e) => md(e).case_id === cid && md(e).slot === 'diagnosis',
      );
      const sp = ofType(f, 'step_presented').find((e) => md(e).case_id === cid);
      if (!d || !before(d, r) || !sp || !before(sp, r))
        shared.push('prediction_without_or_before_diagnosis_or_step');
    }
    // slot-scoped record checks
    const key = slot === 'diagnosis' ? PART[cid] : STEP[cid];
    if (kind !== 'option' && kind !== 'cannot_solve')
      slotDef[slot].push('response_kind');
    if (
      kind === 'option' &&
      (typeof m.option_id !== 'string' || !m.option_id.startsWith(optPrefix))
    )
      slotDef[slot].push('option_missing_or_unknown');
    if (
      kind === 'cannot_solve' &&
      (!('option_id' in m) || m.option_id !== null || m.correct === true)
    )
      slotDef[slot].push('cannot_solve_malformed');
    if (typeof m.correct !== 'boolean')
      slotDef[slot].push('non_boolean_correct');
    const rec = kind === 'option' && m.option_id === key;
    if (typeof m.correct === 'boolean' && m.correct !== rec)
      slotDef[slot].push('correct_contradicts_key');
    if (m.key_option_id !== key)
      slotDef[slot].push('key_option_id_not_content');
    resp[slot].set(cid, r);
  }
  for (const t of ofType(f, 'test_run')) {
    const cid = str(md(t).case_id);
    const pp = cid ? presented.get(cid) : undefined;
    const d = cid ? resp.diagnosis.get(cid) : undefined;
    if (
      !pp ||
      !before(pp, t) ||
      (d && before(d, t)) ||
      (closure && before(closure, t))
    )
      shared.push('test_outside_its_window');
  }
  for (const s of ofType(f, 'step_presented')) {
    const cid = str(md(s).case_id);
    const d = cid ? resp.diagnosis.get(cid) : undefined;
    if (!d || !before(d, s)) shared.push('step_before_its_diagnosis');
  }
  for (const rs of ofType(f, 'results_shown'))
    if (!completion[0] || !before(completion[0], rs))
      shared.push('results_before_completion');
  const answeredAll =
    resp.diagnosis.size + resp.prediction.size + (uncertain ? 1 : 0);
  if (completion.length > 1) shared.push('completion_twice');
  if (completion[0] && answeredAll < 6)
    shared.push('completion_with_fewer_than_six');
  if (
    !completion[0] &&
    resp.diagnosis.size === 3 &&
    resp.prediction.size === 3 &&
    !closure
  )
    shared.push('six_without_completion');
  if (closure && completion[0]) shared.push('closure_after_completion');
  const faults = ofType(f, 'technical_failure').filter(
    (e) =>
      !(str(md(e).detail) ?? '').startsWith('reload') &&
      !(completion[0] && before(completion[0], e)),
  );
  if (faults.length) shared.push('fault_while_open');
  const count = (slot: string) => {
    let n = 0;
    for (const [cid, r] of resp[slot])
      if (
        md(r).response_kind === 'option' &&
        md(r).option_id === (slot === 'diagnosis' ? PART[cid] : STEP[cid])
      )
        n++;
    return n;
  };
  const dCorrect = count('diagnosis');
  const pCorrect = count('prediction');
  // snapshot comparisons by scope
  const snapRec = completion[0] ?? closure;
  if (snapRec) {
    const s = md(snapRec);
    if (
      num(s.correct_first_diagnoses) !== null &&
      num(s.correct_first_diagnoses) !== dCorrect
    )
      slotDef.diagnosis.push('snapshot_disagrees');
    if (
      num(s.parts_recorded) !== null &&
      num(s.parts_recorded) !== resp.diagnosis.size
    )
      slotDef.diagnosis.push('snapshot_disagrees');
    if (
      num(s.correct_consequence_predictions) !== null &&
      num(s.correct_consequence_predictions) !== pCorrect
    )
      slotDef.prediction.push('snapshot_disagrees');
    if (
      num(s.steps_recorded) !== null &&
      num(s.steps_recorded) !== resp.prediction.size
    )
      slotDef.prediction.push('snapshot_disagrees');
    if (
      num(s.cases_presented) !== null &&
      num(s.cases_presented) !== presented.size
    )
      shared.push('snapshot_shared_field_disagrees');
  }
  const comps: Md = {
    administration_version: 'm18-cases-v1',
    form_id: 'm18-form-1',
    content_version: 'm18-content-v1',
    prediction_target: 'actual_case',
    observations_share_one_episode: true,
    slots: {
      diagnosis: { answered: resp.diagnosis.size, planned: 3 },
      prediction: { answered: resp.prediction.size, planned: 3 },
    },
    reload_check: reloadCheckComponent(c),
    // §5.290 (a) / REG §5.410: two or more records, a first-load record, a contradictory or malformed one, or a found opening beside an opening of this load
    exposure_record_consistent:
      c.exposureRecordConsistentCheckPart &&
      !(
        c.checkCount === 1 &&
        c.record?.prior_opening_found === true &&
        opened.length > 0
      ),
  };
  if (shared.length || uncertain) {
    const r = shared.length ? 'shared:' + shared[0] : 'isolation_uncertain';
    return one(
      'technical_failure',
      r,
      null,
      null,
      'technical_failure',
      r,
      null,
      null,
      {
        ...comps,
        defect_scope: shared.length ? 'shared' : 'isolation_uncertain',
        integrity_defect: [...new Set(shared)],
      },
    );
  }
  const briefed = ofType(f, 'presented').length > 0;
  if (opened.length === 0) {
    const wc = firstOf(f, 'window_closed');
    if (!briefed)
      return one(
        'not_presented',
        'never_presented',
        null,
        null,
        'not_presented',
        'never_presented',
        null,
        null,
        { ...comps, never_opened_reason: 'not_briefed_not_opened' },
      );
    if (wc && str(md(wc).exit_state) === 'closed_at_review')
      return one(
        'no_eligible_event',
        'briefed_not_opened',
        null,
        null,
        'no_eligible_event',
        'briefed_not_opened',
        null,
        null,
        { ...comps, never_opened_reason: 'briefed_not_opened', censored: true },
      );
    return one(
      'pending',
      'briefed_not_opened',
      null,
      null,
      'pending',
      'briefed_not_opened',
      null,
      null,
      { ...comps, never_opened_reason: 'briefed_not_opened' },
    );
  }
  const dBad = slotDef.diagnosis.length > 0;
  const pBad = slotDef.prediction.length > 0;
  const dOut = (): [string, string | null, number | null, number | null] => {
    if (dBad)
      return [
        'technical_failure',
        'slot:diagnosis:' + slotDef.diagnosis[0],
        null,
        null,
      ];
    if (completion[0]) return ['observed', null, dCorrect, resp.diagnosis.size];
    if (!closure) return ['pending', 'series_open', null, null];
    const n = resp.diagnosis.size;
    if (n === 3) return ['observed', null, dCorrect, 3];
    if (n > 0) return ['incomplete', 'closed_at_review', dCorrect, n];
    return [
      'no_eligible_event',
      presented.size ? 'case_presented_no_response' : 'intro_only',
      null,
      0,
    ];
  };
  const pOut = (): [string, string | null, number | null, number | null] => {
    if (pBad)
      return [
        'technical_failure',
        'slot:prediction:' + slotDef.prediction[0],
        null,
        null,
      ];
    if (completion[0])
      return ['observed', null, pCorrect, resp.prediction.size];
    if (!closure) return ['pending', 'series_open', null, null];
    const n = resp.prediction.size;
    if (n === 3) return ['observed', null, pCorrect, 3];
    if (n > 0) return ['incomplete', 'closed_at_review', pCorrect, n];
    return [
      'no_eligible_event',
      resp.diagnosis.size
        ? 'diagnosis_only'
        : presented.size
          ? 'case_presented_no_response'
          : 'intro_only',
      null,
      0,
    ];
  };
  const d = dOut();
  const p = pOut();
  return one(d[0], d[1], d[2], d[3], p[0], p[1], p[2], p[3], {
    ...comps,
    ...(closure
      ? { closure_reason: 'closed_at_review' }
      : completion[0]
        ? { closure_reason: 'completed' }
        : {}),
  });
}

// ================================================================ M19

const S_M19_P: RecountSpecEntry = {
  item: 'M19',
  feature_id: 'm19_continuations',
  role: 'primary',
  families: ['proto_m19_lines_'],
  eligibility:
    'per line from the attempt events alone: boundary = the first attempt after which the executed settings include all listed evidence settings (line 1 the all-ON SINGLE setting; line 2 dial 4 SHUT and dial 5 SHUT); continued = a later attempt exists; eligible <=> boundary AND finish not technical_failure AND (continued OR finish set_aside OR shift_ended); a boundary line closed at the review without a continuation is censored; a technical_failure line is excluded',
  numerator: 'eligible lines with a further executed TRY after their boundary',
  denominator:
    'eligible lines (planned 2; conditional, complete at any size above zero)',
  missing_rule:
    'not presented => not_presented; presented never opened => pending, after closed_unopened no_eligible_event (not_opened); opened without check_recorded => pending, after the series closure no_eligible_event (check_not_reached / check_not_completed); check fail => understanding_failed; lines in work => pending; complete or closed with denominator 0 => null/0: technical_failure (technical_only) > interrupted (censored_only) > no_eligible_event (obstacle_not_reached / no_try); S1-S7 defects => technical_failure (integrity_defect); precedence interrupted > technical_failure > understanding_failed > pending > closed',
  page_load_treatment:
    'as M14 (RL-4, REG §5.410), incl. the D-7 (i) recomputation and the flags entry "the reload check records are inconsistent"; under an established check a load with no current-load evidence reads its first-load rule (r3 direction (b); the U21 SC-3 rule "interrupted while earlier loads exist" is recorded as GAPS G-M19-1)',
  citations: [
    'REG:1409-2215',
    'ADD:1171-1235',
    'ADD:1907',
    'R3:386-389',
    'ROD:D-6',
    'ROD:D-7',
    'REG:14962-15061',
    'ADD:1817-1843',
  ],
};

function m19(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m19_lines_');
  const reloaded = input.page_load_index > 1;
  const c = classify(input, f, null);
  priorCarryForward(input, 'proto_m19_lines_', c);
  const oc = c.occ[OCC_DEFAULT];
  const opened = ofType(f, 'opportunity_opened');
  const mks = f.evs.filter(
    (e) =>
      sfx(f, e) === 'technical_failure' &&
      (str(md(e).detail) ?? '').startsWith('reload'),
  );
  const rlFlags = c.exposureRecordConsistentCheckPart
    ? []
    : ['the reload check records are inconsistent']; // REG §5.410 (a): M19 / M20 signal it in `flags`
  const one = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    comps: Md = {},
  ) => [
    mk(S_M19_P, v, n, dn, d, r, {
      reload_check: reloadCheckComponent(c),
      flags: rlFlags,
      ...comps,
    }),
  ];
  if (reloaded && c.malformed)
    return one('technical_failure', 'check_record_malformed', null, null, null);
  if (reloaded && opened.length === 0) {
    if (mks.length)
      return one('interrupted', 'held_back_after_reload', null, null, null);
    if (!oc || oc.cls !== 'A')
      return one(
        'interrupted',
        'absence_of_earlier_opening_not_established:' +
          (oc ? oc.cls + ':' + oc.basis : 'none'),
        null,
        null,
        null,
      );
  }
  const defects: string[] = [];
  const sc = checkSeq(f.all);
  if (!sc.ok) defects.push('S2_sequence');
  for (const e of f.all) {
    const m = md(e);
    if (
      (m.entry_state_version !== undefined &&
        m.entry_state_version !== 'm19-lines-v2') ||
      (m.opportunity_id !== undefined &&
        m.opportunity_id !== 'proto_m19_lines_series')
    ) {
      defects.push('S1_identity');
      break;
    }
  }
  for (const s of [
    'line_presented',
    'attempt',
    'difficulty_boundary',
    'line_finished',
    'check_answered',
  ]) {
    for (const e of ofType(f, s))
      if (
        md(e).form_id !== 'm19-form-1' ||
        md(e).content_version !== 'm19-content-v2'
      )
        defects.push('S1_form_or_content');
  }
  if (opened[0]) {
    const snap = isObj(md(opened[0]).entry_state_snapshot)
      ? (md(opened[0]).entry_state_snapshot as Md)
      : {};
    if (
      snap.lines_planned !== 2 ||
      stableJson(snap.line_order) !== stableJson(['m19_l1', 'm19_l2'])
    )
      defects.push('S1_entry_snapshot');
    if (
      (snap.form_id !== undefined && snap.form_id !== 'm19-form-1') ||
      (snap.content_version !== undefined &&
        snap.content_version !== 'm19-content-v2')
    )
      defects.push('S1_entry_snapshot');
  }
  const closedUnopened = ofType(f, 'closed_unopened');
  if (closedUnopened.length && opened.length)
    defects.push('S3_closed_unopened_with_opening');
  // S7 check
  const answersC = ofType(f, 'check_answered');
  const recorded = ofType(f, 'check_recorded');
  const KEY: Record<string, string> = {
    m19_chk_q1: 'm19_chk_q1_o2',
    m19_chk_q2: 'm19_chk_q2_o3',
  };
  if (answersC.length > 2) defects.push('S7_more_than_two_answers');
  answersC.forEach((a, i) => {
    const m = md(a);
    if (m.attempt !== i + 1) defects.push('S7_attempt_order');
    if (
      typeof m.check_id === 'string' &&
      m.correct !== (m.option_id === KEY[m.check_id])
    )
      defects.push('S7_correct_flag');
  });
  if (answersC[1]) {
    const expl = firstOf(f, 'explanation_shown');
    if (
      md(answersC[0]).correct !== false ||
      !expl ||
      !before(expl, answersC[1])
    )
      defects.push('S7_second_attempt_without_wrong_first_and_explanation');
  }
  let checkStatus: string | null = null;
  if (answersC[0]) {
    const a1 = md(answersC[0]).correct === true;
    const a2 = answersC[1] ? md(answersC[1]).correct === true : null;
    checkStatus = a1
      ? 'pass_first'
      : a2 === true
        ? 'pass_after_explanation'
        : a2 === false
          ? 'fail'
          : null;
  }
  if (recorded.length > 1) defects.push('S7_check_recorded_twice');
  if (
    recorded[0] &&
    checkStatus !== null &&
    md(recorded[0]).status !== checkStatus
  )
    defects.push('S7_status_disagrees');
  // lines
  const LINES = ['m19_l1', 'm19_l2'];
  const reading = (line: string, s: Md): string | null => {
    if (line === 'm19_l1') {
      if (
        typeof s.h1 !== 'boolean' ||
        typeof s.h2 !== 'boolean' ||
        typeof s.h3 !== 'boolean' ||
        (s.feed !== 'SINGLE' && s.feed !== 'DOUBLE')
      )
        return null;
      const v =
        ((s.h1 ? 1 : 0) + (s.h2 ? 2 : 0) + (s.h3 ? 4 : 0)) *
        (s.feed === 'DOUBLE' ? 2 : 1);
      return v < 10 ? 'LOW' : v === 10 ? 'OK' : 'HIGH';
    }
    const d = num(s.dial);
    if (
      d === null ||
      !Number.isInteger(d) ||
      d < 1 ||
      d > 9 ||
      (s.bypass !== 'SHUT' && s.bypass !== 'OPEN')
    )
      return null;
    const v = 2 * d - (s.bypass === 'OPEN' ? 1 : 0);
    return v < 9 ? 'LOW' : v === 9 ? 'OK' : 'HIGH';
  };
  const isEvidence = (line: string, s: Md): string | null => {
    if (line === 'm19_l1')
      return s.h1 === true &&
        s.h2 === true &&
        s.h3 === true &&
        s.feed === 'SINGLE'
        ? 'allon'
        : null;
    if (s.bypass === 'SHUT' && (s.dial === 4 || s.dial === 5))
      return 'd' + s.dial;
    return null;
  };
  const need: Record<string, string[]> = {
    m19_l1: ['allon'],
    m19_l2: ['d4', 'd5'],
  };
  interface L {
    presented: boolean;
    attempts: number;
    boundary: number | null;
    continued: boolean;
    finish: string | null;
    eligible: boolean;
    censored: boolean;
    excluded: string | null;
    tried: boolean;
  }
  const lines: Record<string, L> = {};
  const lp = ofType(f, 'line_presented');
  lp.forEach((e, i) => {
    if (md(e).line_id !== LINES[i]) defects.push('S3_line_order_or_unknown');
  });
  for (const id of LINES) {
    const pres = lp.filter((e) => md(e).line_id === id);
    if (pres.length > 1) defects.push('S3_line_presented_twice');
    const att = ofType(f, 'attempt').filter((e) => md(e).line_id === id);
    const fin = ofType(f, 'line_finished').filter((e) => md(e).line_id === id);
    const bnd = ofType(f, 'difficulty_boundary').filter(
      (e) => md(e).line_id === id,
    );
    if (fin.length > 1) defects.push('S6_finished_twice');
    if (
      id === 'm19_l1' &&
      pres[0] &&
      (!recorded[0] || !before(recorded[0], pres[0]))
    )
      defects.push('S3_line1_before_check');
    if (id === 'm19_l2' && pres[0]) {
      const f1 = ofType(f, 'line_finished').find(
        (e) => md(e).line_id === 'm19_l1',
      );
      if (!f1 || !before(f1, pres[0]))
        defects.push('S3_line2_before_line1_finish');
    }
    const settings = new Set<string>();
    const have = new Set<string>();
    let boundary: number | null = null;
    let boundarySeq: number | null = null;
    const evid: number[] = [];
    for (let i = 0; i < att.length; i++) {
      const a = att[i];
      const m = md(a);
      if (m.attempt_index !== i + 1) defects.push('S4_attempt_index');
      const s = isObj(m.setting) ? (m.setting as Md) : {};
      const rd = reading(id, s);
      if (rd === null) defects.push('S4_setting_malformed');
      else if (m.reading !== rd || m.restored !== (rd === 'OK'))
        defects.push('S4_stored_reading');
      const key = stableJson(s);
      if (settings.has(key)) defects.push('S4_setting_executed_twice');
      settings.add(key);
      if (!pres[0] || !before(pres[0], a) || (fin[0] && !before(a, fin[0])))
        defects.push('S4_attempt_outside_line');
      const ev = isEvidence(id, s);
      if (ev) {
        have.add(ev);
        evid.push(i + 1);
      }
      if (boundary === null && need[id].every((n) => have.has(n))) {
        boundary = i + 1;
        boundarySeq = seqOf(a);
      }
    }
    // S5 boundary record
    if (boundary === null && bnd.length)
      defects.push('S5_boundary_without_rule');
    if (boundary !== null) {
      if (bnd.length !== 1) defects.push('S5_boundary_count');
      else {
        const b = md(bnd[0]);
        if (
          b.attempt_index !== boundary ||
          b.rule !== 'designed_obstacle' ||
          b.attempt_sequence !== boundarySeq
        )
          defects.push('S5_boundary_fields');
        if (stableJson(b.evidence_attempt_indices) !== stableJson(evid))
          defects.push('S5_evidence_indices');
        const ba = att[(boundary as number) - 1];
        const later = att[boundary as number];
        if (
          !before(ba, bnd[0]) ||
          (later && !before(bnd[0], later)) ||
          (fin[0] && !before(bnd[0], fin[0]))
        )
          defects.push('S5_boundary_position');
      }
    }
    const finish = fin[0] ? str(md(fin[0]).finish) : null;
    const continued = boundary !== null && att.length > boundary;
    if (fin[0]) {
      const lastRestored =
        att.length > 0 && md(att[att.length - 1]).restored === true;
      if ((finish === 'restored') !== lastRestored)
        defects.push('S6_restored_finish');
      if (
        md(fin[0]).boundary_attempt_index !== undefined &&
        (md(fin[0]).boundary_attempt_index ?? null) !== boundary
      )
        defects.push('S6_boundary_index');
      if (
        md(fin[0]).continued !== undefined &&
        md(fin[0]).continued !== continued
      )
        defects.push('S6_continued');
    }
    const eligible =
      boundary !== null &&
      finish !== null &&
      finish !== 'technical_failure' &&
      (continued || finish === 'set_aside' || finish === 'shift_ended');
    const reviewCensored =
      boundary !== null && finish === 'closed_at_review' && !continued;
    lines[id] = {
      presented: pres.length > 0,
      attempts: att.length,
      boundary,
      continued,
      finish,
      eligible,
      censored: reviewCensored,
      excluded:
        finish === 'technical_failure'
          ? 'technical_failure'
          : reviewCensored
            ? 'closed_at_review'
            : null,
      tried: att.length > 0,
    };
  }
  const seriesCompleted = firstOf(f, 'series_completed');
  const seriesClosed = firstOf(f, 'series_closed');
  const tfRec = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  for (const t of tfRec) {
    const lid = str(md(t).line_id);
    if (lid && lines[lid] && lines[lid].finish !== 'technical_failure')
      defects.push('S6_fault_record_without_line_finish');
  }
  for (const id of LINES)
    if (
      lines[id].finish === 'technical_failure' &&
      !tfRec.some((t) => md(t).line_id === id)
    )
      defects.push('S6_tf_finish_without_record');
  const snap = seriesCompleted ?? seriesClosed;
  if (snap) {
    for (const l of arr(md(snap).lines) ?? []) {
      if (!isObj(l)) continue;
      const L = lines[String(l.line_id)];
      if (
        L &&
        ((l.boundary_attempt_index ?? null) !== L.boundary ||
          (l.continued !== undefined && l.continued !== L.continued) ||
          (l.finish !== undefined && (l.finish ?? null) !== L.finish))
      )
        defects.push('S6_snapshot_disagrees');
    }
  }
  const lineComps = Object.fromEntries(
    LINES.map((id) => [
      id,
      {
        presented: lines[id].presented,
        attempts: lines[id].attempts,
        boundary_attempt_index: lines[id].boundary,
        continued: lines[id].continued,
        finish: lines[id].finish,
        eligible: lines[id].eligible,
        censored: lines[id].censored,
        excluded_reason: lines[id].excluded,
      },
    ]),
  );
  const comps: Md = {
    check: { status: checkStatus },
    lines: lineComps,
    presented_in_current_load: ofType(f, 'presented').length > 0,
    observations_share_one_episode: true,
  };
  if (defects.length)
    return one(
      'technical_failure',
      'integrity:' + defects[0],
      null,
      null,
      null,
      { ...comps, integrity_defect: [...new Set(defects)] },
    );
  // lifecycle
  if (opened.length === 0) {
    const presentedL = ofType(f, 'presented').length > 0;
    if (!presentedL)
      return one('not_presented', 'not_presented', null, null, null, {
        ...comps,
        nonresponse_kind: 'not_presented',
      });
    if (
      closedUnopened.length ||
      str(md(firstOf(f, 'window_closed')).exit_state) === 'closed_at_review'
    )
      return one('no_eligible_event', 'not_opened', null, null, null, {
        ...comps,
        nonresponse_kind: 'not_opened',
      });
    return one('pending', 'presented_never_opened', null, null, null, comps);
  }
  const closedAny = !!seriesCompleted || !!seriesClosed || tfRec.length > 0;
  if (checkStatus === 'fail')
    return one('understanding_failed', 'check_failed', null, null, null, {
      ...comps,
      nonresponse_kind: 'check_failed',
    });
  if (!recorded[0]) {
    if (!closedAny)
      return one('pending', 'card_or_check_open', null, null, null, comps);
    if (tfRec.length)
      return one('technical_failure', 'technical_only', null, null, null, {
        ...comps,
        nonresponse_kind: 'technical_only',
      });
    const k = ofType(f, 'check_presented').length
      ? 'check_not_completed'
      : 'check_not_reached';
    return one('no_eligible_event', k, null, null, null, {
      ...comps,
      nonresponse_kind: k,
    });
  }
  const elig = LINES.filter((id) => lines[id].eligible);
  const num1 = elig.filter((id) => lines[id].continued).length;
  const bothFinished = LINES.every((id) => lines[id].finish !== null);
  if (!bothFinished && !closedAny)
    return one('pending', 'lines_in_work', null, null, null, comps);
  const censoredLines = LINES.filter((id) => lines[id].excluded);
  const closure = seriesCompleted
    ? 'completed'
    : seriesClosed
      ? str(md(seriesClosed).closure_reason) === 'shift_ended'
        ? 'route_departure'
        : 'closed_at_review'
      : 'technical_failure';
  if (elig.length > 0)
    return one('observed', null, num1, num1, elig.length, {
      ...comps,
      included_ids: elig,
      censored: censoredLines.length > 0,
      closure_reason: closure,
    });
  if (
    LINES.some((id) => lines[id].excluded === 'technical_failure') ||
    (tfRec.length && !LINES.some((id) => lines[id].censored))
  )
    return one('technical_failure', 'technical_only', null, null, 0, {
      ...comps,
      nonresponse_kind: 'technical_only',
      censored: true,
      closure_reason: closure,
    });
  if (LINES.some((id) => lines[id].censored))
    return one('interrupted', 'censored_only', null, null, 0, {
      ...comps,
      nonresponse_kind: 'censored_only',
      censored: true,
      closure_reason: closure,
    });
  const tried = LINES.some((id) => lines[id].presented && lines[id].tried);
  return one(
    'no_eligible_event',
    tried ? 'obstacle_not_reached' : 'no_try',
    null,
    null,
    0,
    {
      ...comps,
      nonresponse_kind: tried ? 'obstacle_not_reached' : 'no_try',
      closure_reason: closure,
    },
  );
}

// ================================================================ M20

const S_M20_P: RecountSpecEntry = {
  item: 'M20',
  feature_id: 'm20_cued_resumptions',
  role: 'primary',
  families: ['proto_m20_feed_'],
  eligibility:
    "per channel from the raw events alone: held = channel_held after the aligned step 2; released = channel_released at held_at_ms + 30000; a spontaneous resumption = the first executed align_attempt after the release and before the channel's cue_presented (or with no notice) — excluded from the cued denominator; cued-eligible <=> released AND not resumed before its notice AND the notice validly presented (visible, focused, >= release + 30000, A before B, B >= 8000 ms after A's actual end) AND not excluded",
  numerator:
    'cued-eligible channels with a cued credit (the first executed align_attempt after cue_presented); a noticed channel without a credit counts 0 at the sign-off',
  denominator:
    'cued-eligible channels (planned 2; conditional, complete above zero); noticed without a credit: censored at the review, excluded by a fault',
  missing_rule:
    'no current-load opportunity evidence (outdoor_* never counts) => not_presented; presented, never opened => pending, at closed_unopened or the absence record no_eligible_event (not_opened); opened, not final => pending; final with denominator 0 => null/null/0: technical_only => technical_failure, censored_only => interrupted, resumed_before_cue > cue_not_presented > no_hold > not_begun => no_eligible_event; S1-S7 defects => technical_failure',
  page_load_treatment:
    'as M14 (RL-4, REG §5.410), incl. the D-7 (i) recomputation; an inconsistent check is signalled by the flags entry "the reload check records are inconsistent" (REG §5.410 (a))',
  citations: [
    'REG:759-1408',
    'ADD:1237-1330',
    'ADD:1908',
    'R3:386-389',
    'ROD:D-6',
    'ROD:D-7',
    'REG:14962-15061',
    'ADD:1817-1843',
  ],
};

function m20(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m20_feed_');
  const reloaded = input.page_load_index > 1;
  const c = classify(input, f, null);
  priorCarryForward(input, 'proto_m20_feed_', c);
  const oc = c.occ[OCC_DEFAULT];
  const live = f.evs.filter((e) => !sfx(f, e).startsWith('outdoor_'));
  const opened = live.filter((e) => sfx(f, e) === 'opportunity_opened');
  const mks = live.filter(
    (e) =>
      sfx(f, e) === 'technical_failure' &&
      (str(md(e).detail) ?? '').startsWith('reload'),
  );
  const rlFlags = c.exposureRecordConsistentCheckPart
    ? []
    : ['the reload check records are inconsistent']; // REG §5.410 (a)
  const one = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    comps: Md = {},
  ) => [
    mk(S_M20_P, v, n, dn, d, r, {
      reload_check: reloadCheckComponent(c),
      difficulty_established: false,
      flags: rlFlags,
      ...comps,
    }),
  ];
  if (reloaded && c.malformed)
    return one('technical_failure', 'check_record_malformed', null, null, null);
  if (reloaded && opened.length === 0) {
    if (mks.length)
      return one('interrupted', 'reload_hold_back', null, null, null);
    if (!oc || oc.cls !== 'A')
      return one(
        'interrupted',
        'reload_no_current_evidence:' + (oc ? oc.cls + ':' + oc.basis : 'none'),
        null,
        null,
        null,
      );
  }
  const defects: string[] = [];
  const all = f.all.filter((e) => !sfx(f, e).startsWith('outdoor_'));
  if (!checkSeq(all).ok) defects.push('S2_sequence');
  for (const e of all) {
    const m = md(e);
    if (
      (m.entry_state_version !== undefined &&
        m.entry_state_version !== 'm20-feed-returns-v2') ||
      (m.opportunity_id !== undefined &&
        m.opportunity_id !== 'proto_m20_feed_project')
    ) {
      defects.push('S1_identity');
      break;
    }
  }
  const closedUnopened = live.filter((e) => sfx(f, e) === 'closed_unopened');
  if (closedUnopened.length && opened.length)
    defects.push('S3_closed_unopened_with_opening');
  const TARGET: Record<string, number[][]> = {
    m20_ch_a: [
      [2, 4, 3],
      [3, 1, 4],
      [4, 2, 1, 3],
      [1, 3, 4, 2],
      [3, 4, 2, 1, 4],
      [2, 1, 3, 4, 2],
    ],
    m20_ch_b: [
      [4, 1, 3],
      [2, 3, 1],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 2, 3, 1, 3],
      [1, 4, 2, 3, 4],
    ],
  };
  const CH = ['m20_ch_a', 'm20_ch_b'];
  const terminal = live.filter(
    (e) =>
      ['project_completed', 'project_closed', 'technical_failure'].includes(
        sfx(f, e),
      ) && !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const term = terminal.filter((e) => sfx(f, e) !== 'technical_failure')[0];
  const fault = terminal.find((e) => sfx(f, e) === 'technical_failure');
  const termEv = term ?? fault;
  if (terminal.filter((e) => sfx(f, e) !== 'technical_failure').length > 1)
    defects.push('S7_two_terminal_records');
  interface Ch {
    status: string;
    eligible: boolean;
    credited: boolean;
    spontaneous: boolean;
    noticeEnd: number | null;
    cueAt: number | null;
    released: number | null;
  }
  const ch: Record<string, Ch> = {};
  for (const id of CH) {
    const ev = live.filter((e) => md(e).channel_id === id);
    const atts = ev.filter((e) => sfx(f, e) === 'align_attempt');
    const held = ev.filter((e) => sfx(f, e) === 'channel_held');
    const rel = ev.filter((e) => sfx(f, e) === 'channel_released');
    const cue = ev.filter((e) => sfx(f, e) === 'cue_presented');
    const cueEnd = ev.filter((e) => sfx(f, e) === 'cue_notice_ended');
    // S4 attempts
    let lastVec: Record<number, string> = {};
    atts.forEach((a, i) => {
      const m = md(a);
      if (m.attempt_index !== i + 1) defects.push('S4_attempt_index');
      const step = num(m.step_index);
      const cells = arr(m.cells);
      const tgt = step !== null ? TARGET[id][step - 1] : undefined;
      if (!tgt || !cells || cells.length !== tgt.length) {
        defects.push('S4_cells_or_step');
        return;
      }
      const differ = cells.filter((v, k) => v !== tgt[k]).length;
      if (m.differ !== differ || m.aligned !== (differ === 0))
        defects.push('S4_stored_result');
      if (cells.every((v) => v === 1)) defects.push('S4_all_ones_executed');
      if (lastVec[step as number] === stableJson(cells))
        defects.push('S4_repeat_executed');
      lastVec[step as number] = stableJson(cells);
      if (held[0] && before(held[0], a) && (!rel[0] || before(a, rel[0])))
        defects.push('S4_attempt_on_held_channel');
      if (termEv && before(termEv, a))
        defects.push('S4_attempt_after_terminal');
    });
    lastVec = {};
    const step2 = atts.find(
      (a) => md(a).step_index === 2 && md(a).aligned === true,
    );
    if ((step2 ? 1 : 0) !== held.length) defects.push('S5_hold_iff_step2');
    if (held.length > 1) defects.push('S5_hold_twice');
    const heldAt = held[0] ? num(md(held[0]).held_at_ms) : null;
    if (rel.length > 1) defects.push('S6_release_twice');
    const releasedAt = rel[0] ? num(md(rel[0]).released_at_ms) : null;
    if (
      rel[0] &&
      (!held[0] ||
        !before(held[0], rel[0]) ||
        heldAt === null ||
        releasedAt !== heldAt + 30000)
    )
      defects.push('S6_release_timing');
    if (cue.length > 1) defects.push('S6_cue_twice');
    const cueAt = cue[0] ? num(md(cue[0]).presented_at_ms) : null;
    if (cue[0]) {
      const m = md(cue[0]);
      if (!rel[0] || !before(rel[0], cue[0]))
        defects.push('S6_cue_without_release');
      if (m.page_visible !== true || m.page_focused !== true)
        defects.push('S6_cue_not_visible_focused');
      if (releasedAt === null || cueAt === null || cueAt < releasedAt + 30000)
        defects.push('S6_cue_too_early');
      if (atts.some((a) => rel[0] && before(rel[0], a) && before(a, cue[0])))
        defects.push('S6_cue_after_resumption');
      if (ev.some((e) => sfx(f, e) === 'channel_aligned' && before(e, cue[0])))
        defects.push('S6_cue_after_aligned');
      if (termEv && before(termEv, cue[0]))
        defects.push('S7_cue_after_terminal');
    }
    if (cueEnd.length > 1) defects.push('S6_notice_end_twice');
    const endAt = cueEnd[0] ? num(md(cueEnd[0]).ended_at_ms) : null;
    if (cueEnd[0] && (cueAt === null || endAt === null || endAt < cueAt))
      defects.push('S6_notice_end_before_presentation');
    if (cueEnd[0] && term && before(term, cueEnd[0]))
      defects.push('S7_notice_end_after_terminal');
    const spontaneousAtt = rel[0]
      ? atts.find((a) => before(rel[0], a) && (!cue[0] || before(a, cue[0])))
      : undefined;
    const creditAtt = cue[0]
      ? atts.find((a) => before(cue[0], a) && (!termEv || before(a, termEv)))
      : undefined;
    let status: string;
    let eligible = false;
    let credited = false;
    const closure = term
      ? sfx(f, term) === 'project_completed'
        ? 'completed'
        : str(md(term).closure_reason)
      : fault
        ? 'technical_failure'
        : null;
    if (atts.length === 0) status = 'not_begun';
    else if (!held[0]) status = 'begun_not_held';
    else if (spontaneousAtt) status = 'resumed_spontaneously';
    else if (cue[0] && creditAtt) {
      status = 'resumed';
      eligible = true;
      credited = true;
    } else if (cue[0]) {
      if (closure === 'shift_signed_off' || closure === 'completed') {
        status = 'not_resumed';
        eligible = true;
      } else if (closure === 'closed_at_review') status = 'censored_review';
      else if (closure === 'technical_failure')
        status = 'excluded_technical_failure';
      else status = 'awaiting_return';
    } else
      status = closure
        ? 'cue_not_presented'
        : rel[0]
          ? 'released_awaiting'
          : 'held';
    ch[id] = {
      status,
      eligible,
      credited,
      spontaneous: !!spontaneousAtt,
      noticeEnd: endAt,
      cueAt,
      released: releasedAt,
    };
  }
  // B's notice ordering (E38 / E57)
  const a = ch.m20_ch_a;
  const b = ch.m20_ch_b;
  if (
    b.cueAt !== null &&
    a.cueAt !== null &&
    (a.noticeEnd === null || b.cueAt < a.noticeEnd + 8000)
  )
    defects.push('S6_B_within_8000_of_A_end');
  if (
    b.cueAt !== null &&
    a.cueAt === null &&
    a.released !== null &&
    !a.spontaneous &&
    a.released + 30000 <= b.cueAt &&
    ['released_awaiting', 'cue_not_presented'].includes(a.status)
  )
    defects.push('S6_B_while_A_due_undelivered');
  const snapRec = term;
  if (snapRec) {
    const sm = md(snapRec);
    const spont = CH.filter((id) => ch[id].spontaneous).length;
    if (
      num(sm.spontaneous_resumptions) !== null &&
      num(sm.spontaneous_resumptions) !== spont
    )
      defects.push('S7_snapshot_disagrees');
    if (
      sfx(f, snapRec) === 'project_completed' &&
      !CH.every((id) =>
        live.some(
          (e) => md(e).channel_id === id && sfx(f, e) === 'channel_aligned',
        ),
      )
    )
      defects.push('S7_completed_without_both_aligned');
  }
  const spontaneous = CH.filter((id) => ch[id].spontaneous).length;
  const comps: Md = {
    spontaneous_resumptions: spontaneous,
    channels: Object.fromEntries(
      CH.map((id) => [
        id,
        {
          status: ch[id].status,
          eligible: ch[id].eligible,
          credited: ch[id].credited,
        },
      ]),
    ),
    project_closure_reason: term
      ? sfx(f, term) === 'project_completed'
        ? 'completed'
        : (md(term).closure_reason ?? null)
      : fault
        ? 'technical_failure'
        : null,
    observations_share_one_project: true,
    cued_outcome_conditional_on_no_spontaneous_resumption: true,
  };
  if (defects.length)
    return one(
      'technical_failure',
      'integrity:' + defects[0],
      null,
      null,
      null,
      {
        integrity_defect: [...new Set(defects)],
        spontaneous_resumptions: null,
        valid: false,
      },
    );
  const presentedL = live.some((e) => sfx(f, e) === 'presented');
  if (opened.length === 0) {
    if (!presentedL && closedUnopened.length === 0)
      return one('not_presented', 'not_presented', null, null, null, {
        nonresponse_kind: 'not_presented',
      });
    const wc = firstOf(f, 'window_closed');
    if (closedUnopened.length || str(md(wc).exit_state) === 'closed_at_review')
      return one('no_eligible_event', 'not_opened', null, null, null, {
        nonresponse_kind: 'not_opened',
      });
    return one('pending', 'presented_never_opened', null, null, null);
  }
  const bothResumed = CH.every((id) =>
    ['resumed', 'resumed_spontaneously'].includes(ch[id].status),
  );
  const finalNow = !!termEv || bothResumed;
  if (!finalNow) return one('pending', 'project_open', null, null, null, comps);
  const elig = CH.filter((id) => ch[id].eligible);
  const credits = elig.filter((id) => ch[id].credited).length;
  const excluded = CH.filter((id) =>
    ['censored_review', 'excluded_technical_failure'].includes(ch[id].status),
  );
  const closureReason = term
    ? sfx(f, term) === 'project_completed'
      ? 'completed'
      : str(md(term).closure_reason) === 'shift_signed_off'
        ? 'route_departure'
        : 'closed_at_review'
    : fault
      ? 'technical_failure'
      : null;
  const faultAfterFinal = !!fault && bothResumed;
  if (elig.length > 0)
    return one('observed', null, credits, credits, elig.length, {
      ...comps,
      censored: excluded.length > 0,
      closure_reason: closureReason,
      ...(faultAfterFinal ? { fault_after_final_result: true } : {}),
    });
  const rank = [
    'excluded_technical_failure',
    'censored_review',
    'resumed_spontaneously',
    'cue_not_presented',
    'begun_not_held',
    'not_begun',
  ];
  const kindOf: Record<string, string> = {
    excluded_technical_failure: 'technical_only',
    censored_review: 'censored_only',
    resumed_spontaneously: 'resumed_before_cue',
    cue_not_presented: 'cue_not_presented',
    begun_not_held: 'no_hold',
    not_begun: 'not_begun',
  };
  const top =
    rank.find((r) => CH.some((id) => ch[id].status === r)) ??
    'cue_not_presented';
  const nk = kindOf[top] ?? 'cue_not_presented';
  const d =
    nk === 'technical_only'
      ? 'technical_failure'
      : nk === 'censored_only'
        ? 'interrupted'
        : 'no_eligible_event';
  return one(d, nk, null, null, 0, {
    ...comps,
    nonresponse_kind: nk,
    closure_reason: closureReason,
    censored: d !== 'no_eligible_event',
  });
}

// ================================================================ D-2 (i) wrapper for M21 / M22
//
// RL-3 (REG §5.409; addendum §2 "U24 RL-3"): a reload hold-back marker is
// no longer a technical failure of the row; a held case / report is never
// a zero and never in the denominator; beside an observed one the row reads
// interrupted with its contribution kept; with none opened interrupted
// null/null; with one opened and none eligible a would-be
// no_eligible_event reads interrupted null/0; pending, an existing
// interrupted and understanding_failed keep their readings (reading (g)).

function applyD2(
  base: {
    d: string;
    r: string | null;
    v: number | null;
    n: number | null;
    dn: number | null;
  },
  heldReason: string | null,
  anyOpened: boolean,
): {
  d: string;
  r: string | null;
  v: number | null;
  n: number | null;
  dn: number | null;
} {
  if (!heldReason) return base;
  if (base.d === 'observed' || base.d === 'incomplete')
    return { ...base, d: 'interrupted', r: heldReason };
  if (base.d === 'no_eligible_event')
    return { d: 'interrupted', r: heldReason, v: null, n: null, dn: 0 };
  if (
    base.d === 'pending' ||
    base.d === 'interrupted' ||
    base.d === 'understanding_failed' ||
    base.d === 'technical_failure'
  )
    return base;
  return anyOpened
    ? { d: 'interrupted', r: heldReason, v: null, n: null, dn: 0 }
    : { d: 'interrupted', r: heldReason, v: null, n: null, dn: null };
}

// ================================================================ M21

const S_M21_P: RecountSpecEntry = {
  item: 'M21',
  feature_id: 'm21_restudy_revisions',
  role: 'primary',
  families: ['proto_m21_case_'],
  eligibility:
    'per case o1 / o2: the first application (applied index 1) incorrect AND the case resolved by the participant (accepted or set aside) — or closed by the review after the numerator fact was observed (a review-closed case keeps its observed 1); a first-time success is outside the denominator',
  numerator:
    'eligible cases with a relevant restudy (a `restudy` record with relevant true, after a failed application) AND a later revised application (an applied record with revised true after that restudy); compared with the case record (disagreement => technical_failure for the row)',
  denominator: 'eligible cases (planned 2; conditional: 1 is observed)',
  missing_rule:
    'two first-time successes / no eligible case with a first-time success => no_eligible_event null/0; presented, never opened => declined; never presented => not_presented; a case open at export => pending; a review-closed or still-open incorrect case without the fact => censored and excluded (null interrupted when it was the only one); a non-reload technical_failure record voids the row',
  page_load_treatment:
    'D-2 (i) (REG §5.409): held case beside an observed one => interrupted x/1; would-be no_eligible_event => interrupted null/0; nothing opened => interrupted null/null; class from the M21 check (stage 1 presented, stage 3 opportunity_opened per case); RL-1C decision A for presented cases',
  citations: [
    'REG:7471-7540',
    'ADD:1909',
    'R3:210-223',
    'REG:14785-14791',
    'REG:14862-14873',
    'ADD:1791-1815',
    'ROD:D-2',
  ],
};

function m21(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m21_case_');
  const OCCS = ['o1', 'o2'];
  const c = classify(input, f, OCCS);
  const mks = markers(f);
  interface O {
    st: 'NOP' | 'DEC' | 'OPEN' | 'FIRST_OK' | 'NOAPP' | 'ELIG' | 'CENS';
    x: number | null;
    opened: boolean;
    presented: boolean;
    any: boolean;
    disagree: boolean;
  }
  const occ: Record<string, O> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const opened = evs.some((e) => sfx(f, e) === 'opportunity_opened');
    const presented = evs.some((e) => sfx(f, e) === 'presented');
    const apps = evs.filter((e) => sfx(f, e) === 'applied');
    const acc = evs.find((e) => sfx(f, e) === 'accepted');
    const aside = evs.find((e) => sfx(f, e) === 'set_aside');
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    const restudies = evs.filter(
      (e) => sfx(f, e) === 'restudy' && md(e).relevant === true,
    );
    let fact = false;
    for (const r of restudies) {
      const failedBefore = apps.some(
        (a) => before(a, r) && md(a).correct === false,
      );
      const revisedAfter = apps.some(
        (a) => before(r, a) && md(a).revised === true,
      );
      if (failedBefore && revisedAfter) fact = true;
    }
    let st: O['st'] = 'NOP';
    let x: number | null = null;
    let disagree = false;
    if (opened) {
      const first = apps.find((a) => md(a).index === 1) ?? apps[0];
      const resolved = !!acc || !!aside;
      const reviewClosed =
        !!closed && str(md(closed).exit_state) === 'closed_at_review';
      if (!first) st = closed || resolved ? 'NOAPP' : 'OPEN';
      else if (md(first).correct === true)
        st = closed || resolved ? 'FIRST_OK' : 'OPEN';
      else if (resolved || (reviewClosed && fact)) {
        st = 'ELIG';
        x = fact ? 1 : 0;
      } else if (reviewClosed || closed) st = 'CENS';
      else st = 'OPEN';
      const rc =
        closed && isObj(md(closed).raw_components)
          ? (md(closed).raw_components as Md)
          : null;
      if (
        rc &&
        st === 'ELIG' &&
        typeof rc.restudy_revision === 'boolean' &&
        rc.restudy_revision !== fact
      )
        disagree = true;
    } else if (presented) st = 'DEC';
    occ[o] = { st, x, opened, presented, any: evs.length > 0, disagree };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS)
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      occ[o].opened,
      occ[o].presented,
      occ[o].any,
      { unreachedHeldWithoutCheck: false },
    );
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const live = OCCS.filter((o) => !holds[o].held);
  const held = OCCS.filter((o) => holds[o].held);
  const one = (
    b: {
      d: string;
      r: string | null;
      v: number | null;
      n: number | null;
      dn: number | null;
    },
    comps: Md = {},
  ) => [mk(S_M21_P, b.v, b.n, b.dn, b.d, b.r, comps)];
  if (c.reloaded && c.malformed)
    return one({
      d: 'technical_failure',
      r: 'check_record_malformed',
      v: null,
      n: null,
      dn: null,
    });
  if (faults.length)
    return one({
      d: 'technical_failure',
      r: 'technical_failure_record',
      v: null,
      n: null,
      dn: null,
    });
  if (OCCS.some((o) => occ[o].disagree))
    return one({
      d: 'technical_failure',
      r: 'case_record_disagrees_with_recount',
      v: null,
      n: null,
      dn: null,
    });
  const elig = live.filter((o) => occ[o].st === 'ELIG');
  const x = elig.reduce((s, o) => s + (occ[o].x as number), 0);
  let base: {
    d: string;
    r: string | null;
    v: number | null;
    n: number | null;
    dn: number | null;
  };
  if (live.some((o) => occ[o].st === 'OPEN'))
    base = { d: 'pending', r: 'case_open', v: null, n: null, dn: null };
  else if (elig.length)
    base = { d: 'observed', r: null, v: x, n: x, dn: elig.length };
  else if (live.some((o) => occ[o].st === 'CENS'))
    base = { d: 'interrupted', r: 'censored_only', v: null, n: null, dn: null };
  else if (live.some((o) => occ[o].st === 'FIRST_OK' || occ[o].st === 'NOAPP'))
    base = {
      d: 'no_eligible_event',
      r: 'first_time_successes',
      v: null,
      n: null,
      dn: 0,
    };
  else if (live.some((o) => occ[o].st === 'DEC'))
    base = {
      d: 'declined',
      r: 'presented_never_opened',
      v: null,
      n: null,
      dn: null,
    };
  else
    base = {
      d: 'not_presented',
      r: 'never_presented',
      v: null,
      n: null,
      dn: null,
    };
  const heldReason = held.length
    ? 'held:' + held.map((o) => o + '=' + holds[o].basis).join(',')
    : null;
  const out = applyD2(
    base,
    heldReason,
    OCCS.some((o) => occ[o].opened),
  );
  return one(out, {
    cases: Object.fromEntries(
      OCCS.map((o) => [o, holds[o].held ? 'held' : occ[o].st]),
    ),
    eligible_cases: elig,
    censored: live.some((o) => occ[o].st === 'CENS') || held.length > 0,
  });
}

// ================================================================ M22

const S_M22_P: RecountSpecEntry = {
  item: 'M22',
  feature_id: 'm22_revisions_begun',
  role: 'primary',
  families: ['proto_m22_returned_'],
  eligibility:
    'per report o1 / o2: the requirement presented (setback_presented after a valid first submission) AND decided by the participant (accepted or withdrawn) — or review-closed after the revision had begun; a returned note never acknowledged is excluded; acknowledged and left to the review without a revision = censored, excluded',
  numerator:
    'eligible reports with a revision begun (the first code_attached after the setback_acknowledged), compared with the report record (disagreement => technical_failure)',
  denominator: 'eligible reports (2 planned; one => incomplete on 1)',
  missing_rule:
    'no requirement presented => no_eligible_event; presented never opened => declined; never presented => not_presented; a report open => pending; every returned report closed unacknowledged => understanding_failed; acknowledged left to the review without a revision with nothing else eligible => interrupted; a non-reload technical_failure record voids the row and its companion',
  page_load_treatment:
    'D-2 (i) as M21 (HB + OBS => interrupted x/1, overriding incomplete); class from the M22 check',
  citations: [
    'REG:7396-7469',
    'ADD:1910',
    'ADD:1564-1571',
    'R3:225-236',
    'REG:14785-14791',
    'REG:14862-14873',
    'ROD:D-2',
  ],
};
const S_M22_C: RecountSpecEntry = {
  item: 'M22',
  feature_id: 'm22_discouragement_ratings',
  role: 'companion',
  families: ['proto_m22_returned_'],
  eligibility:
    'per returned report: its rating screen (rating_presented) and answer (rating_answered value 1-5 / rating_declined)',
  numerator:
    'n/a (per report {value, declined, recall_delay_ms, position} or null, acknowledged_reports and the screens presented beside)',
  denominator: 'n/a',
  missing_rule:
    'declined or missing = null, never a midpoint; all declined => declined; never answered => pending before / interrupted after the record closure; a held report is identified in provisional components and kept distinct from an ordinary missing rating, nothing fabricated, no denominator (owner decision of 25 October 2026); with no report opened in the load both rows read interrupted (REG §5.409 (n))',
  page_load_treatment:
    'beside a held report the companion keeps its own reading (REG §5.409 (n)); the provisional component held_reports [{ report, class }] names every held report with its class (H / U / M from its marker or its class in the one record) on every companion row, [] when none, apart from missing_reports (a due report whose rating was not given) (REG §5.411 (1); ADD U24 completion S2)',
  citations: [
    'REG:7426-7449',
    'REG:14908-14920',
    'OWN:2026-10-25:M22',
    'REG:15068-15082',
    'ADD:1847-1855',
    'REG:15131',
  ],
};

function m22(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m22_returned_');
  const OCCS = ['o1', 'o2'];
  const c = classify(input, f, OCCS);
  const mks = markers(f);
  interface O {
    st: 'NOP' | 'DEC' | 'OPEN' | 'NOREQ' | 'UNACK' | 'ELIG' | 'CENS';
    x: number | null;
    opened: boolean;
    presented: boolean;
    any: boolean;
    disagree: boolean;
    acknowledged: boolean;
  }
  const occ: Record<string, O> = {};
  for (const o of OCCS) {
    const evs = f.evs.filter((e) => md(e).occasion === o);
    const opened = evs.some((e) => sfx(f, e) === 'opportunity_opened');
    const presented = evs.some((e) => sfx(f, e) === 'presented');
    const req = evs.find((e) => sfx(f, e) === 'setback_presented');
    const ack = evs.find((e) => sfx(f, e) === 'setback_acknowledged');
    const decided = evs.find(
      (e) => sfx(f, e) === 'accepted' || sfx(f, e) === 'withdrawn',
    );
    const closed = evs.find((e) => sfx(f, e) === 'window_closed');
    const begun =
      !!ack && evs.some((e) => sfx(f, e) === 'code_attached' && before(ack, e));
    let st: O['st'] = 'NOP';
    let x: number | null = null;
    let disagree = false;
    if (opened) {
      if (!req) st = closed || decided ? 'NOREQ' : 'OPEN';
      else if (decided) {
        if (!ack) st = 'UNACK';
        else {
          st = 'ELIG';
          x = begun ? 1 : 0;
        }
      } else if (closed) {
        if (!ack) st = 'UNACK';
        else if (begun) {
          st = 'ELIG';
          x = 1;
        } else st = 'CENS';
      } else st = 'OPEN';
      const rc =
        closed && isObj(md(closed).raw_components)
          ? (md(closed).raw_components as Md)
          : null;
      if (
        rc &&
        typeof rc.revision_begun === 'boolean' &&
        st === 'ELIG' &&
        rc.revision_begun !== begun
      )
        disagree = true;
    } else if (presented) st = 'DEC';
    occ[o] = {
      st,
      x,
      opened,
      presented,
      any: evs.length > 0,
      disagree,
      acknowledged: !!ack,
    };
  }
  const holds: Record<string, HoldInfo> = {};
  for (const o of OCCS)
    holds[o] = holdFor(
      c,
      o,
      mks.filter((m) => m.occasion === o),
      occ[o].opened,
      occ[o].presented,
      occ[o].any,
      { unreachedHeldWithoutCheck: false },
    );
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  const live = OCCS.filter((o) => !holds[o].held);
  const held = OCCS.filter((o) => holds[o].held);
  const recordClosed =
    input.raw_events.some(
      (e) => e.event_type === 'pilot_closure_record_closed',
    ) ||
    f.evs.some(
      (e) =>
        sfx(f, e) === 'window_closed' &&
        str(md(e).exit_state) === 'closed_at_review',
    );
  // companion pieces
  const ratingOf = (o: string): Md | null => {
    if (holds[o].held) return null;
    const ans = f.evs.find(
      (e) =>
        md(e).occasion === o &&
        (sfx(f, e) === 'rating_answered' || sfx(f, e) === 'rating_declined'),
    );
    if (!ans) return null;
    const m = md(ans);
    const declined = sfx(f, ans) === 'rating_declined';
    return {
      value: declined ? null : num(m.value),
      declined,
      recall_delay_ms: num(m.recall_delay_ms),
      position: num(m.position),
    };
  };
  const two = (
    b: {
      d: string;
      r: string | null;
      v: number | null;
      n: number | null;
      dn: number | null;
    },
    comps: Md = {},
  ): RecountRecord[] => {
    const p = mk(S_M22_P, b.v, b.n, b.dn, b.d, b.r, comps);
    // REG §5.411 (1) / ADD "U24 completion S2": held_reports [{ report, class }] on every companion row, [] when nothing is held;
    // kept apart from missing_reports (a due report whose rating was not given; a held report is never due).
    const classOf = (o: string): string => {
      const bs = holds[o].basis ?? '';
      if (bs.startsWith('marker:')) return bs.slice(7);
      return bs.split(':')[0];
    };
    const missing = OCCS.filter(
      (o) =>
        !holds[o].held &&
        ['ELIG', 'UNACK', 'CENS'].includes(occ[o].st) &&
        ratingOf(o) === null,
    );
    const heldComp: Md = {
      held_reports: held.map((o) => ({ report: o, class: classOf(o) })),
      missing_reports: missing,
    };
    const screens = f.evs.filter(
      (e) => sfx(f, e) === 'rating_presented',
    ).length;
    const ack = OCCS.filter((o) => !holds[o].held && occ[o].acknowledged);
    if (b.d === 'technical_failure')
      return [
        p,
        mk(S_M22_C, null, null, null, 'technical_failure', b.r, heldComp),
      ];
    if (held.length && !OCCS.some((o) => occ[o].opened))
      return [p, mk(S_M22_C, null, null, null, 'interrupted', b.r, heldComp)];
    const vals = { o1: ratingOf('o1'), o2: ratingOf('o2') };
    const got = Object.values(vals).filter((v): v is Md => v !== null);
    const cc: Md = {
      acknowledged_reports: ack,
      screens_presented: screens,
      ...heldComp,
    };
    if (got.some((v) => v.declined === false))
      return [p, mk(S_M22_C, vals, null, null, 'observed', null, cc)];
    if (got.length && got.every((v) => v.declined === true))
      return [p, mk(S_M22_C, vals, null, null, 'declined', 'all_declined', cc)];
    if (ack.length === 0 && !screens)
      return [
        p,
        mk(
          S_M22_C,
          null,
          null,
          null,
          b.d === 'observed' || b.d === 'incomplete'
            ? recordClosed
              ? 'interrupted'
              : 'pending'
            : b.d,
          b.r,
          cc,
        ),
      ];
    return [
      p,
      mk(
        S_M22_C,
        null,
        null,
        null,
        recordClosed ? 'interrupted' : 'pending',
        recordClosed
          ? 'never_answered_after_record_closure'
          : 'not_yet_answered',
        cc,
      ),
    ];
  };
  if (c.reloaded && c.malformed)
    return two({
      d: 'technical_failure',
      r: 'check_record_malformed',
      v: null,
      n: null,
      dn: null,
    });
  if (faults.length)
    return two({
      d: 'technical_failure',
      r: 'technical_failure_record',
      v: null,
      n: null,
      dn: null,
    });
  if (OCCS.some((o) => occ[o].disagree))
    return two({
      d: 'technical_failure',
      r: 'report_record_disagrees_with_recount',
      v: null,
      n: null,
      dn: null,
    });
  const elig = live.filter((o) => occ[o].st === 'ELIG');
  const x = elig.reduce((s, o) => s + (occ[o].x as number), 0);
  let base: {
    d: string;
    r: string | null;
    v: number | null;
    n: number | null;
    dn: number | null;
  };
  if (live.some((o) => occ[o].st === 'OPEN'))
    base = { d: 'pending', r: 'report_open', v: null, n: null, dn: null };
  else if (elig.length === 2)
    base = { d: 'observed', r: null, v: x, n: x, dn: 2 };
  else if (elig.length === 1)
    base = { d: 'incomplete', r: 'one_report_eligible', v: x, n: x, dn: 1 };
  else if (live.some((o) => occ[o].st === 'CENS'))
    base = {
      d: 'interrupted',
      r: 'acknowledged_left_to_review',
      v: null,
      n: null,
      dn: null,
    };
  else if (
    live.some((o) => occ[o].st === 'UNACK') &&
    live.filter((o) => occ[o].opened).every((o) => occ[o].st === 'UNACK')
  )
    base = {
      d: 'understanding_failed',
      r: 'every_returned_report_unacknowledged',
      v: null,
      n: null,
      dn: null,
    };
  else if (live.some((o) => occ[o].st === 'NOREQ' || occ[o].st === 'UNACK'))
    base = {
      d: 'no_eligible_event',
      r: 'no_requirement_presented',
      v: null,
      n: null,
      dn: 0,
    };
  else if (live.some((o) => occ[o].st === 'DEC'))
    base = {
      d: 'declined',
      r: 'presented_never_opened',
      v: null,
      n: null,
      dn: null,
    };
  else
    base = {
      d: 'not_presented',
      r: 'never_presented',
      v: null,
      n: null,
      dn: null,
    };
  const heldReason = held.length
    ? 'held:' + held.map((o) => o + '=' + holds[o].basis).join(',')
    : null;
  const out = applyD2(
    base,
    heldReason,
    OCCS.some((o) => occ[o].opened),
  );
  return two(out, {
    reports: Object.fromEntries(
      OCCS.map((o) => [o, holds[o].held ? 'held' : occ[o].st]),
    ),
    eligible_reports: elig,
  });
}

// ================================================================ M23

const S_M23_P: RecountSpecEntry = {
  item: 'M23',
  feature_id: 'm23_continuations_after_failure',
  role: 'primary',
  families: ['proto_m23_plots_'],
  eligibility:
    'per plot (plot_a, plot_b): the genuine failure = the first completed EMPTY dig of a NEW cell (dig_resolved outcome empty, new_cell true); eligible <=> a genuine failure AND not technically invalid (a plot-scoped fault excludes only an outcome still unknown at the fault)',
  numerator:
    'eligible plots with outcome 1: a credit = the first COMPLETED qualifying scan (scan_resolved qualifying_continuation true) or valid new-cell dig after a CONTINUE response; outcome 0 on a stop response, on a confirmed selector stop after the usable choice was presented, or on an informed shift end; otherwise unknown',
  denominator: 'eligible plots (planned 2; conditional)',
  missing_rule:
    'E(c): any valid eligible outcome unknown at the closure => value and numerator null, the full denominator, interrupted (eligible_response_unresolved); no eligible plot => no_eligible_event (recovered_without_failure / stopped_before_failure / mixed_no_eligible_event / no_failed_dig); never opened => not_presented (presented_not_opened when the brief was shown), never declined, numerator null and denominator 0 (v4: "a row without a resolved count (not_presented, the reload hold-back, no current-load evidence) exports numerator: null, denominator: 0", REG §5.363 (e)); series open => pending; only invalid evidence => technical_failure; S1-S6 contradictions void the row',
  page_load_treatment:
    'reloaded: class from the M23 record (the record is authoritative over the reload_blocked payload, REG §5.409 (e)); H/U/M or a hold-back (reload_blocked / reload technical_failure) => interrupted, numerator null, denominator 0 (REG §5.363 (e)); A => first-load reading; RL-1C decision A for a presentation without its check',
  citations: [
    'REG:445-757',
    'REG:12770-12777',
    'ADD:1332-1470',
    'ADD:1911',
    'REG:14846-14857',
    'ADD:1754-1803',
  ],
};

function m23(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, 'proto_m23_plots_');
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT, [
    'technical_failure',
    'reload_blocked',
  ]);
  const opened = ofType(f, 'opportunity_opened');
  const presented = ofType(f, 'presented').length > 0;
  const hold = holdFor(
    c,
    OCC_DEFAULT,
    mks,
    opened.length > 0,
    presented,
    f.evs.length > 0,
    { unreachedHeldWithoutCheck: false },
  );
  const one = (
    d: string,
    r: string | null,
    v: number | null,
    n: number | null,
    dn: number | null,
    comps: Md = {},
  ) => [
    mk(S_M23_P, v, n, dn, d, r, {
      reload_check: reloadCheckComponent(c),
      ...comps,
    }),
  ];
  if (c.reloaded && c.malformed)
    return one('technical_failure', 'check_record_malformed', null, null, null);
  if (hold.held || f.evs.some((e) => sfx(f, e) === 'reload_blocked'))
    return one(
      'interrupted',
      'held:' + (hold.basis ?? 'reload_blocked'),
      null,
      null,
      0,
      { held_back_after_reload: true },
    );
  // S1 identity, S2 one record per sequence (identical duplicates deduplicate)
  const defects: string[] = [];
  for (const e of f.all) {
    const m = md(e);
    if (
      (m.entry_state_version !== undefined &&
        m.entry_state_version !== 'm23-plots-v1') ||
      (m.opportunity_id !== undefined &&
        m.opportunity_id !== 'proto_m23_excavation_series')
    ) {
      defects.push('S1_identity');
      break;
    }
  }
  // A record WITHOUT a usable sequence has no stated M23 treatment (REG §4
  // "Unit 23" (2) states one record per sequence and the sequence order
  // only): MUTATION-RULES.md lists it as uncovered; no rule is invented here.
  const dedup: RecountEvent[] = [];
  const seenSeq = new Map<number, string>();
  for (const e of f.evs) {
    const s = seqOf(e);
    if (s === null) {
      dedup.push(e);
      continue;
    }
    const j = stableJson(e);
    if (seenSeq.has(s)) {
      if (seenSeq.get(s) !== j) defects.push('S2_two_records_on_one_sequence');
      continue;
    }
    seenSeq.set(s, j);
    dedup.push(e);
  }
  const E = dedup;
  const of = (s: string) => E.filter((e) => sfx(f, e) === s);
  // S3 / S4: one terminal transition per action; a resolution needs its start
  const starts = new Map<string, RecountEvent>();
  for (const a of of('action_started')) {
    const id = str(md(a).action_id);
    if (id) starts.set(id, a);
  }
  const terminalCount = new Map<string, number>();
  for (const s of ['scan_resolved', 'dig_resolved', 'action_cancelled']) {
    for (const r of of(s)) {
      const id = str(md(r).action_id);
      if (!id || !starts.has(id) || !before(starts.get(id), r))
        defects.push('S4_resolution_without_start');
      if (id) terminalCount.set(id, (terminalCount.get(id) ?? 0) + 1);
    }
  }
  for (const [, n] of terminalCount)
    if (n > 1) defects.push('S3_two_terminal_transitions');
  const snap =
    opened[0] && isObj(md(opened[0]).entry_state_snapshot)
      ? (md(opened[0]).entry_state_snapshot as Md)
      : {};
  const plotsDecl = (arr(snap.plots) ?? []).filter(isObj) as Md[];
  const PLOTS = ['plot_a', 'plot_b'];
  interface P {
    failure: RecountEvent | undefined;
    presentedUsable: boolean;
    response: string | null;
    outcome: number | null; // 1 / 0 / null unknown
    eligible: boolean;
    excluded: boolean;
    recoveredWithoutFailure: boolean;
    stoppedBeforeFailure: boolean;
    terminal: boolean;
  }
  const plots: Record<string, P> = {};
  for (const p of PLOTS) {
    const ev = E.filter((e) => md(e).plot_id === p);
    const decl = plotsDecl.find((d) => d.plot_id === p);
    const key = decl && isObj(decl.key_cell) ? (decl.key_cell as Md) : null;
    for (const d of ev.filter((e) => sfx(f, e) === 'dig_resolved')) {
      const cell = isObj(md(d).cell) ? (md(d).cell as Md) : null;
      if (key && cell) {
        const hit = cell.col === key.col && cell.row === key.row;
        if ((md(d).outcome === 'recovered') !== hit)
          defects.push('S6_dig_outcome_disagrees_with_key');
      }
    }
    const failure = ev.find(
      (e) =>
        sfx(f, e) === 'dig_resolved' &&
        md(e).outcome === 'empty' &&
        md(e).new_cell !== false,
    );
    const choices = ev.filter((e) => sfx(f, e) === 'failure_choice');
    if (choices.length > 1) defects.push('S5_two_responses');
    if (choices[0] && (!failure || !before(failure, choices[0])))
      defects.push('S5_response_without_failure');
    const pres = failure
      ? ev.find(
          (e) =>
            sfx(f, e) === 'failure_choice_presented' &&
            before(failure, e) &&
            md(e).visible !== false &&
            md(e).focused !== false,
        )
      : undefined;
    const response = choices[0] ? str(md(choices[0]).response) : null;
    const closedP = ev.find((e) => sfx(f, e) === 'plot_closed');
    const fault = ev.find(
      (e) => sfx(f, e) === 'technical_failure' && md(e).scope === 'plot',
    );
    let outcome: number | null = null;
    if (failure) {
      if (response === 'continue' && choices[0]) {
        const credit = ev.find(
          (e) =>
            before(choices[0], e) &&
            (!fault || before(e, fault)) &&
            ((sfx(f, e) === 'scan_resolved' &&
              md(e).qualifying_continuation === true) ||
              (sfx(f, e) === 'dig_resolved' && md(e).new_cell === true)),
        );
        if (credit) outcome = 1;
      }
      if (outcome === null && response === 'stop') outcome = 0;
      if (outcome === null && closedP) {
        const reason = str(md(closedP).plot_closure_reason);
        if (
          reason === 'explicit_stop' &&
          md(closedP).confirmed_stop === true &&
          pres &&
          before(pres, closedP) &&
          (!fault || before(closedP, fault))
        )
          outcome = 0;
        if (
          reason === 'shift_end' &&
          md(closedP).informed_shift_end === true &&
          pres
        )
          outcome = 0;
      }
    }
    const excluded = !!fault && outcome === null;
    plots[p] = {
      failure,
      presentedUsable: !!pres,
      response,
      outcome,
      eligible: !!failure && !excluded,
      excluded,
      recoveredWithoutFailure:
        !failure &&
        ev.some(
          (e) => sfx(f, e) === 'dig_resolved' && md(e).outcome === 'recovered',
        ),
      stoppedBeforeFailure:
        !failure &&
        !!closedP &&
        str(md(closedP).plot_closure_reason) === 'explicit_stop',
      terminal: !!closedP || !!fault,
    };
  }
  const comps: Md = {
    administration_version: 'm23-plots-v1',
    presented_in_current_load: presented,
    observations_share_one_episode: true,
    planned_denominator: 2,
    known_outcomes_by_plot: Object.fromEntries(
      PLOTS.map((p) => [p, plots[p].eligible ? plots[p].outcome : null]),
    ),
    invalid_ids: PLOTS.filter((p) => plots[p].excluded),
  };
  if (defects.length)
    return one(
      'technical_failure',
      'integrity:' + defects[0],
      null,
      null,
      null,
      { ...comps, integrity_defect: [...new Set(defects)] },
    );
  // v4: a row without a resolved count exports numerator null, denominator 0
  // (REG:12774-12776, §5.363 (e)); v1-v3 wrote null here (transcription error)
  if (opened.length === 0)
    return one(
      'not_presented',
      presented ? 'presented_not_opened' : 'not_presented',
      null,
      null,
      0,
      comps,
    );
  const seriesFault = E.find(
    (e) => sfx(f, e) === 'technical_failure' && md(e).scope === 'series',
  );
  const closed =
    !!firstOf(f, 'window_closed') ||
    PLOTS.every((p) => plots[p].terminal) ||
    !!seriesFault;
  const elig = PLOTS.filter(
    (p) => plots[p].eligible && !(seriesFault && plots[p].outcome === null),
  );
  const unknown = elig.filter((p) => plots[p].outcome === null);
  const ones = elig.filter((p) => plots[p].outcome === 1).length;
  const anyStop = PLOTS.some(
    (p) => plots[p].response === 'stop' || plots[p].stoppedBeforeFailure,
  );
  const closure =
    seriesFault && elig.length === 0
      ? 'technical_failure'
      : anyStop
        ? 'voluntary_stop'
        : 'completed';
  if (!closed) return one('pending', 'series_open', null, null, null, comps);
  if (elig.length === 0) {
    if (PLOTS.some((p) => plots[p].excluded) || seriesFault)
      return one('technical_failure', 'technical_only', null, null, 0, {
        ...comps,
        censored: true,
      });
    const rw = PLOTS.filter((p) => plots[p].recoveredWithoutFailure).length;
    const sb = PLOTS.filter((p) => plots[p].stoppedBeforeFailure).length;
    const reason =
      rw === 2
        ? 'recovered_without_failure'
        : sb === 2
          ? 'stopped_before_failure'
          : rw + sb > 0
            ? 'mixed_no_eligible_event'
            : 'no_failed_dig';
    return one('no_eligible_event', reason, null, null, 0, {
      ...comps,
      closure_reason: closure,
    });
  }
  if (unknown.length)
    return one(
      'interrupted',
      'eligible_response_unresolved',
      null,
      null,
      elig.length,
      {
        ...comps,
        unknown_eligible_ids: unknown,
        censored: true,
        closure_reason: closure,
      },
    );
  return one('observed', null, ones, ones, elig.length, {
    ...comps,
    included_ids: elig,
    censored: PLOTS.some((p) => plots[p].excluded),
    closure_reason: closure,
  });
}

// ================================================================ M24 / M26 (knowledge boundary assays)

interface BoundaryCfg {
  item: 'M24' | 'M26';
  prefix: string;
  primary: RecountSpecEntry;
  sensitivity: RecountSpecEntry;
  companion: RecountSpecEntry;
  actSuffix: string; // postknowledge_cast | postknowledge_retry
  boundarySuffix: string; // depletion_reached | disconnect_demonstrated
  countField: string; // postknowledge_casts | postknowledge_retries
  rawAct: string; // cycle | transmission
}

function boundary(ctx: Ctx, cfg: BoundaryCfg): RecountRecord[] {
  const { input } = ctx;
  const f = family(input, cfg.prefix);
  const c = classify(input, f, null);
  const mks = markers(f, () => OCC_DEFAULT);
  const presented = ofType(f, 'presented').length > 0; // stage 2: panel / post opened
  const opened = ofType(f, 'opportunity_opened').length > 0; // stage 3: tally begun / uplink powered up
  const hold = holdFor(
    c,
    OCC_DEFAULT,
    mks,
    opened,
    presented,
    f.evs.length > 0,
    { unreachedHeldWithoutCheck: false },
  );
  const closed = firstOf(f, 'window_closed');
  const rc =
    closed && isObj(md(closed).raw_components)
      ? (md(closed).raw_components as Md)
      : null;
  const answers = ofType(f, 'understanding_answered');
  let status = 'untested';
  if (answers[0]) {
    if (md(answers[0]).correct === true) status = 'pass_first';
    else if (answers[1])
      status =
        md(answers[1]).correct === true ? 'pass_after_explanation' : 'fail';
    else status = 'check_incomplete';
  }
  const checkDisagrees =
    (rc &&
      typeof rc.knowledge_status === 'string' &&
      ['pass_first', 'pass_after_explanation', 'fail'].includes(status) &&
      rc.knowledge_status !== status) ||
    answers.some(
      (a) =>
        typeof md(a).key === 'string' &&
        md(a).correct !== (md(a).response === md(a).key),
    );
  const contOpen = firstOf(f, 'continuation_opened');
  const exit = firstOf(f, 'exit');
  const cap = firstOf(f, 'cap_reached');
  const contEnd = [exit, cap, closed]
    .filter((e): e is RecountEvent => !!e)
    .sort((a, b) => (seqOf(a) ?? 0) - (seqOf(b) ?? 0))[0];
  const acts = contOpen
    ? ofType(f, cfg.actSuffix).filter(
        (e) => before(contOpen, e) && (!contEnd || before(e, contEnd)),
      )
    : [];
  const n = acts.length;
  const loggedCounts = [
    exit ? num(md(exit)[cfg.countField]) : null,
    cap ? num(md(cap)[cfg.countField]) : null,
    rc ? num(rc[cfg.countField]) : null,
  ].filter((x): x is number => x !== null);
  const countDisagrees = loggedCounts.some((x) => x !== n);
  const depleted = !!firstOf(f, cfg.boundarySuffix);
  const raw = ofType(f, cfg.rawAct);
  const preKnowledge = raw.filter(
    (e) => md(e).classification === 'pre_knowledge',
  ).length;
  const afterFail = raw.filter(
    (e) => md(e).classification === 'after_fail',
  ).length;
  const companionValue = (): Md => ({
    knowledge_status: status,
    attempts: answers.map((a) => ({
      attempt: md(a).attempt ?? null,
      response: md(a).response ?? null,
      correct: md(a).correct ?? null,
    })),
    explanation_reading_ms: rc ? (rc.explanation_reading_ms ?? null) : null,
    pre_knowledge: preKnowledge,
    after_fail: afterFail,
    switch: ofType(f, 'alternative_used').length > 0,
    exit: !!exit,
    cap: !!cap,
    closure: closed ? (md(closed).exit_state ?? null) : null,
  });
  const three = (
    d: string,
    r: string | null,
    v: number | null,
    comps: Md,
    cdisp: string,
    cval: unknown,
  ): RecountRecord[] => [
    mk(cfg.primary, v, v, null, d, r, comps),
    mk(
      cfg.sensitivity,
      v === null ? null : Math.max(v - 1, 0),
      v === null ? null : Math.max(v - 1, 0),
      null,
      d,
      r,
      comps,
    ),
    mk(cfg.companion, cval, null, null, cdisp, cval === null ? r : null),
  ];
  const compOrNull = (): [string, unknown] =>
    opened ? ['observed', companionValue()] : ['__primary__', null];
  const fin = (
    d: string,
    r: string | null,
    v: number | null = null,
    comps: Md = {},
  ): RecountRecord[] => {
    const [cd, cv] = compOrNull();
    return three(d, r, v, comps, cd === '__primary__' ? d : cd, cv);
  };
  if (c.reloaded && c.malformed)
    return three(
      'technical_failure',
      'check_record_malformed',
      null,
      {},
      'technical_failure',
      null,
    );
  if (hold.held)
    return three(
      'interrupted',
      'held:' + hold.basis,
      null,
      {},
      'interrupted',
      null,
    );
  if (checkDisagrees)
    return three(
      'technical_failure',
      'check_record_disagrees_with_answers',
      null,
      {},
      'technical_failure',
      null,
    );
  if (!opened)
    return presented
      ? fin('declined', 'begun_panel_only')
      : fin(
          'not_presented',
          c.reloaded
            ? 'established_absence_nothing_presented'
            : 'never_presented',
        );
  const faults = ofType(f, 'technical_failure').filter(
    (e) => !(str(md(e).detail) ?? '').startsWith('reload'),
  );
  if (countDisagrees) {
    const [cd, cv] = compOrNull();
    return [
      mk(
        cfg.primary,
        null,
        null,
        null,
        'technical_failure',
        'count_disagrees_with_recount',
      ),
      mk(
        cfg.sensitivity,
        null,
        null,
        null,
        'technical_failure',
        'count_disagrees_with_recount',
      ),
      mk(
        cfg.companion,
        cv,
        null,
        null,
        cd === '__primary__' ? 'technical_failure' : cd,
        null,
      ),
    ];
  }
  if (faults.length && !contOpen)
    return fin('technical_failure', 'fault', null);
  if (!depleted)
    return closed
      ? fin('no_eligible_event', 'boundary_not_reached', null, {
          boundary: 'not_reached',
          censored: true,
        })
      : fin('pending', 'window_open', null);
  if (status === 'fail')
    return fin('understanding_failed', 'check_failed', null, {
      boundary: 'failed',
    });
  if (status === 'untested' || status === 'check_incomplete')
    return closed
      ? fin('interrupted', 'check_never_decided', null, {
          boundary: status,
          censored: true,
        })
      : fin('pending', 'window_open', null);
  if (!contOpen)
    return closed
      ? fin('interrupted', 'check_never_decided', null, {
          boundary: 'check_incomplete',
          censored: true,
        })
      : fin('pending', 'window_open', null);
  let closure: string | null = null;
  if (exit && (!cap || before(exit, cap))) closure = 'voluntary_stop';
  else if (cap) closure = 'cap';
  else if (closed)
    closure =
      str(md(closed).exit_state) === 'closed_at_review'
        ? 'closed_at_review'
        : 'route_departure';
  if (!closure) return fin('pending', 'continuation_open', null);
  return fin('observed', null, n, {
    closure_reason: closure,
    censored: closure === 'cap' || closure === 'closed_at_review',
    knowledge_status: status,
  });
}

const S_M24_P: RecountSpecEntry = {
  item: 'M24',
  feature_id: 'm24_postknowledge_casts',
  role: 'primary',
  families: ['proto_m24_rig_'],
  eligibility:
    'the 30 s focused continuation that opens only on a PASSED expected-outcome check (continuation_opened after understanding_answered pass_first / pass_after_explanation)',
  numerator:
    'postknowledge_cast records inside the continuation (after continuation_opened, before the exit / cap / closure), the first included; compared with the exit / cap / window counts (disagreement => technical_failure on the count and its sensitivity, the companion kept); a check record disagreeing with its understanding_answered events => technical_failure on all three rows',
  denominator: 'none (a count)',
  missing_rule:
    'deck never depleted => null no_eligible_event (censored, boundary not_reached); check never decided => null interrupted (censored); check failed => null understanding_failed; begun-panel-only (presented, never begun) => declined; never presented => not_presented; open => pending; observed with closure_reason voluntary_stop / cap / route_departure / closed_at_review, censored at the cap and the review',
  page_load_treatment:
    'reloaded: class from the M24 check (stage 2 presented, stage 3 opportunity_opened); H/U/M or a marker => interrupted; A => first-load; RL-1C decision A for a presentation without its check',
  citations: ['REG:7273-7394', 'ADD:1912', 'REG:14762-14846', 'ADD:1754-1803'],
};
const S_M24_S: RecountSpecEntry = {
  ...S_M24_P,
  feature_id: 'm24_postknowledge_casts_minus_first',
  role: 'sensitivity',
  numerator: 'max(n - 1, 0) of the primary count n',
  missing_rule: "the primary's disposition",
  citations: ['REG:106', 'REG:7357-7361', 'ADD:1912'],
};
const S_M24_C: RecountSpecEntry = {
  item: 'M24',
  feature_id: 'm24_unqualified_casts',
  role: 'companion',
  families: ['proto_m24_rig_'],
  eligibility: 'a begun window (opportunity_opened)',
  numerator:
    "n/a (object: knowledge status, the check's attempts, the explanation's reading time, pre-knowledge / after-fail counts from the cycle classification, switch, exit, cap, closure)",
  denominator: 'n/a',
  missing_rule:
    "observed whenever the window was begun; otherwise null with the primary's disposition",
  page_load_treatment: 'as the primary',
  citations: ['REG:7368-7371', 'REG:106'],
};
const S_M26_P: RecountSpecEntry = {
  ...S_M24_P,
  item: 'M26',
  feature_id: 'm26_postknowledge_retries',
  families: ['proto_m26_uplink_'],
  numerator:
    'postknowledge_retry records (Post A transmissions) inside the continuation, the FIRST included; checks as M24',
  missing_rule:
    'channel never disconnected => null no_eligible_event; otherwise as M24',
  page_load_treatment: 'as M24 with the M26 check',
  citations: ['REG:7273-7394', 'ADD:1914', 'REG:14762-14846', 'ADD:1754-1803'],
};
const S_M26_S: RecountSpecEntry = {
  ...S_M26_P,
  feature_id: 'm26_postknowledge_retries_minus_first',
  role: 'sensitivity',
  numerator: 'max(n - 1, 0) of the primary count n',
  missing_rule: "the primary's disposition",
  citations: ['REG:108', 'REG:7357-7361', 'ADD:1914'],
};
const S_M26_C: RecountSpecEntry = {
  ...S_M24_C,
  item: 'M26',
  feature_id: 'm26_unqualified_retries',
  families: ['proto_m26_uplink_'],
  citations: ['REG:7368-7371', 'REG:108'],
};

function m24(ctx: Ctx): RecountRecord[] {
  return boundary(ctx, {
    item: 'M24',
    prefix: 'proto_m24_rig_',
    primary: S_M24_P,
    sensitivity: S_M24_S,
    companion: S_M24_C,
    actSuffix: 'postknowledge_cast',
    boundarySuffix: 'depletion_reached',
    countField: 'postknowledge_casts',
    rawAct: 'cycle',
  });
}
function m26(ctx: Ctx): RecountRecord[] {
  return boundary(ctx, {
    item: 'M26',
    prefix: 'proto_m26_uplink_',
    primary: S_M26_P,
    sensitivity: S_M26_S,
    companion: S_M26_C,
    actSuffix: 'postknowledge_retry',
    boundarySuffix: 'disconnect_demonstrated',
    countField: 'postknowledge_retries',
    rawAct: 'transmission',
  });
}

// ================================================================ M25

const S_M25_P: RecountSpecEntry = {
  item: 'M25',
  feature_id: 'm25_optional_repeats',
  role: 'primary',
  families: ['proto_m25_loops_'],
  eligibility:
    'an exposed post: the three required loops completed and the completion screen shown (required_complete with completion_marked true)',
  numerator:
    "completed optional loops: loop_completed records of kind optional after optional_entered and before cap_reached (a loop still running at the cap is not a completed repeat); compared with the post's own record (stopped / window raw_components optional count; disagreement => technical_failure)",
  denominator: 'none (a count)',
  missing_rule:
    'required loops never completed => null no_eligible_event; listed by Noor but never opened => declined; before the briefing => not_presented; open => pending; closure_reason voluntary_stop / cap / route_departure / closed_at_review, censored at the cap and the review',
  page_load_treatment:
    "one M25 record (proto_m25_loops_prior_load_checked; occasions loops / belief / probe); the loops occasion's class: H/U/M or a marker => interrupted; A => first-load; RL-1C decision A for the post's presentation",
  citations: [
    'REG:6325-6427',
    'REG:7659-7684',
    'ADD:1913',
    'R3:265-305',
    'REG:14762-14846',
    'ADD:1754-1803',
  ],
};
const S_M25_C: RecountSpecEntry = {
  item: 'M25',
  feature_id: 'm25_normality_belief',
  role: 'companion',
  families: ['proto_m25_belief_', 'proto_m25_loops_prior_load_checked'],
  eligibility:
    "the recorded value 1-5 of the first question_answered (ordinal); exposure = the loops' required_complete with the completion screen in this load, or, under D-3 = P, the check's established earlier required_complete",
  numerator: 'n/a (the rating)',
  denominator: 'n/a',
  missing_rule:
    'no_eligible_event when not exposed; pending until asked; interrupted when asked and unanswered at the review; RL-3 cases: 1 and 2 (displayed earlier, answered or not) => interrupted, never asked again; 4 (U / M) => interrupted; 3 (earlier exposure established, no earlier display) => a first display read by the first-load rule, with exposure_page_load_index and the delay rule in the components',
  page_load_treatment:
    'the belief occasion\'s class from the one M25 record; case 3 delay: from the earlier proto_m25_loops_window_closed timestamp_ms (prior_page_load_events, the only place they are read) when finite and not later than this load\'s question presentation, else null "earlier closure time not comparable with this load\'s clock"; no earlier closure => null "earlier closure time not recorded"; never zero, never the reload time; missing delay evidence never erases exposure (owner decision of 25 October 2026)',
  citations: [
    'REG:6378-6407',
    'R3:265-305',
    'REG:14792-14801',
    'REG:14807-14834',
    'ADD:1780-1801',
    'OWN:2026-10-25:M25',
    'REG:15083-15089',
    'ADD:1856-1863',
  ],
};

function m25(ctx: Ctx): RecountRecord[] {
  const { input } = ctx;
  const lf = family(input, 'proto_m25_loops_');
  const bf = family(input, 'proto_m25_belief_');
  const OCCS = ['loops', 'belief', 'probe'];
  const c = classify(input, lf, OCCS);
  // ---- loops primary
  const lmk = markers(lf, () => 'loops');
  const lOpened = ofType(lf, 'opportunity_opened').length > 0;
  const lPresented = ofType(lf, 'presented').length > 0;
  const lHold = holdFor(
    c,
    'loops',
    lmk,
    lOpened,
    lPresented,
    lf.evs.length > 0,
  );
  const req = ofType(lf, 'required_complete').find(
    (e) => md(e).completion_marked === true,
  );
  const optEnt = firstOf(lf, 'optional_entered');
  const cap = firstOf(lf, 'cap_reached');
  const stopped = firstOf(lf, 'stopped');
  const closed = firstOf(lf, 'window_closed');
  const rc =
    closed && isObj(md(closed).raw_components)
      ? (md(closed).raw_components as Md)
      : null;
  const opt = optEnt
    ? ofType(lf, 'loop_completed').filter(
        (e) =>
          md(e).kind === 'optional' &&
          before(optEnt, e) &&
          (!cap || before(e, cap)),
      )
    : [];
  const n = opt.length;
  const logged = [
    stopped ? num(md(stopped).optional_completed) : null,
    rc ? num(rc.optional_repeats_completed) : null,
  ].filter((x): x is number => x !== null);
  let p: RecountRecord;
  if (c.reloaded && c.malformed)
    p = mk(
      S_M25_P,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
    );
  else if (lHold.held)
    p = mk(S_M25_P, null, null, null, 'interrupted', 'held:' + lHold.basis);
  else if (!lOpened)
    p = lPresented
      ? mk(S_M25_P, null, null, null, 'declined', 'listed_never_opened')
      : mk(S_M25_P, null, null, null, 'not_presented', 'before_the_briefing');
  else if (logged.some((x) => x !== n))
    p = mk(
      S_M25_P,
      null,
      null,
      null,
      'technical_failure',
      'snapshot_disagrees_with_loop_events',
      { recount_agrees: false },
    );
  else if (!req)
    p = closed
      ? mk(
          S_M25_P,
          null,
          null,
          null,
          'no_eligible_event',
          'required_loops_never_completed',
          { censored: true },
        )
      : mk(S_M25_P, null, null, null, 'pending', 'post_open');
  else if (!closed && !stopped && !cap)
    p = mk(S_M25_P, null, null, null, 'pending', 'post_open');
  else {
    let closure = 'route_departure';
    if (cap) closure = 'cap';
    else if (stopped) closure = 'voluntary_stop';
    else if (closed && str(md(closed).exit_state) === 'closed_at_review')
      closure = 'closed_at_review';
    p = mk(S_M25_P, n, n, null, 'observed', null, {
      recount_agrees: true,
      closure_reason: closure,
      censored: closure === 'cap' || closure === 'closed_at_review',
      loop_in_progress_at_cap: rc ? (rc.loop_in_progress_at_cap ?? null) : null,
    });
  }
  // ---- belief companion
  const bmk = markers(bf, () => 'belief');
  const qp = ofType(bf, 'question_presented');
  const displayed =
    qp.length > 0 ||
    ofType(bf, 'presented').length > 0 ||
    ofType(bf, 'opportunity_opened').length > 0;
  const ans = firstOf(bf, 'question_answered');
  const bClosed = firstOf(bf, 'window_closed');
  const bOc = c.occ.belief;
  let cr: RecountRecord;
  const rec = c.record;
  const bEvidence =
    rec && isObj(rec.occasions) && isObj((rec.occasions as Md).belief)
      ? ((rec.occasions as Md).belief as Md).evidence
      : null;
  const loopsEvidence =
    rec && isObj(rec.occasions) && isObj((rec.occasions as Md).loops)
      ? ((rec.occasions as Md).loops as Md).evidence
      : null;
  const priorRequiredComplete =
    isObj(loopsEvidence) && loopsEvidence.prior_required_complete === true;
  if (c.reloaded && c.malformed)
    cr = mk(
      S_M25_C,
      null,
      null,
      null,
      'technical_failure',
      'check_record_malformed',
    );
  else if (bmk.length > 0 && !ans)
    cr = mk(
      S_M25_C,
      null,
      null,
      null,
      'interrupted',
      'belief_held:marker:' + bmk[0].kind,
    );
  else if (c.reloaded && c.checkCount === 0 && displayed && !ans)
    cr = mk(S_M25_C, null, null, null, 'interrupted', 'belief_held:U:no_check');
  else if (c.reloaded && bOc && bOc.cls !== 'A' && !displayed) {
    const r =
      bOc.cls === 'H'
        ? isObj(bEvidence) && bEvidence.prior_belief_answered === true
          ? 'case2_answered_earlier_not_asked_again'
          : 'case1_displayed_earlier_not_asked_again'
        : bOc.cls === 'M'
          ? 'case4_earlier_check_contradictory'
          : 'case4_earlier_history_not_verified';
    cr = mk(S_M25_C, null, null, null, 'interrupted', r);
  } else if (c.reloaded && c.checkCount === 0 && !displayed && !ans && !req)
    cr = mk(
      S_M25_C,
      null,
      null,
      null,
      'interrupted',
      'no_current_evidence_after_reload',
    );
  else {
    // first-load reading (also case 3 of a reloaded load whose belief occasion is A)
    const exposedHere = !!req;
    const crossLoad =
      c.reloaded && !exposedHere && priorRequiredComplete && bOc?.cls === 'A';
    const comps: Md = {};
    if (crossLoad && qp[0]) {
      const qm = md(qp[0]);
      comps.exposure_page_load_index = qm.exposure_page_load_index ?? null;
      const tNow = num(qp[0].timestamp_ms);
      const expo = num(qm.exposure_page_load_index);
      const priorClose = input.prior_page_load_events.filter(
        (e) =>
          e.event_type === 'proto_m25_loops_window_closed' &&
          (expo === null || e.page_load_index === expo),
      );
      if (input.prior_page_load_events.length > 0) {
        const tClose = priorClose.length
          ? priorClose[priorClose.length - 1].timestamp_ms
          : undefined;
        if (!priorClose.length) {
          comps.delay_since_loops_closed_ms = null;
          comps.delay_since_loops_closed_null_reason =
            'earlier closure time not recorded';
        } else if (
          typeof tClose !== 'number' ||
          !Number.isFinite(tClose) ||
          tNow === null ||
          tClose > tNow
        ) {
          comps.delay_since_loops_closed_ms = null;
          comps.delay_since_loops_closed_null_reason =
            "earlier closure time not comparable with this load's clock";
        } else {
          comps.delay_since_loops_closed_ms = tNow - tClose;
          comps.delay_since_loops_closed_null_reason = null;
        }
        comps.delay_source = 'recomputed_from_prior_page_load_events';
      } else {
        comps.delay_since_loops_closed_ms =
          qm.delay_since_loops_closed_ms ?? null;
        comps.delay_since_loops_closed_null_reason =
          qm.delay_since_loops_closed_null_reason ?? null;
        comps.delay_source = 'logged_on_question_presented';
      }
    }
    if (ans) {
      const v = num(md(ans).value);
      cr =
        v !== null && v >= 1 && v <= 5 && Number.isInteger(v)
          ? mk(S_M25_C, v, null, null, 'observed', null, comps)
          : mk(
              S_M25_C,
              null,
              null,
              null,
              'technical_failure',
              'value_out_of_range',
              comps,
            );
    } else if (qp[0])
      cr = bClosed
        ? mk(
            S_M25_C,
            null,
            null,
            null,
            'interrupted',
            'asked_unanswered_at_review',
            comps,
          )
        : mk(
            S_M25_C,
            null,
            null,
            null,
            'pending',
            'asked_not_yet_answered',
            comps,
          );
    else if (exposedHere || crossLoad)
      cr = mk(
        S_M25_C,
        null,
        null,
        null,
        'pending',
        'exposed_not_yet_asked',
        comps,
      );
    else
      cr = mk(
        S_M25_C,
        null,
        null,
        null,
        'no_eligible_event',
        'not_exposed',
        comps,
      );
  }
  return [p, cr];
}

// ================================================================ exports

/** Every registered feature of RC3B-FEATURE-IDS.json (45: 26 primary, 17
 * companion, 2 sensitivity) has an entry here and a record in every
 * recount() result. Clause-level limits are listed in GAPS.md. */
export const RECOUNT_SPEC: readonly RecountSpecEntry[] = [
  S_M01_P,
  S_M01_C,
  S_M02_P,
  S_M02_LAT,
  S_M02_LAY,
  S_M03_P,
  S_M03_C,
  S_M04_P,
  S_M04_C,
  S_M05_P,
  S_M05_C,
  S_M06_P,
  S_M06_C,
  S_M07_P,
  S_M07_C,
  S_M08_P,
  S_M08_C,
  S_M09_P,
  S_M10_P,
  S_M11_P,
  S_M11_C,
  S_M12_P,
  S_M12_C,
  S_M13_P,
  S_M14_P,
  S_M15_P,
  S_M16_P,
  S_M17_P,
  S_M17_C,
  S_M18_P,
  S_M18_C,
  S_M19_P,
  S_M20_P,
  S_M21_P,
  S_M22_P,
  S_M22_C,
  S_M23_P,
  S_M24_P,
  S_M24_S,
  S_M24_C,
  S_M25_P,
  S_M25_C,
  S_M26_P,
  S_M26_S,
  S_M26_C,
];

/** Features that cannot be recounted at all from exported raw events.
 * None: every feature is in RECOUNT_SPEC; the clauses that cannot be
 * recounted, or that the documents do not settle, are listed in GAPS.md
 * with the rule the recount applies meanwhile and the owner question. */
export const RECOUNT_GAPS: readonly {
  item: string;
  feature_id: string;
  why: string;
  citations: readonly string[];
}[] = [];

const ITEMS: readonly ((ctx: Ctx) => RecountRecord[])[] = [
  m01,
  m02,
  m03,
  m04,
  m05,
  m06,
  m07,
  m08,
  m09,
  m10,
  m11,
  m12,
  m13,
  m14,
  m15,
  m16,
  m17,
  m18,
  m19,
  m20,
  m21,
  m22,
  m23,
  m24,
  m25,
  m26,
];

function errorRecords(
  spec: readonly RecountSpecEntry[],
  item: string,
  err: unknown,
): RecountRecord[] {
  // A recount fault is reported, never silently omitted (coverage rule).
  return spec
    .filter((s) => s.item === item)
    .map((s) => ({
      item: s.item,
      feature_id: s.feature_id,
      role: s.role as Role,
      value: null,
      numerator: null,
      denominator: null,
      disposition: 'technical_failure',
      reason:
        'recount_internal_error:' +
        (err instanceof Error ? err.message : String(err)).slice(0, 120),
      citation: s.feature_id,
    }));
}

export function recount(input: RecountInput): RecountRecord[] {
  const safe: RecountInput = {
    raw_events: Array.isArray(input?.raw_events)
      ? input.raw_events.filter(
          (e) => e && typeof e === 'object' && typeof e.event_type === 'string',
        )
      : [],
    prior_page_load_events: Array.isArray(input?.prior_page_load_events)
      ? input.prior_page_load_events.filter(
          (e) => e && typeof e === 'object' && typeof e.event_type === 'string',
        )
      : [],
    page_load_index:
      typeof input?.page_load_index === 'number' &&
      Number.isFinite(input.page_load_index)
        ? input.page_load_index
        : 1,
    game_session_id:
      typeof input?.game_session_id === 'string' ? input.game_session_id : '',
  };
  const ctx: Ctx = { input: safe };
  const out: RecountRecord[] = [];
  ITEMS.forEach((fn, i) => {
    const item = 'M' + String(i + 1).padStart(2, '0');
    try {
      out.push(...fn(ctx));
    } catch (err) {
      out.push(...errorRecords(RECOUNT_SPEC, item, err));
    }
  });
  // order by RECOUNT_SPEC; exactly one record per spec entry
  const byId = new Map(out.map((r) => [r.feature_id, r]));
  return RECOUNT_SPEC.map(
    (s) =>
      byId.get(s.feature_id) ??
      errorRecords([s], s.item, new Error('no record produced'))[0],
  );
}
