/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SellerProfileDto } from './dto/seller-profile.dto';
import { SellerServicesDto } from './dto/seller-services.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  @Roles(UserRole.SELLER)
  getOnboardingStatus(@Request() req) {
    return this.onboardingService.getOnboardingStatus(req.user.id);
  }

  @Post('profile')
  @Roles(UserRole.SELLER)
  updateSellerProfile(@Request() req, @Body() profileDto: SellerProfileDto) {
    return this.onboardingService.updateSellerProfile(req.user.id, profileDto);
  }

  @Post('services')
  @Roles(UserRole.SELLER)
  addSellerServices(@Request() req, @Body() servicesDto: SellerServicesDto) {
    return this.onboardingService.addSellerServices(req.user.id, servicesDto);
  }

  @Post('complete')
  @Roles(UserRole.SELLER)
  completeOnboarding(
    @Request() req,
    @Body() completeDto: CompleteOnboardingDto,
  ) {
    return this.onboardingService.completeOnboarding(req.user.id, completeDto);
  }
}
