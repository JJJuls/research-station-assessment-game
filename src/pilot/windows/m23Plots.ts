/**
 * M23 — the window adapter of the two-plot excavation protocol (Station 080
 * M01–M26 run, Unit 23; administration `m23-plots-v1`).
 *
 * Owns the ONE register window of the series (opportunity
 * `proto_m23_excavation_series`, window id `m23_plots_w1`, family
 * `proto_m23_plots_`), the session-scope series state, the log sink (the
 * kit's required fields plus the protocol stamp; it returns the logger
 * sequence of the event it wrote), the reload guard, the surface commands
 * the plot panel routes to, the field bridge the yard scene drives (admission,
 * action tokens, resolutions, cancellations, approach samples, region entry
 * and exit), the closures (Noor's shift end, the station-record review, the
 * both-plots completion, faults) and the DEV probe. Every command delegates
 * to the pure model (`m23PlotsModel.ts`) with its input mode; the surface
 * model (`m23SurfaceModel.ts`) calls only these commands; the scene supplies
 * the world through `installM23Host` (origin, region membership, camera,
 * surface, feedback) and never writes model state itself.
 *
 * Closure rules (research-owner decision D-U23-1, 16 October 2026): both
 * plots terminal (recovered, explicitly stopped or individually faulted)
 * complete the window; Noor's "finished outside" closes every live plot
 * `shift_end` and the window as a completed observation unless a valid
 * eligible response stays unknown (then censored, E(c)); the review closes
 * live plots `review` (unknowns stay unknown); a series opened in an earlier
 * page load is never re-run; a fault terminates the plot in work (the other
 * stays usable) or, without one, the whole series. Nothing here scores.
 */
import {
  classifyM23Reload,
  m23PriorLoadRecord,
} from '../../measurement/features/m23';
import { protocolStamp } from '../../measurement/protocol';
import {
  PRIOR_LOAD_CHECK_SUFFIX,
  reloadHoldBackClass,
  reloadHoldBackDetail,
  ROW_OCCASION,
} from '../../measurement/reloadCheck';
import { researchRuntime } from '../../systems';
import type { SurfaceInputObservation } from '../ui/WorkSurfaceScene';
import {
  M23_TEXT,
  type M23Cell,
  m23JointAssignment,
  M23P_ENTRY_STATE_VERSION,
  M23P_OBJECT_ID,
  M23P_OPPORTUNITY_ID,
  M23P_SCENE,
  M23P_WINDOW_ID,
  m23Plot,
  type M23PlotId,
  type M23PlotLetter,
  m23RegionAssociation,
} from './m23PlotsContent';
import {
  createM23Series,
  M23_RELOAD_DETAIL,
  type M23ActionKind,
  type M23Admission,
  m23Admit,
  type M23CancelReason,
  m23ChoicePending,
  m23ClosureSnapshot,
  type M23DigOutcome,
  m23EntrySnapshot,
  type M23InputMode,
  m23Live,
  type M23LogSink,
  m23ObservedContinuation,
  type M23OpenOutcome,
  type M23PauseCause,
  m23PlotOf,
  type M23PlotState,
  m23PriorLoadCheck,
  m23RefusalCopy,
  type M23RefusalReason,
  type M23Response,
  m23sAfterChoiceEnter,
  m23sApproachSample,
  m23sBriefShown,
  m23sCancelAction,
  m23sCancelStop,
  type M23ScanOutcome,
  m23sChoose,
  m23sCloseAtReview,
  m23sCloseAtShiftEnd,
  m23sConfirmStop,
  m23Selected,
  m23SelectorStatus,
  m23sEnterRegion,
  type M23Series,
  m23sExampleViewed,
  m23sFail,
  m23sHelpClosed,
  m23sHelpOpened,
  type M23ShiftEndSource,
  m23sHoldBack,
  m23sNavigationToken,
  m23sOpenPlot,
  m23sPause,
  m23sPresentFailureChoice,
  m23sRefuse,
  m23sRegionExit,
  m23sRequestStop,
  m23sResolveDig,
  m23sResolveScan,
  m23sSelectorShown,
  m23sStartAction,
  m23sSurfaceClosed,
  m23sSurfaceOpened,
  type M23View,
} from './m23PlotsModel';
import { m23OptionSide, type M23SurfaceHost } from './m23SurfaceModel';
import { currentSessionId, type InputMode, ItemWindow } from './windowKit';

export {
  M23_FAMILY,
  M23P_ENTRY_STATE_VERSION,
  M23P_OPPORTUNITY_ID,
  M23P_WINDOW_ID,
} from './m23PlotsContent';
export type { M23ShiftEndSource } from './m23PlotsModel';

/* ------------------------------------------------------------------ *
 * The window, the state, the sink
 * ------------------------------------------------------------------ */

const windowInstance = new ItemWindow({
  item: 'M23',
  opportunityId: M23P_OPPORTUNITY_ID,
  windowId: M23P_WINDOW_ID,
  entryStateVersion: M23P_ENTRY_STATE_VERSION,
  family: 'proto_m23_plots_',
  scene: M23P_SCENE,
  objectId: M23P_OBJECT_ID,
});

/** The ONE register window of the series. */
export function m23Window(): ItemWindow {
  return windowInstance;
}

let series: M23Series | null = null;
let priorLoadChecked = false;
let focusEpoch = 0;
/** The view the first-failure presentation was last recorded for (render-gated). */
let presentedEpoch: string | null = null;
let briefLoggedEpoch: string | null = null;

function ensure(): M23Series {
  if (series === null) {
    const sessionId = currentSessionId();

    // Round 3 (amendment OD-6): one joint assignment over the sixteen cells
    // from the series' own mixing hash (the shared helper is untouched).
    series = createM23Series(m23JointAssignment(sessionId));
  }

  return series;
}

/**
 * The log sink: writes the family event through the kit and returns the
 * logger sequence it received (read back from the runtime's event list).
 */
const sink: M23LogSink = (suffix, metadata) => {
  windowInstance.log(suffix, { ...protocolStamp(), ...metadata });

  const events = researchRuntime.getEvents();
  const last = events[events.length - 1];

  return last !== undefined &&
    last.event_type === `proto_m23_plots_${suffix}` &&
    typeof last.sequence === 'number'
    ? last.sequence
    : null;
};

/* ------------------------------------------------------------------ *
 * The host (the yard scene) — installed per scene creation
 * ------------------------------------------------------------------ */

export interface M23Membership {
  member: boolean;
  stance: 'interior' | 'boundary_stance' | null;
}

