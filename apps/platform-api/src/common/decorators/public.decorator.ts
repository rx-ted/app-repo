import 'reflect-metadata';

export const PUBLIC_KEY = 'public';

export function Public() {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(PUBLIC_KEY, true, target.constructor, key!);
    } else {
      Reflect.defineMetadata(PUBLIC_KEY, true, target);
    }
  };
}
