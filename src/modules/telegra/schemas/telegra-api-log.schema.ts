import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TelegraApiLogDocument = TelegraApiLog & Document;

@Schema({ timestamps: true, collection: 'telegra_api_log' })
export class TelegraApiLog {
  @Prop({ required: true })
  api_name: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  method: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  payload?: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  response?: any;

  @Prop({ required: true, enum: ['success', 'failed'] })
  status: string;

  @Prop()
  response_status_code?: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  error?: any;

  @Prop()
  error_message?: string;

  @Prop()
  duration_ms?: number;
}

export const TelegraApiLogSchema = SchemaFactory.createForClass(TelegraApiLog);
