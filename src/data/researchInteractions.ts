export interface ResearchInteraction {
  object_id: string;
  label: string;
  episode: string;
  event_type: string;
  score_tags: string[];
  /**
   * Canonical V3 §3.2 `room_id` for this station, per the naming table in
   * docs/research/event-schema.md §2. Unset for interactions that have no
   * canonical room mapping (e.g. `sign`, a leftover template interaction).
   */
  room_id?: string;
  /**
   * Canonical V3 §3.2 `task_id`, set only where event-schema.md §2/§6
   * documents an explicit canonical task_id string for this station.
   */
  task_id?: string;
}

export const researchInteractions = {
  archiveAccessTerminal: {
    object_id: 'archive_access_terminal',
    label: 'Archive Access Terminal',
    episode: 'mps_archive_access',
    event_type: 'archive_attempt',
    score_tags: ['difficulty_persistence'],
    room_id: 'archive_room',
    task_id: 'archive_code_entry',
  },
  archiveLogShelves: {
    object_id: 'archive_log_shelves',
    label: 'Archive Log Shelves',
    episode: 'mps_archive_access',
    // Canonical V3 §4 Room 1 mini-game mechanic: "optional log comparison
    // step". Same room/task as the terminal; distinct object.
    event_type: 'archive_log_compared',
    score_tags: ['difficulty_persistence'],
    room_id: 'archive_room',
    task_id: 'archive_code_entry',
  },
  dockArrivalTutorial: {
    object_id: 'dock_arrival_tutorial',
    label: 'Dock AI - Arrival Tutorial',
    episode: 'control_dock_arrival',
    event_type: 'dock_tutorial_opened',
    score_tags: ['tutorial', 'control', 'movement', 'instruction_following'],
    room_id: 'dock_arrival',
  },
  engineerCalibrationBench: {
    object_id: 'engineer_calibration_bench',
    label: 'Calibration Bench',
    // Pilot ethical-decision scenario station (src/scenarios framework).
    // scenario_* events are pilot-development telemetry only: no canonical
    // task_id, no Q-mapping, no construct scoring (scenarioTypes.ts note).
    episode: 'pilot_scenario_calibration_anomaly',
    event_type: 'scenario_entered',
    score_tags: [],
    room_id: 'engineer_hub',
  },
  engineerReportBack: {
    object_id: 'engineer_report_back',
    label: 'Engineer Kai - Status Report',
    episode: 'bfi_responsibility_report',
    event_type: 'engineer_report_opened',
    score_tags: ['responsibility', 'dependability', 'organization'],
    room_id: 'engineer_hub',
    task_id: 'engineer_report_submission',
  },
  finalCoreIntegration: {
    object_id: 'final_core_integration',
    label: 'Core AI - Final Integration',
    episode: 'final_core_integration',
    event_type: 'final_core_opened',
    score_tags: [
      'final_integration',
      'responsibility',
      'organization',
      'productiveness',
      'perseverance',
    ],
    room_id: 'final_core_room',
  },
  hazardUncertaintyWarning: {
    object_id: 'hazard_uncertainty_warning',
    label: 'Hazard / Uncertainty Warning',
    episode: 'mps_hazard_uncertainty',
    event_type: 'hazard_warning_seen',
    score_tags: ['uncertainty_persistence'],
    room_id: 'hazard_control_room',
    task_id: 'hazard_route_decision',
  },
  hubPriorityAllocation: {
    object_id: 'hub_priority_allocation_console',
    label: 'Priority Allocation Console',
    // Pilot ethical-decision scenario station (src/scenarios framework);
    // same governance note as engineerCalibrationBench. Lives in the Hub
    // control area — scenario_* telemetry stays control/pilot data.
    episode: 'pilot_scenario_priority_allocation',
    event_type: 'scenario_entered',
    score_tags: [],
    room_id: 'station_hub',
  },
  inventoryPrepChecklist: {
    object_id: 'inventory_prep_checklist',
    label: 'Quartermaster - Inventory Prep',
    episode: 'bfi_organization_prep',
    event_type: 'inventory_prep_opened',
    score_tags: ['organization', 'preparation', 'prudence'],
    room_id: 'inventory_prep_room',
  },
  interruptionCorridor: {
    object_id: 'interruption_corridor',
    label: 'Comms AI - Interruption',
    episode: 'grit_consistency_interruption',
    event_type: 'interruption_opened',
    score_tags: ['consistency', 'return_to_task', 'focus', 'task_switching'],
    room_id: 'interruption_corridor',
  },
  optionalSideRepair: {
    object_id: 'optional_side_repair',
    label: 'Maintenance Bot - Side Repair',
    episode: 'bfi_productiveness_side_repair',
    event_type: 'side_repair_opened',
    score_tags: [
      'productiveness',
      'diligence',
      'perseverance',
      'optional_effort',
    ],
    room_id: 'optional_side_repair_bay',
  },
  stationHub: {
    object_id: 'station_hub_navigation',
    label: 'Station Hub',
    episode: 'control_station_hub',
    event_type: 'station_hub_entered',
    score_tags: ['control', 'navigation'],
    // Control/usability navigation area, not a V3 assessment room — see
    // event-schema.md §2 "station_hub" (additive). Never Q-mapped.
    room_id: 'station_hub',
  },
  sign: {
    object_id: 'sign',
    label: 'Welcome sign',
    episode: 'template_intro',
    event_type: 'interaction',
    score_tags: [],
  },
  repairManualStation: {
    object_id: 'repair_manual_station',
    label: 'Repair Manual Station',
    episode: 'mps_systems_repair',
    // Canonical V3 §4 Room 2 system: "repair manual station", distinct from
    // the repair panel's legacy manual option (repair_manual_used). Same
    // room/task as the panel; distinct object (archiveLogShelves precedent).
    event_type: 'repair_manual_opened',
    score_tags: ['difficulty_persistence'],
    room_id: 'systems_repair_room',
    task_id: 'repair_sequence_selection',
  },
  systemsRepairFailure: {
    object_id: 'systems_repair_failure',
    label: 'Systems Repair Failure',
    episode: 'mps_systems_repair',
    event_type: 'repair_attempt',
    score_tags: ['difficulty_persistence'],
    room_id: 'systems_repair_room',
    task_id: 'repair_sequence_selection',
  },
} satisfies Record<string, ResearchInteraction>;
