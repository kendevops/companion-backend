/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
  }

  async uploadProfilePicture(file: Express.Multer.File, userId: string) {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, fileName);

      // Ensure upload directory exists
      await fs.ensureDir(this.uploadDir);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Return the file URL/path that can be used to access the file
      const fileUrl = `/uploads/${fileName}`;

      console.log('File uploaded successfully:', fileUrl);

      return {
        success: true,
        fileUrl,
        filename: fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async removeProfilePicture(fileUrl: string, userId: string) {
    try {
      // Extract filename from URL
      const filename = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, filename);

      // Check if file exists before trying to delete
      const fileExists = await fs.pathExists(filePath);
      if (fileExists) {
        await fs.remove(filePath);
      }

      return { success: true, message: 'File removed successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to remove file');
    }
  }

  async serveFile(filename: string, res: Response) {
    try {
      const filePath = path.join(process.cwd(), this.uploadDir, filename);

      // Check if file exists
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw new NotFoundException('File not found');
      }

      // Get file stats to set proper headers
      const stats = await fs.stat(filePath);
      const fileExtension = path.extname(filename).toLowerCase();

      // Set content type based on file extension
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };

      const contentType =
        contentTypeMap[fileExtension] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving file:', error);
      throw new NotFoundException('File not found');
    }
  }
}
