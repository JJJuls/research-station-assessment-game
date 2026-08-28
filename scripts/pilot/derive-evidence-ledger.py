#!/usr/bin/env python3
"""
Derive the M01-M26 implementation ledger from the frozen decision workbook.

Evidence-led pilot v2, Unit 0. Reads sheet `09_M01_M26_FINAL` of
`docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx`
(stdlib only - no openpyxl) and writes:

  docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.json
      full ledger INCLUDING the exact source item wording (criterion
      comparison; internal traceability only - never player-facing);
  docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.md
      human-readable companion;
  src/pilot/evidenceLedger.ts
      pure, Node-importable ledger WITHOUT the source wording (so no
      questionnaire text ever enters the game bundle).

Sheet 09 fields are copied verbatim. The `route` block is the implementation
layer of this mission (provisional `proto_*` identifiers, windows, episodes);
it never changes a disposition, never adds a score, weight or formula.

Usage:  python scripts/pilot/derive-evidence-ledger.py
"""
import hashlib
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORKBOOK = os.path.join(
    ROOT, 'docs', 'verification', 'input',
    'Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx')
OUT_DIR = os.path.join(ROOT, 'docs', 'verification', 'evidence-led-pilot-v2')
JSON_OUT = os.path.join(OUT_DIR, 'M01-M26-IMPLEMENTATION-LEDGER.json')
MD_OUT = os.path.join(OUT_DIR, 'M01-M26-IMPLEMENTATION-LEDGER.md')
TS_OUT = os.path.join(ROOT, 'src', 'pilot', 'evidenceLedger.ts')
SHEET = '09_M01_M26_FINAL'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

COLUMNS = ['id', 'instrument', 'facet_or_scale', 'exact_source_item',
           'final_disposition', 'analysis_level', 'final_game_opportunity',
           'candidate_raw_variables', 'validity_gate', 'rival_explanations',
           'active_seconds', 'implementation_action', 'episode_label',
           'primary_source']

DISPOSITION_CLASS = {
    'GAME-CANDIDATE — STRONG': 'strong',
    'GAME-CANDIDATE — CONDITIONAL': 'conditional',
    'QUESTIONNAIRE-PRIMARY': 'questionnaire_primary',
    'QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED': 'questionnaire_primary',
}

EPISODE_NAMES = {
    1: 'Storm Arrival & Incident Handover',
    2: 'Records & Workshop Restoration',
    3: 'Signal Analysis Incident',
    4: 'Exterior Recovery',
    5: 'Return, Revision & Handover',
    6: 'Utility & Core Closure',
}

