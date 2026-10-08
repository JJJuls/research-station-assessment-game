/**
 * M14 — the approved content of the two-packet incident desk (Station 080
 * M01–M26 run, Unit 17; administration `m14-integration-v1`).
 *
 * PURE module (no Phaser, no runtime, no `import.meta`): the two packets
 * of `U17-STIMULUS-PREVIEW.md` (revision r4) exactly as approved by the
 * research owner's decision D-U17-1 of 7 October 2026 — two packets,
 * each of six messages, three gauges and three keyed integration
 * decisions whose keys need at least two sources — together with every
 * participant-facing string of the desk (orientation, status line, help,
 * dialogs, acknowledgement, results, closed records). Typography
 * amendment T1 (decision D-U17-2 of 8 October 2026) is applied: a
 * no-break space (U+00A0) inside "tank N" / "Tank N" and before "%".
 *
 * Nothing here is re-authored by the implementer: a defect found in a key
 * is recorded for the owner, never corrected here. The keys are the
 * authored content's answers under the rules the participant is given;
 * their logical correctness does not establish empirical validity, and
 * the six decisions are clustered observations inside one desk episode.
 * No questionnaire wording appears anywhere in this file.
 */

export const M14_FAMILY = 'proto_m14_integration_';
export const M14_OPPORTUNITY_ID = 'proto_m14_integration_series';
/** The kit's own window id (the first packet's window). */
export const M14_WINDOW_ID = 'm14_packet_p1';
export const M14_ENTRY_STATE_VERSION = 'm14-integration-v1';
export const M14_OBJECT_ID = 'm14_incident_desk';
export const M14_SCENE = 'station_concourse';
export const M14_PACKETS_PLANNED = 2;
export const M14_DECISIONS_PLANNED = 6;
/** A confirming press inside this window after a dialog opened is refused. */
export const M14_SETTLE_MS = 400;

export type M14PacketId = 'p1' | 'p2';
export type M14SourceKind = 'message' | 'gauge';
export type M14OptionLetter = 'a' | 'b' | 'c' | 'd';

export const M14_PACKET_IDS: readonly M14PacketId[] = ['p1', 'p2'];
export const M14_PACKET_WINDOW_IDS: Record<M14PacketId, string> = {
  p1: 'm14_packet_p1',
  p2: 'm14_packet_p2',
};
export const M14_OPTION_LETTERS: readonly M14OptionLetter[] = [
  'a',
  'b',
  'c',
  'd',
];

export interface M14Source {
  id: string;
  kind: M14SourceKind;
  /** 1–9 inside the packet (messages 1–6, gauges 7–9): the tile hotkey. */
  index: number;
  /** Closed-tile line: "time · sender" for a message, the label for a gauge. */
  header: string;
  /** The text shown when the tile is open. */
  text: string;
}

export interface M14Option {
  id: string;
  letter: M14OptionLetter;
  label: string;
}

export interface M14Decision {
  id: string;
  packet_id: M14PacketId;
  /** 1–3 inside the packet. */
  index: number;
  /** 1–6 across the series. */
  global_index: number;
  /** Short title for the results view (implementer default D-5). */
  short_title: string;
  question: string;
  options: readonly M14Option[];
  key_option_id: string;
  /** The preview's establishing sets (two for P1-D3), by source id. */
  establishing_sets: readonly (readonly string[])[];
  /** The approved results line (shown only after the sixth answer). */
  results_line: string;
}

export interface M14Packet {
  id: M14PacketId;
  /** 1–2. */
  index: number;
  content_version: string;
  /** The packet-start title line. */
  title: string;
  /** The packet-start readings line. */
  readings_line: string;
  sources: readonly M14Source[];
  decisions: readonly M14Decision[];
}

/** U+00A0 — typography amendment T1. */
const NB = String.fromCharCode(0xa0);

function message(
  packet: M14PacketId,
  index: number,
  time: string,
  sender: string,
  text: string,
): M14Source {
  return {
    id: `${packet}_m${index}`,
    kind: 'message',
    index,
    header: `${time} · ${sender}`,
    text,
  };
}

