/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateSellerProfileDto,
  SelectServicesDto,
  CreateServiceFromPredefinedDto,
} from './dto/onboarding.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  // Check if seller has completed onboarding
  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller: {
          include: {
            contactDetails: true,
            services: true,
          },
        },
      },
    });

    if (!user || user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can access onboarding');
    }

    if (!user.seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const hasProfileDetails = !!(
      user.seller.bio &&
      user.seller.contactDetails?.phoneNumber &&
      user.seller.profilePictures.length > 0
    );

    const hasMinimumServices = user.seller.services.length >= 3;

    return {
      completed: user.seller.onboardingCompleted,
      steps: {
        profileDetails: hasProfileDetails,
        serviceSelection: hasMinimumServices,
      },
      seller: user.seller,
    };
  }

  // Update seller profile details (Step 1)
  async updateSellerProfile(
    userId: string,
    updateData: UpdateSellerProfileDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user || user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can update profile');
    }

    if (!user.seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Update seller profile
    const updatedSeller = await this.prisma.seller.update({
      where: { id: user.seller.id },
      data: {
        bio: updateData.bio,
        profilePictures:
          updateData.profilePictures || user.seller.profilePictures,
      },
      include: {
        contactDetails: true,
        user: true,
      },
    });

    // Update or create contact details
    if (updateData.phoneNumber || updateData.instagram || updateData.wechat) {
      if (!updateData.phoneNumber) {
        throw new BadRequestException('Phone number is required');
      }
      await this.prisma.contactDetails.upsert({
        where: { sellerId: user.seller.id },
        update: {
          phoneNumber: updateData.phoneNumber,
          instagram: updateData.instagram,
          wechat: updateData.wechat,
        },
        create: {
          sellerId: user.seller.id,
          phoneNumber: updateData.phoneNumber,
          instagram: updateData.instagram,
          wechat: updateData.wechat,
        },
      });
    }

    return updatedSeller;
  }

  // Get all predefined services
  getPredefinedServices() {
    return this.prisma.predefinedService.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  // Create services from predefined list (Step 2)
  async createServicesFromPredefined(
    userId: string,
    servicesData: CreateServiceFromPredefinedDto[],
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user || user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can create services');
    }

    if (!user.seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const sellerId = user.seller.id;

    if (servicesData.length < 3) {
      throw new BadRequestException('You must select at least 3 services');
    }

    // Verify all predefined services exist
    const predefinedServiceIds = servicesData.map((s) => s.predefinedServiceId);
    const predefinedServices = await this.prisma.predefinedService.findMany({
      where: {
        id: { in: predefinedServiceIds },
        isActive: true,
      },
    });

    if (predefinedServices.length !== predefinedServiceIds.length) {
      throw new BadRequestException('Some selected services are invalid');
    }
    // Create services for the seller
    const createdServices = await Promise.all(
      servicesData.map(async (serviceData) => {
        const predefinedService = predefinedServices.find(
          (ps) => ps.id === serviceData.predefinedServiceId,
        );

        return this.prisma.service.create({
          data: {
            sellerId: sellerId,
            title: serviceData.title,
            description:
              serviceData.description || predefinedService.description,
            price: serviceData.price || predefinedService.basePrice,
            isAvailable: true,
          },
        });
      }),
    );

    return createdServices;
  }

  // Complete onboarding
  async completeOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller: {
          include: {
            contactDetails: true,
            services: true,
          },
        },
      },
    });

    if (!user || user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can complete onboarding');
    }

    if (!user.seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Check if all requirements are met
    const hasProfileDetails = !!(
      user.seller.bio &&
      user.seller.contactDetails?.phoneNumber &&
      user.seller.profilePictures.length > 0
    );

    const hasMinimumServices = user.seller.services.length >= 3;

    if (!hasProfileDetails || !hasMinimumServices) {
      throw new BadRequestException('Please complete all onboarding steps');
    }

    // Mark onboarding as completed
    const updatedSeller = await this.prisma.seller.update({
      where: { id: user.seller.id },
      data: { onboardingCompleted: true },
      include: {
        user: true,
        contactDetails: true,
        services: true,
      },
    });

    return updatedSeller;
  }

  // Bulk select services (alternative approach)
  async selectPredefinedServices(
    userId: string,
    selectData: SelectServicesDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: true },
    });

    if (!user || user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can select services');
    }

    if (!user.seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Verify all predefined services exist
    const predefinedServices = await this.prisma.predefinedService.findMany({
      where: {
        id: { in: selectData.predefinedServiceIds },
        isActive: true,
      },
    });

    if (predefinedServices.length !== selectData.predefinedServiceIds.length) {
      throw new BadRequestException('Some selected services are invalid');
    }

    // Create services based on predefined services
    const sellerId = user.seller.id;
    const createdServices = await Promise.all(
      predefinedServices.map(async (predefinedService) => {
        return this.prisma.service.create({
          data: {
            sellerId: sellerId,
            title: predefinedService.name,
            description: predefinedService.description,
            price: predefinedService.basePrice,
            isAvailable: true,
          },
        });
      }),
    );

    return createdServices;
  }
}
