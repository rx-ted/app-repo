import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import { Injectable, Inject } from '../decorators';
import type { IServiceRegistry } from '../interfaces';
import { Container } from './container';
import { createMockLogger } from '../testing';

describe('Container', () => {
  test('resolve() returns same instance for class with no deps (singleton)', () => {
    class NoDeps {}
    const container = new Container();
    const a = container.resolve(NoDeps);
    const b = container.resolve(NoDeps);
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(NoDeps);
  });

  test('resolve() injects dependency when constructor has one param', () => {
    class Dep {}
    class WithDep {
      constructor(public dep: Dep) {}
    }
    Reflect.defineMetadata('design:paramtypes', [Dep], WithDep);

    const container = new Container();
    const instance = container.resolve(WithDep);
    expect(instance).toBeInstanceOf(WithDep);
    expect(instance.dep).toBeInstanceOf(Dep);
    expect(instance.dep).toBe(container.resolve(Dep));
  });

  test('resolve() throws when circular dependency is detected', () => {
    class CircularA {
      constructor(_b: CircularB) {}
    }
    class CircularB {
      constructor(_a: CircularA) {}
    }
    Reflect.defineMetadata('design:paramtypes', [CircularB], CircularA);
    Reflect.defineMetadata('design:paramtypes', [CircularA], CircularB);

    const container = new Container();
    expect(() => container.resolve(CircularA)).toThrow('Circular dependency detected');
  });

  test('register() allows pre-created instance; resolve() returns it', () => {
    class Injectable {}
    const container = new Container();
    const instance = new Injectable();
    container.register(Injectable, instance);
    expect(container.resolve(Injectable)).toBe(instance);
  });

  test('resolve() tells you to add @Injectable() when decorator is missing', () => {
    class NeedsDep {
      constructor(_dep: unknown) {}
    }

    const container = new Container();
    expect(() => container.resolve(NeedsDep)).toThrow('not decorated with @Injectable()');
  });

  test('resolve() throws for decorated class with missing reflect-metadata', () => {
    @Injectable()
    class DecoratedButNoMeta {
      constructor(_dep: unknown) {}
    }
    // Clear the paramtypes that TypeScript might have emitted
    Reflect.deleteMetadata('design:paramtypes', DecoratedButNoMeta);

    const { logger } = createMockLogger();
    const container = new Container(undefined, logger, true);
    expect(() => container.resolve(DecoratedButNoMeta)).toThrow('Use @Inject()');
  });

  test('resolve() throws clear error for non-class dependency metadata', () => {
    class BadDepController {
      constructor(_dep: unknown) {}
    }
    Reflect.defineMetadata('design:paramtypes', [Object], BadDepController);

    const container = new Container();
    expect(() => container.resolve(BadDepController)).toThrow(
      'Cannot resolve dependency at index 0',
    );
  });

  test('resolve() throws when injected service registry reports service but metadata is missing', () => {
    class NeedsDep {
      constructor(_dep: unknown) {}
    }

    const serviceRegistry: IServiceRegistry = {
      isService() {
        return true;
      },
    };

    const { logger } = createMockLogger();
    const container = new Container(serviceRegistry, logger, true);
    expect(() => container.resolve(NeedsDep)).toThrow('Use @Inject()');
  });

  test('resolve() emits DI diagnostics when debug mode is enabled', () => {
    const { logger, logs } = createMockLogger();

    class Dependency {}
    class Consumer {
      constructor(public readonly dependency: Dependency) {}
    }
    Reflect.defineMetadata('design:paramtypes', [Dependency], Consumer);

    const container = new Container(undefined, logger, true);
    container.resolve(Consumer);
    container.resolve(Consumer);

    expect(
      logs.some(
        (log) => log.context?.category === 'di' && log.message.includes('Resolving Consumer'),
      ),
    ).toBe(true);
    expect(
      logs.some(
        (log) =>
          log.context?.category === 'di' && log.message.includes('Resolved Consumer from DI cache'),
      ),
    ).toBe(true);
  });

  // ── @Injectable() / @Inject() resolution ──

  test('resolve() uses @Inject() metadata over design:paramtypes when both present', () => {
    class RealDep {}
    class FakeDep {}

    @Injectable()
    class Target {
      constructor(@Inject(RealDep) public dep: RealDep) {}
    }
    // Simulate wrong emitted metadata to prove @Inject() wins
    Reflect.defineMetadata('design:paramtypes', [FakeDep], Target);

    const container = new Container();
    const instance = container.resolve(Target);
    expect(instance.dep).toBeInstanceOf(RealDep);
  });

  test('resolve() creates instance with @Inject() deps when design:paramtypes is absent', () => {
    class Dep {}

    @Injectable()
    class Target {
      constructor(@Inject(Dep) public dep: Dep) {}
    }
    // Explicitly delete any auto-emitted metadata (simulates esbuild bundling)
    Reflect.deleteMetadata('design:paramtypes', Target);

    const container = new Container();
    const instance = container.resolve(Target);
    expect(instance).toBeInstanceOf(Target);
    expect(instance.dep).toBeInstanceOf(Dep);
  });

  test('resolve() with @Injectable() + no @Inject() throws', () => {
    @Injectable()
    class Target {
      constructor(_dep: unknown) {}
    }
    Reflect.deleteMetadata('design:paramtypes', Target);

    const { logger } = createMockLogger();
    const container = new Container(undefined, logger, true);
    expect(() => container.resolve(Target)).toThrow('Use @Inject()');
  });

  test('resolve() caches @Injectable() instance like any other singleton', () => {
    class Dep {}

    @Injectable()
    class Target {
      constructor(@Inject(Dep) public dep: Dep) {}
    }

    const container = new Container();
    const a = container.resolve(Target);
    const b = container.resolve(Target);
    expect(a).toBe(b);
  });
});
