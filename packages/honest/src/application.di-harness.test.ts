import 'reflect-metadata';
import { afterEach, describe, expect, test } from 'vitest';
import { MetadataRegistry } from './registries';
import { createTestController } from './testing/fixtures/application-test-fixtures';
import { createServiceTestContainer } from './testing';

afterEach(() => {
  MetadataRegistry.clear();
});

describe('createServiceTestContainer', () => {
  test('DI error message tells you to add @Injectable() or @Service() when decorator is missing', () => {
    class InjectedStub {}
    class NotAService {
      constructor(public dep: InjectedStub) {}
    }

    const harness = createServiceTestContainer();
    expect(() => harness.get(NotAService)).toThrow(
      'not decorated with @Injectable() or @Service()',
    );
  });

  test('container.has() returns false for unresolved and true after resolve', () => {
    const TestController = createTestController();
    const harness = createServiceTestContainer();
    expect(harness.has(TestController)).toBe(false);

    harness.get(TestController);
    expect(harness.has(TestController)).toBe(true);
  });

  test('container.clear() removes all cached instances', () => {
    const TestController = createTestController();
    const harness = createServiceTestContainer();
    harness.get(TestController);
    expect(harness.has(TestController)).toBe(true);

    harness.clear();
    expect(harness.has(TestController)).toBe(false);
  });
});
