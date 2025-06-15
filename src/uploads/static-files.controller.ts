/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import * as path from 'path';
import * as fs from 'fs-extra';

@Controller('uploads')
@Public() // Make uploads publicly accessible
export class StaticFilesController {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Validate filename to prevent directory traversal
      if (
        filename.includes('..') ||
        filename.includes('/') ||
        filename.includes('\\')
      ) {
        throw new NotFoundException('Invalid filename');
      }

      const filePath = path.join(this.uploadDir, filename);

      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        throw new NotFoundException('File not found');
      }

      // Set CORS headers
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      });

      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      res.set('Content-Type', contentType);

      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }
}
