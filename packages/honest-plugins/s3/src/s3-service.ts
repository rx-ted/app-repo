import { Service, ComponentManager } from '@rx-ted/packages-honest';
import type { FileDriver } from './types';
import { S3_GLOBAL_KEY } from './s3.plugin';

@Service()
class S3Service {
  constructor() {
    return ComponentManager.getPlugin<FileDriver>(S3_GLOBAL_KEY);
  }
}

interface S3Service extends FileDriver {}

export { S3Service };
