import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class ShopifyHmacGuard implements CanActivate {
  private readonly logger = new Logger(ShopifyHmacGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as
      string | undefined;
    const secret = this.configService.get<string>('app.shopify.webhookSecret');

    if (!hmacHeader || !secret) {
      this.logger.warn(
        'Missing HMAC header or webhook secret is not configured',
      );
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) {
      this.logger.error(
        'req.rawBody is missing. Ensure NestJS rawBody option is enabled in main.ts.',
      );
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const generatedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const generatedHashBuffer = Buffer.from(generatedHash, 'utf8');
    const hmacHeaderBuffer = Buffer.from(hmacHeader, 'utf8');

    if (
      generatedHashBuffer.length !== hmacHeaderBuffer.length ||
      !crypto.timingSafeEqual(generatedHashBuffer, hmacHeaderBuffer)
    ) {
      this.logger.warn('HMAC verification failed');
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    return true;
  }
}
