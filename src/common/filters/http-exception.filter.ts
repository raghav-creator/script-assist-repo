import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status code
    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      // Handle string or object response
      if (typeof res === 'string') {
        message = res;
        error = res;
      } else if (typeof res === 'object') {
        message = (res as any).message || 'Unexpected error';
        error = (res as any).error || exception.message;
      } else {
        message = exception.message;
        error = exception.message;
      }
    } else {
      // Unhandled exceptions default to 500
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = (exception as any)?.message || 'Unknown error';
    }

    // Log errors (sensitive stack info is only logged, not exposed to clients)
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${error}`,
        (exception as any)?.stack,
      );
    } else {
      this.logger.warn(`HTTP ${status} Warning: ${error}`);
    }


    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
