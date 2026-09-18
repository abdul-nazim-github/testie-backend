import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopifyWebhookService } from './services/shopify-webhook.service';
import { ShopifyWebhookController } from './controllers/shopify-webhook.controller';
import {
  ShopifyWebhook,
  ShopifyWebhookSchema,
} from './schemas/shopify-webhook.schema';

import { TelegraModule } from '../telegra/telegra.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopifyWebhook.name, schema: ShopifyWebhookSchema },
    ]),
    TelegraModule,
  ],
  controllers: [ShopifyWebhookController],
  providers: [ShopifyWebhookService],
  exports: [ShopifyWebhookService],
})
export class ShopifyModule {}
