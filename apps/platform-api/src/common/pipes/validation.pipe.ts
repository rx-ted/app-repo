import type { ArgumentMetadata, IPipe } from '@rx-ted/packages-honest';
import type { ZodSchema } from 'zod';

export class ValidationPipe implements IPipe {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    return this.schema.parse(value);
  }
}
