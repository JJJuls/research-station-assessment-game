/**
 * Feature extractor barrel. Item extractor modules register themselves on
 * import; this barrel imports them so the export-time extraction and the
 * offline reproduction see the same rule set.
 */
import './m08';

export * from './extract';
export * from './types';
