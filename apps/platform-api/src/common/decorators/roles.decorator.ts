import 'reflect-metadata';

export const ROLES_KEY = 'roles';

export function Roles(...roles: string[]) {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, target.constructor, key!);
    } else {
      Reflect.defineMetadata(ROLES_KEY, roles, target);
    }
  };
}