export interface M23HostHooks {
  /** The avatar's current position (world px). */
  origin: () => { x: number; y: number };
  /** The qualifying-region predicate of a plot at a point (contract §10). */
  member: (plot: M23PlotId, x: number, y: number) => M23Membership;
  /** The plot whose rectangle contains the point (null outside both). */
  insidePlot: (x: number, y: number) => M23PlotId | null;
  /** Every plot whose exact qualifying region holds the point (amendment OD-4). */
  regionPlots: (x: number, y: number) => M23PlotId[];
  tools: () => string[];
  stage: () => string | null;
  /** The page is visible and focused (a presentation is usable). */
  usable: () => boolean;
  surface: {
    isOpen: () => boolean;
    open: () => void;
    refresh: () => void;
    close: () => void;
  };
  /** The selected plot is searching: engage its fixed frame. */
  onSearching: (plot: M23PlotId) => void;
  /** No plot is searching: release the fixed frame (ordinary follow). */
  onNotSearching: () => void;
  /** Any plot / selection / tray change: outlines, registries, guidance, probes. */
  onChanged: () => void;
  /** The ONE guidance setter (the first usable selector). */
  onGuidanceAddressed: () => void;
  feedback: (message: string) => void;
  /** Cancels the running world action through the shared framework. */
  cancelWorldAction: () => boolean;
}

let host: M23HostHooks | null = null;
/** The cause the host set before cancelling the world action itself. */
let pendingCancelCause: M23CancelReason | null = null;
/** The input mode of the deliberate UI cause (P / PANEL, HELP) behind a pending cancel. */
let pendingCancelMode: InputMode | null = null;

export function installM23Host(hooks: M23HostHooks) {
  host = hooks;
}

export function uninstallM23Host(hooks: M23HostHooks) {
  if (host === hooks) {
    host = null;
  }
}

function now(): number {
  return Date.now();
}

/* ------------------------------------------------------------------ *
 * Faults and guards
 * ------------------------------------------------------------------ */

/**
 * A runtime fault: the plot in work (or the named plot) terminates
 * `technical_failure` and the other plot stays usable; without one the
 * whole series terminates and the register is marked invalid. Never throws.
 */
export function m23TechnicalFailure(
  detail: string,
  plotId: M23PlotId | null = null,
  nowMs: number = now(),
) {
  const s = ensure();

  try {
    const outcome = m23sFail(s, detail, plotId, nowMs, sink);

    if (outcome.kind === 'series') {
      if (windowInstance.isOpen()) {
        windowInstance.pause(nowMs);
      }

      windowInstance.technicalFailure(detail);
      // The pinned series-closed line: the whole excavation is closed.
      host?.feedback(M23_TEXT.series_closed);
    } else if (outcome.kind === 'plot') {
      settleSeriesClosure(nowMs, 'system');
      // The pinned plot-fault line at the fault itself (the other plot is
      // unchanged; the participant can leave).
      host?.feedback(M23_TEXT.plot_fault);
    } else if (outcome.kind === 'after_closure') {
      sink('technical_failure', {
        phase: 'closure',
        scope: 'after_closure',
        detail,
        at_ms: nowMs,
        input_mode: 'system',
      });
    }

    host?.onNotSearching();
    host?.onChanged();
    publishM23Probe(nowMs);
  } catch {
    // The fault record itself failed: the state already says so.
  }
}

/** Runs a command; a thrown fault is routed to `m23TechnicalFailure` and `fallback` returned. */
function guarded<T>(name: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    m23TechnicalFailure(`${name}: ${message}`, ensure().selected);

    return fallback;
  }
}

/**
 * The series completed by its own evidence (both plots terminal) — the
 * kit window completes (or fails when every plot is technically invalid).
 */
function settleSeriesClosure(nowMs: number, mode: M23InputMode) {
  const s = ensure();

  if (s.closure === null || s.closure.trigger !== 'both_plots_terminal') {
    return;
  }

  if (!windowInstance.isOpen()) {
    return;
  }

  if (s.closure.reason === 'technical_failure') {
    windowInstance.pause(nowMs);
    windowInstance.technicalFailure(s.fault_detail ?? 'both plots faulted');

    return;
  }

  windowInstance.complete(nowMs, m23ClosureSnapshot(s, nowMs), mode, {
    exitState: s.closure.reason === 'voluntary_stop' ? 'stopped' : 'completed',
  });
}

export function declareM23Plots() {
  ensure();
  windowInstance.declare();
}

export function m23Series(): Readonly<M23Series> {
  return ensure();
}

function priorLoadCheck() {
  const pageLoadIndex = researchRuntime.getPageLoadIndex();

  if (pageLoadIndex <= 1) {
    return null;
  }

  return m23PriorLoadCheck(
    pageLoadIndex,
    researchRuntime.getPriorPageLoadEvents(),
    researchRuntime.getEventIntegrity(),
  );
}

/**
 * Reload guard (contract §3 F8): a series whose selector was measured
 * (`opportunity_opened`) in an earlier page load of this identity is never
 * re-run — prior exposure recorded, the kit's technical failure with the
 * reload detail, the row `interrupted`. A reload before any measured
 * opening permits the replay of the brief and the examples. Idempotent.
 *
 * U24 RL-3 (`RELOAD-CORRECTION-SPEC-r3-exec.md` §4 G4): the check is now
 * logged, once per reloaded load at yard entry, as the provisional
 * `proto_m23_plots_prior_load_checked` record (RL-0's helper, the existing
 * head fields), and the series is held unless that record establishes the
 * absence of an earlier measured opening (A): H as before; U / M take the
 * same lock with their own detail, no prior exposure and no
 * administration.
 */
export function guardM23Reload(nowMs: number = now()): boolean {
  const s = ensure();

  if (s.status === 'held_back') {
    return true;
  }

  if (priorLoadChecked) {
    return false;
  }

  priorLoadChecked = true;

  const check = priorLoadCheck();

  if (check === null) {
    return false;
  }

  const record = m23PriorLoadRecord(
    check.page_load_index,
    researchRuntime.getPriorPageLoadEvents(),
    researchRuntime.getEventIntegrity(),
  );

  if (record !== null) {
    sink(PRIOR_LOAD_CHECK_SUFFIX, { ...record, input_mode: 'system' });
  }

  s.reload = check;

  const cls = classifyM23Reload(
    check.page_load_index,
    record === null ? [] : [record],
  ).occasions[ROW_OCCASION].class;

  if (cls === null || cls === 'A') {
    return false;
  }

  if (cls === 'H') {
    m23sHoldBack(s, check, nowMs, sink);
    windowInstance.recordPriorExposure(
      'excavation selector opened in an earlier page load of this identity',
    );
    windowInstance.technicalFailure(M23_RELOAD_DETAIL);
  } else {
    const detail = reloadHoldBackDetail(cls, 'excavation not administered');

    m23sHoldBack(s, check, nowMs, sink, detail);
    windowInstance.technicalFailure(detail);
  }

  // The guidance stays addressed across the hold-back (§12 M1, G04).
  host?.onGuidanceAddressed();

  return true;
}

