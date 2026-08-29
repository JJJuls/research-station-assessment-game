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
  archiveReconciliationDesk: {
    object_id: 'archive_reconciliation_desk',
    label: 'Records Reconciliation Desk',
    // Pilot ethical-decision scenario station (src/scenarios framework);
    // same governance note as engineerCalibrationBench: scenario_* events
    // are pilot-development telemetry only — no canonical task_id, no
    // Q-mapping, no construct scoring (scenarioTypes.ts note). Additive
    // beside the room's canonical archive task, which is untouched.
    episode: 'pilot_scenario_incident_reconciliation',
    event_type: 'scenario_entered',
    score_tags: [],
    room_id: 'archive_room',
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
  // FABLE-NEXT-02 per-item preparation stations (contract §R4 target
  // minigame). Additive beside the quartermaster console; the `event_type`
  // field documents each station's representative emitted event only —
  // RoomScene prompt options log their own explicit event names, and
  // per-item placement events override `object_id` with the registry
  // `item_id` (task-file payload rule).
  inventoryBinConsumables: {
    object_id: 'inventory_bin_consumables',
    label: 'Consumables Bin',
    episode: 'bfi_organization_prep',
    event_type: 'inventory_item_sorted_correct',
    score_tags: ['organization', 'preparation'],
    room_id: 'inventory_prep_room',
  },
  inventoryBinElectronics: {
    object_id: 'inventory_bin_electronics',
    label: 'Electronics Shelf',
    episode: 'bfi_organization_prep',
    event_type: 'inventory_item_sorted_correct',
    score_tags: ['organization', 'preparation'],
    room_id: 'inventory_prep_room',
  },
  inventoryBinHandTools: {
    object_id: 'inventory_bin_hand_tools',
    label: 'Hand Tools Rack',
    episode: 'bfi_organization_prep',
    event_type: 'inventory_item_sorted_correct',
    score_tags: ['organization', 'preparation'],
    room_id: 'inventory_prep_room',
  },
  inventoryKitCrate: {
    object_id: 'inventory_kit_crate',
    label: 'Field Kit Crate',
    episode: 'bfi_organization_prep',
    event_type: 'correct_tool_selected',
    score_tags: ['organization', 'preparation'],
    room_id: 'inventory_prep_room',
  },
  inventoryPrepBench: {
    object_id: 'inventory_prep_bench',
    label: 'Prep Bench',
    episode: 'bfi_organization_prep',
    // The bench itself emits NO station-level event (collect/put-back are
    // deliberately unlogged; placement is the measured act at the
    // destination stations). Inert documentation value only.
    event_type: 'inventory_prep_opened',
    score_tags: ['organization', 'preparation'],
    room_id: 'inventory_prep_room',
  },
  inventoryPrepChecklist: {
    object_id: 'inventory_prep_checklist',
    label: 'Quartermaster - Inventory Prep',
    episode: 'bfi_organization_prep',
    event_type: 'inventory_prep_opened',
    score_tags: ['organization', 'preparation', 'prudence'],
    room_id: 'inventory_prep_room',
  },
  inventorySealLog: {
    object_id: 'inventory_seal_log_terminal',
    label: 'Supply Airlock Seal Log',
    // Pilot ethical-decision scenario station (src/scenarios framework);
    // same governance note as engineerCalibrationBench. Additive beside
    // the quartermaster prep console, whose canonical task is untouched.
    episode: 'pilot_scenario_protocol_breach',
    event_type: 'scenario_entered',
    score_tags: [],
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
  // FABLE-NEXT-05: the genuinely pending original objective's own station
  // (relay check-in, available while the accepted relay-supervision duty
  // is active). Distinct object in the same room (sideRepairPartsShelf
  // precedent) — the observed return act and the original's completion
  // are physical interactions here, never dialogue assertions.
  interruptionRelayCheckpoint: {
    object_id: 'relay_checkpoint',
    label: 'Relay Checkpoint',
    episode: 'grit_consistency_interruption',
    event_type: 'return_to_unfinished_task',
    score_tags: ['consistency', 'return_to_task', 'follow_through'],
    room_id: 'interruption_corridor',
  },
  // FABLE-NEXT-05: the competing task's station — the beacon's offer
  // actually runs here (1-2 interactions). switched_task is observed at
  // the first real interaction, not at the beacon dialogue.
  interruptionAuxJunction: {
    object_id: 'aux_antenna_junction',
    label: 'Antenna Junction',
    episode: 'grit_consistency_interruption',
    event_type: 'switched_task',
    score_tags: ['consistency', 'task_switching'],
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
  sideRepairPartsShelf: {
    object_id: 'side_repair_parts_shelf',
    label: 'Parts Shelf',
    episode: 'bfi_productiveness_side_repair',
    // FABLE-NEXT-03 step substrate: the fetch-component step of the
    // accepted multi-step stabiliser repair (V3 §4 Room 6 "parts
    // shelves"). Same room as the Utility Bot; distinct object
    // (archiveLogShelves precedent).
    event_type: 'side_repair_step_completed',
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
  // ——— Overnight playable-prototype route stations (Unit 2) ———
  // proto_* interactions are INTERNAL/PROVISIONAL runtime identifiers for
  // the embodied gameplay route. Their events are raw prototype telemetry
  // logged via logScenarioEvent (scenario_* precedent): no canonical
  // task_id, no Q-mapping, no construct scoring, and none of these names
  // is an approved tier-3 event-schema entry. `proto_field_site` is a
  // provisional area id, not a canonical event-schema §2 room_id.
  hubQuartermasterVale: {
    object_id: 'proto_quartermaster_vale',
    label: 'Quartermaster Vale',
    episode: 'proto_field_route',
    event_type: 'proto_requisition_opened',
    score_tags: [],
    room_id: 'station_hub',
  },
  hubFieldLocker: {
    object_id: 'proto_field_equipment_locker',
    label: 'Field Equipment Locker',
    episode: 'proto_field_route',
    event_type: 'proto_item_collected',
    score_tags: [],
    room_id: 'station_hub',
  },
  fieldKaiSupervisor: {
    object_id: 'proto_field_kai',
    label: 'Engineer Kai',
    episode: 'proto_field_route',
    event_type: 'proto_field_briefing_opened',
    score_tags: [],
    room_id: 'proto_field_site',
  },
  fieldScanNode: {
    object_id: 'proto_field_scan_node',
    label: 'Survey Marker',
    episode: 'proto_field_route',
    event_type: 'proto_scan_performed',
    score_tags: [],
    room_id: 'proto_field_site',
  },
  fieldFeedHousing: {
    object_id: 'proto_field_feed_housing',
    label: 'Antenna Feed Housing',
    episode: 'proto_field_route',
    event_type: 'proto_install_step_completed',
    score_tags: [],
    room_id: 'proto_field_site',
  },
  // ——— Overnight-prototype measurement modules (Unit 3) ———
  // Same governance as the proto route stations above: internal/
  // provisional identifiers, raw prototype telemetry via logScenarioEvent
  // only, no canonical task_id, no Q-mapping, no scoring. The measurement
  // DESIGNS follow the adopted NEXT-10 rulings (SA-2/3/4/5/6/12/13);
  // canonical event names and scoring remain open research-owner
  // decisions.
  utilityBotDiagnostic: {
    object_id: 'proto_utility_bot_diagnostic',
    label: 'Utility Bot',
    episode: 'proto_q27_utility_stop',
    event_type: 'proto_q27_opened',
    score_tags: [],
    room_id: 'proto_utility_bay',
  },
  // ——— Action-assessment rebuild (Unit 2): coolant red line ———
  // Same governance as every proto_* block above: internal/provisional
  // identifiers, raw telemetry via logScenarioEvent only, no canonical
  // task_id, no Q-mapping, no scoring. proto_m23_* / proto_m26_* are
  // item-local provisional M-battery families (M<->Q crosswalk is an
  // open research-owner decision).
  coolantYardArea: {
    object_id: 'proto_coolant_yard_area',
    label: 'Coolant Yard',
    episode: 'proto_coolant_line',
    event_type: 'proto_yard_entered',
    score_tags: [],
    room_id: 'proto_coolant_yard',
  },
  coolantSupplyCrate: {
    object_id: 'proto_yard_supply_crate',
    label: 'Yard Supply Crate',
    episode: 'proto_coolant_line',
    event_type: 'proto_supply_taken',
    score_tags: [],
    room_id: 'proto_coolant_yard',
  },
  coolantFrozenHousing: {
    object_id: 'proto_m23_frozen_housing',
    label: 'Frozen Coupling Housing',
    episode: 'proto_m23_frozen_coupling',
    event_type: 'proto_m23_engaged',
    score_tags: [],
    room_id: 'proto_coolant_yard',
  },
  coolantReclamationPost: {
    object_id: 'proto_m26_reclamation_post',
    label: 'Reclamation Post',
    episode: 'proto_m26_reclaimed_sector',
    event_type: 'proto_m26_certificate_shown',
    score_tags: [],
    room_id: 'proto_coolant_yard',
  },
  pumpPressureConsole: {
    object_id: 'proto_pump_pressure_console',
    label: 'Pressure Console',
    episode: 'proto_coolant_line',
    event_type: 'proto_work_order_read',
    score_tags: [],
    room_id: 'proto_pump_house',
  },
  pumpManifoldTrench: {
    object_id: 'proto_m13_manifold_trench',
    label: 'Manifold Trench',
    episode: 'proto_m13_manifold_puzzle',
    event_type: 'proto_m13_piece_placed',
    score_tags: [],
    room_id: 'proto_pump_house',
  },
  pumpDiagnosticBoard: {
    object_id: 'proto_m18_diagnostic_board',
    label: 'Diagnostic Board',
    episode: 'proto_m18_pressure_diagnosis',
    event_type: 'proto_m18_pressure_fault_presented',
    score_tags: [],
    room_id: 'proto_pump_house',
  },
  pumpReliefValve: {
    object_id: 'proto_m22_relief_valve',
    label: 'Relief Valve',
    episode: 'proto_m22_seal_setback',
    event_type: 'proto_m22_setback_shown',
    score_tags: [],
    room_id: 'proto_pump_house',
  },
  coolantRecyclerRig: {
    object_id: 'proto_m24_recycler_rig',
    label: 'Recycler Catchment',
    episode: 'proto_m24_recycler_catchment',
    event_type: 'proto_m24_pull',
    score_tags: [],
    room_id: 'proto_coolant_yard',
  },
  pumpInterlockConsole: {
    object_id: 'proto_m25_interlock_console',
    label: 'Pump Interlock Console',
    episode: 'proto_m25_pump_interlock',
    event_type: 'proto_m25_prime_cycle',
    score_tags: [],
    room_id: 'proto_pump_house',
  },
  // ——— Field-actions foundation: developer proving-ground stations ———
  // Same governance as every proto_* block above: internal/provisional
  // identifiers, raw telemetry via logScenarioEvent only, no canonical
  // task_id, no Q-mapping, no scoring. `proto_field_actions_lab` is a
  // provisional developer-area id, never a canonical room_id. The three
  // provisional measurement adapters under src/fieldActions/opportunities
  // log their own disjoint families directly (m02Filing precedent).
  fieldLabArea: {
    object_id: 'proto_field_lab_area',
    label: 'Field Actions Lab',
    episode: 'proto_field_actions_lab',
    event_type: 'proto_field_lab_entered',
    score_tags: [],
    room_id: 'proto_field_actions_lab',
  },
  fieldLabSupplyCrate: {
    object_id: 'proto_field_lab_supply_crate',
    label: 'Supply Crate',
    episode: 'proto_field_actions_lab',
    event_type: 'proto_field_lab_supply_taken',
    score_tags: [],
    room_id: 'proto_field_actions_lab',
  },
  fieldLabRangeConsole: {
    object_id: 'proto_field_lab_range_console',
    label: 'Range Control Console',
    episode: 'proto_field_actions_lab',
    event_type: 'proto_field_lab_console_exercise_opened',
    score_tags: [],
    room_id: 'proto_field_actions_lab',
  },
  fieldLabMaintenanceBench: {
    object_id: 'proto_field_lab_maintenance_bench',
    label: 'Maintenance Bench',
    episode: 'proto_field_actions_lab',
    event_type: 'proto_field_lab_bench_used',
    score_tags: [],
    room_id: 'proto_field_actions_lab',
  },
  fieldLabRecoveryRig: {
    object_id: 'proto_field_lab_recovery_rig',
    label: 'Recovery Rig Readout',
    episode: 'proto_field_actions_lab',
    event_type: 'proto_field_lab_rig_status',
    score_tags: [],
    room_id: 'proto_field_actions_lab',
  },
  fieldLabVerificationPost: {
    object_id: 'proto_field_lab_verification_post',
    label: 'Verification Post',
    episode: 'proto_field_actions_lab',
    event_type: 'proto_field_lab_certificate_viewed',
    score_tags: [],
    room_id: 'proto_field_actions_lab',
  },
  // ——— Physical-mechanics session (Unit 7): post-assessment free play ———
  // NOT a measurement opportunity: locked until the assessment route is
  // complete (or an explicit DEV free-play flag), no Q tags, secondary
  // gameplay telemetry only (seed + pull history).
  fieldIceBore: {
    object_id: 'proto_field_ice_bore',
    label: 'Ice Bore Winch',
    episode: 'proto_post_ice_salvage',
    event_type: 'proto_salvage_opened',
    score_tags: [],
    room_id: 'proto_field_site',
  },
  // ——— Physical-mechanics session (Unit 4): persistence-deepening proto
  // stations. Same governance: provisional identifiers, raw telemetry via
  // logScenarioEvent only, no canonical mapping, no scoring. The intake
  // rig is the Q23 separately bounded retry-quality CANDIDATE (own
  // instance/state — the contested repair-stream split stays open and
  // untouched); the bay console hosts the SA-2 candidate switch-to-
  // useful-action act for the Q27 window.
  repairIntakeRig: {
    object_id: 'proto_repair_intake_rig',
    label: 'Auxiliary Intake Rig',
    episode: 'proto_q23_retry_quality',
    event_type: 'proto_q23_rig_opened',
    score_tags: [],
    room_id: 'systems_repair_room',
  },
  repairGaugeCard: {
    object_id: 'proto_repair_gauge_card',
    label: 'Gauge Card',
    episode: 'proto_q23_retry_quality',
    event_type: 'proto_q23_gauge_viewed',
    score_tags: [],
    room_id: 'systems_repair_room',
  },
  utilityBayConsole: {
    object_id: 'proto_utility_bay_console',
    label: 'Bay Console',
    episode: 'proto_q27_utility_stop',
    event_type: 'proto_q27_switched_to_useful',
    score_tags: [],
    room_id: 'proto_utility_bay',
  },
  // ——— Physical-mechanics session (Unit 3): Ridge Annex artifact survey ———
  // Same governance as every proto area above: internal/provisional
  // identifiers, raw prototype telemetry via logScenarioEvent only, no
  // canonical task_id, no Q-mapping, no scoring. The module is the
  // CANDIDATE exploratory Q16 prototype (own instance/state per the
  // ruling's shared-stream remedy); canonical events and scoring remain
  // open research-owner decisions.
  artifactSurveyNoor: {
    object_id: 'proto_artifact_survey_noor',
    label: 'Surveyor Noor',
    episode: 'proto_q16_artifact_survey',
    event_type: 'proto_q16_noor_opened',
    score_tags: [],
    room_id: 'proto_artifact_field',
  },
  artifactSurveyNotebook: {
    object_id: 'proto_artifact_survey_notebook',
    label: 'Field Notebook',
    episode: 'proto_q16_artifact_survey',
    event_type: 'proto_q16_brief_read',
    score_tags: [],
    room_id: 'proto_artifact_field',
  },
  artifactSurveySite: {
    object_id: 'proto_artifact_survey_site',
    label: 'Survey Stake',
    episode: 'proto_q16_artifact_survey',
    event_type: 'proto_q16_site_scanned',
    score_tags: [],
    room_id: 'proto_artifact_field',
  },
  artifactSurveyCase: {
    object_id: 'proto_artifact_survey_case',
    label: 'Specimen Case',
    episode: 'proto_q16_artifact_survey',
    event_type: 'proto_q16_artifact_stored',
    score_tags: [],
    room_id: 'proto_artifact_field',
  },
  annexPlanningTerminal: {
    object_id: 'proto_annex_planning_terminal',
    label: 'Planning Terminal',
    episode: 'proto_q29q31_goal_horizon',
    event_type: 'proto_horizon_opened',
    score_tags: [],
    room_id: 'proto_ops_annex',
  },
  annexPortfolioBoard: {
    object_id: 'proto_annex_portfolio_board',
    label: 'Project Portfolio Board',
    episode: 'proto_q32_portfolio',
    event_type: 'proto_q32_board_opened',
    score_tags: [],
    room_id: 'proto_ops_annex',
  },
  annexClosureDesk: {
    object_id: 'proto_annex_closure_desk',
    label: 'Contract Closure Desk',
    episode: 'proto_q33_closure_queue',
    event_type: 'proto_q33_queue_opened',
    score_tags: [],
    room_id: 'proto_ops_annex',
  },
  hubCalibrationCabinet: {
    object_id: 'proto_hub_calibration_cabinet',
    label: 'Calibration Cabinet',
    episode: 'proto_q03_retrieval',
    event_type: 'proto_q03_slot_opened',
    score_tags: [],
    room_id: 'station_hub',
  },
  hubWorkOrderBoard: {
    object_id: 'proto_hub_work_order_board',
    label: 'Work Order Board',
    episode: 'proto_q30_granularity',
    event_type: 'proto_q30_structure_chosen',
    score_tags: [],
    room_id: 'station_hub',
  },
  engineerPlanningSlate: {
    object_id: 'proto_engineer_planning_slate',
    label: 'Kai — Planning Slate',
    episode: 'proto_q29q31_goal_horizon',
    event_type: 'proto_horizon_opened',
    score_tags: [],
    room_id: 'engineer_hub',
  },
  fieldTelemetryCache: {
    object_id: 'proto_field_telemetry_cache',
    label: 'Telemetry Cache Console',
    episode: 'proto_q30_granularity',
    event_type: 'proto_q30_structure_chosen',
    score_tags: [],
    room_id: 'proto_field_site',
  },
  interruptionCheckinScheduler: {
    object_id: 'proto_corridor_checkin_scheduler',
    label: 'Relay Schedule Panel',
    episode: 'proto_corridor_degating',
    event_type: 'proto_corridor_checkin_scheduled',
    score_tags: [],
    room_id: 'interruption_corridor',
  },
  finalCoreBaseline: {
    object_id: 'proto_final_core_baseline',
    label: 'Core Baseline Buffer',
    episode: 'proto_final_core_baseline',
    event_type: 'proto_final_core_baseline_presented',
    score_tags: [],
    room_id: 'final_core_room',
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
  // ——— Professional pilot route (Unit 2+): unmapped route telemetry ———
  // Same governance as every proto_* / scenario_* block above: internal
  // provisional identifiers logged via logScenarioEvent only — no canonical
  // room_id/task_id, no Q-mapping, no scoring, no study item. `pilot_*`
  // events describe navigation, guidance and NPC beats; the measurement
  // windows the route hosts log their own disjoint proto_* families.
  pilotRoute: {
    object_id: 'pilot_route_guidance',
    label: 'Route guidance',
    episode: 'pilot_route',
    event_type: 'pilot_zone_entered',
    score_tags: [],
  },
  pilotDoor: {
    object_id: 'pilot_zone_door',
    label: 'Zone door',
    episode: 'pilot_route',
    event_type: 'pilot_door_used',
    score_tags: [],
  },
  pilotOpening: {
    object_id: 'pilot_opening',
    label: 'Arrival opening',
    episode: 'pilot_route',
    event_type: 'pilot_opening_shown',
    score_tags: [],
  },
  pilotVale: {
    object_id: 'pilot_npc_vale',
    label: 'Vale',
    episode: 'pilot_route',
    event_type: 'pilot_npc_beat',
    score_tags: [],
  },
  pilotKai: {
    object_id: 'pilot_npc_kai',
    label: 'Kai',
    episode: 'pilot_route',
    event_type: 'pilot_npc_beat',
    score_tags: [],
  },
  pilotNoor: {
    object_id: 'pilot_npc_noor',
    label: 'Noor',
    episode: 'pilot_route',
    event_type: 'pilot_npc_beat',
    score_tags: [],
  },
  pilotStation: {
    object_id: 'pilot_station',
    label: 'Station',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotRigReadout: {
    object_id: 'pilot_rig_readout',
    label: 'Recovery Rig Readout',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotVerificationPost: {
    object_id: 'pilot_verification_post',
    label: 'Verification Post',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  // Exterior Recovery episode sites (pilot v2 Unit 4): route telemetry
  // only — the item windows they host log their own proto_* families.
  pilotCoupling: {
    object_id: 'pilot_frozen_coupling',
    label: 'Frozen Coolant Coupling',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotMast: {
    object_id: 'pilot_mast_04',
    label: 'Mast 04',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotPlotStake: {
    object_id: 'pilot_excavation_stake',
    label: 'Excavation Field Stake',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotUplinkA: {
    object_id: 'pilot_uplink_post_a',
    label: 'Field Uplink Post A',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotUplinkB: {
    object_id: 'pilot_uplink_post_b',
    label: 'Field Uplink Post B',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotSortingBench: {
    object_id: 'pilot_sorting_bench',
    label: 'Sorting Bench',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotLinePanel: {
    object_id: 'pilot_line_status_panel',
    label: 'Line Status Panel',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotSealLog: {
    object_id: 'pilot_seal_log',
    label: 'Sample Seal Log',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  // Return, Revision & Handover stations (pilot v2 Unit 5): route
  // telemetry only — the item windows they host log their own families.
  pilotFeedConsole: {
    object_id: 'pilot_feed_console',
    label: 'Station Feed Console',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotRelayBench: {
    object_id: 'pilot_relay_bench',
    label: 'Relay Bench',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotReportDesk: {
    object_id: 'pilot_report_desk',
    label: 'Shift Report Desk',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotHandoverDesk: {
    object_id: 'pilot_handover_desk',
    label: 'Outbound Handover Desk',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotSignalWorkstation: {
    object_id: 'pilot_signal_workstation',
    label: 'Signal Analysis Workstation',
    episode: 'pilot_route',
    event_type: 'pilot_station_opened',
    score_tags: [],
  },
  pilotWorkOrderBoard: {
    object_id: 'pilot_work_order_board',
    label: 'Work Order Board',
    episode: 'pilot_route',
    event_type: 'pilot_npc_beat',
    score_tags: [],
  },
  pilotCoreConsole: {
    object_id: 'pilot_core_console',
    label: 'Core Synchronisation Console',
    episode: 'pilot_route',
    event_type: 'pilot_core_console_opened',
    score_tags: [],
  },
} satisfies Record<string, ResearchInteraction>;
