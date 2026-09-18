import {
  Controller,
  Post,
  Headers,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { ShopifyWebhookService } from '../services/shopify-webhook.service';
import { ShopifyHmacGuard } from '../guards/shopify-hmac.guard';

@ApiTags('Shopify')
@Controller('shopify')
export class ShopifyWebhookController {
  constructor(private readonly shopifyWebhookService: ShopifyWebhookService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ShopifyHmacGuard)
  @ApiOperation({
    summary: 'Receive Shopify Webhook',
    description:
      'Accepts a Shopify webhook payload, verifies HMAC signature, and persists the data. Duplicate webhooks are handled idempotently.',
  })
  @ApiHeader({
    name: 'x-shopify-hmac-sha256',
    required: true,
    description: 'HMAC-SHA256 signature',
  })
  @ApiHeader({
    name: 'x-shopify-topic',
    required: true,
    description: 'Webhook topic (e.g., orders/create)',
  })
  @ApiHeader({
    name: 'x-shopify-shop-domain',
    required: true,
    description: 'Originating shop domain',
  })
  @ApiHeader({
    name: 'x-shopify-webhook-id',
    required: true,
    description: 'Unique webhook ID for idempotency',
  })
  @ApiHeader({
    name: 'x-shopify-api-version',
    required: false,
    description: 'Shopify API version',
  })
  @ApiBody({ description: 'Raw Shopify webhook JSON payload', type: Object })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required headers (e.g., X-Shopify-Webhook-Id).',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing HMAC signature.',
  })
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.shopifyWebhookService.processWebhook(headers, payload);
  }
}