# ---------------------------------------------------------------------------
# Implementation layer (this mission). Every identifier is provisional
# (`proto_*` / `secondary_*`), never a canonical event name. Family prefixes
# are pairwise disjoint and never a prefix of a legacy dev-only family.
# ---------------------------------------------------------------------------
ROUTE = {
    'M01': dict(episodes=[1], opportunity_ids=['proto_m01_plan_board'],
                windows=[dict(id='m01_plan_board_w1', episode=1, occasion=None)],
                family_prefixes=['proto_m01_board_'], secondary_ids=[],
                location='Station Concourse / Incident Desk - plan board',
                mechanic='Storm incident plan board: inspect a compact packet, order the work into a dependency-valid sequence (two or more valid orders), then execute the first three transitions.'),
    'M02': dict(episodes=[2], opportunity_ids=['proto_m02_case_workspace'],
                windows=[dict(id='m02_workspace_w1', episode=2, occasion=None),
                         dict(id='m02_retrieval_w1', episode=2, occasion=None)],
                family_prefixes=['proto_m02_case_'], secondary_ids=[],
                location='Records Workshop - open case workspace',
                mechanic='Open workspace: six heterogeneous case bundles, optional folders and labels, free placement; then retrieval of two counterbalanced cases before the handover commit. No designer-preferred layout is scored.'),
    'M03': dict(episodes=[2, 5], opportunity_ids=['proto_m03_reset_a', 'proto_m03_reset_b'],
                windows=[dict(id='m03_reset_o1', episode=2, occasion='a'),
                         dict(id='m03_reset_o2', episode=5, occasion='b')],
                family_prefixes=['proto_m03_'], secondary_ids=[],
                location='Records Workshop press (occasion 1) and Workshop Return press (occasion 2)',
                mechanic='After an unrelated job the workstation is left with a fixed number of item-local residuals and clearly marked homes; the reset is optional and never instructed; exit stays open.'),
    'M04': dict(episodes=[2], opportunity_ids=['proto_m04_debris_cleanup'],
                windows=[dict(id='m04_debris_w1', episode=2, occasion=None)],
                family_prefixes=['proto_m04_debris_'], secondary_ids=[],
                location='Records Workshop - sample-job debris',
                mechanic='A neutral sample job creates six standardised, self-generated debris objects; disposal is optional, the route never gates on cleanup, debris is never reused by M03.'),
    'M05': dict(episodes=[1, 4], opportunity_ids=['proto_m05_initiation_o1', 'proto_m05_initiation_o2'],
                windows=[dict(id='m05_initiation_o1', episode=1, occasion='o1'),
                         dict(id='m05_initiation_o2', episode=4, occasion='o2')],
                family_prefixes=['proto_m05_initiation_'], secondary_ids=[],
                location='Concourse visible fault (occasion 1); Recovery Yard visible fault (occasion 2)',
                mechanic='Two low-risk visible faults at separate quiet moments after objective comprehension, without an NPC command; the initiation clock starts after comprehension and latency censoring is preserved.'),
    'M06': dict(episodes=[2], opportunity_ids=['proto_m06_routine_dispatch'],
                windows=[dict(id='m06_dispatch_w1', episode=2, occasion=None)],
                family_prefixes=['proto_m06_dispatch_'], secondary_ids=[],
                location='Records Workshop - dispatch console',
                mechanic='After non-scored practice, compose and dispatch four routine pseudo-commands from visible tokens/reference; typing optional; animation time excluded.'),
    'M07': dict(episodes=[2, 5], opportunity_ids=['proto_m07_calibration_project'],
                windows=[dict(id='m07_calibration_start', episode=2, occasion=None),
                         dict(id='m07_calibration_end', episode=5, occasion=None)],
                family_prefixes=['proto_m07_calibration_'], secondary_ids=[],
                location='Records Workshop calibration bench (start) / Workshop Return (end)',
                mechanic='Six-stage routine calibration with a visible endpoint and persistent state; the participant may leave and naturally return; no injected setback or difficulty spike; no route gate forces completion.'),
    'M08': dict(episodes=[], opportunity_ids=[], windows=[], family_prefixes=[],
                secondary_ids=['secondary_m08_optional_job'],
                location='Across route - two naturally available optional useful jobs',
                mechanic='No scored minigame. Optional-job engagement is descriptive secondary telemetry only and is never interpreted as a score; the exact item stays in the questionnaire.'),
    'M09': dict(episodes=[1, 5], opportunity_ids=['proto_m09_monitor_watch'],
                windows=[dict(id='m09_check_1', episode=1, occasion='check1'),
                         dict(id='m09_check_2', episode=5, occasion='check2')],
                family_prefixes=['proto_m09_watch_'], secondary_ids=[],
                location='Concourse monitor gauge - accepted in episode 1; check 1 due before leaving the Concourse, check 2 due on the return',
                mechanic='Voluntarily accept a monitor watch with two scheduled gauge checks at fixed milestones, equal reminders and guaranteed access; failures are distinguished from invalid presentation.'),
    'M10': dict(episodes=[1, 5], opportunity_ids=['proto_m10_component_promise'],
                windows=[dict(id='m10_promise_accept', episode=1, occasion=None),
                         dict(id='m10_promise_handover', episode=5, occasion=None)],
                family_prefixes=['proto_m10_promise_'], secondary_ids=[],
                location='Concourse (accept) -> named NPC on the return (handover)',
                mechanic='Voluntarily accept delivery of a named component, receive a standardised interruption, and later hand it to the available named NPC; one neutral reminder; no dialogue wording scored.'),
    'M11': dict(episodes=[2], opportunity_ids=[], windows=[], family_prefixes=[],
                secondary_ids=['secondary_m11_seal_obligation'],
                location='Records Workshop - sample-seal obligation (secondary only)',
                mechanic='Sample-seal obligation kept as secondary safety/compliance telemetry only; no hazard penalty; never broad irresponsibility; the exact item stays in the questionnaire.'),
    'M12': dict(episodes=[1, 2], opportunity_ids=['proto_m12_qc_o1', 'proto_m12_qc_o2'],
                windows=[dict(id='m12_qc_o1', episode=1, occasion='o1'),
                         dict(id='m12_qc_o2', episode=2, occasion='o2')],
                family_prefixes=['proto_m12_qc_'], secondary_ids=[],
                location='Concourse QC packet (occasion 1); Records Workshop completed work product (occasion 2)',
                mechanic='Two matched, independently reachable quality-control occasions: inspect a completed work product with one visible-but-not-salient matched error and optionally correct before submit; form and order recorded; no speed score.'),
    'M13': dict(episodes=[2], opportunity_ids=['proto_m13_lattice_construction'],
                windows=[dict(id='m13_lattice_w1', episode=2, occasion=None)],
                family_prefixes=['proto_m13_lattice_'], secondary_ids=[],
                location='Records Workshop - conduit lattice bench (physical 3x3 pipe network)',
                mechanic='Physical 3x3 pipe/signal network: place and rotate a complete piece set so endpoints connect, the valve is inline and no branch remains open; hit targets, rotation/snap feedback, undo/reset and an accessible lane; no auto-completion, no card answer.'),
    'M14': dict(episodes=[1], opportunity_ids=['proto_m14_incident_desk'],
                windows=[dict(id='m14_desk_w1', episode=1, occasion=None)],
                family_prefixes=['proto_m14_desk_'], secondary_ids=[],
                location='Concourse - multi-source incident desk (spatial work surface)',
                mechanic='One incident desk combining six messages, three gauges and one station diagram; assign faults and priorities while every source remains externally visible; independent packet/window.'),
    'M15': dict(episodes=[3], opportunity_ids=['proto_m15_layered_cipher'],
                windows=[dict(id='m15_causal_w1', episode=3, occasion=None)],
                family_prefixes=['proto_m15_cipher_'], secondary_ids=[],
                location='Diagnostics Laboratory - signal case phase 1 (causal model)',
                mechanic='Phase 1 of the signal-analysis case: build a compact causal subsystem model from independent evidence, then predict the effect of one intervention (existing relational engine and validator retained).'),
    'M16': dict(episodes=[3], opportunity_ids=['proto_m16_protocol_update'],
                windows=[dict(id='m16_protocol_w1', episode=3, occasion=None)],
                family_prefixes=['proto_m16_protocol_'], secondary_ids=[],
                location='Diagnostics Laboratory - signal case phase 2 (novel protocol)',
                mechanic='Phase 2: learn a genuinely novel three-part signal protocol and classify unseen cases into process lanes using tokens or typed aliases; one concise tutorial, then unseen cases.'),
    'M17': dict(episodes=[3], opportunity_ids=['proto_m17_syntax_acquisition'],
                windows=[dict(id='m17_transfer_w1', episode=3, occasion=None)],
                family_prefixes=['proto_m17_syntax_'], secondary_ids=[],
                location='Diagnostics Laboratory - signal case phase 3 (demonstration / practice / transfer)',
                mechanic='Phase 3: one demonstration, one guided practice, then one changed unassisted transfer case; motor time is not scored.'),
    'M18': dict(episodes=[3], opportunity_ids=['proto_m18_lattice_fault_diagnosis'],
                windows=[dict(id='m18_diagnosis_w1', episode=3, occasion=None)],
                family_prefixes=['proto_m18_fault_'], secondary_ids=[],
                location='Diagnostics Laboratory - signal case phase 4 (hypothesis diagnosis)',
                mechanic='Phase 4: test reversible hypotheses against independent evidence panels, eliminate contradictions and submit the sole evidence-consistent fault; independent of M13 state and events.'),
    'M19': dict(episodes=[4], opportunity_ids=['proto_m19_progressive_valve'],
                windows=[dict(id='m19_valve_w1', episode=4, occasion=None)],
                family_prefixes=['proto_m19_valve_'], secondary_ids=[],
                location='Recovery Yard - difficult valve/coupling',
                mechanic='Progressive physical valve/coupling: resistance increases after initial progress, feedback stays informative, completion remains attainable, a neutral stop is always available.'),
    'M20': dict(episodes=[4, 5], opportunity_ids=['proto_m20_antenna_restoration'],
                windows=[dict(id='m20_antenna_start', episode=4, occasion=None),
                         dict(id='m20_antenna_resume', episode=5, occasion=None)],
                family_prefixes=['proto_m20_antenna_'], secondary_ids=[],
                location='Recovery Yard mast (start) -> Workshop Return feed console (resume/finish)',
                mechanic='Multi-stage antenna restoration begun outside, interrupted by the one required return duty, then a natural (uncommanded) opportunity to resume and finish with visibly persisted state.'),
    'M21': dict(episodes=[5], opportunity_ids=['proto_m21_manual_repair'],
                windows=[dict(id='m21_manual_w1', episode=5, occasion=None)],
                family_prefixes=['proto_m21_manual_'], secondary_ids=[],
                location='Workshop Return - manual-based repair',
                mechanic='Concise unfamiliar cross-referenced manual (text + equivalent diagram mode) used to infer a rule and apply it to a novel repair; reading duration is never primary.'),
    'M22': dict(episodes=[5], opportunity_ids=['proto_m22_report_revision'],
                windows=[dict(id='m22_report_w1', episode=5, occasion=None)],
                family_prefixes=['proto_m22_report_'], secondary_ids=[],
                location='Workshop Return - shift report desk',
                mechanic='Submit a reasonable assembled report, receive a standardised newly revealed criterion, then revise and resubmit using actionable feedback (direct editing/assembly, not multiple-choice cards).'),
    'M23': dict(episodes=[4], opportunity_ids=['proto_m23_field_recovery'],
                windows=[dict(id='m23_excavation_w1', episode=4, occasion=None)],
                family_prefixes=['proto_m23_field_recovery_'], secondary_ids=[],
                location='Recovery Yard - scanner-guided excavation plot',
                mechanic='Existing scanner-guided excavation: C-strength/bearing feedback narrows a bounded field, D-dig exact terrain cells to recover an attainable buried component; bounded and recoverable; useful progress distinguished from aimless time.'),
    'M24': dict(episodes=[4], opportunity_ids=['proto_m24_magnet_utility'],
                windows=[dict(id='m24_magnet_w1', episode=4, occasion=None)],
                family_prefixes=['proto_m24_magnet_utility_'], secondary_ids=[],
                location='Metal Recovery Yard - magnet rig (F, rig-local)',
                mechanic='Finite magnet-recovery deck; every completed cycle advances the deck; objective depletion shown and acknowledged with an equally visible useful alternative; state persists across room returns; no reward after depletion; misses, empty pulls and depletion remain distinguishable.'),
    'M25': dict(episodes=[5], opportunity_ids=['proto_m25_belief_probe'],
                windows=[dict(id='m25_probe_w1', episode=5, occasion=None)],
                family_prefixes=['proto_m25_probe_'], secondary_ids=['secondary_m25_lock_resubmits'],
                location='Workshop Return - transparent self-report probe (questionnaire/hybrid)',
                mechanic='Transparent direct belief/expectancy probe presented openly as a self-report item and stored separately from every behavioural component; the exact source item remains in the questionnaire; any locked-command repetition telemetry is secondary context only.'),
    'M26': dict(episodes=[4], opportunity_ids=['proto_m26_channel_disconnect'],
                windows=[dict(id='m26_channel_w1', episode=4, occasion=None)],
                family_prefixes=['proto_m26_channel_'], secondary_ids=[],
                location='Recovery Yard - transmission channel post',
                mechanic='After one successful transmission the channel is physically disconnected, demonstrated and acknowledged while a working alternative channel remains equally available; the first confirmation probe is excluded; the disconnect state persists.'),
}