/* ------------------------------------------------------------------ *
 * The stake, the brief, the examples, the selector
 * ------------------------------------------------------------------ */

export type M23StakeOutcome = 'brief' | 'selector' | 'closed' | 'locked';

/**
 * E at the stake (or P / PANEL in the field): the brief before the first
 * measured opening, the selector afterwards; a closed or locked series
 * answers with its pinned line and opens nothing.
 */
export function openM23Stake(
  mode: InputMode,
  nowMs: number = now(),
): M23StakeOutcome {
  declareM23Plots();
  guardM23Reload(nowMs);

  const s = ensure();

  if (s.status === 'held_back') {
    return 'locked';
  }

  if (s.status === 'closed' || s.status === 'technical_failure') {
    return 'closed';
  }

  const outcome = guarded('stake', 'closed', () => {
    if (s.opened) {
      // E at the stake while a plot is in work: the deliberate interaction
      // pauses the plot first (§12 M2) — the panel opens over a paused
      // plot, never over one still searching; a running action cancels.
      if (m23Live(s) && m23Selected(s) !== null) {
        if (s.action !== null) {
          m23FieldCancel('panel', nowMs);
        }

        m23sPause(s, 'panel', nowMs, sink, mode);
        host?.onNotSearching();
      }

      focusEpoch += 1;
      m23sSurfaceOpened(s, 'selector', nowMs, sink);
      m23sSelectorShown(s, nowMs);

      return 'selector';
    }

    focusEpoch += 1;
    briefLoggedEpoch = null;
    m23sSurfaceOpened(s, 'brief', nowMs, sink);
    windowInstance.present(nowMs, {
      layout_id: 'a_adjusted_v1',
      brief_shown: true,
      plots_planned: 2,
    });

    return 'brief';
  });

  publishM23Probe(nowMs);

  return outcome;
}

/** The current focus epoch (the surface model's per-view id suffix). */
export function m23FocusEpoch(): string {
  return `e${focusEpoch}`;
}

function freshView(view: M23View, nowMs: number) {
  const s = ensure();

  focusEpoch += 1;
  s.view = view;
  s.view_shown_at_ms = nowMs;
}

/**
 * Render-gated exposure records: the surface model asks for the series on
 * every render; the brief's closure explanation and the first-failure
 * presentation are recorded on the first USABLE render of their view.
 */
function onRender(s: M23Series, rendering = true) {
  // A render IS the surface showing the view (the launched surface scene
  // may not yet count as active during its first render); a recheck from
  // a focus or visibility change needs the surface to be open.
  if (host === null || (!rendering && !host.surface.isOpen())) {
    return;
  }

  const epoch = m23FocusEpoch();

  if (s.view === 'brief' && briefLoggedEpoch !== epoch) {
    if (host.usable()) {
      briefLoggedEpoch = epoch;
      m23sBriefShown(s, now(), true, sink, s.help_replay ? 'help' : 'brief');
    }
  }

  if (s.view === 'first_failure' && presentedEpoch !== epoch) {
    const plot = m23Selected(s);

    if (plot !== null && m23ChoicePending(plot) && host.usable()) {
      presentedEpoch = epoch;
      m23sPresentFailureChoice(s, plot.id, now(), true, epoch, sink);
    }
  }

  publishM23Probe();
}

/** The page regained focus / visibility: a pending exposure may now be usable. */
export function m23PresentationRecheck() {
  const s = ensure();

  onRender(s, false);
  publishM23Probe();
}

function closeSurfaceAsPause(
  cause: M23PauseCause,
  mode: InputMode,
  nowMs: number,
) {
  const s = ensure();

  m23sSurfaceClosed(s, nowMs, sink, cause);

  const selected = m23Selected(s);
  const wasInWork =
    selected !== null &&
    (selected.status === 'approaching' || selected.status === 'searching');

  if (m23Live(s)) {
    m23sPause(s, cause, nowMs, sink, mode);
  }

  presentedEpoch = null;
  briefLoggedEpoch = null;
  host?.onNotSearching();
  host?.onChanged();

  if (wasInWork) {
    // The pinned paused line (ESC / STEP AWAY on an open panel).
    host?.feedback(M23_TEXT.paused);
  }
}

/** The surface's `onClose` (ESC): the view decides what ESC means. */
export function m23ConsumesEsc(nowMs: number = now()): boolean {
  const s = ensure();

  return guarded('esc', false, () => {
    if (s.view === 'stop_confirm') {
      const requesting = s.plots.find((plot) => plot.stop_request !== null);

      if (requesting !== undefined) {
        m23sCancelStop(s, requesting.id, 'keyboard', nowMs, 'esc', sink);
        freshView('selector', nowMs);

        return true;
      }
    }

    if (s.help_replay && s.help_origin !== null && s.help_origin !== 'none') {
      const back = m23sHelpClosed(s, nowMs, 'keyboard', sink);

      if (back !== null) {
        freshView(back, nowMs);

        return true;
      }
    }

    return false;
  });
}

/** The surface closed (ESC consumed as a pause, STEP AWAY, the host's close). */
export function closeM23Surface(
  cause: M23PauseCause,
  mode: InputMode,
  nowMs: number = now(),
) {
  guarded('close_surface', undefined, () => {
    closeSurfaceAsPause(cause, mode, nowMs);
  });
  publishM23Probe(nowMs);
}

/* ------------------------------------------------------------------ *
 * Surface commands
 * ------------------------------------------------------------------ */

function refreshSurface() {
  host?.surface.refresh();
  publishM23Probe();
}

function showExample(page: 1 | 2, mode: InputMode, nowMs: number) {
  const s = ensure();

  if (s.status === 'held_back' || s.status === 'closed') {
    return;
  }

  freshView(page === 1 ? 'example_1' : 'example_2', nowMs);
  m23sExampleViewed(s, page, nowMs, sink, mode);
  refreshSurface();
}

