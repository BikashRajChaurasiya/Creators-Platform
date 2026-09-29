import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Translates Prisma's known request errors into meaningful HTTP responses.
 *
 * Without this, `PrismaClientKnownRequestError` is not an `HttpException`, so it
 * falls through to Nest's default handler and every database-level failure
 * becomes an opaque `500 Internal server error`. The most common case on this
 * codebase is `P2002`: `Payment.applicationId` is unique, so paying the same
 * accepted application twice is *guaranteed* to raise it, and the client needs to
 * know it is a conflict rather than a server fault.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const { status, message, fields } = this.describe(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Unexpected: keep the detail in the log rather than leaking it to clients.
      this.logger.error(`Unhandled Prisma error ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(fields ? { fields } : {}),
    });
  }

  private describe(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    fields?: string[];
  } {
    switch (exception.code) {
      case 'P2002': {
        const targets = (exception.meta as { target?: string[] | string } | undefined)?.target;
        const names = Array.isArray(targets) ? targets : typeof targets === 'string' ? [targets] : [];
        return {
          status: HttpStatus.CONFLICT,
          message: names.length
            ? `A record with this ${names.join(', ')} already exists.`
            : 'A record with these values already exists.',
          fields: names.length ? names : undefined,
        };
      }
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'A related record is missing, so this change cannot be applied.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record no longer exists.',
        };
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          message: 'The request conflicted with another change. Please retry.',
        };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }
  }
}
