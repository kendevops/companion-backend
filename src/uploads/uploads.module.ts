/* eslint-disable @typescript-eslint/require-await */
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uploadDir = configService.get<string>('UPLOAD_DIR', './uploads');
        const uploadPath = join(process.cwd(), uploadDir);

        // Ensure upload directory exists
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
          console.log('Created upload directory:', uploadPath);
        }

        return {
          storage: diskStorage({
            destination: (req, file, cb) => {
              cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
              // Generate unique filename
              const uniqueSuffix = uuidv4();
              const fileExtension = extname(file.originalname);
              const filename = `${uniqueSuffix}${fileExtension}`;
              cb(null, filename);
            },
          }),
          fileFilter: (req, file, cb) => {
            // Accept only images
            if (file.mimetype.startsWith('image/')) {
              cb(null, true);
            } else {
              cb(new Error('Only image files are allowed'), false);
            }
          },
          limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
          },
        };
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
