import { MetadataRegistry } from '../registries';
import type { Constructor } from '../types';

export function Redirect(url: string, statusCode: number = 302) {
  return (target: object, propertyKey: string | symbol): void => {
    MetadataRegistry.setRedirect(target.constructor as Constructor, propertyKey, url, statusCode);
  };
}
