/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
// import { PrismaService } from './prisma/prisma.service';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  // const prismaService = app.get(PrismaService);

  // Enable Prisma shutdown hooks
  // prismaService.enableShutdownHooks(app);

  // Set global application settings
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  // app.enableCors({
  //   origin: configService.get<string>('CORS_ORIGIN', '*'),
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true,
  // });

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://companion-ten.vercel.app/',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
    ],
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      // Set CORS headers for static files
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      });
    },
  });

  // Security
  app.use(helmet());

  // Serve static files (uploaded images)
  const uploadDir = configService.get<string>('UPLOAD_DIR', './uploads');
  const uploadPath = join(process.cwd(), uploadDir);
  app.useStaticAssets(uploadPath, {
    prefix: '/uploads/',
  });

  console.log('Serving static files from:', uploadPath);

  // Swagger API documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Companion API')
      .setDescription('The Companion API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start the server
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
void bootstrap();
