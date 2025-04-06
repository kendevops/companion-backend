/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Delete,
  Body,
  Request,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('profile-picture')
  @Roles(UserRole.SELLER)
  @UseInterceptors(FileInterceptor('file'))
  uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.uploadsService.uploadProfilePicture(file, req.user.id);
  }

  @Delete('profile-picture')
  @Roles(UserRole.SELLER)
  removeProfilePicture(@Body('fileUrl') fileUrl: string, @Request() req) {
    return this.uploadsService.removeProfilePicture(fileUrl, req.user.id);
  }

  // Serve static files from uploads directory
  @Public()
  @Get(':filename')
  async serveUploadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const file = await this.uploadsService.getUploadedFile(filename);
    return res.sendFile(file);
  }
}
