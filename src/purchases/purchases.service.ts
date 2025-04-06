/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { ServicesService } from '../services/services.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private servicesService: ServicesService,
  ) {}

  async create(createPurchaseDto: CreatePurchaseDto, userId: string) {
    const { sellerId, serviceIds } = createPurchaseDto;

    // Get the buyer ID from the user ID
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      throw new ForbiddenException('Only buyers can create purchases');
    }

    // Validate the seller exists
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    // Validate services exist and calculate total price
    let totalAmount = 0;
    const services: {
      id: string;
      sellerId: string;
      createdAt: Date;
      updatedAt: Date;
      title: string;
      description: string;
      price: number;
      isAvailable: boolean;
    }[] = [];

    for (const serviceId of serviceIds) {
      const service = await this.servicesService.findOne(serviceId);

      // Validate service belongs to specified seller
      if (service.sellerId !== sellerId) {
        throw new BadRequestException(
          `Service ${serviceId} does not belong to the specified seller`,
        );
      }

      // Validate service is available
      if (!service.isAvailable) {
        throw new BadRequestException(`Service ${serviceId} is not available`);
      }

      services.push(service);
      totalAmount += service.price;
    }

    // Create purchase and service relationships
    return this.prisma.$transaction(async (prisma) => {
      // Create the purchase
      const purchase = await prisma.purchase.create({
        data: {
          buyerId: buyer.id,
          sellerId,
          totalAmount,
          status: 'PENDING',
        },
      });

      // Create service relationships
      for (const service of services) {
        await prisma.purchaseService.create({
          data: {
            purchaseId: purchase.id,
            serviceId: service.id,
            price: service.price,
          },
        });
      }

      return this.findOne(purchase.id);
    });
  }

  async findAll(userId: string, userRole: UserRole) {
    switch (userRole) {
      case UserRole.ADMIN:
        // Admins can see all purchases
        return this.prisma.purchase.findMany({
          include: {
            buyer: {
              include: {
                user: {
                  select: {
                    name: true,
                    username: true,
                  },
                },
              },
            },
            seller: {
              include: {
                user: {
                  select: {
                    name: true,
                    username: true,
                  },
                },
              },
            },
            services: {
              include: {
                service: true,
              },
            },
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      case UserRole.SELLER:
        // Sellers can see purchases where they are the seller
        const seller = await this.prisma.seller.findFirst({
          where: { userId },
        });

        if (!seller) {
          return [];
        }

        return this.prisma.purchase.findMany({
          where: {
            sellerId: seller.id,
          },
          include: {
            buyer: {
              include: {
                user: {
                  select: {
                    name: true,
                    username: true,
                  },
                },
              },
            },
            services: {
              include: {
                service: true,
              },
            },
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      case UserRole.BUYER:
        // Buyers can see their own purchases
        const buyer = await this.prisma.buyer.findFirst({
          where: { userId },
        });

        if (!buyer) {
          return [];
        }

        return this.prisma.purchase.findMany({
          where: {
            buyerId: buyer.id,
          },
          include: {
            seller: {
              include: {
                user: {
                  select: {
                    name: true,
                    username: true,
                  },
                },
              },
            },
            services: {
              include: {
                service: true,
              },
            },
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      default:
        return [];
    }
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                name: true,
                username: true,
                email: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                name: true,
                username: true,
                email: true,
              },
            },
            // Only include contact details if purchase is accepted or completed
            contactDetails: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        payment: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    // Only return seller contact details if purchase status is ACCEPTED or COMPLETED
    if (purchase.status !== 'ACCEPTED' && purchase.status !== 'COMPLETED') {
      purchase.seller.contactDetails = null;
    }

    return purchase;
  }

  async update(
    id: string,
    updatePurchaseDto: UpdatePurchaseDto,
    userId: string,
    userRole: UserRole,
  ) {
    const purchase = await this.findOne(id);

    // Check authorization based on role and status change
    if (userRole === UserRole.BUYER) {
      // Buyers can only cancel their own pending purchases
      const buyer = await this.prisma.buyer.findFirst({
        where: { userId },
      });

      if (!buyer || purchase.buyerId !== buyer.id) {
        throw new ForbiddenException('You can only update your own purchases');
      }

      // Buyers can only cancel their pending purchases
      if (
        updatePurchaseDto.status === 'CANCELLED' &&
        purchase.status !== 'PENDING'
      ) {
        throw new ForbiddenException('You can only cancel pending purchases');
      }

      // Buyers can't perform other status changes
      if (
        updatePurchaseDto.status &&
        updatePurchaseDto.status !== 'CANCELLED'
      ) {
        throw new ForbiddenException('Buyers can only cancel purchases');
      }
    } else if (userRole === UserRole.SELLER) {
      // Sellers can only update purchases where they are the seller
      const seller = await this.prisma.seller.findFirst({
        where: { userId },
      });

      if (!seller || purchase.sellerId !== seller.id) {
        throw new ForbiddenException(
          'You can only update purchases where you are the seller',
        );
      }

      // Sellers can accept pending purchases or complete accepted purchases
      if (
        (updatePurchaseDto.status === 'ACCEPTED' &&
          purchase.status !== 'PENDING') ||
        (updatePurchaseDto.status === 'COMPLETED' &&
          purchase.status !== 'ACCEPTED')
      ) {
        throw new ForbiddenException('Invalid status transition');
      }
    }

    // Update the purchase
    return this.prisma.purchase.update({
      where: { id },
      data: updatePurchaseDto,
      include: {
        buyer: {
          include: {
            user: true,
          },
        },
        seller: {
          include: {
            user: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        payment: true,
      },
    });
  }

  async getPurchasesByStatus(
    status: string,
    userId: string,
    userRole: UserRole,
  ) {
    switch (userRole) {
      case UserRole.ADMIN:
        return this.prisma.purchase.findMany({
          where: { status },
          include: {
            buyer: {
              include: {
                user: true,
              },
            },
            seller: {
              include: {
                user: true,
              },
            },
            services: {
              include: {
                service: true,
              },
            },
            payment: true,
          },
        });

      case UserRole.SELLER:
        const seller = await this.prisma.seller.findFirst({
          where: { userId },
        });

        if (!seller) {
          return [];
        }

        return this.prisma.purchase.findMany({
          where: {
            sellerId: seller.id,
            status,
          },
          include: {
            buyer: {
              include: {
                user: true,
              },
            },
            services: {
              include: {
                service: true,
              },
            },
            payment: true,
          },
        });

      case UserRole.BUYER:
        const buyer = await this.prisma.buyer.findFirst({
          where: { userId },
        });

        if (!buyer) {
          return [];
        }

        return this.prisma.purchase.findMany({
          where: {
            buyerId: buyer.id,
            status,
          },
          include: {
            seller: {
              include: {
                user: true,
              },
            },
            services: {
              include: {
                service: true,
              },
            },
            payment: true,
          },
        });

      default:
        return [];
    }
  }
}
