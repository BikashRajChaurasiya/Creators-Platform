import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Converts Zod validation errors thrown by request handlers into a clean 400 response.
 */
@Catch(ZodError)
export class ZodFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const issues = exception.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    response.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors: issues,
    });
  }
}