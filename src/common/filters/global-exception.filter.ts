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
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(`[${request.method}] ${request.url} - 500:`, exception);
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${status}`);
    }

    // Do not leak stack traces or internal errors to clients
    response.status(status).json({
      success: false,
      message:
        typeof message === 'string'
          ? message
          : (message as Record<string, unknown>).message ||
            'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