def read_sheet(path, sheet_name):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    relmap = {r.get('Id'): r.get('Target') for r in rels}
    target = None
    names = []
    for s in wb.find('m:sheets', NS):
        names.append(s.get('name'))
        if s.get('name') == sheet_name:
            target = relmap[s.get('{%s}id' % NS['r'])]
    if target is None:
        raise SystemExit('sheet %s not found; sheets=%s' % (sheet_name, names))
    target = target[1:] if target.startswith('/') else 'xl/' + target
    root = ET.fromstring(z.read(target))

    def col_index(ref):
        col = re.match(r'[A-Z]+', ref).group(0)
        n = 0
        for ch in col:
            n = n * 26 + (ord(ch) - 64)
        return n - 1

    rows = []
    for row in root.iter('{%s}row' % NS['m']):
        cells = {}
        for c in row.findall('m:c', NS):
            idx = col_index(c.get('r'))
            t = c.get('t')
            v = c.find('m:v', NS)
            val = ''
            if t == 's' and v is not None:
                val = shared[int(v.text)]
            elif t == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
            elif v is not None:
                val = v.text or ''
            cells[idx] = val
        if cells:
            rows.append([cells.get(i, '') for i in range(max(cells) + 1)])
    return names, rows


def parse_episodes(label):
    return sorted({int(n) for n in re.findall(r'\b([1-6])\b', label)})


