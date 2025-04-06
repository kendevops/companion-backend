/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
      const updatedSeller = await this.prisma.seller.update({
        where: { id: seller.id },
        data: {
          profilePictures: {
            push: fileUrl,
          },
        },
      });

      return {
        success: true,
        url: fileUrl,
        profilePictures: updatedSeller.profilePictures,
      };
    } else {
      // For now, only sellers can upload profile pictures
      throw new ForbiddenException('Only sellers can upload profile pictures');
    }
  }

  async removeProfilePicture(fileUrl: string, userId: string) {
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
        // const filename = fileUrl.split('/').pop();
        const uploadDir =
          this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
        await unlink(join(process.cwd(), uploadDir));
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
