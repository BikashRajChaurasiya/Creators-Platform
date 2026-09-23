import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodEffects, ZodSchema } from 'zod';

/**
 * Validates a request part (body/query/params) against a Zod schema.
 * Returns the parsed (and coerced) value.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T> | ZodEffects<ZodSchema<T>>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    if (!value) return undefined as unknown as T;
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  }
}