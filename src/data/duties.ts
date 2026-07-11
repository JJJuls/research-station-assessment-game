/**
 * Duty identifiers used in SessionState's accepted_duties/skipped_duties/
 * active_objectives lists (V3 §3.1). Vocabulary is defined by the room
 * beat that introduces each duty, per SessionState's documented
 * open-vocabulary rule.
 */

/**
 * Relay supervision duty offered by Engineer Kai (V3 §4 Room 3, Q10).
 * The Final Core beat reads this id for the follow-through check.
 */
export const RELAY_SUPERVISION_DUTY_ID = 'relay_supervision';
