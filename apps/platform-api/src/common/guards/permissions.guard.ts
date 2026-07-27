import type { IGuard } from '@rx-ted/packages-honest';
import {
  HONEST_PIPELINE_CONTROLLER_KEY,
  HONEST_PIPELINE_HANDLER_KEY,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { isPublicHandler } from '@/common/guards/is-public.util';

export class PermissionsGuard implements IGuard {
  canActivate(c: Context): boolean {
    const controllerClass = c.get(HONEST_PIPELINE_CONTROLLER_KEY) as
      | (new (
          ...args: any[]
        ) => any)
      | undefined;
    if (!controllerClass) return true;

    if (isPublicHandler(c)) return true;

    const handlerName = c.get(HONEST_PIPELINE_HANDLER_KEY) as string | undefined;
    const requiredPerms =
      (handlerName && Reflect.getMetadata(PERMISSIONS_KEY, controllerClass, handlerName)) ??
      (Reflect.getMetadata(PERMISSIONS_KEY, controllerClass) as string[] | undefined);
    if (!requiredPerms?.length) return true;

    const user = c.get('user') as { permissions?: string[] } | undefined;
    if (!user?.permissions?.length) {
      throw new HTTPException(403, { message: 'Forbidden: insufficient permissions' });
    }

    const hasPerm = requiredPerms.some((perm: string) => user.permissions!.includes(perm));
    if (!hasPerm) {
      throw new HTTPException(403, { message: 'Forbidden: insufficient permissions' });
    }

    return true;
  }
}