function backToBrief(mode: InputMode, nowMs: number) {
  void mode;

  const s = ensure();

  freshView('brief', nowMs);
  briefLoggedEpoch = null;
  s.view = 'brief';
  refreshSurface();
}

/** OPEN PLOT PANEL after page 2: the first usable selector is the measured opening. */
function openSelector(mode: InputMode, nowMs: number) {
  const s = ensure();

  freshView('selector', nowMs);

  const outcome = m23sSelectorShown(s, nowMs);

  if (outcome === 'first') {
    windowInstance.open(
      nowMs,
      m23EntrySnapshot(s, {
        stage: host?.stage() ?? null,
        visibility: {
          page_visible:
            typeof document === 'undefined' ? true : !document.hidden,
          page_focused:
            typeof document === 'undefined' ||
            typeof document.hasFocus !== 'function'
              ? true
              : document.hasFocus(),
        },
        prior_load: s.reload,
        tools: host?.tools() ?? [],
      }),
    );
    sink('surface_opened', {
      phase: 'presentation',
      view: 'selector',
      measured_opening: true,
      input_mode: mode,
    });
    host?.onGuidanceAddressed();
    host?.onChanged();
  }

  refreshSurface();
}

function help(mode: InputMode, nowMs: number) {
  const s = ensure();
  const origin = s.view;

  freshView('example_1', nowMs);
  m23sHelpOpened(s, origin, nowMs, mode, sink);
  refreshSurface();
}

function closeHelp(mode: InputMode, nowMs: number) {
  const s = ensure();
  const back = m23sHelpClosed(s, nowMs, mode, sink);

  if (back === null) {
    m23sSurfaceClosed(s, nowMs, sink, 'help_closed');
    host?.surface.close();
    host?.onChanged();
    publishM23Probe(nowMs);

    return;
  }

  freshView(back, nowMs);
  refreshSurface();
}

function stepAway(mode: InputMode, nowMs: number) {
  // STEP AWAY and ESC are the same pause (contract §4: "ESC / STEP AWAY").
  closeSurfaceAsPause('esc', mode, nowMs);
  host?.surface.close();
  publishM23Probe(nowMs);
}

/** OPEN / RESUME from the selector (contract §12 M2). */
function openPlot(plotId: M23PlotId, mode: InputMode, nowMs: number) {
  const s = ensure();

  if (host === null) {
    return;
  }

  const origin = host.origin();
  const member = host.member(plotId, origin.x, origin.y);
  const outcome = m23sOpenPlot(s, plotId, mode, nowMs, origin, member, sink);

  applyOpenOutcome(outcome, nowMs);
}

function applyOpenOutcome(outcome: M23OpenOutcome, nowMs: number) {
  const s = ensure();

  if (host === null) {
    return;
  }

  switch (outcome.kind) {
    case 'refused':
      refreshSurface();
      return;
    case 'choice_first':
      presentedEpoch = null;
      freshView('first_failure', nowMs);
      host.onNotSearching();
      host.onChanged();
      refreshSurface();
      return;
    case 'approaching':
      m23sSurfaceClosed(s, nowMs, sink, 'plot_opened');
      host.surface.close();
      host.onNotSearching();
      host.onChanged();
      host.feedback(M23_TEXT.approach_status(m23Plot(outcome.plot_id).letter));
      publishM23Probe(nowMs);
      return;
    case 'searching':
      m23sSurfaceClosed(s, nowMs, sink, 'plot_opened');
      host.surface.close();
      host.onSearching(outcome.plot_id);
      host.onChanged();
      publishM23Probe(nowMs);
      return;
  }
}

function requestStop(plotId: M23PlotId, mode: InputMode, nowMs: number) {
  const s = ensure();

  if (m23sRequestStop(s, plotId, mode, nowMs, sink)) {
    freshView('stop_confirm', nowMs);
  }

  refreshSurface();
}

function cancelStop(plotId: M23PlotId, mode: InputMode, nowMs: number) {
  const s = ensure();

  if (m23sCancelStop(s, plotId, mode, nowMs, 'back', sink)) {
    freshView('selector', nowMs);
  }

  refreshSurface();
}

function confirmStop(plotId: M23PlotId, mode: InputMode, nowMs: number) {
  const s = ensure();
  const letter = m23Plot(plotId).letter;

  if (m23sConfirmStop(s, plotId, mode, nowMs, sink)) {
    settleSeriesClosure(nowMs, mode);
    freshView(m23Live(s) ? 'selector' : 'record', nowMs);
    host?.onNotSearching();
    host?.onChanged();
    host?.feedback(M23_TEXT.stopped(letter));
  }

  refreshSurface();
}

/** CONTINUE SEARCH / STOP THIS PLOT on the first-failure panel (D1). */
function choose(
  plotId: M23PlotId,
  response: M23Response,
  side: 'left' | 'right',
  mode: InputMode,
  nowMs: number,
) {
  const s = ensure();

  if (host === null) {
    return;
  }

  const outcome = m23sChoose(s, plotId, response, mode, nowMs, side, sink);

  if (outcome.kind === 'refused') {
    refreshSurface();

    return;
  }

  presentedEpoch = null;

  if (response === 'stop') {
    settleSeriesClosure(nowMs, mode);
    m23sSurfaceClosed(s, nowMs, sink, 'first_failure_stop');
    host.surface.close();
    host.onNotSearching();
    host.onChanged();
    host.feedback(M23_TEXT.stopped(m23Plot(plotId).letter));
    publishM23Probe(nowMs);

    return;
  }

  const origin = host.origin();
  const member = host.member(plotId, origin.x, origin.y);
  const entry = m23sAfterChoiceEnter(s, plotId, nowMs, origin, member, sink);

  m23sSurfaceClosed(s, nowMs, sink, 'first_failure_continue');
  host.surface.close();

  if (entry.kind === 'searching') {
    host.onSearching(plotId);
    host.feedback(M23_TEXT.after_continue);
  } else {
    host.onNotSearching();
    host.feedback(M23_TEXT.approach_status(m23Plot(plotId).letter));
  }

  host.onChanged();
  publishM23Probe(nowMs);
}

/** The surface's input observer (contract §12 M3): tokens on the first-failure view only. */
export function m23ObserveInput(observation: SurfaceInputObservation) {
  const s = ensure();

  if (s.view !== 'first_failure' || observation.kind !== 'navigate') {
    return;
  }

  const key = observation.key ?? '';
  const token =
    key === 'Tab'
      ? observation.shift
        ? 'Shift+Tab'
        : 'Tab'
      : key.startsWith('Arrow')
        ? key.slice(5)
        : key;
  const family =
    key === 'Tab' ? (observation.shift ? 'shift_tab' : 'tab') : 'arrow';

  m23sNavigationToken(s, token, family, observation.to_id);
}

