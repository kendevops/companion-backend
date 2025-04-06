/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string) {
    const { purchaseId, paymentMethod } = createPaymentDto;

    // Get the purchase
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        buyer: true,
        payment: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
    }

    // Check if payment already exists
    if (purchase.payment) {
      throw new BadRequestException('Payment for this purchase already exists');
    }

    // Get the buyer ID from the user ID
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      throw new ForbiddenException('Only buyers can make payments');
    }

    // Verify the buyer is the owner of the purchase
    if (purchase.buyerId !== buyer.id) {
      throw new ForbiddenException('You can only pay for your own purchases');
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        purchaseId,
        amount: purchase.totalAmount,
        paymentMethod,
        status: 'COMPLETED', // In a real app, this would be PENDING until processed
      },
    });

    // Update purchase status to ACCEPTED
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'ACCEPTED',
      },
    });

    return payment;
  }

  async findAll(userId: string, userRole: UserRole) {
    switch (userRole) {
      case UserRole.ADMIN:
        // Admins can see all payments
        return this.prisma.payment.findMany({
          include: {
            purchase: {
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
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      case UserRole.SELLER:
        // Sellers can see payments for their sales
        const seller = await this.prisma.seller.findFirst({
          where: { userId },
        });

        if (!seller) {
          return [];
        }

        return this.prisma.payment.findMany({
          where: {
            purchase: {
              sellerId: seller.id,
            },
          },
          include: {
            purchase: {
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
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      case UserRole.BUYER:
        // Buyers can see their own payments
        const buyer = await this.prisma.buyer.findFirst({
          where: { userId },
        });

        if (!buyer) {
          return [];
        }

        return this.prisma.payment.findMany({
          where: {
            purchase: {
              buyerId: buyer.id,
            },
          },
          include: {
            purchase: {
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
              },
            },
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        purchase: {
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
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    userId: string,
    userRole: UserRole,
  ) {
    const payment = await this.findOne(id);

    // Only admins can update payment status
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update payment status',
      );
    }

    // Handle refunds
    if (updatePaymentDto.status === 'REFUNDED') {
      // Update the purchase status as well
      await this.prisma.purchase.update({
        where: { id: payment.purchaseId },
        data: {
          status: 'REFUNDED',
        },
      });
    }

    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        purchase: {
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
          },
        },
      },
    });
  }

  async getPaymentsByStatus(
    status: string,
    userId: string,
    userRole: UserRole,
  ) {
    switch (userRole) {
      case UserRole.ADMIN:
        return this.prisma.payment.findMany({
          where: { status },
          include: {
            purchase: {
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
              },
            },
          },
        });

      case UserRole.SELLER:
        const seller = await this.prisma.seller.findFirst({
          where: { userId },
        });

        if (!seller) {
          return [];
        }

        return this.prisma.payment.findMany({
          where: {
            status,
            purchase: {
              sellerId: seller.id,
            },
          },
          include: {
            purchase: {
              include: {
                buyer: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });

      case UserRole.BUYER:
        const buyer = await this.prisma.buyer.findFirst({
          where: { userId },
        });

        if (!buyer) {
          return [];
        }

        return this.prisma.payment.findMany({
          where: {
            status,
            purchase: {
              buyerId: buyer.id,
            },
          },
          include: {
            purchase: {
              include: {
                seller: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });

      default:
        return [];
    }
  }
}
