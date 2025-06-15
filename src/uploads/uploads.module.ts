/* eslint-disable @typescript-eslint/require-await */
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get<string>('UPLOAD_DIR', './uploads'),
        limits: {
          fileSize: configService.get<number>('MAX_FILE_SIZE', 5 * 1024 * 1024), // 5MB
        },
        fileFilter: (req, file, cb) => {
          if (file.mimetype.startsWith('image/')) {
            cb(null, true);
          } else {
            cb(new Error('Only image files are allowed'), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
