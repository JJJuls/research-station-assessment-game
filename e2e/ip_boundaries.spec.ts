/**
 * Information Processing foundation — scientific boundaries (Unit 5).
 *
 * - proto_m13_* … proto_m18_* (and the tutorial family) are pairwise
 *   disjoint by construction;
 * - tutorial events are never item evidence;
 * - no canonical context, event schema entry or ScoringManager rule was
 *   added for any IP family;
 * - a missing opportunity stays missing (never zero/low);
 * - no later opportunity is gated by earlier performance.
 */

import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import {
  bootIpLab,
  clickTerminalButton,
  ipModules,
  ipValidity,
  terminalProbe,
  typeCommand,
  waitTerminalOpen,
  walkAndUseStation,
} from './ipHelpers';

const FAMILIES = [
  'proto_ip_tutorial',
  'proto_m13_lattice',
  'proto_m18_fault',
  'proto_m14_packet',
  'proto_m15_cipher',
  'proto_m16_protocol',
  'proto_m17_syntax',
];

test.describe('scientific boundaries (source)', () => {
  test('no canonical context, schema entry or scoring rule references an IP family', () => {
    for (const file of [
      'src/world/CanonicalEventContext.ts',
      'src/systems/ScoringManager.ts',
      'src/systems/EventLogger.ts',
      'src/systems/SessionState.ts',
      'src/systems/QualtricsBridge.ts',
      'docs/research/event-schema.md',
      'docs/research/scoring-plan.md',
    ]) {
      const source = readFileSync(file, 'utf8');

      for (const family of FAMILIES) {
        expect(source, `${file} mentions ${family}`).not.toContain(family);
      }

      expect(source).not.toMatch(/information_processing_lab|__ipModules/);
    }
  });

  test('every module logs exactly one family and never another module’s', () => {
    const modules: [string, string][] = [
      ['src/informationProcessing/tutorial.ts', 'proto_ip_tutorial'],
      ['src/informationProcessing/m13PipeNetwork.ts', 'proto_m13_lattice'],
      ['src/informationProcessing/m18FaultDiagnosis.ts', 'proto_m18_fault'],
      ['src/informationProcessing/m14PacketSaturation.ts', 'proto_m14_packet'],
      ['src/informationProcessing/m15LayeredCipher.ts', 'proto_m15_cipher'],
      ['src/informationProcessing/m16ProtocolUpdate.ts', 'proto_m16_protocol'],
      ['src/informationProcessing/m17SyntaxAcquisition.ts', 'proto_m17_syntax'],
    ];

    for (const [file, family] of modules) {
      const source = readFileSync(file, 'utf8');
      const logged = [...source.matchAll(/logIpEvent\('([a-z0-9_]+)'/g)].map(
        (m) => m[1],
      );
      const declared = [
        ...source.matchAll(/declareIpEvents\('([a-z0-9_]+)'/g),
      ].map((m) => m[1]);

      expect(new Set(logged), file).toEqual(new Set([family]));
      expect(declared, file).toEqual([family]);
    }
  });
});

test.describe('scientific boundaries (runtime)', () => {
  test('families are pairwise disjoint; missing stays missing; failure never gates the next opportunity', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_BOUNDARIES',
      ip_form: 'A',
    });

    // All seven families are declared at lab boot; pairwise disjoint.
    const probe = await ipModules(page);
    const families = probe.event_families;

    expect(Object.keys(families).sort()).toEqual([...FAMILIES].sort());

    const names = Object.values(families).flat();

    expect(new Set(names).size).toBe(names.length);

    for (const [family, types] of Object.entries(families)) {
      expect(
        types.every((type) => type.startsWith(`${family}_`)),
        family,
      ).toBe(true);
    }

    // Tutorial events carry no measure id and are never an M-family name.
    expect(
      families.proto_ip_tutorial.some((type) => /proto_m1[3-8]/.test(type)),
    ).toBe(false);

    // Stop M14 without any routing (exited) — then M15 still opens, and
    // M14's record is MISSING (participant_absent), never a low value.
    await walkAndUseStation(page, 'm14');
    await waitTerminalOpen(page, true);
    await typeCommand(page, 'STOP');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect((await terminalProbe(page)).closed).toBe(true);
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    const m14 = await ipValidity(page, 'proto_m14_packet_saturation');

    expect(m14.validity).toBe('missing');
    expect(m14.invalid_reason).toBe('participant_absent');

    await walkAndUseStation(page, 'm15');
    await waitTerminalOpen(page, true);
    expect((await terminalProbe(page)).task).toBe('m15');
    await clickTerminalButton(page, 'close');
    await waitTerminalOpen(page, false);

    // Never-opened opportunities stay pending/offered — no value invented.
    for (const id of [
      'proto_m16_protocol_update',
      'proto_m17_syntax_acquisition',
      'proto_m13_lattice_construction',
      'proto_m18_lattice_fault_diagnosis',
    ]) {
      const record = await ipValidity(page, id);

      expect(record.entered, id).toBe(false);
      expect(record.validity, id).toBe('pending');
    }

    // No item score anywhere in the probe surface.
    const surface = JSON.stringify((await ipModules(page)).modules);

    expect(surface).not.toMatch(/"score"|"item_score"|"scale_score"|"weight"/);
  });
});
