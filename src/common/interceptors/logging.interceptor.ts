import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const user = req.user ? `UserID:${req.user.id}` : 'unknown';
    const now = Date.now();

    // Log incoming request
    this.logger.log(`[Request] ${method} ${url} - ${user}`);

    return next.handle().pipe(
      tap((response) => {
        
        this.logger.log(
          `[Response] ${method} ${url} - ${user} - ${Date.now() - now}ms`,
        );
      }),
      catchError((err) => {
        
        this.logger.error(
          `[Error] ${method} ${url} - ${user} - ${Date.now() - now}ms - ${err.message}`,
          err.stack,
        );
        throw err; 
      }),
    );
  }
}
