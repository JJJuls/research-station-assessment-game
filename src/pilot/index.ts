/**
 * Professional pilot route package (M01–M26 cohesive route).
 *
 * Unit 1: coverage schedule + runtime registry. Later units add the route
 * stage machine, the pilot zone base scene, the station map and the Final
 * Core completion flow. Nothing here is a canonical event name, a score or a
 * trait; every identifier is provisional.
 */
export * from './coverageSchedule';
export * from './pilotCoverage';
export * from './pilotRoute';