function gauge(
  packet: M14PacketId,
  index: number,
  label: string,
  reading: string,
  reference: string | null,
): M14Source {
  return {
    id: `${packet}_g${index}`,
    kind: 'gauge',
    index: 6 + index,
    header: label,
    text: reference === null ? reading : `${reading} · ${reference}`,
  };
}

function decision(
  packet: M14PacketId,
  index: number,
  shortTitle: string,
  question: string,
  labels: readonly [string, string, string, string],
  key: M14OptionLetter,
  establishingSets: readonly (readonly string[])[],
  resultsLine: string,
): M14Decision {
  const id = `${packet}_d${index}`;

  return {
    id,
    packet_id: packet,
    index,
    global_index: (packet === 'p1' ? 0 : 3) + index,
    short_title: shortTitle,
    question,
    options: M14_OPTION_LETTERS.map((letter, position) => ({
      id: `${id}_${letter}`,
      letter,
      label: labels[position],
    })),
    key_option_id: `${id}_${key}`,
    establishing_sets: establishingSets,
    results_line: resultsLine,
  };
}

/** Packet 1 — "Night packet: pump bay and power" (readings 04:00). */
const PACKET_1: M14Packet = {
  id: 'p1',
  index: 1,
  content_version: 'm14-p1-v1',
  title: 'PACKET 1 OF 2 — Night packet: pump bay and power',
  readings_line:
    'Gauge readings taken at 04:00. Messages are listed in time order.',
  sources: [
    message(
      'p1',
      1,
      '00:30',
      'Duty officer',
      "Standing order: whenever a coolant loop reads below its normal band, isolate it (shut it off) — unless the medical bay is running on that loop at that point; then it stays on. Loop B's bypass valve may be opened while loop B is inside its band, and not otherwise.",
    ),
    message(
      'p1',
      2,
      '01:10',
      'Night watch',
      'The medical bay is running on loop A tonight.',
    ),
    message('p1', 3, '01:20', 'Stores', 'Pump bay shelf: 4 spare seals.'),
    message(
      'p1',
      4,
      '02:35',
      'Pump bay',
      'Medical bay switched to loop B at 02:30. Loop A now feeds just the galley. The galley heaters may be restarted while loop A is inside its band, and not otherwise.',
    ),
    message(
      'p1',
      5,
      '03:10',
      'Pump bay',
      'Joint 7 re-sealed with 2 spare seals from the pump bay shelf. The standby pump may be started while the main bus reads 27.5 V or more, and not otherwise.',
    ),
    message(
      'p1',
      6,
      '03:40',
      'Workshop',
      'Brought 1 new spare seal over and left it on the pump bay shelf. Our sample press may run while the main bus is inside its normal band, and not otherwise.',
    ),
    gauge('p1', 1, 'Loop A pressure', '1.6 bar', 'normal band 2.0–2.6 bar'),
    gauge('p1', 2, 'Loop B pressure', '1.8 bar', 'normal band 2.0–2.6 bar'),
    gauge('p1', 3, 'Main bus', '27.2 V', 'normal band 26.5–28.5 V'),
  ],
  decisions: [
    decision(
      'p1',
      1,
      'Coolant loops',
      'Under the standing order, which coolant loops, if any, do you isolate now?',
      ['Loop A only', 'Loop B only', 'Both loops', 'Neither loop'],
      'a',
      [['p1_m1', 'p1_g1', 'p1_m4']],
      'Loop A only: it is below its band (1.6 bar) and, since 02:30, not feeding the medical bay. Loop B feeds the medical bay, so it stays on.',
    ),
    decision(
      'p1',
      2,
      'Spare seals',
      'How many spare seals are on the pump bay shelf now?',
      ['2', '3', '4', '5'],
      'b',
      [['p1_m3', 'p1_m5', 'p1_m6']],
      '3: 4 on the shelf at 01:20, 2 used at 03:10, 1 brought at 03:40.',
    ),
    decision(
      'p1',
      3,
      'Job allowed now',
      'Which one of these jobs is allowed now?',
      [
        'Restart the galley heaters',
        "Open loop B's bypass valve",
        'Start the standby pump',
        'Run the sample press',
      ],
      'd',
      [
        ['p1_m6', 'p1_g3'],
        ['p1_m4', 'p1_g1', 'p1_m1', 'p1_g2', 'p1_m5', 'p1_g3'],
      ],
      'Run the sample press: the main bus (27.2 V) is inside its band. The pump needs 27.5 V or more; loops A and B are still below their bands.',
    ),
  ],
};