/**
 * Binds the surface model to this adapter: the host scene supplies the
 * clock; the state reader and every command come from here (the surface
 * model stays pure).
 */
export function bindM23Surface(base: { now: () => number }): M23SurfaceHost {
  return {
    now: base.now,
    series: () => {
      const s = ensure();

      onRender(s);

      return s;
    },
    focusEpoch: m23FocusEpoch,
    commands: {
      showExample: (page, mode, nowMs) =>
        guarded('show_example', undefined, () =>
          showExample(page, mode, nowMs),
        ),
      backToBrief: (mode, nowMs) =>
        guarded('back_to_brief', undefined, () => backToBrief(mode, nowMs)),
      openSelector: (mode, nowMs) =>
        guarded('open_selector', undefined, () => openSelector(mode, nowMs)),
      help: (mode, nowMs) =>
        guarded('help', undefined, () => help(mode, nowMs)),
      closeHelp: (mode, nowMs) =>
        guarded('close_help', undefined, () => closeHelp(mode, nowMs)),
      stepAway: (mode, nowMs) =>
        guarded('step_away', undefined, () => stepAway(mode, nowMs)),
      openPlot: (plot, mode, nowMs) =>
        guarded('open_plot', undefined, () => openPlot(plot, mode, nowMs)),
      requestStop: (plot, mode, nowMs) =>
        guarded('request_stop', undefined, () =>
          requestStop(plot, mode, nowMs),
        ),
      cancelStop: (plot, mode, nowMs) =>
        guarded('cancel_stop', undefined, () => cancelStop(plot, mode, nowMs)),
      confirmStop: (plot, mode, nowMs) =>
        guarded('confirm_stop', undefined, () =>
          confirmStop(plot, mode, nowMs),
        ),
      choose: (plot, response, side, mode, nowMs) =>
        guarded('choose', undefined, () =>
          choose(plot, response, side, mode, nowMs),
        ),
    },
  };
}

/* ------------------------------------------------------------------ *
 * P / PANEL and HELP from the field
 * ------------------------------------------------------------------ */

/** P / PANEL in the field: the running action cancels (`panel`), the panel opens. */
export function openM23Panel(
  mode: InputMode,
  nowMs: number = now(),
): M23StakeOutcome {
  const s = ensure();

  if (s.action !== null) {
    pendingCancelCause = 'panel';
    pendingCancelMode = mode;
    host?.cancelWorldAction();
    pendingCancelCause = null;
    pendingCancelMode = null;
  }

  if (m23Live(s) && m23Selected(s) !== null) {
    const selected = m23Selected(s);
    const wasInWork =
      selected !== null &&
      (selected.status === 'approaching' || selected.status === 'searching');

    guarded('panel_pause', undefined, () => {
      m23sPause(s, 'panel', nowMs, sink, mode);
    });
    host?.onNotSearching();

    if (wasInWork) {
      host?.feedback(M23_TEXT.paused);
    }
  }

  return openM23Stake(mode, nowMs);
}

/** HELP from the field pad: the example pages replay; nothing else changes. */
export function openM23FieldHelp(mode: InputMode, nowMs: number = now()) {
  const s = ensure();

  if (s.action !== null) {
    pendingCancelCause = 'help';
    pendingCancelMode = mode;
    host?.cancelWorldAction();
    pendingCancelCause = null;
    pendingCancelMode = null;
  }

  guarded('field_help', undefined, () => {
    if (m23Live(s) && m23Selected(s) !== null) {
      m23sPause(s, 'help', nowMs, sink, mode);
      host?.onNotSearching();
    }

    focusEpoch += 1;
    m23sSurfaceOpened(s, 'example_1', nowMs, sink, true);
    m23sHelpOpened(s, 'none', nowMs, mode, sink);
  });
}

/* ------------------------------------------------------------------ *
 * The field bridge (the yard scene)
 * ------------------------------------------------------------------ */

/** Whether M23 governs C / D at the avatar's position now. */
export function m23FieldGoverns(x: number, y: number): boolean {
  const s = ensure();

  if (host === null) {
    return false;
  }

  // Inside a plot rectangle — and, since round 3 (amendment OD-4), anywhere
  // in a plot's exact qualifying region (the boundary ring) — the series
  // governs in every status: before the opening, while paused and after the
  // closure a press is refused (`plot_not_active` / `plot_terminal`), never
  // a reading over an inactive target (contract §3, F5). Away from both
  // regions only a plot IN WORK (approaching or searching) governs; a paused
  // or pending selection leaves the ordinary yard actions alone there.
  if (host.insidePlot(x, y) !== null || host.regionPlots(x, y).length > 0) {
    return true;
  }

  if (!m23Live(s)) {
    return false;
  }

  const selected = m23Selected(s);

  return (
    selected !== null &&
    (selected.status === 'approaching' || selected.status === 'searching')
  );
}

export interface M23FieldAdmission extends M23Admission {
  copy: string | null;
}

/**
 * Admission of a C / D press. With `record` (a real press) a refusal is
 * written as `action_refused` and its copy returned; without it (the
 * per-frame eligibility of the hint chip) nothing is recorded.
 */
export function m23FieldAdmit(
  kind: M23ActionKind,
  context: { busy: boolean; cooling: boolean; cell: M23Cell | null },
  mode: InputMode,
  record = true,
): M23FieldAdmission {
  const s = ensure();

  if (host === null) {
    return { admitted: false, reason: null, plot: null, copy: null };
  }

  const origin = host.origin();
  const selected = m23Selected(s);
  const member =
    selected === null
      ? { member: false, stance: null }
      : host.member(selected.id, origin.x, origin.y);
  // The ring plot associates a refusal with no selection (OD-4); a point in
  // BOTH regions (the P08 band on the shared border) is governed but
  // associates with neither (null); outside both regions nothing is
  // governed (undefined).
  const regions = host.regionPlots(origin.x, origin.y);
  const admission = m23Admit(s, kind, {
    member,
    cell: context.cell,
    busy: context.busy,
    cooling: context.cooling,
    insidePlot: host.insidePlot(origin.x, origin.y),
    regionPlot: m23RegionAssociation(regions),
  });

  if (admission.admitted || admission.reason === null) {
    return { ...admission, copy: null };
  }

  const reason: M23RefusalReason = admission.reason;

  if (!record) {
    return { ...admission, copy: m23RefusalCopy(reason) };
  }

  guarded('refuse', undefined, () => {
    m23sRefuse(
      s,
      kind,
      reason,
      admission.plot,
      { x: origin.x, y: origin.y, cell: context.cell },
      mode,
      sink,
    );
  });
  publishM23Probe();

  return { ...admission, copy: m23RefusalCopy(reason) };
}

