/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { role, ...userData } = createUserDto;

    // Check if user with email or username already exists
    const existingEmail = await this.findByEmail(userData.email);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.findByUsername(userData.username);
    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }

    // Create user with transaction to handle role-specific data
    return this.prisma.$transaction(async (prisma) => {
      // Create the base user
      const user = await prisma.user.create({
        data: {
          ...userData,
          role,
        },
      });

      // Create role-specific record
      switch (role) {
        case UserRole.ADMIN:
          await prisma.admin.create({
            data: {
              userId: user.id,
            },
          });
          break;
        case UserRole.SELLER:
          await prisma.seller.create({
            data: {
              userId: user.id,
              profilePictures: [],
              verified: false,
              rating: 0,
            },
          });
          break;
        case UserRole.BUYER:
          await prisma.buyer.create({
            data: {
              userId: user.id,
            },
          });
          break;
      }

      return user;
    });
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        password: true, // Exclude password
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<any> {
    return await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        password: true, // Include the password field
      },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Check if user exists
    await this.findById(id);

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Check for email or username conflicts if updating those fields
    if (updateUserDto.email) {
      const existingEmail = await this.findByEmail(updateUserDto.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.username) {
      const existingUsername = await this.findByUsername(
        updateUserDto.username,
      );
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException('Username already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string): Promise<Omit<User, 'password'>> {
    // Check if user exists
    await this.findById(id);

    // Delete the user (Prisma will cascade delete related records)
    const deletedUser = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return deletedUser;
  }

  // Get sellers with their services and ratings
  async findSellers(query?: string) {
    const sellers = await this.prisma.user.findMany({
      where: {
        role: UserRole.SELLER,
        OR: query
          ? [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: false, // Don't expose email
        role: true,
        createdAt: true,
        updatedAt: true,
        password: false, // Exclude password
        seller: {
          include: {
            services: {
              where: {
                isAvailable: true,
              },
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                isAvailable: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            // Don't include contact details until after purchase
            contactDetails: false,
            reviews: {
              take: 3,
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                buyer: {
                  select: {
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
        },
      },
    });

    // Filter out users without seller profiles
    return sellers.filter((user) => user.seller !== null);
  }

  // Get seller detail with services (buyer view)
  async findSellerDetail(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            password: false, // Exclude password
          },
        },
        services: {
          where: { isAvailable: true },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            isAvailable: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        reviews: {
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
            service: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    // Don't expose contact details unless after payment
    return {
      ...seller,
      contactDetails: undefined,
    };
  }

  // Get buyer detail with purchases
  async findBuyerDetail(buyerId: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id: buyerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            password: false, // Exclude password
          },
        },
        purchases: {
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
        },
        reviews: {
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
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${buyerId} not found`);
    }

    return buyer;
  }

  // Update seller profile
  async updateSellerProfile(userId: string, profileData: any) {
    const user = await this.findById(userId);

    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('Only sellers can update seller profiles');
    }

    const seller = await this.prisma.seller.findFirst({
      where: { userId },
      include: {
        contactDetails: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const { contactDetails, ...sellerData } = profileData;

    // Update the seller profile
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatedSeller = await this.prisma.seller.update({
      where: { id: seller.id },
      data: sellerData,
    });

    // Update contact details if provided
    if (contactDetails) {
      if (seller.contactDetails) {
        // Update existing contact details
        await this.prisma.contactDetails.update({
          where: { sellerId: seller.id },
          data: contactDetails,
        });
      } else {
        // Create new contact details
        await this.prisma.contactDetails.create({
          data: {
            ...contactDetails,
            sellerId: seller.id,
          },
        });
      }
    }

    // Return the updated seller with contact details
    return this.prisma.seller.findUnique({
      where: { id: seller.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        contactDetails: true,
        services: true,
      },
    });
  }

  // Get seller contact details (only after purchase)
  async getSellerContactDetails(sellerId: string, buyerId: string) {
    // Check if the buyer has an accepted or completed purchase with this seller
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        buyerId,
        sellerId,
        OR: [{ status: 'ACCEPTED' }, { status: 'COMPLETED' }],
      },
    });

    if (!purchase) {
      throw new ForbiddenException(
        'You need to purchase services from this seller to view contact details',
      );
    }

    // Retrieve contact details
    const contactDetails = await this.prisma.contactDetails.findUnique({
      where: { sellerId },
    });

    if (!contactDetails) {
      throw new NotFoundException(
        'Seller has not provided contact details yet',
      );
    }

    return contactDetails;
  }

  // // Get dashboard statistics based on user role
  // async getDashboardStats(userId: string, userRole: UserRole) {
  //   switch (userRole) {
  //     case UserRole.ADMIN:
  //       return this.getAdminDashboardStats();
  //     case UserRole.SELLER:
  //       return this.getSellerDashboardStats(userId);
  //     case UserRole.BUYER:
  //       return this.getBuyerDashboardStats(userId);
  //     default:
  //       throw new BadRequestException('Invalid user role');
  //   }
  // }

  // async getAdminDashboardStats() {
  //   const [
  //     totalUsers,
  //     totalSellers,
  //     totalBuyers,
  //     totalServices,
  //     totalPurchases,
  //     totalCompletedPurchases,
  //     totalRevenue,
  //     recentPurchases,
  //     recentUsers,
  //   ] = await Promise.all([
  //     this.prisma.user.count(),
  //     this.prisma.seller.count(),
  //     this.prisma.buyer.count(),
  //     this.prisma.service.count(),
  //     this.prisma.purchase.count(),
  //     this.prisma.purchase.count({
  //       where: { status: 'COMPLETED' },
  //     }),
  //     this.prisma.payment.aggregate({
  //       _sum: { amount: true },
  //     }),
  //     this.prisma.purchase.findMany({
  //       take: 5,
  //       orderBy: { createdAt: 'desc' },
  //       include: {
  //         buyer: {
  //           include: {
  //             user: {
  //               select: {
  //                 name: true,
  //                 username: true,
  //               },
  //             },
  //           },
  //         },
  //         seller: {
  //           include: {
  //             user: {
  //               select: {
  //                 name: true,
  //                 username: true,
  //               },
  //             },
  //           },
  //         },
  //         services: {
  //           include: {
  //             service: true,
  //           },
  //         },
  //         payment: true,
  //       },
  //     }),
  //     this.prisma.user.findMany({
  //       take: 5,
  //       orderBy: { createdAt: 'desc' },
  //       select: {
  //         id: true,
  //         name: true,
  //         username: true,
  //         role: true,
  //         createdAt: true,
  //       },
  //     }),
  //   ]);

  //   // Calculate completion rate
  //   const completionRate =
  //     totalPurchases > 0
  //       ? Math.round((totalCompletedPurchases / totalPurchases) * 100)
  //       : 0;

  //   return {
  //     totalUsers,
  //     totalSellers,
  //     totalBuyers,
  //     totalServices,
  //     totalPurchases,
  //     completionRate,
  //     totalRevenue: totalRevenue._sum.amount || 0,
  //     recentPurchases,
  //     recentUsers,
  //   };
  // }

  // async getSellerDashboardStats(userId: string) {
  //   const seller = await this.prisma.seller.findFirst({
  //     where: { userId },
  //   });

  //   if (!seller) {
  //     throw new NotFoundException('Seller profile not found');
  //   }

  //   const [
  //     totalServices,
  //     activePurchases,
  //     completedPurchases,
  //     totalEarnings,
  //     recentPurchases,
  //     profileViews,
  //   ] = await Promise.all([
  //     this.prisma.service.count({
  //       where: { sellerId: seller.id },
  //     }),
  //     this.prisma.purchase.count({
  //       where: {
  //         sellerId: seller.id,
  //         status: { in: ['PENDING', 'ACCEPTED'] },
  //       },
  //     }),
  //     this.prisma.purchase.count({
  //       where: {
  //         sellerId: seller.id,
  //         status: 'COMPLETED',
  //       },
  //     }),
  //     this.prisma.payment.aggregate({
  //       where: {
  //         purchase: {
  //           sellerId: seller.id,
  //           status: { in: ['ACCEPTED', 'COMPLETED'] },
  //         },
  //       },
  //       _sum: { amount: true },
  //     }),
  //     this.prisma.purchase.findMany({
  //       where: { sellerId: seller.id },
  //       take: 5,
  //       orderBy: { createdAt: 'desc' },
  //       include: {
  //         buyer: {
  //           include: {
  //             user: {
  //               select: {
  //                 name: true,
  //                 username: true,
  //               },
  //             },
  //           },
  //         },
  //         services: {
  //           include: {
  //             service: true,
  //           },
  //         },
  //         payment: true,
  //       },
  //     }),
  //     100, // Mock profile views - in a real app this would come from analytics
  //   ]);

  //   // Calculate completion rate
  //   const totalPurchases = activePurchases + completedPurchases;
  //   const completionRate =
  //     totalPurchases > 0
  //       ? Math.round((completedPurchases / totalPurchases) * 100)
  //       : 0;

  //   return {
  //     totalServices,
  //     activePurchases,
  //     completedPurchases,
  //     completionRate,
  //     totalEarnings: totalEarnings._sum.amount || 0,
  //     recentPurchases,
  //     profileViews,
  //     rating: seller.rating,
  //   };
  // }

  // async getBuyerDashboardStats(userId: string) {
  //   const buyer = await this.prisma.buyer.findFirst({
  //     where: { userId },
  //   });

  //   if (!buyer) {
  //     throw new NotFoundException('Buyer profile not found');
  //   }

  //   const [
  //     totalPurchases,
  //     activePurchases,
  //     completedPurchases,
  //     totalSpent,
  //     recentPurchases,
  //     favoriteSellers, // This would typically come from a favorites table
  //   ] = await Promise.all([
  //     this.prisma.purchase.count({
  //       where: { buyerId: buyer.id },
  //     }),
  //     this.prisma.purchase.count({
  //       where: {
  //         buyerId: buyer.id,
  //         status: { in: ['PENDING', 'ACCEPTED'] },
  //       },
  //     }),
  //     this.prisma.purchase.count({
  //       where: {
  //         buyerId: buyer.id,
  //         status: 'COMPLETED',
  //       },
  //     }),
  //     this.prisma.payment.aggregate({
  //       where: {
  //         purchase: {
  //           buyerId: buyer.id,
  //         },
  //       },
  //       _sum: { amount: true },
  //     }),
  //     this.prisma.purchase.findMany({
  //       where: { buyerId: buyer.id },
  //       take: 5,
  //       orderBy: { createdAt: 'desc' },
  //       include: {
  //         seller: {
  //           include: {
  //             user: {
  //               select: {
  //                 name: true,
  //                 username: true,
  //               },
  //             },
  //           },
  //         },
  //         services: {
  //           include: {
  //             service: true,
  //           },
  //         },
  //         payment: true,
  //       },
  //     }),
  //     [], // Mock favorite sellers - in a real app this would come from favorites table
  //   ]);

  //   // Recommended sellers would typically be based on purchase history, ratings, etc.
  //   const recommendedSellers = await this.findSellers();

  //   return {
  //     totalPurchases,
  //     activePurchases,
  //     completedPurchases,
  //     totalSpent: totalSpent._sum.amount || 0,
  //     recentPurchases,
  //     favoriteSellers,
  //     recommendedSellers: recommendedSellers.slice(0, 5), // Just take the first 5 for recommendation
  //   };
  // }
}
