import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, map, of, switchMap } from 'rxjs';

/**
 * Wraps handler responses into a consistent { data, meta?, message? } envelope.
 * If a handler already returns an object with a `data` key, it is passed through.
 * Controllers may return `{ data: <Promise> }` without awaiting; resolve those
 * before serialization so they do not render as `{}`.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      switchMap((body) => {
        if (
          body &&
          typeof body === 'object' &&
          'data' in body &&
          body.data &&
          (body.data instanceof Promise || typeof (body.data as { then?: unknown }).then === 'function')
        ) {
          return from(body.data as Promise<unknown>).pipe(map((data) => ({ ...body, data })));
        }
        return of(body);
      }),
      map((body) => {
        if (body && typeof body === 'object' && 'data' in body) return body;
        return { data: body ?? null };
      }),
    );
  }
}