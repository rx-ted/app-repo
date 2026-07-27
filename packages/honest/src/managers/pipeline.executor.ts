import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { NOOP_LOGGER } from '@rx-ted/packages-core';
import type { ILogger } from '@rx-ted/packages-core';
import { HONEST_PIPELINE_CONTROLLER_KEY, HONEST_PIPELINE_HANDLER_KEY } from '../constants';
import type { ParameterMetadata } from '../interfaces';
import type { IPipe } from '../interfaces';
import { MetadataRegistry } from '../registries';
import type { ComponentManager } from './component.manager';
import type { HandlerInvoker } from './handler.invoker';
import type { ParameterResolver } from './parameter.resolver';
import type { Constructor } from '../types';

export interface PipelineExecutionInput {
  controllerClass: Constructor;
  handlerName: string | symbol;
  handler: (...args: unknown[]) => Promise<unknown> | unknown;
  handlerParams: ReadonlyArray<ParameterMetadata>;
  handlerPipes: ReadonlyArray<IPipe>;
  contextIndex?: number;
  context: Context;
}

/**
 * Executes guard, parameter-resolution, and handler invocation stages.
 */
export class PipelineExecutor {
  constructor(
    private readonly componentManager: ComponentManager,
    private readonly parameterResolver: ParameterResolver,
    private readonly handlerInvoker: HandlerInvoker,
    private readonly logger: ILogger = NOOP_LOGGER,
    private readonly debugPipeline = false,
  ) {}

  async execute(input: PipelineExecutionInput): Promise<unknown> {
    const {
      controllerClass,
      handlerName,
      handler,
      handlerParams,
      handlerPipes,
      contextIndex,
      context,
    } = input;

    context.set(HONEST_PIPELINE_CONTROLLER_KEY, controllerClass);
    context.set(HONEST_PIPELINE_HANDLER_KEY, String(handlerName));

    const guards = this.componentManager.getHandlerGuards(controllerClass, handlerName);

    for (const guard of guards) {
      const canActivate = await guard.canActivate(context);
      if (!canActivate) {
        if (this.debugPipeline) {
          this.logger.warn(
            {
              category: 'pipeline',
              guard: guard.constructor?.name || 'UnknownGuard',
            },
            `Guard rejected request at ${controllerClass.name}.${String(handlerName)}`,
          );
        }
        throw new HTTPException(403, {
          message: `Forbidden by ${guard.constructor?.name || 'UnknownGuard'} at ${controllerClass.name}.${String(handlerName)}`,
        });
      }
    }

    const args = await this.parameterResolver.resolveArguments({
      controllerName: controllerClass.name,
      handlerName,
      handlerArity: handler.length,
      handlerParams,
      handlerPipes,
      context,
    });

    if (this.debugPipeline) {
      this.logger.debug(
        {
          category: 'pipeline',
          guardCount: guards.length,
          parameterCount: handlerParams.length,
          pipeCount: handlerPipes.length,
        },
        `Resolved handler arguments for ${controllerClass.name}.${String(handlerName)}`,
      );
    }

    const result = await this.handlerInvoker.invoke({
      handler,
      args,
      context,
      contextIndex,
    });

    const redirect = MetadataRegistry.getRedirect(controllerClass, handlerName);
    if (redirect) {
      return context.redirect(
        redirect.url as Parameters<Context['redirect']>[0],
        redirect.statusCode as Parameters<Context['redirect']>[1],
      );
    }

    return result;
  }
}
