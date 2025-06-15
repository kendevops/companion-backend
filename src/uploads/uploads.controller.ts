/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipOnboardingCheck } from '../auth/decorators/skip-onboarding.decorator';
import { UserRole } from '@prisma/client';

@Controller('uploads')
@Roles(UserRole.SELLER)
@SkipOnboardingCheck() // Allow uploads during onboarding
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadsService.uploadProfilePicture(file, req.user.id);
  }

  @Delete('profile-picture')
  async removeProfilePicture(
    @Body() body: { fileUrl: string },
    @Request() req,
  ) {
    return this.uploadsService.removeProfilePicture(body.fileUrl, req.user.id);
  }
}
