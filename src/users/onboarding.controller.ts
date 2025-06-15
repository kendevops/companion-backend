/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Post, Body, Request, Patch } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  UpdateSellerProfileDto,
  SelectServicesDto,
  CreateServiceFromPredefinedDto,
} from './dto/onboarding.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipOnboardingCheck } from '../auth/decorators/skip-onboarding.decorator';
import { UserRole } from '@prisma/client';

@Controller('onboarding')
@Roles(UserRole.SELLER)
@SkipOnboardingCheck() // Allow access to onboarding endpoints even if onboarding is not completed
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // Get onboarding status
  @Get('status')
  getOnboardingStatus(@Request() req) {
    return this.onboardingService.getOnboardingStatus(req.user.id);
  }

  // Step 1: Update seller profile details
  @Patch('profile')
  updateSellerProfile(
    @Request() req,
    @Body() updateData: UpdateSellerProfileDto,
  ) {
    return this.onboardingService.updateSellerProfile(req.user.id, updateData);
  }

  // Get predefined services for selection
  @Get('predefined-services')
  getPredefinedServices() {
    return this.onboardingService.getPredefinedServices();
  }

  // Step 2: Select services (bulk approach)
  @Post('select-services')
  selectServices(@Request() req, @Body() selectData: SelectServicesDto) {
    return this.onboardingService.selectPredefinedServices(
      req.user.id,
      selectData,
    );
  }

  // Step 2: Create services from predefined (detailed approach)
  @Post('create-services')
  createServicesFromPredefined(
    @Request() req,
    @Body() servicesData: CreateServiceFromPredefinedDto[],
  ) {
    return this.onboardingService.createServicesFromPredefined(
      req.user.id,
      servicesData,
    );
  }

  // Complete onboarding
  @Post('complete')
  completeOnboarding(@Request() req) {
    return this.onboardingService.completeOnboarding(req.user.id);
  }
}
