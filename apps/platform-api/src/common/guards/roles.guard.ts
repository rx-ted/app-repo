import type { IGuard } from '@rx-ted/packages-honest';
import {
  HONEST_PIPELINE_CONTROLLER_KEY,
  HONEST_PIPELINE_HANDLER_KEY,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { isPublicHandler } from '@/common/guards/is-public.util';

export class RolesGuard implements IGuard {
  canActivate(c: Context): boolean {
    const controllerClass = c.get(HONEST_PIPELINE_CONTROLLER_KEY) as
      | (new (
          ...args: any[]
        ) => any)
      | undefined;
    if (!controllerClass) return true;

    if (isPublicHandler(c)) return true;

    const handlerName = c.get(HONEST_PIPELINE_HANDLER_KEY) as string | undefined;
    const requiredRoles =
      (handlerName && Reflect.getMetadata(ROLES_KEY, controllerClass, handlerName)) ??
      (Reflect.getMetadata(ROLES_KEY, controllerClass) as string[] | undefined);
    if (!requiredRoles?.length) return true;

    const user = c.get('user') as { roles?: string[] } | undefined;
    if (!user?.roles?.length) {
      throw new HTTPException(403, { message: 'Forbidden: insufficient roles' });
    }

    const hasRole = requiredRoles.some((role: string) =>
      user.roles!.some((r) => r.toLowerCase() === role.toLowerCase()),
    );
    if (!hasRole) {
      throw new HTTPException(403, { message: 'Forbidden: insufficient roles' });
    }

    return true;
  }
}
