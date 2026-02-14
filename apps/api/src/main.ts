import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import basicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads directory
  const uploadDir = process.env.UPLOAD_DIR;

  if (!uploadDir) {
    console.error('❌ ERROR: UPLOAD_DIR environment variable is not set!');
    console.error('Please set UPLOAD_DIR in your .env file:');
    console.error('  Local: UPLOAD_DIR=/Users/sandman/projects/picamula/uploads');
    console.error('  Production: UPLOAD_DIR=/var/www/juntatribo/uploads');
    process.exit(1);
  }

  app.useStaticAssets(uploadDir, {
    prefix: '/uploads',
  });
  console.log(`📁 Serving static files from: ${uploadDir}`);

  // Enable CORS
  app.enableCors({
    origin: ['https://juntatribo.com', 'https://www.juntatribo.com', 'https://localhost:3003', 'http://localhost:3003'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger setup (limited to non-production)
  if (process.env.NODE_ENV !== 'production') {
    // Debug environment variables
    console.log('=== SWAGGER AUTH DEBUG ===');
    console.log('SWAGGER_USER:', process.env.SWAGGER_USER);
    console.log('SWAGGER_PASSWORD:', process.env.SWAGGER_PASSWORD ? '***' : 'undefined');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('==========================');

    const swaggerUser = process.env.SWAGGER_USER || 'admin';
    const swaggerPassword = process.env.SWAGGER_PASSWORD || 'password';

    app.use(
      ['/api/docs', '/api/docs-json'],
      basicAuth({
        challenge: true,
        users: { [swaggerUser]: swaggerPassword },
      }),
    );

    const options = new DocumentBuilder()
      .setTitle('JuntaTribo API')
      .setDescription('Multi-user travel app API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in the controllers!
      )
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 8001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
    console.log(`🔐 Use credentials: ${process.env.SWAGGER_USER || 'admin'} / ${process.env.SWAGGER_PASSWORD || 'password'}`);
  }
}

bootstrap();