/** Packet 2 — "Morning packet: mast, yard and uplink" (readings 07:00). */
const PACKET_2: M14Packet = {
  id: 'p2',
  index: 2,
  content_version: 'm14-p2-v1',
  title: 'PACKET 2 OF 2 — Morning packet: mast, yard and uplink',
  readings_line:
    'Gauge readings taken at 07:00. Messages are listed in time order.',
  sources: [
    message(
      'p2',
      1,
      '04:10',
      'Comms lead',
      'Mast climbs need a climbing ticket. Only Ansel and Corin hold one, and both are on shift today. Nobody climbs while the mast wind is over its limit.',
    ),
    message(
      'p2',
      2,
      '04:30',
      'Yard',
      `Generator moved to tank${NB}2 while tank${NB}1 is cleaned.`,
    ),
    message(
      'p2',
      3,
      '04:45',
      'Comms',
      `The uplink needs at least 10${NB}% signal for text bursts, 30${NB}% for voice calls and 70${NB}% for video calls.`,
    ),
    message(
      'p2',
      4,
      '05:55',
      'Comms',
      `Ice on the dish: voice calls now need at least 40${NB}% signal. The other thresholds are unchanged.`,
    ),
    message(
      'p2',
      5,
      '06:05',
      'Yard',
      `Tank${NB}1 cleaned and partly refilled. From now on, run the generator on the emptiest tank that still holds at least 20${NB}%.`,
    ),
    message(
      'p2',
      6,
      '06:20',
      'Roster',
      'Ansel sprained an ankle on the ice — no climbing today. Dara is free all morning to help anyone.',
    ),
    gauge('p2', 1, 'Mast wind', '31 km/h', 'climbing limit 40 km/h'),
    gauge(
      'p2',
      2,
      'Fuel tanks',
      `tank${NB}1: 64${NB}% · tank${NB}2: 15${NB}% · tank${NB}3: 41${NB}%`,
      null,
    ),
    gauge('p2', 3, 'Uplink signal', `34${NB}%`, null),
  ],
  decisions: [
    decision(
      'p2',
      1,
      'Mast climb',
      'Who can be sent up the mast now?',
      ['Ansel', 'Corin', 'Dara', 'Nobody — the wind is over its limit'],
      'b',
      [['p2_m1', 'p2_m6', 'p2_g1']],
      'Corin: only Ansel and Corin hold tickets, Ansel cannot climb today, and the wind (31 km/h) is under its 40 km/h limit.',
    ),
    decision(
      'p2',
      2,
      'Generator tank',
      'Under the yard rule, which tank should the generator run on now?',
      [`Tank${NB}1`, `Tank${NB}2`, `Tank${NB}3`, 'None of the tanks qualifies'],
      'c',
      [['p2_m5', 'p2_g2']],
      `Tank${NB}3: tank${NB}2 (15${NB}%) is below 20${NB}%; of tanks 1 and 3, tank${NB}3 (41${NB}%) is the emptier.`,
    ),
    decision(
      'p2',
      3,
      'Uplink contact',
      'Base asks for the fullest contact the uplink allows now (video is fuller than voice, voice is fuller than text). Which?',
      [
        'Video call',
        'Voice call',
        'Text bursts only',
        'No contact is possible',
      ],
      'c',
      [['p2_m3', 'p2_m4', 'p2_g3']],
      `Text bursts only: 34${NB}% is enough for text (10${NB}%) but not for voice (40${NB}% since 05:55) or video (70${NB}%).`,
    ),
  ],
};

