import type { ControllerOptions } from '../interfaces';
import { MetadataRegistry } from '../registries';

export function Controller(route = '', options: ControllerOptions = {}): ClassDecorator {
  return (target: any) => {
    MetadataRegistry.setControllerPath(target, route);
    MetadataRegistry.setControllerOptions(target, options);
    MetadataRegistry.addService(target);
    if (options.tag) {
      Reflect.defineMetadata('api:controller:tag', options.tag, target);
    }
  };
}
