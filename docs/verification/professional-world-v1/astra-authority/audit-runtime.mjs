// Documentation-only audit driver. Never imported by product code.
// Uses existing browser/runtime controls; all browser, Vite and image output is TEMP-only.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

const root = process.cwd();
const temporary = path.join(os.tmpdir(), 'astra-world-authority-references');
await mkdir(temporary, { recursive: true });
// Chromium writes native diagnostics in its inherited working directory on Windows.
// Keep even incidental output outside the worktree; Vite retains the explicit root.
process.chdir(temporary);
const mode = process.argv[2] ?? 'captures';
let server;
if (mode === 'design') {
  const designRoot = path.join(
    root,
    'docs/verification/professional-world-v1/astra-authority',
  );
  const http = createHttpServer(async (req, res) => {
    try {
      const name = path.basename(new URL(req.url, 'http://localhost').pathname);
      if (!/^[a-zA-Z0-9_.-]+\.(svg|html|md)$/.test(name))
        throw new Error('Unsupported path');
      const body = await readFile(path.join(designRoot, name));
      res.setHeader(
        'Content-Type',
        name.endsWith('.svg')
          ? 'image/svg+xml'
          : name.endsWith('.html')
            ? 'text/html'
            : 'text/plain',
      );
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  server = {
    listen: () =>
      new Promise((resolve) => http.listen(5186, '127.0.0.1', resolve)),
    close: () => new Promise((resolve) => http.close(resolve)),
  };
} else
  server = await createServer({
    configFile: false,
    plugins: [createHtmlPlugin()],
    root,
    envDir: temporary,
    cacheDir: path.join(temporary, 'vite-cache'),
    server: { host: '127.0.0.1', port: 5186, strictPort: true },
  });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--log-file=' + path.join(temporary, 'chromium-debug.log'),
  ],
});
const results = {
  entry: 'f6e051f',
  mode,
  observations: [],
  errors: [],
  externalRequestsBlocked: 0,
};
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  baseURL: 'http://127.0.0.1:5186',
});
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (
    ['127.0.0.1', 'localhost'].includes(url.hostname) ||
    ['data:', 'blob:'].includes(url.protocol)
  )
    return route.continue();
  results.externalRequestsBlocked += 1;
  return route.abort();
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on('pageerror', (error) => results.errors.push(String(error)));
async function capture(label) {
  await page.waitForTimeout(900);
  const viewport = page.viewportSize();
  const file = path.join(
    temporary,
    label + '-' + viewport.width + 'x' + viewport.height + '.png',
  );
  await page.screenshot({ path: file });
  const probes = await page.evaluate(() => ({
    player: window.__playerProbe ?? null,
    camera: window.__cameraProbe ?? null,
    mission: window.__missionCardProbe ?? null,
    route: window.__pilotProbe ?? null,
    prompt: window.__worldPromptProbe ?? null,
    cards: window.__promptCards ?? null,
    opening: window.__pilotOpeningProbe ?? null,
    inventory: window.__inventoryProbe ?? null,
  }));
  results.observations.push({ label, viewport, file, probes });
  process.stdout.write(
    JSON.stringify({
      captured: label,
      viewport,
      player: probes.player,
      prompt: probes.prompt,
    }) + '\n',
  );
}
try {
  const helpers =
    mode === 'design'
      ? null
      : await server.ssrLoadModule('/e2e/pilotHelpers.ts');
  const baseHelpers =
    mode === 'design' ? null : await server.ssrLoadModule('/e2e/helpers.ts');
  if (results.mode === 'captures') {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      for (const scene of [
        'dock',
        'station_concourse',
        'records_workshop',
        'diagnostics_laboratory',
        'exterior_recovery_yard',
        'utility_core_deck',
        'core_chamber',
      ]) {
        await helpers.bootPilotScene(
          page,
          'ASTRA_DIRECT_' + scene + viewport.width,
          scene,
        );
        await capture('current-' + scene);
      }
    }
    // Actual current build at each supported debug scale; not a new camera implementation.
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const scale of [1, 1.25, 1.5]) {
      await page.goto(
        '/?scene=station_concourse&world_scale=' +
          scale +
          '&game_session_id=ASTRA_SCALE_' +
          scale +
          '&participant_id=ASTRA_LOCAL',
      );
      await helpers.waitScene(page, 'station_concourse', 60000);
      await capture('current-scale-' + scale);
    }
  } else if (results.mode === 'design') {
    const base = '/docs/verification/professional-world-v1/astra-authority/';
    for (const file of [
      'world-topology',
      'route-and-restoration',
      'camera-comparison',
      'zone-dock',
      'zone-concourse',
      'zone-records',
      'zone-laboratory',
      'zone-yard',
      'zone-utility',
      'zone-core',
      'opening-storyboard',
      'interaction-states',
      'inventory-hud',
      'depth-layers',
      'composition-1280x720',
      'composition-1920x1080',
    ]) {
      await page.goto(base + file + '.svg');
      const size = await page.locator('svg').evaluate((svg) => ({
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
      }));
      await page.setViewportSize(size);
      const overflow = await page.locator('svg text').evaluateAll((texts) =>
        texts.flatMap((text) => {
          const box = text.getBoundingClientRect();
          const root = text.ownerSVGElement.getBoundingClientRect();
          return box.left < root.left - 1 ||
            box.right > root.right + 1 ||
            box.top < root.top - 1 ||
            box.bottom > root.bottom + 1
            ? [text.textContent]
            : [];
        }),
      );
      if (overflow.length)
        throw new Error(file + ': text outside board ' + overflow.join('; '));
      await capture('design-' + file);
    }
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(base + 'mockups.html');
      await page
        .getByRole('button', { name: 'Inventory and HUD', exact: true })
        .click();
      await capture('design-gallery');
      await page
        .getByRole('button', { name: 'Camera comparison', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      results.observations.push({
        label: 'gallery-keyboard',
        viewport,
        src: await page.locator('#board').getAttribute('src'),
      });
    }
  } else if (results.mode === 'route') {
    const journey = await server.ssrLoadModule('/e2e/journey.ts');
    const closure = await server.ssrLoadModule('/e2e/closureHelpers.ts');
    await helpers.bootPilot(page, 'ASTRA_ROUTE', { skipOpening: false });
    await capture('opening-early');
    await page.waitForTimeout(12000);
    await capture('opening-late');
    await helpers.waitScene(page, 'dock', 60000);
    await journey.completeDockTutorial(page, 1);
    await capture('route-dock');
    await helpers.dockToConcourse(page);
    await capture('route-concourse');
    await helpers.openPromptAt(page, helpers.PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await baseHelpers.selectPromptOption(page, 1);
    await baseHelpers.selectPromptOption(page, 1); // watch accepted, normal participant choice
    await baseHelpers.selectPromptOption(page, 2); // promise declined, normal participant choice
    await helpers.walkTo(page, 640, 576, { yFirst: true });
    await helpers.walkTo(page, 1200, 576);
    await capture('m09-actual-approach');
    await helpers.press(page, 'e');
    await capture('m09-after-read');
    results.m09Events = await page.evaluate(() =>
      JSON.parse(window.researchRuntime.exportEventsJSON()).filter(
        (event) =>
          event.event_type.startsWith('proto_m09_') ||
          event.event_type === 'pilot_station_opened',
      ),
    );
    await helpers.openPromptAt(page, helpers.PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await baseHelpers.selectPromptOption(page, 1);
    await helpers.concourseToWorkshop(page);
    await capture('route-records');
    await helpers.press(page, 'i');
    await capture('inventory');
    await helpers.press(page, 'Escape');
    await helpers.workshopSignOff(page);
    await helpers.workshopToConcourse(page);
    await helpers.concourseToLabBriefed(page);
    await capture('route-laboratory');
    await helpers.labToYardBriefed(page);
    await capture('route-yard');
    await helpers.yardReturnToConcourse(page);
    await capture('route-return-concourse');
    await helpers.press(page, 'm');
    await capture('route-map');
    await helpers.press(page, 'Escape');
    await helpers.returnShiftToDeckClosure(page);
    await helpers.concourseToDeck(page);
    await capture('route-utility');
    await closure.closeStationRecord(page);
    await closure.raiseAllFeeds(page, 'keyboard');
    await closure.enterCoreChamber(page);
    await capture('route-core');
    results.routeCompletedToCore = true;
    const returnHelpers = await server.ssrLoadModule('/e2e/returnHelpers.ts');
    await closure.openSyncReview(page);
    await capture('route-core-review');
    await returnHelpers.keyActivate(page, 'arm_sync');
    await closure.waitCoreState(page, 'confirmation_armed');
    await capture('route-core-confirmation');
    await returnHelpers.keyActivate(page, 'confirm_sync');
    await closure.waitCoreState(page, 'stable', 30000);
    await closure.waitCompletionNotice(page, true);
    await capture('route-completion-notice');
    results.routeCompletedToStableNotice = true;
    results.completionProbes = await page.evaluate(() => ({
      core: window.__coreChamberProbe,
      handoff: window.__completionHandoffProbe,
      closure: window.__closureProbe,
    }));
  } else {
    throw new Error('Expected captures, route or design');
  }
} catch (error) {
  results.auditFailure = String(error.stack ?? error);
  process.stderr.write(results.auditFailure + '\n');
  await capture('audit-failure').catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(
    path.join(temporary, 'runtime-' + results.mode + '.json'),
    JSON.stringify(results, null, 2),
  );
  await browser.close();
  await server.close();
}