/** A scan or dig the host just started on the admitted plot. */
export function m23FieldStarted(
  kind: M23ActionKind,
  cell: M23Cell | null,
  mode: InputMode,
  nowMs: number = now(),
): string | null {
  const s = ensure();

  if (host === null) {
    return null;
  }

  const origin = host.origin();
  const selected = m23Selected(s);
  const member =
    selected === null
      ? { member: false, stance: null }
      : host.member(selected.id, origin.x, origin.y);
  const token = guarded('start', null, () =>
    m23sStartAction(
      s,
      kind,
      nowMs,
      origin,
      member.stance ?? 'interior',
      cell,
      mode,
      sink,
    ),
  );

  publishM23Probe(nowMs);

  return token?.id ?? null;
}

/** The host's scan resolved (the controller's reading is kept beside the recount). */
export function m23FieldScanResolved(
  reportedStrength: number | null,
  nowMs: number = now(),
): M23ScanOutcome | null {
  const s = ensure();
  const token = s.action;

  if (host === null || token === null || token.kind !== 'scan') {
    return null;
  }

  const origin = host.origin();
  const member = host.member(token.plot_id, origin.x, origin.y);
  const outcome = guarded('scan_resolved', null, () =>
    m23sResolveScan(s, token.id, nowMs, origin, member, sink, {
      strength: reportedStrength,
    }),
  );

  host.onChanged();
  publishM23Probe(nowMs);

  return outcome;
}

/** The host's dig resolved at its selected cell. */
export function m23FieldDigResolved(
  nowMs: number = now(),
): M23DigOutcome | null {
  const s = ensure();
  const token = s.action;

  if (host === null || token === null || token.kind !== 'dig') {
    return null;
  }

  const origin = host.origin();
  const outcome = guarded('dig_resolved', null, () =>
    m23sResolveDig(s, token.id, nowMs, origin, sink),
  );

  if (outcome !== null) {
    if (outcome.outcome === 'recovered') {
      settleSeriesClosure(nowMs, token.input_mode);
      host.onNotSearching();
      host.feedback(M23_TEXT.recovery(m23Plot(outcome.plot_id).letter));
    } else if (outcome.choice_due) {
      presentedEpoch = null;
      freshView('first_failure', nowMs);
      m23sSurfaceOpened(s, 'first_failure', nowMs, sink);
      host.onNotSearching();
      host.surface.open();
    }
  }

  host.onChanged();
  publishM23Probe(nowMs);

  return outcome;
}

/**
 * The running action was cancelled through the shared framework. The
 * cause is the one the host set (`m23FieldCancel`), else inferred: a
 * hidden page, a lost focus, otherwise the participant's ESC.
 */
export function m23FieldCancelled(nowMs: number = now()) {
  const s = ensure();

  if (s.action === null) {
    return;
  }

  const cause: M23CancelReason =
    pendingCancelCause ??
    (typeof document !== 'undefined' && document.hidden
      ? 'hidden'
      : typeof document !== 'undefined' &&
          typeof document.hasFocus === 'function' &&
          !document.hasFocus()
        ? 'focus_loss'
        : 'esc');
  const kind = s.action.kind;
  // A deliberate UI cause keeps the participant's input mode (P / PANEL,
  // HELP by keyboard or pointer; ESC by keyboard); the system causes are
  // the system's.
  const mode: InputMode =
    cause === 'panel' || cause === 'help'
      ? (pendingCancelMode ?? 'keyboard')
      : cause === 'esc'
        ? 'keyboard'
        : 'system';

  guarded('cancelled', undefined, () => {
    m23sCancelAction(s, cause, nowMs, sink, mode);
  });
  host?.feedback(
    kind === 'scan' ? M23_TEXT.scan_cancelled : M23_TEXT.dig_cancelled,
  );
  publishM23Probe(nowMs);
}

/** The host cancels a running M23 action for a named cause (blur, hidden, departure, shutdown…). */
export function m23FieldCancel(
  cause: M23CancelReason,
  nowMs: number = now(),
): boolean {
  const s = ensure();

  if (s.action === null) {
    return false;
  }

  if (cause === 'scene_shutdown') {
    // The framework's shutdown cleanup never calls the cancel hook: the
    // host records the cancellation itself (contract §3).
    guarded('cancel_boundary', undefined, () => {
      m23sCancelAction(s, cause, nowMs, sink, 'system');
    });

    return true;
  }

  pendingCancelCause = cause;

  const cancelled = host?.cancelWorldAction() ?? false;

  pendingCancelCause = null;

  if (!cancelled && s.action !== null) {
    guarded('cancel_fallback', undefined, () => {
      m23sCancelAction(s, cause, nowMs, sink, 'system');
    });
  }

  return true;
}

/**
 * The per-frame lifecycle (the yard scene's `onPilotUpdate`): the
 * approaching plot's samples and its region entry; the searching plot's
 * region exit (a pause, the follow restored).
 */
export function m23FieldTick(nowMs: number = now()) {
  const s = ensure();

  if (host === null || !m23Live(s)) {
    return;
  }

  const plot = m23Selected(s);

  if (plot === null) {
    return;
  }

  const origin = host.origin();

  if (plot.status === 'approaching') {
    const member = host.member(plot.id, origin.x, origin.y);

    if (member.member) {
      guarded('region_entry', undefined, () => {
        m23sEnterRegion(
          s,
          origin.x,
          origin.y,
          member.stance ?? 'interior',
          nowMs,
          sink,
        );
      });
      host.onSearching(plot.id);
      host.onChanged();
      publishM23Probe(nowMs);
    } else {
      m23sApproachSample(s, origin.x, origin.y, nowMs);
    }

    return;
  }

  if (plot.status === 'searching' && s.action === null) {
    const member = host.member(plot.id, origin.x, origin.y);

    if (!member.member) {
      guarded('region_exit', undefined, () => {
        m23sRegionExit(s, nowMs, sink);
      });
      host.onNotSearching();
      host.onChanged();
      host.feedback(M23_TEXT.left_region);
      publishM23Probe(nowMs);
    } else {
      plot.stance = member.stance;
    }
  }
}