def main():
    names, rows = read_sheet(WORKBOOK, SHEET)
    header = rows[3]
    assert header[0] == 'ID', header
    items = []
    for r in rows[4:]:
        if not r or not re.match(r'^M\d\d$', r[0]):
            continue
        r = r + [''] * (len(COLUMNS) - len(r))
        d = dict(zip(COLUMNS, r))
        d['active_seconds'] = int(float(d['active_seconds']))
        d['candidate_raw_variables'] = [
            v.strip() for v in d['candidate_raw_variables'].split(';') if v.strip()]
        d['disposition_class'] = DISPOSITION_CLASS[d['final_disposition']]
        d['episodes'] = parse_episodes(d['episode_label'])
        route = ROUTE[d['id']]
        # The route may only host windows in the episodes sheet 09 names
        # (M09/M10 accept in ep 1 and close in ep 5 with one check also due
        # at the ep-2 milestone; that milestone is a window, not a new episode
        # assignment, so the item-level episode list stays the sheet's).
        assert route['episodes'] == d['episodes'], (
            d['id'], route['episodes'], d['episodes'])
        d['route'] = dict(
            location=route['location'],
            mechanic=route['mechanic'],
            episodes=route['episodes'],
            opportunity_ids=route['opportunity_ids'],
            windows=route['windows'],
            family_prefixes=route['family_prefixes'],
            secondary_telemetry_ids=route['secondary_ids'],
            implementation_status='planned',
        )
        # route.episodes is the single copy; the transient parse helper goes.
        del d['episodes']
        items.append(d)

    assert [i['id'] for i in items] == ['M%02d' % n for n in range(1, 27)]
    counts = {'strong': 0, 'conditional': 0, 'questionnaire_primary': 0}
    for i in items:
        counts[i['disposition_class']] += 1
    assert counts == {'strong': 16, 'conditional': 7, 'questionnaire_primary': 3}, counts
    assert sum(i['active_seconds'] for i in items) == 1040

    md5 = hashlib.md5(open(WORKBOOK, 'rb').read()).hexdigest()
    ledger = dict(
        ledger_id='evidence-led-pilot-v2-ledger',
        ledger_version=1,
        source=dict(
            workbook='docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx',
            workbook_md5=md5,
            sheet=SHEET,
            sheets_present=names,
            authority='Sheets 08-14 are the implementation authority for this mission; sheets 00-07 are preserved provenance.'),
        scientific_status=(
            'Professional research prototype. Establishes no formal validity, reliability, norms, cut scores, '
            'hiring utility or questionnaire equivalence. Candidate variables are raw components only; '
            'missing/invalid opportunities never become low values; no trait score is computed.'),
        inference_model=[
            dict(instrument='BFI-2', facet_or_scale='Organization', items=['M01', 'M02', 'M03', 'M04']),
            dict(instrument='BFI-2', facet_or_scale='Productiveness', items=['M05', 'M06', 'M07', 'M08']),
            dict(instrument='BFI-2', facet_or_scale='Responsibility', items=['M09', 'M10', 'M11', 'M12']),
            dict(instrument='BESSI-192', facet_or_scale='Information Processing Skill',
                 items=['M13', 'M14', 'M15', 'M16', 'M17', 'M18']),
            dict(instrument='Multidimensional Persistence Scale', facet_or_scale='Persistence Despite Difficulty',
                 items=['M19', 'M20', 'M21', 'M22', 'M23']),
            dict(instrument='Multidimensional Persistence Scale', facet_or_scale='Inappropriate Persistence',
                 items=['M24', 'M25', 'M26']),
        ],
        analysis_order=[
            'data quality and valid exposure',
            'raw-component distributions',
            'reliability/generalizability where repeated occasions permit',
            'facet/scale-level convergence and discrimination',
            'fairness/accessibility and gaming/language/device moderation',
            'criterion evidence',
        ],
        classification_counts=counts,
        item_owned_active_seconds=sum(i['active_seconds'] for i in items),
        burden_budget=dict(item_owned_active_seconds=1040, shared_overhead_seconds=420,
                           non_scored_closure_seconds=75, planned_total_seconds=1535,
                           human_median_target_minutes=27, human_p90_gate_minutes=30,
                           status='Planning estimate only - requires human pilot'),
        episodes=[dict(number=n, name=EPISODE_NAMES[n]) for n in range(1, 7)],
        items=items,
    )
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(JSON_OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2)
        f.write('\n')

    # ---- Markdown companion ------------------------------------------------
    lines = ['# M01-M26 implementation ledger (evidence-led pilot v2)', '',
             'Derived from `%s` sheet `%s` (workbook md5 `%s`) by '
             '`scripts/pilot/derive-evidence-ledger.py`. **Do not edit by hand - regenerate.**' % (
                 ledger['source']['workbook'], SHEET, md5), '',
             'Frozen dispositions: **%d strong / %d conditional / %d questionnaire-primary or hybrid**; '
             'item-owned active seconds **%d**.' % (counts['strong'], counts['conditional'],
                                                   counts['questionnaire_primary'],
                                                   ledger['item_owned_active_seconds']), '',
             ledger['scientific_status'], '',
             'The exact source item wording below is internal traceability for criterion comparison. '
             'It is never shown to participants and never enters the game bundle.', '',
             '| ID | Instrument | Facet / scale | Disposition | Episode(s) | Sec | Provisional opportunity id(s) | Windows |',
             '| --- | --- | --- | --- | --- | --- | --- | --- |']
    for i in items:
        lines.append('| %s | %s | %s | %s | %s | %d | %s | %s |' % (
            i['id'], i['instrument'], i['facet_or_scale'], i['final_disposition'],
            ', '.join(str(e) for e in i['route']['episodes']) or '-', i['active_seconds'],
            ', '.join('`%s`' % o for o in i['route']['opportunity_ids']) or '- (secondary: %s)' % ', '.join(
                '`%s`' % s for s in i['route']['secondary_telemetry_ids']),
            ', '.join('`%s` (ep %d)' % (w['id'], w['episode']) for w in i['route']['windows']) or '-'))
    lines.append('')
    for i in items:
        lines += ['## %s - %s / %s' % (i['id'], i['instrument'], i['facet_or_scale']), '',
                  '- **Exact source item (criterion comparison; internal only):** %s' % i['exact_source_item'],
                  '- **Final disposition:** %s (`%s`)' % (i['final_disposition'], i['disposition_class']),
                  '- **Analysis level:** %s' % i['analysis_level'],
                  '- **Final game opportunity (sheet 09):** %s' % i['final_game_opportunity'],
                  '- **Candidate raw variables (raw components only):** %s' % ', '.join(
                      '`%s`' % v for v in i['candidate_raw_variables']),
                  '- **Validity / missing gate:** %s' % i['validity_gate'],
                  '- **Main rival explanations:** %s' % i['rival_explanations'],
                  '- **Active seconds:** %d / **Episode:** %s' % (i['active_seconds'], i['episode_label']),
                  '- **Implementation action:** %s' % i['implementation_action'],
                  '- **Route (this mission, provisional):** %s - %s' % (i['route']['location'], i['route']['mechanic']),
                  '- **Opportunity ids:** %s / **Family prefixes:** %s / **Secondary telemetry:** %s' % (
                      ', '.join('`%s`' % o for o in i['route']['opportunity_ids']) or '-',
                      ', '.join('`%s`' % o for o in i['route']['family_prefixes']) or '-',
                      ', '.join('`%s`' % o for o in i['route']['secondary_telemetry_ids']) or '-'),
                  '- **Primary source:** %s' % i['primary_source'], '']
    with open(MD_OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))

    # ---- TypeScript module (no source wording) -----------------------------
    def ts(v):
        return json.dumps(v, ensure_ascii=False)

    ts_keys = ['id', 'instrument', 'facet_or_scale', 'final_disposition', 'disposition_class',
               'analysis_level', 'final_game_opportunity', 'candidate_raw_variables',
               'validity_gate', 'rival_explanations', 'active_seconds', 'implementation_action',
               'episode_label', 'primary_source']
    route_keys = ['location', 'mechanic', 'episodes', 'opportunity_ids', 'windows',
                  'family_prefixes', 'secondary_telemetry_ids', 'implementation_status']
    ts_items = []
    for i in items:
        body = ''.join('    %s: %s,\n' % (k, ts(i[k])) for k in ts_keys)
        route = ''.join('      %s: %s,\n' % (k, ts(i['route'][k])) for k in route_keys)
        ts_items.append('  {\n' + body + '    route: {\n' + route + '    },\n  }')

    header = open(os.path.join(os.path.dirname(__file__), 'evidenceLedger.header.ts.tmpl'),
                  encoding='utf-8').read()
    ts_src = header.replace(
        '__ITEM_IDS__', '\n'.join("  | '%s'" % i['id'] for i in items)
    ).replace('__MD5__', ts(md5)).replace('__SHEET__', ts(SHEET)).replace(
        '__EPISODES__', '\n'.join('  %d: %s,' % (n, ts(EPISODE_NAMES[n])) for n in range(1, 7))
    ).replace('__INFERENCE__', json.dumps(ledger['inference_model'], ensure_ascii=False, indent=2)
    ).replace('__ITEMS__', ',\n'.join(ts_items))
    with open(TS_OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(ts_src)
    print('wrote', JSON_OUT)
    print('wrote', MD_OUT)
    print('wrote', TS_OUT)
    print('counts', counts, 'active', ledger['item_owned_active_seconds'])


if __name__ == '__main__':
    main()
