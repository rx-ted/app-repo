import 'reflect-metadata';

export const PERMISSIONS_KEY = 'permissions';

export function Permissions(...permissions: string[]) {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target.constructor, key!);
    } else {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    }
  };
}
