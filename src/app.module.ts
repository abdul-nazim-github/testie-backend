import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { TelegraModule } from './modules/telegra/telegra.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    ShopifyModule,
    TelegraModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