/** The selected plot's search is paused by the host for a cause (overlay, ESC menu, blur…). */
export function pauseM23(
  cause: M23PauseCause,
  mode: InputMode = 'system',
  nowMs: number = now(),
) {
  const s = ensure();

  if (!m23Live(s)) {
    return;
  }

  // A running world action (the controller's timer) ends with the pause:
  // the framework's cancel writes the record with this cause; the model
  // then has nothing left to cancel. The world never completes a scan or
  // dig the series already recorded as cancelled.
  if (s.action !== null) {
    m23FieldCancel(cause, nowMs);
  }

  const selected = m23Selected(s);
  const wasInWork =
    selected !== null &&
    (selected.status === 'approaching' || selected.status === 'searching');

  guarded('pause', undefined, () => {
    m23sPause(s, cause, nowMs, sink, mode);
  });
  host?.onNotSearching();
  host?.onChanged();

  // The pinned line for the pause the participant sees in the field: the
  // region-exit line at a search-region exit, the paused line otherwise
  // (a departure's line is shown on re-entry; a shutdown shows nothing).
  if (wasInWork && cause === 'search_region_exit') {
    host?.feedback(M23_TEXT.left_region);
  } else if (
    wasInWork &&
    cause !== 'yard_departure' &&
    cause !== 'scene_shutdown' &&
    cause !== 'series_boundary'
  ) {
    host?.feedback(M23_TEXT.paused);
  }

  publishM23Probe(nowMs);
}

/* ------------------------------------------------------------------ *
 * Departures, resumes and the closures the exterior route dispatches
 * ------------------------------------------------------------------ */

/** Airlock exit: a live selection pauses (`yard_departure`); the window's clock pauses. */
export function m23PlotsDeparture(nowMs: number) {
  const s = ensure();

  if (m23Live(s)) {
    m23FieldCancel('yard_departure', nowMs);
    guarded('departure', undefined, () => {
      m23sPause(s, 'yard_departure', nowMs, sink, 'system');
    });
  }

  if (windowInstance.isOpen()) {
    windowInstance.pause(nowMs);
  }
}

/** Yard re-entry: the window's active-time bookkeeping resumes. */
export function m23PlotsResume(nowMs: number) {
  windowInstance.resume(nowMs);

  // Back in the yard with a plot still paused from the departure: the
  // pinned ordinary-exit line (the panel resumes it).
  const s = ensure();
  const selected = m23Selected(s);

  if (
    m23Live(s) &&
    selected !== null &&
    (selected.status === 'paused' || selected.status === 'choice_pending')
  ) {
    host?.feedback(M23_TEXT.ordinary_exit);
  }
}

/** True when a valid eligible plot's response is still unknown (E(c)). */
function eligibleUnknown(s: M23Series): boolean {
  return s.plots.some(
    (plot) =>
      plot.first_failure !== null &&
      plot.status !== 'technical_failure' &&
      m23ObservedContinuation(plot) === null,
  );
}

/**
 * Noor's "finished outside" (the ONE interruption point): every live plot
 * closes `shift_end` with the participant source; the window completes as a
 * completed observation, or is censored when an eligible response stays
 * unknown (E(c)). A presented, never-opened series stays unopened for the
 * review. Idempotent.
 */
/** The source of the next shift end (Noor's command as the participant's); consumed by the closure. */
let pendingShiftEndSource: M23ShiftEndSource | null = null;

const SYSTEM_SHIFT_END: M23ShiftEndSource = {
  participant_initiated: false,
  origin_input_mode: 'system',
  shift_end_command_id: null,
  shift_end_sequence: null,
};

/**
 * The yard scene notes the participant source of Noor's "finished outside"
 * immediately before the route's one interruption point (`endExteriorShift`,
 * whose call stays byte-identical for the M19 source checks); a shift end
 * without a noted source is the system's (D2: never an informed 0).
 */
export function noteM23ShiftEndSource(source: M23ShiftEndSource) {
  pendingShiftEndSource = source;
}

export function closeM23PlotsAtShiftEnd(
  nowMs: number,
  source?: M23ShiftEndSource,
) {
  const s = ensure();
  const resolved = source ?? pendingShiftEndSource ?? SYSTEM_SHIFT_END;

  pendingShiftEndSource = null;

  if (!m23Live(s)) {
    return;
  }

  guarded('shift_end', undefined, () => {
    m23FieldCancel('series_boundary', nowMs);
    m23sCloseAtShiftEnd(s, nowMs, resolved, sink);
  });

  if (windowInstance.isOpen()) {
    const raw = m23ClosureSnapshot(s, nowMs);

    if (eligibleUnknown(s)) {
      windowInstance.stop(
        nowMs,
        'stopped',
        { ...raw, invalid_detail: 'eligible_response_unresolved' },
        'system',
        'censored',
      );
    } else {
      windowInstance.complete(nowMs, raw, 'system', { exitState: 'stopped' });
    }
  }

  host?.onNotSearching();
  host?.onChanged();
  publishM23Probe(nowMs);
}

/**
 * The station-record review: live plots close `review` (unknowns stay
 * unknown, never a 0); a never-opened series is recorded absent
 * (`presented_not_opened` when the brief was shown, never `declined`).
 */
