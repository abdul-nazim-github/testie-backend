import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegraService } from './services/telegra.service';
import { TelegraApiLog, TelegraApiLogSchema } from './schemas/telegra-api-log.schema';


@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: TelegraApiLog.name, schema: TelegraApiLogSchema },
    ]),
  ],
  providers: [TelegraService],
  exports: [TelegraService],
})
export class TelegraModule {}
