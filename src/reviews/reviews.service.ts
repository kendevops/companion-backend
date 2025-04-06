/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(createReviewDto: CreateReviewDto, userId: string) {
    const { sellerId, serviceId, rating, comment } = createReviewDto;

    // Get the buyer ID from the user ID
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      throw new ForbiddenException('Only buyers can create reviews');
    }

    // Verify the seller exists
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    // Verify the service exists and belongs to the seller
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    if (service.sellerId !== sellerId) {
      throw new BadRequestException(
        'Service does not belong to the specified seller',
      );
    }

    // Verify the buyer has purchased this service from this seller and it's completed
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        buyerId: buyer.id,
        sellerId,
        status: 'COMPLETED',
        services: {
          some: {
            serviceId,
          },
        },
      },
    });

    if (!purchase) {
      throw new ForbiddenException(
        'You can only review services you have purchased and completed',
      );
    }

    // Check if the buyer has already reviewed this service
    const existingReview = await this.prisma.review.findFirst({
      where: {
        buyerId: buyer.id,
        sellerId,
        serviceId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this service');
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        buyerId: buyer.id,
        sellerId,
        serviceId,
        rating,
        comment,
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
        service: true,
      },
    });

    // Update seller's average rating
    await this.updateSellerRating(sellerId);

    return review;
  }

  async findAll() {
    return this.prisma.review.findMany({
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
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findBySeller(sellerId: string) {
    // Verify the seller exists
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    return this.prisma.review.findMany({
      where: {
        sellerId,
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
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByService(serviceId: string) {
    // Verify the service exists
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    return this.prisma.review.findMany({
      where: {
        serviceId,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByBuyer(userId: string) {
    // Get the buyer ID from the user ID
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      return [];
    }

    return this.prisma.review.findMany({
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
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
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
        service: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
    userRole: UserRole,
  ) {
    const review = await this.findOne(id);

    // If admin, allow update regardless of ownership
    if (userRole === UserRole.ADMIN) {
      const updatedReview = await this.prisma.review.update({
        where: { id },
        data: updateReviewDto,
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
          service: true,
        },
      });

      if (updateReviewDto.rating) {
        await this.updateSellerRating(review.sellerId);
      }

      return updatedReview;
    }

    // Get the buyer ID from the user ID
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      throw new ForbiddenException('Only buyers can update reviews');
    }

    // Check if the user is the owner of the review
    if (review.buyerId !== buyer.id) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
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
        service: true,
      },
    });

    // Update seller's average rating if rating changed
    if (updateReviewDto.rating) {
      await this.updateSellerRating(review.sellerId);
    }

    return updatedReview;
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const review = await this.findOne(id);

    // If admin, allow deletion regardless of ownership
    if (userRole === UserRole.ADMIN) {
      const deletedReview = await this.prisma.review.delete({
        where: { id },
      });

      await this.updateSellerRating(review.sellerId);
      return deletedReview;
    }

    // Get the buyer ID from the user ID
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      throw new ForbiddenException('Only buyers can delete reviews');
    }

    // Check if the user is the owner of the review
    if (review.buyerId !== buyer.id) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const deletedReview = await this.prisma.review.delete({
      where: { id },
    });

    // Update seller's average rating
    await this.updateSellerRating(review.sellerId);

    return deletedReview;
  }

  // Helper method to update a seller's average rating
  private async updateSellerRating(sellerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { sellerId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      await this.prisma.seller.update({
        where: { id: sellerId },
        data: { rating: 0 },
      });
      return;
    }

    // Calculate the average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update the seller's rating
    await this.prisma.seller.update({
      where: { id: sellerId },
      data: { rating: averageRating },
    });
  }
}
