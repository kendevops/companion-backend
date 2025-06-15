/* eslint-disable @typescript-eslint/require-await */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { UserRole } from '@prisma/client';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

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

    console.log('Uploading file for user:', userId);
    console.log('File details:', {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Get the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle based on role
    if (user.role === UserRole.SELLER) {
      // Get the seller profile
      const seller = await this.prisma.seller.findFirst({
        where: { userId },
      });

      if (!seller) {
        throw new NotFoundException('Seller profile not found');
      }

      // Add the new profile picture
      const fileUrl = `/uploads/${file.filename}`;

      console.log('Adding profile picture:', fileUrl);

      const updatedSeller = await this.prisma.seller.update({
        where: { id: seller.id },
        data: {
          profilePictures: {
            push: fileUrl,
          },
        },
      });

      console.log('Profile picture added successfully');

      return {
        success: true,
        fileUrl, // This matches what the frontend expects
        url: fileUrl, // Keep this for backward compatibility
        filename: file.filename,
        originalName: file.originalname,
        profilePictures: updatedSeller.profilePictures,
      };
    } else {
      // For now, only sellers can upload profile pictures
      throw new ForbiddenException('Only sellers can upload profile pictures');
    }
  }

  async removeProfilePicture(fileUrl: string, userId: string) {
    console.log('Removing profile picture:', fileUrl, 'for user:', userId);

    // Get the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle based on role
    if (user.role === UserRole.SELLER) {
      // Get the seller profile
      const seller = await this.prisma.seller.findFirst({
        where: { userId },
      });

      if (!seller) {
        throw new NotFoundException('Seller profile not found');
      }

      // Check if the image exists in the seller's profile pictures
      if (!seller.profilePictures.includes(fileUrl)) {
        throw new NotFoundException('Profile picture not found');
      }

      // Remove the file from the profile pictures array
      const updatedProfilePictures = seller.profilePictures.filter(
        (url) => url !== fileUrl,
      );

      const updatedSeller = await this.prisma.seller.update({
        where: { id: seller.id },
        data: {
          profilePictures: updatedProfilePictures,
        },
      });

      // Try to delete the actual file from disk
      try {
        const filename = fileUrl.split('/').pop(); // Extract filename from URL
        if (!filename) {
          throw new NotFoundException(
            'Filename could not be determined from URL',
          );
        }
        const uploadDir =
          this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
        const filePath = join(process.cwd(), uploadDir, filename);

        console.log('Attempting to delete file:', filePath);
        await unlink(filePath);
        console.log('File deleted successfully');
      } catch (error) {
        console.error('Error deleting file:', error);
        // Continue even if file deletion fails
      }

      return {
        success: true,
        profilePictures: updatedSeller.profilePictures,
      };
    } else {
      // For now, only sellers can remove profile pictures
      throw new ForbiddenException('Only sellers can remove profile pictures');
    }
  }

  async getUploadedFile(filename: string) {
    const uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    return join(process.cwd(), uploadDir, filename);
  }
}
