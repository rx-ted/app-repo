import { Service, ComponentManager } from '@rx-ted/packages-honest';
import type { CounterDriver } from './types';
import { COUNTER_GLOBAL_KEY } from './constants';

@Service()
class CounterService {
  constructor() {
    return ComponentManager.getPlugin<CounterDriver>(COUNTER_GLOBAL_KEY);
  }
}

interface CounterService extends CounterDriver {}

export { CounterService, COUNTER_GLOBAL_KEY };
