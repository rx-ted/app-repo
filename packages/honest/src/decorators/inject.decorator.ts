import { MetadataRegistry } from '../registries';
import type { Constructor } from '../types';

/**
 * Marks a class as available for dependency injection.
 *
 * **Cross-platform requirement:**
 * - **Cloudflare Workers (esbuild):** REQUIRED — `design:paramtypes` is NOT emitted,
 *   so `@Injectable()` + `@Inject()` are the only way to wire constructor dependencies.
 * - **Node.js / Deno / Bun (tsx / tsc):** optional if `emitDecoratorMetadata` is
 *   enabled, because `design:paramtypes` is emitted automatically.
 *
 * **Recommendation:** always use `@Injectable()` together with `@Inject()` for
 * every class with constructor dependencies.  This guarantees zero-config DI
 * across all runtimes (Workers, Node, Deno, Bun) without relying on TypeScript
 * compiler metadata.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyService {
 *   doSomething() { return 'done'; }
 * }
 * ```
 */
export function Injectable(): ClassDecorator {
  return (target: any) => {
    MetadataRegistry.addService(target);
  };
}

/**
 * Explicitly declares a constructor parameter's injection token.
 *
 * Use on each constructor parameter whose type must be resolved by the DI
 * container.  When paired with `@Injectable()`, the container reads the
 * `di:inject:params` metadata stored by this decorator **before** falling
 * back to `design:paramtypes`.
 *
 * **Why this exists:**
 * Bundlers such as esbuild (used by Cloudflare Workers / wrangler) do **not**
 * emit `design:paramtypes`.  Without `@Inject()` the container cannot know
 * which types to instantiate for constructor parameters.
 *
 * **Recommendation:** always pair `@Inject()` with `@Injectable()` so your
 * code works on every runtime without relying on `emitDecoratorMetadata`.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyController {
 *   constructor(@Inject(MyService) private service: MyService) {}
 * }
 * ```
 */
export function Inject(token: Constructor): ParameterDecorator {
  return (target: object, _propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existing: (Constructor | undefined)[] =
      Reflect.getOwnMetadata('di:inject:params', target) || [];
    existing[parameterIndex] = token;
    Reflect.defineMetadata('di:inject:params', existing, target);
  };
}