/** The two packets in the fixed, assigned order (decision D-U17-1, item 3). */
export const M14_PACKETS: readonly M14Packet[] = [PACKET_1, PACKET_2];
export const M14_ASSIGNED_PACKET_ORDER: readonly M14PacketId[] = ['p1', 'p2'];
export const M14_CONTENT_VERSIONS: Record<M14PacketId, string> = {
  p1: PACKET_1.content_version,
  p2: PACKET_2.content_version,
};

export function isM14PacketId(value: unknown): value is M14PacketId {
  return value === 'p1' || value === 'p2';
}

export function m14Packet(id: M14PacketId): M14Packet {
  return id === 'p1' ? PACKET_1 : PACKET_2;
}

/** Every decision in series order (`p1_d1` … `p2_d3`). */
export function m14Decisions(): M14Decision[] {
  return M14_PACKETS.flatMap((packet) => [...packet.decisions]);
}

export function m14Decision(id: string): M14Decision | undefined {
  return m14Decisions().find((candidate) => candidate.id === id);
}

export function isM14DecisionId(value: unknown): boolean {
  return typeof value === 'string' && m14Decision(value) !== undefined;
}

export function m14Source(
  packet: M14PacketId,
  sourceId: string,
): M14Source | undefined {
  return m14Packet(packet).sources.find((source) => source.id === sourceId);
}

export function m14Option(
  decisionId: string,
  optionId: string,
): M14Option | undefined {
  return m14Decision(decisionId)?.options.find(
    (option) => option.id === optionId,
  );
}

/** The key of a decision: the authored option (decision D-U17-1, item 1). */
export function m14KeyOptionId(decisionId: string): string | undefined {
  return m14Decision(decisionId)?.key_option_id;
}

/**
 * Every participant-facing string of the desk other than the packets
 * (preview r4 §3). Fixed in meaning; never shortened.
 */
export const M14_TEXT = {
  title: 'INCIDENT DESK — STORM PACKETS',
  orientation: [
    'Two packets from the storm are waiting. Each has six messages, three gauges and three decisions.',
    '• Open any message or gauge as often as you like. Opened items stay open until you close them.',
    '• Messages were accurate when they were sent. If a later message changes a fact or rule from an earlier one, go by the later message; everything else in the earlier message still holds.',
    '• Nothing happened that a packet does not report.',
    '• For each decision, choose an answer — you can change your choice — then RECORD ANSWER and confirm. Each decision takes one recorded answer; it cannot be changed.',
    '• If you cannot work out an answer, record CANNOT SOLVE.',
    '• Results for all six decisions are shown after the last answer.',
    '• You can leave and come back; everything stays as it is until the station record is closed.',
  ],
  start_packet_1: 'START PACKET 1',
  status:
    'Open sources as needed. Choose an answer, then RECORD ANSWER. One answer per decision — it cannot be changed. Results follow the sixth answer.',
  help_title: 'HELP — INCIDENT DESK',
  help_controls:
    'TAB / arrows move · ENTER or SPACE activates · 1–6 open or close messages, 7–9 gauges · A–D choose an answer · R RECORD ANSWER · N CANNOT SOLVE · H help · ESC closes a dialog, then the help, then leaves.',
  close_help: 'CLOSE HELP (ESC)',
  decision_heading: (index: number) => `DECISION ${index} OF 3`,
  decision_subtitle: (index: number) => `Decision ${index} of 3`,
  record_answer: 'RECORD ANSWER (R)',
  cannot_solve: 'CANNOT SOLVE (N)',
  help: 'HELP (H)',
  leave: 'LEAVE DESK',
  confirm_answer: (index: number) =>
    `Record this answer for decision ${index}? It cannot be changed afterwards.`,
  confirm_cannot_solve: (index: number) =>
    `Record CANNOT SOLVE for decision ${index}? It cannot be changed afterwards.`,
  confirm_answer_control: 'RECORD ANSWER (ENTER)',
  confirm_cannot_solve_control: 'RECORD (ENTER)',
  keep_working: 'KEEP WORKING (ESC)',
  choose_first: 'Choose an answer first.',
  acknowledgement: (index: number) => `Answer recorded for decision ${index}.`,
  next_decision: 'NEXT DECISION (ENTER)',
  next_packet: 'NEXT PACKET (ENTER)',
  show_results: 'SHOW RESULTS (ENTER)',
  recorded_count: (count: number) => `${count} of 6 recorded`,
  results_heading: 'All six answers are recorded.',
  your_answer: 'Your recorded answer:',
  station_answer: 'Station answer:',
  cannot_solve_answer: 'CANNOT SOLVE',
  results_next: 'NEXT (ENTER)',
  results_back: 'BACK (B)',
  finish: 'FINISH (F)',
  closed_at_review: 'Station record closed — the desk keeps its record.',
  held_back:
    'This desk was already used in this session. Its record is kept; nothing further is recorded here.',
  fault: 'The desk has a fault and is closed. Recorded answers are kept.',
  footer_orientation: 'ENTER or SPACE starts · H help · ESC leaves',
  footer_decision:
    'TAB/arrows · ENTER/SPACE · 1-9 sources · A-D answer · R record · N CANNOT SOLVE · H help · ESC leaves',
  footer_dialog: 'ENTER records · ESC keeps working',
  footer_acknowledgement: 'ENTER continues · 1-9 sources · H help · ESC leaves',
  footer_sixth_acknowledgement: 'ENTER shows the results · H help · ESC leaves',
  footer_results_first: 'ENTER next · F finish · H help · ESC leaves',
  footer_results_second: 'ENTER or B back · F finish · H help · ESC leaves',
  footer_record: 'ESC leaves',
  footer_help: 'ENTER or ESC closes the help',
} as const;

