import { LOGGER_SYMBOL, createLogger, type ILogger } from '@rx-ted/packages-core';
import { ComponentManager } from '../managers';

export function resolvePluginLogger(name: string): ILogger {
  if (ComponentManager.hasPlugin(LOGGER_SYMBOL)) {
    return ComponentManager.getPlugin<ILogger>(LOGGER_SYMBOL).child({ module: name });
  }
  return createLogger({ name });
}
