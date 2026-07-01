export interface ResearchInteraction {
  object_id: string;
  label: string;
  episode: string;
  event_type: string;
  score_tags: string[];
}

export const researchInteractions = {
  archiveAccessTerminal: {
    object_id: 'archive_access_terminal',
    label: 'Archive Access Terminal',
    episode: 'mps_archive_access',
    event_type: 'archive_attempt',
    score_tags: ['difficulty_persistence'],
  },
  engineerReportBack: {
    object_id: 'engineer_report_back',
    label: 'Engineer Kai - Status Report',
    episode: 'bfi_responsibility_report',
    event_type: 'engineer_report_opened',
    score_tags: ['responsibility', 'dependability', 'organization'],
  },
  hazardUncertaintyWarning: {
    object_id: 'hazard_uncertainty_warning',
    label: 'Hazard / Uncertainty Warning',
    episode: 'mps_hazard_uncertainty',
    event_type: 'hazard_warning_seen',
    score_tags: ['uncertainty_persistence'],
  },
  sign: {
    object_id: 'sign',
    label: 'Welcome sign',
    episode: 'template_intro',
    event_type: 'interaction',
    score_tags: [],
  },
  systemsRepairFailure: {
    object_id: 'systems_repair_failure',
    label: 'Systems Repair Failure',
    episode: 'mps_systems_repair',
    event_type: 'repair_attempt',
    score_tags: ['difficulty_persistence'],
  },
} satisfies Record<string, ResearchInteraction>;