/**
 * Every participant-facing string of the desk, for the wording tests:
 * the packets (titles, readings lines, source headers and texts,
 * questions, options, results lines) and the fixed strings above.
 */
export function m14ParticipantStrings(): string[] {
  const strings: string[] = [];

  for (const packet of M14_PACKETS) {
    strings.push(packet.title, packet.readings_line);

    for (const source of packet.sources) {
      strings.push(source.header, source.text);
    }

    for (const entry of packet.decisions) {
      strings.push(entry.short_title, entry.question, entry.results_line);

      for (const option of entry.options) {
        strings.push(option.label);
      }
    }
  }

  for (const value of Object.values(M14_TEXT)) {
    if (typeof value === 'string') {
      strings.push(value);
    } else if (Array.isArray(value)) {
      strings.push(...value);
    } else if (typeof value === 'function') {
      strings.push(value(1), value(2), value(3), value(6));
    }
  }

  return strings;
}

/** The strings of the first-response phase (before the sixth answer). */
export function m14FirstResponsePhaseStrings(): string[] {
  const strings: string[] = [];

  for (const packet of M14_PACKETS) {
    strings.push(packet.title, packet.readings_line);

    for (const source of packet.sources) {
      strings.push(source.header, source.text);
    }

    for (const entry of packet.decisions) {
      strings.push(entry.question);

      for (const option of entry.options) {
        strings.push(option.label);
      }
    }
  }

  const T = M14_TEXT;

  strings.push(
    T.title,
    ...T.orientation,
    T.start_packet_1,
    T.status,
    T.help_title,
    T.help_controls,
    T.close_help,
    T.record_answer,
    T.cannot_solve,
    T.help,
    T.leave,
    T.confirm_answer_control,
    T.confirm_cannot_solve_control,
    T.keep_working,
    T.choose_first,
    T.next_decision,
    T.next_packet,
    T.show_results,
    T.closed_at_review,
    T.held_back,
    T.fault,
    T.footer_orientation,
    T.footer_decision,
    T.footer_dialog,
    T.footer_acknowledgement,
    T.footer_record,
    T.footer_help,
  );

  for (let index = 1; index <= 3; index += 1) {
    strings.push(
      T.decision_heading(index),
      T.confirm_answer(index),
      T.confirm_cannot_solve(index),
      T.acknowledgement(index),
    );
  }

  for (let count = 0; count <= 6; count += 1) {
    strings.push(T.recorded_count(count));
  }

  return strings;
}
