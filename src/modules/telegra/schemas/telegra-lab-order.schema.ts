import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TelegraLabOrderDocument = TelegraLabOrder & Document;

@Schema({ timestamps: true, collection: 'telegra_labOrders', strict: false })
export class TelegraLabOrder {
  @Prop({ required: true })
  orderId: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data: any;
}

export const TelegraLabOrderSchema = SchemaFactory.createForClass(TelegraLabOrder);
