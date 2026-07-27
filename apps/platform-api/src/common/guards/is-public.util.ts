import 'reflect-metadata';
import {
  HONEST_PIPELINE_CONTROLLER_KEY,
  HONEST_PIPELINE_HANDLER_KEY,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { PUBLIC_KEY } from '@/common/decorators';

export function isPublicHandler(c: Context): boolean {
  const controllerClass = c.get(HONEST_PIPELINE_CONTROLLER_KEY) as
    | (new (
        ...args: unknown[]
      ) => unknown)
    | undefined;
  const handlerName = c.get(HONEST_PIPELINE_HANDLER_KEY) as string | undefined;
  if (!controllerClass) return false;
  if (handlerName && Reflect.getMetadata(PUBLIC_KEY, controllerClass, handlerName)) return true;
  if (Reflect.getMetadata(PUBLIC_KEY, controllerClass)) return true;
  return false;
}
