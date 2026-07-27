import 'reflect-metadata';
import { afterEach, describe, expect, test } from 'vitest';
import { Application } from './application';
import { MetadataRegistry } from './registries';
import {
  createBrokenControllerModule,
  createDiagnosticsAController,
  createDiagnosticsBController,
  createEmptyModule,
  createTestController,
} from './testing/fixtures/application-test-fixtures';
import {
  createControllerTestApplication,
  createTestApplication,
  createMockLogger,
} from './testing';

afterEach(() => {
  MetadataRegistry.clear();
});

describe('Application diagnostics', () => {
  test('startup diagnostics includes route count in debug mode', async () => {
    const { logger, logs } = createMockLogger();

    await createControllerTestApplication({
      controller: createTestController(),
      appOptions: {
        debug: true,
        logger,
      },
    });

    expect(
      logs.some(
        (log) =>
          log.context?.category === 'startup' &&
          log.level === 'info' &&
          log.message.includes('Application registered') &&
          Number((log.context as Record<string, unknown>)?.routeCount) >= 1,
      ),
    ).toBe(true);
  });

  test('strict.requireRoutes emits startup diagnostic error before throwing', async () => {
    const { logger, logs } = createMockLogger();

    await expect(
      Application.create(createEmptyModule(), {
        strict: { requireRoutes: true },
        logger,
      }),
    ).rejects.toThrow('Strict mode: no routes were registered');

    expect(
      logs.some(
        (log) =>
          log.context?.category === 'startup' &&
          log.level === 'error' &&
          log.message.includes('Strict mode failed'),
      ),
    ).toBe(true);
  });

  test('startup diagnostics includes completion event with timing details', async () => {
    const { logger, logs } = createMockLogger();

    await createControllerTestApplication({
      controller: createTestController(),
      appOptions: {
        debug: true,
        logger,
      },
    });

    const startupCompleted = logs.find(
      (log) =>
        log.context?.category === 'startup' &&
        log.level === 'info' &&
        log.message === 'Application startup completed',
    );

    expect(startupCompleted).toBeDefined();
    expect(
      Number((startupCompleted?.context as Record<string, unknown>)?.startupDurationMs),
    ).toBeGreaterThanOrEqual(0);
    expect(
      Number((startupCompleted?.context as Record<string, unknown>)?.routeCount),
    ).toBeGreaterThanOrEqual(1);
  });

  test('debug.startup enables startup diagnostics independently from debug.routes', async () => {
    const { logger, logs } = createMockLogger();

    await createControllerTestApplication({
      controller: createTestController(),
      appOptions: {
        debug: { startup: true, routes: false },
        logger,
      },
    });

    expect(logs.some((log) => log.context?.category === 'startup')).toBe(true);
    expect(logs.some((log) => log.context?.category === 'routes')).toBe(false);
  });

  test('startup diagnostics emits generic startup failure event in debug mode', async () => {
    const { logger, logs } = createMockLogger();

    await expect(
      Application.create(createBrokenControllerModule(), { debug: true, logger }),
    ).rejects.toThrow('is not decorated with @Controller()');

    expect(
      logs.some(
        (log) =>
          log.context?.category === 'startup' &&
          log.level === 'error' &&
          log.message === 'Application startup failed' &&
          String((log.context as Record<string, unknown>)?.errorMessage || '').includes(
            'is not decorated with @Controller()',
          ),
      ),
    ).toBe(true);
  });

  test('startupGuide emits actionable hints for strict no-routes startup failure', async () => {
    const { logger, logs } = createMockLogger();

    await expect(
      Application.create(createEmptyModule(), {
        strict: { requireRoutes: true },
        startupGuide: true,
        logger,
      }),
    ).rejects.toThrow('Strict mode: no routes were registered');

    const guideLog = logs.find(
      (log) => log.context?.category === 'startup' && log.message === 'Startup guide',
    );
    expect(guideLog).toBeDefined();
    expect(Array.isArray((guideLog?.context as Record<string, unknown>)?.hints)).toBe(true);
    expect(
      ((guideLog?.context as Record<string, unknown>)?.hints as string[]).some((hint) =>
        hint.includes('strict.requireRoutes'),
      ),
    ).toBe(true);
  });

  test('startupGuide emits actionable hints for missing @Controller() startup failure', async () => {
    const { logger, logs } = createMockLogger();

    await expect(
      Application.create(createBrokenControllerModule(), {
        startupGuide: { verbose: true },
        logger,
      }),
    ).rejects.toThrow('is not decorated with @Controller()');

    const guideLog = logs.find(
      (log) => log.context?.category === 'startup' && log.message === 'Startup guide',
    );
    expect(guideLog).toBeDefined();
    expect(
      ((guideLog?.context as Record<string, unknown>)?.hints as string[]).some((hint) =>
        hint.includes('@Controller()'),
      ),
    ).toBe(true);

    expect(
      logs.some(
        (log) =>
          log.context?.category === 'startup' &&
          log.level === 'warn' &&
          log.message === 'Startup guide (verbose)',
      ),
    ).toBe(true);
  });

  test('debug.routes emits per-controller route registration timing diagnostics', async () => {
    const { logger, logs } = createMockLogger();

    await createTestApplication({
      controllers: [createDiagnosticsAController(), createDiagnosticsBController()],
      appOptions: {
        debug: { routes: true, startup: false },
        logger,
      },
    });

    const controllerLogs = logs.filter(
      (log) =>
        log.context?.category === 'routes' &&
        log.level === 'info' &&
        log.message === 'Registered controller routes',
    );

    expect(controllerLogs.length).toBeGreaterThanOrEqual(2);
    expect(
      controllerLogs.every((log) => {
        const details = (log.context || {}) as Record<string, unknown>;
        return (
          typeof details.controller === 'string' &&
          Number(details.routeCountAdded) >= 1 &&
          Number(details.registrationDurationMs) >= 0
        );
      }),
    ).toBe(true);
  });
});
