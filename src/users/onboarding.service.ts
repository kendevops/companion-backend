/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SellerProfileDto } from './dto/seller-profile.dto';
import { SellerServicesDto } from './dto/seller-services.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getOnboardingStatus(userId: string) {
    // Get the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if the user is a seller
    if (user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers have an onboarding process');
    }

    // If the seller record doesn't exist yet, create it
    let seller = user.seller;
    if (!seller) {
      seller = await this.prisma.seller.create({
        data: {
          userId: user.id,
          profilePictures: [],
          verified: false,
          rating: 0,
          onboardingCompleted: false,
        },
      });
    }

    // Get the count of services
    const servicesCount = await this.prisma.service.count({
      where: { sellerId: seller.id },
    });

    // Check if contact details exist
    const contactDetails = await this.prisma.contactDetails.findUnique({
      where: { sellerId: seller.id },
    });

    // Determine onboarding steps status
    const stepsCompleted = {
      profileSetup:
        !!seller.bio && seller.profilePictures.length > 0 && !!contactDetails,
      servicesSetup: servicesCount >= 3,
      onboardingCompleted: seller.onboardingCompleted,
    };

    return {
      sellerId: seller.id,
      ...stepsCompleted,
      nextStep: !stepsCompleted.profileSetup
        ? 'profile'
        : !stepsCompleted.servicesSetup
          ? 'services'
          : 'dashboard',
    };
  }

  async updateSellerProfile(userId: string, profileDto: SellerProfileDto) {
    // Get the seller by userId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can update seller profiles');
    }

    let seller = user.seller;
    if (!seller) {
      // Create seller profile if it doesn't exist
      seller = await this.prisma.seller.create({
        data: {
          userId: user.id,
          profilePictures: [],
          verified: false,
          rating: 0,
          onboardingCompleted: false,
        },
      });
    }

    // Update seller profile
    const updatedSeller = await this.prisma.seller.update({
      where: { id: seller.id },
      data: {
        bio: profileDto.bio,
        profilePictures: profileDto.profilePictures,
      },
    });

    // Update or create contact details
    let contactDetails = await this.prisma.contactDetails.findUnique({
      where: { sellerId: seller.id },
    });

    if (contactDetails) {
      contactDetails = await this.prisma.contactDetails.update({
        where: { id: contactDetails.id },
        data: profileDto.contactDetails,
      });
    } else {
      contactDetails = await this.prisma.contactDetails.create({
        data: {
          ...profileDto.contactDetails,
          sellerId: seller.id,
        },
      });
    }

    return {
      ...updatedSeller,
      contactDetails,
    };
  }

  async addSellerServices(userId: string, servicesDto: SellerServicesDto) {
    // Get the seller by userId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can add services');
    }

    if (!user.seller) {
      throw new BadRequestException('Complete profile setup first');
    }

    // Check if the user already has completed the profile step
    const contactDetails = await this.prisma.contactDetails.findUnique({
      where: { sellerId: user.seller.id },
    });

    if (
      !contactDetails ||
      !user.seller.bio ||
      user.seller.profilePictures.length === 0
    ) {
      throw new BadRequestException('Complete profile setup first');
    }

    // Add services
    const createdServices: Array<
      Awaited<ReturnType<typeof this.prisma.service.create>>
    > = [];
    for (const serviceData of servicesDto.services) {
      const service = await this.prisma.service.create({
        data: {
          ...serviceData,
          sellerId: user.seller.id,
        },
      });
      createdServices.push(service);
    }

    return createdServices;
  }

  async completeOnboarding(userId: string, completeDto: CompleteOnboardingDto) {
    // Get the seller by userId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers have an onboarding process');
    }

    if (!user.seller) {
      throw new BadRequestException('Seller profile does not exist');
    }

    // Check if profile and services are completed
    const contactDetails = await this.prisma.contactDetails.findUnique({
      where: { sellerId: user.seller.id },
    });

    if (
      !contactDetails ||
      !user.seller.bio ||
      user.seller.profilePictures.length === 0
    ) {
      throw new BadRequestException('Complete profile setup first');
    }

    const servicesCount = await this.prisma.service.count({
      where: { sellerId: user.seller.id },
    });

    if (servicesCount < 3) {
      throw new BadRequestException('Add at least 3 services first');
    }

    // Update onboarding status
    const updatedSeller = await this.prisma.seller.update({
      where: { id: user.seller.id },
      data: {
        onboardingCompleted: completeDto.completed,
      },
    });

    return updatedSeller;
  }
}
