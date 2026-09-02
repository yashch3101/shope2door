import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import {
  Request,
  Response,
} from 'express';

@Catch()
export class HttpExceptionFilter
  implements ExceptionFilter
{
  private readonly logger =
    new Logger(
      HttpExceptionFilter.name,
    );

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const ctx =
      host.switchToHttp();

    const response =
      ctx.getResponse<Response>();

    const request =
      ctx.getRequest<Request>();

    // =====================================================
    // DETERMINE HTTP STATUS
    // =====================================================

    const isHttpException =
      exception instanceof HttpException;

    const status =
      isHttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // =====================================================
    // CLIENT MESSAGE
    // =====================================================

    let message:
      | string
      | string[] =
      'Internal server error';

    if (isHttpException) {
      const exceptionResponse =
        exception.getResponse();

      if (
        typeof exceptionResponse ===
        'string'
      ) {
        message =
          exceptionResponse;
      } else if (
        typeof exceptionResponse ===
          'object' &&
        exceptionResponse !== null
      ) {
        const responseObject =
          exceptionResponse as {
            message?:
              | string
              | string[];
          };

        if (
          responseObject.message
        ) {
          message =
            responseObject.message;
        }
      }
    }

    // =====================================================
    // NEVER EXPOSE INTERNAL 5XX DETAILS
    // =====================================================

    if (status >= 500) {
      message =
        'Internal server error';
    }

    // =====================================================
    // LOG SERVER-SIDE ERRORS
    // =====================================================

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,

        exception instanceof Error
          ? exception.stack
          : String(exception),
      );
    }

    // =====================================================
    // LOG IMPORTANT CLIENT ERRORS
    // =====================================================

    if (
      status >= 400 &&
      status < 500
    ) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}`,
      );
    }

    // =====================================================
    // SAFE RESPONSE
    // =====================================================

    response.status(status).json({
      success: false,

      statusCode: status,

      message,

      timestamp:
        new Date().toISOString(),

      path: request.url,
    });
  }
}