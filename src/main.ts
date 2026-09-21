import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors();

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Testie Health Backend')
    .setDescription(
      'API for receiving and persisting Shopify webhooks securely',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  Logger.log('🗄️ Database connected successfully', 'Bootstrap');
  Logger.log(`🚀 Application is running on port: ${port}`, 'Bootstrap');

  // Keep-alive ping to prevent Render free-tier auto-shutdown
  const backendUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  const pingInterval = 5 * 60 * 1000; // 5 minutes

  setInterval(() => {
    axios
      .get(`${backendUrl}/api/v1/health`)
      .then((res) => {
        Logger.log(
          `Keep-alive ping successful (Status: ${res.status})`,
          'KeepAlive',
        );
      })
      .catch((err) => {
        Logger.error('❌ Keep-alive ping failed', err.message, 'KeepAlive');
      });
  }, pingInterval);

  Logger.log(
    `⏰ Keep-alive ping scheduled every 10 minutes for ${backendUrl}/api/v1/health`,
    'Bootstrap',
  );
}
void bootstrap();