export function closeM23PlotsAtReview(nowMs: number) {
  const s = ensure();

  if (windowInstance.windowStatus() === 'unopened') {
    windowInstance.markAbsent(
      s.presented ? 'presented_not_opened' : 'not_presented_not_opened',
    );

    return;
  }

  if (!m23Live(s)) {
    return;
  }

  guarded('review', undefined, () => {
    m23FieldCancel('series_boundary', nowMs);
    m23sCloseAtReview(s, nowMs, sink);
  });

  if (windowInstance.isOpen()) {
    const raw = m23ClosureSnapshot(s, nowMs);

    if (eligibleUnknown(s)) {
      windowInstance.stop(
        nowMs,
        'closed_at_review',
        { ...raw, invalid_detail: 'closed_at_review' },
        'system',
        'censored',
      );
    } else {
      windowInstance.complete(nowMs, raw, 'system', { exitState: 'stopped' });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Scene conveniences
 * ------------------------------------------------------------------ */

/** The stake's closed-series line (contract §4). */
export function m23StakeClosedLine(): string {
  const s = ensure();

  // A whole-series fault closed the excavation: the series-closed line (the
  // plot-fault line speaks of "the other plot", true only for a plot fault).
  // A held series: the existing lock line (H), or the two approved U / M
  // lines (U24 RL-3, r3 §9).
  if (s.status !== 'held_back') {
    return M23_TEXT.series_closed;
  }

  const held = reloadHoldBackClass(s.fault_detail);

  return held === 'U' || held === 'M'
    ? M23_TEXT.reload_lock_unverified.join('\n')
    : M23_TEXT.reload_lock;
}

export function m23SelectedPlot(): Readonly<M23PlotState> | null {
  return m23Selected(ensure());
}

export function m23PlotState(id: M23PlotId): Readonly<M23PlotState> {
  return m23PlotOf(ensure(), id);
}

export function m23SeriesOpened(): boolean {
  return ensure().opened;
}

export function m23GuidanceAddressed(): boolean {
  return ensure().guidance_addressed;
}

export function m23ActionPending(): boolean {
  return ensure().action !== null;
}

export function m23SelectedLetter(): M23PlotLetter | null {
  return m23Selected(ensure())?.letter ?? null;
}

/* ------------------------------------------------------------------ *
 * DEV probe
 * ------------------------------------------------------------------ */

declare global {
  interface Window {
    /** DEV-only, read-only probe of the two-plot excavation (Unit 23). */
    __m23PlotsProbe?: M23PlotsProbe | null;
  }
}

export interface M23PlotsProbe {
  status: string;
  view: string;
  surface_open: boolean;
  help_replay: boolean;
  selected: string | null;
  opened: boolean;
  guidance_addressed: boolean;
  presented: boolean;
  window: string;
  exit: string | null;
  assignment: {
    plot_a_form: string;
    plot_b_form: string;
    plot_order: string;
    failure_option_order: string;
  };
  action: {
    id: string;
    kind: string;
    plot_id: string;
    started_at_ms: number;
  } | null;
  closure: { trigger: string; reason: string } | null;
  fault_detail: string | null;
  focus_epoch: string;
  tray: string[];
  example_views: { page_1: number; page_2: number };
  closure_explanations: number;
  plots: Record<
    M23PlotId,
    {
      status: string;
      selector_status: string;
      form: string;
      opened: boolean;
      realised_position: number | null;
      resume_count: number;
      approaches: number;
      region_entries: number;
      stance: string | null;
      attempts: number;
      scans: number;
      digs: number;
      cancelled: number;
      refusals: number;
      pauses: number;
      first_failure: {
        action_id: string;
        cell: M23Cell;
        at_ms: number;
      } | null;
      presentation: {
        id: string;
        count: number;
        unpresented: boolean;
      } | null;
      response: string | null;
      response_source: string | null;
      credit: string | null;
      system_cancelled_after_continue: string[];
      stop_request: string | null;
      closure: string | null;
      observed_continuation: boolean | null;
      last_scan: { strength: number; band: string; trend: string } | null;
      last_dig: { cell: M23Cell; outcome: string } | null;
      tray: boolean;
    }
  >;
  now_ms: number;
}

/** Publishes the DEV probe (read-only; never read back into gameplay). */
export function publishM23Probe(nowMs: number = now()) {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const s = ensure();
  const plots = Object.fromEntries(
    s.plots.map((plot) => {
      const lastScan = plot.scans[plot.scans.length - 1] ?? null;
      const lastDig = plot.dug[plot.dug.length - 1] ?? null;

      return [
        plot.id,
        {
          status: plot.status,
          selector_status: m23SelectorStatusOf(plot),
          form: plot.form,
          opened: plot.opened,
          realised_position: plot.realised_position,
          resume_count: plot.resume_count,
          approaches: plot.approach_count,
          region_entries: plot.region_entries,
          stance: plot.stance,
          attempts: plot.attempts,
          scans: plot.scans.length,
          digs: plot.dug.length,
          cancelled: plot.cancelled,
          refusals: plot.refusals,
          pauses: plot.pauses,
          first_failure:
            plot.first_failure === null
              ? null
              : {
                  action_id: plot.first_failure.action_id,
                  cell: { ...plot.first_failure.cell },
                  at_ms: plot.first_failure.at_ms,
                },
          presentation:
            plot.presentation === null
              ? null
              : {
                  id: plot.presentation.id,
                  count: plot.presentation.count,
                  unpresented: plot.presentation.unpresented,
                },
          response: plot.response?.response ?? null,
          response_source: plot.response?.source ?? null,
          credit: plot.credit?.action_id ?? null,
          system_cancelled_after_continue: [
            ...plot.system_cancelled_after_continue,
          ],
          stop_request: plot.stop_request?.id ?? null,
          closure: plot.closure?.reason ?? null,
          observed_continuation: m23ObservedContinuation(plot),
          last_scan:
            lastScan === null
              ? null
              : {
                  strength: lastScan.strength,
                  band: lastScan.band,
                  trend: lastScan.trend,
                },
          last_dig:
            lastDig === null
              ? null
              : { cell: { ...lastDig.cell }, outcome: lastDig.outcome },
          tray: plot.tray,
        },
      ];
    }),
  ) as M23PlotsProbe['plots'];

  window.__m23PlotsProbe = {
    status: s.status,
    view: s.view,
    surface_open: s.surface_open,
    help_replay: s.help_replay,
    selected: s.selected,
    opened: s.opened,
    guidance_addressed: s.guidance_addressed,
    presented: s.presented,
    window: windowInstance.windowStatus(),
    exit: windowInstance.exit(),
    assignment: { ...s.assignment },
    action:
      s.action === null
        ? null
        : {
            id: s.action.id,
            kind: s.action.kind,
            plot_id: s.action.plot_id,
            started_at_ms: s.action.started_at_ms,
          },
    closure:
      s.closure === null
        ? null
        : { trigger: s.closure.trigger, reason: s.closure.reason },
    fault_detail: s.fault_detail,
    focus_epoch: m23FocusEpoch(),
    tray: s.plots.filter((plot) => plot.tray).map((plot) => plot.letter),
    example_views: { ...s.example_views },
    closure_explanations: s.closure_explanations,
    plots,
    now_ms: nowMs,
  };
}

function m23SelectorStatusOf(plot: M23PlotState): string {
  return m23SelectorStatus(plot);
}

/** Test-only escape hatch. */
export function resetM23State() {
  series = null;
  priorLoadChecked = false;
  focusEpoch = 0;
  presentedEpoch = null;
  briefLoggedEpoch = null;
  pendingCancelCause = null;
  pendingShiftEndSource = null;
  windowInstance.reset();
}

/** The option side of a surface element id (re-exported for the scene). */
export { m23OptionSide };
