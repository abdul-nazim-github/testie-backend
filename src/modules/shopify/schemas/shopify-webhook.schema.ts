import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShopifyWebhookDocument = ShopifyWebhook & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'shopify_webhooks',
})
export class ShopifyWebhook {
  @Prop({ required: true, index: true })
  topic: string;

  @Prop({ required: true, index: true })
  shop_domain: string;

  @Prop({ required: true, unique: true })
  webhook_id: string;

  @Prop()
  api_version?: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ type: Object })
  headers?: Record<string, any>;
}

export const ShopifyWebhookSchema =
  SchemaFactory.createForClass(ShopifyWebhook);
