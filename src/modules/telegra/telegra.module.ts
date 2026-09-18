import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegraService } from './services/telegra.service';
import { TelegraApiLog, TelegraApiLogSchema } from './schemas/telegra-api-log.schema';
import { TelegraLabOrder, TelegraLabOrderSchema } from './schemas/telegra-lab-order.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: TelegraApiLog.name, schema: TelegraApiLogSchema },
      { name: TelegraLabOrder.name, schema: TelegraLabOrderSchema },
    ]),
  ],
  providers: [TelegraService],
  exports: [TelegraService],
})
export class TelegraModule {}
