/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService implements OnModuleInit {
  serveFile(filename: string, res: Response<any, Record<string, any>>) {
    throw new Error('Method not implemented.');
  }
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
  }

  async onModuleInit() {
    // Ensure upload directory exists when the module initializes
    try {
      await fs.ensureDir(this.uploadDir);
      console.log(`Upload directory ensured: ${this.uploadDir}`);
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async uploadProfilePicture(file: Express.Multer.File, userId: string) {
    console.log('Upload request received:', {
      userId,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype,
      hasBuffer: !!file?.buffer,
    });

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
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

      console.log('Attempting to save file:', {
        fileName,
        filePath,
        uploadDir: this.uploadDir,
      });

      // Ensure upload directory exists
      await fs.ensureDir(this.uploadDir);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Verify file was saved
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw new Error('File was not saved successfully');
      }

      // Return the file URL/path that can be used to access the file
      const fileUrl = `/uploads/${fileName}`;

      console.log('File uploaded successfully:', {
        fileUrl,
        fileName,
        filePath,
        fileExists,
      });

      return {
        success: true,
        fileUrl,
        filename: fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Upload error details:', {
        error: error.message,
        stack: error.stack,
        uploadDir: this.uploadDir,
        fileName: file?.originalname,
      });
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async removeProfilePicture(fileUrl: string, userId: string) {
    try {
      // Extract filename from URL
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      const exists = await fs.pathExists(filePath);
      if (exists) {
        await fs.remove(filePath);
        console.log('File removed successfully:', filePath);
      }

      return { success: true, message: 'File removed successfully' };
    } catch (error) {
      console.error('Remove file error:', error);
      throw new BadRequestException('Failed to remove file');
    }
  }
}
