import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EasyTrip Bus Ticket API')
    .setDescription(
      'REST API for trips, bookings, SSLCommerz payments, refunds, and admin operations. ' +
        'Use POST /auth/login, then Authorize with the returned accessToken (Bearer).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from login or register response',
      },
      'JWT',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  const corsOrigins = [
    'http://localhost:5173',
    'https://easytrip-beta.vercel.app',
    ...(frontendUrl ? [frontendUrl] : []),
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
void bootstrap();