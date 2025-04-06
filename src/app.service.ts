/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  getHello() {
    return {
      message: 'Welcome to the Companion API',
      version: '1.0.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }

  async healthCheck() {
    let dbStatus = 'ok';
    let dbError = null;
    try {
      // Check database connection
      await this.prismaService.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'error';
      dbError = error.message;
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          error: dbError,
        },
      },
    };
  }

  getPublicConfig() {
    // Return only public configuration values
    return {
      apiVersion: '1.0.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      maxUploadSize: this.configService.get<number>('MAX_FILE_SIZE', 5242880),
    };
  }
}
