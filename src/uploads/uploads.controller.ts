/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
// import { multer } from 'multer';
import { UploadsService } from './uploads.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipOnboardingCheck } from '../auth/decorators/skip-onboarding.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('profile-picture')
  @Roles(UserRole.SELLER)
  @SkipOnboardingCheck() // Allow uploads during onboarding
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
  @Roles(UserRole.SELLER)
  @SkipOnboardingCheck() // Allow deletes during onboarding
  async removeProfilePicture(
    @Body() body: { fileUrl: string },
    @Request() req,
  ) {
    return this.uploadsService.removeProfilePicture(body.fileUrl, req.user.id);
  }

  @Get(':filename')
  @Public() // Make file serving public so images can be displayed
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    return this.uploadsService.serveFile(filename, res);
  }
}
