import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { UserRole } from '@prisma/client';
import { AdminDashboardStatsDto } from './dto/admin-dashboard-stats.dto';
import { SellerDashboardStatsDto } from './dto/seller-dashboard-stats.dto';
import { BuyerDashboardStatsDto } from './dto/buyer-dashboard-stats.dto';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboardStats(): Promise<AdminDashboardStatsDto> {
    // Execute all queries in parallel for better performance
    const [
      totalUsers,
      totalSellers,
      totalBuyers,
      totalServices,
      totalPurchases,
      totalCompletedPurchases,
      totalRevenue,
      pendingPayouts,
      recentPurchases,
      recentUsers,
    ] = await Promise.all([
      // Count total users
      this.prisma.user.count(),

      // Count sellers
      this.prisma.seller.count(),

      // Count buyers
      this.prisma.buyer.count(),

      // Count services
      this.prisma.service.count(),

      // Count all purchases
      this.prisma.purchase.count(),

      // Count completed purchases
      this.prisma.purchase.count({
        where: { status: 'COMPLETED' },
      }),

      // Calculate total revenue (sum of all completed payments)
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),

      // Calculate pending payouts (accepted but not paid to sellers)
      this.prisma.purchase.aggregate({
        where: {
          status: 'ACCEPTED',
          payment: { status: 'COMPLETED' },
        },
        _sum: { totalAmount: true },
      }),

      // Fetch recent purchases with related data
      this.prisma.purchase.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            include: {
              user: {
                select: {
                  id: true,
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
                  id: true,
                  name: true,
                  username: true,
                  email: true,
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
      }),

      // Fetch recent users
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate completion rate
    const completionRate =
      totalPurchases > 0
        ? Math.round((totalCompletedPurchases / totalPurchases) * 100)
        : 0;

    return {
      totalUsers,
      totalSellers,
      totalBuyers,
      totalServices,
      totalPurchases,
      totalCompletedPurchases,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingPayouts: pendingPayouts._sum.totalAmount || 0,
      completionRate,
      recentPurchases,
      recentUsers,
    };
  }

  /**
   * Get seller dashboard statistics
   */
  async getSellerDashboardStats(
    userId: string,
  ): Promise<SellerDashboardStatsDto> {
    // Find the seller record for this user
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const sellerId = seller.id;

    // Execute all queries in parallel for better performance
    const [
      totalServices,
      activePurchases,
      completedPurchases,
      totalEarnings,
      recentPurchases,
    ] = await Promise.all([
      // Count seller's services
      this.prisma.service.count({
        where: { sellerId },
      }),

      // Count active purchases (pending + accepted)
      this.prisma.purchase.count({
        where: {
          sellerId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      }),

      // Count completed purchases
      this.prisma.purchase.count({
        where: {
          sellerId,
          status: 'COMPLETED',
        },
      }),

      // Calculate total earnings from completed payments
      this.prisma.payment.aggregate({
        where: {
          purchase: {
            sellerId,
            status: { in: ['ACCEPTED', 'COMPLETED'] },
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // Fetch recent purchases with related data
      this.prisma.purchase.findMany({
        where: { sellerId },
        take: 5,
        orderBy: { createdAt: 'desc' },
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
      }),
    ]);

    // Calculate total purchases
    const totalPurchases = activePurchases + completedPurchases;

    // Calculate completion rate
    const completionRate =
      totalPurchases > 0
        ? Math.round((completedPurchases / totalPurchases) * 100)
        : 0;

    // Placeholder for profile views - in a real app, this would come from an analytics service
    const profileViews = 100;

    return {
      totalServices,
      activePurchases,
      completedPurchases,
      completionRate,
      totalEarnings: totalEarnings._sum.amount || 0,
      recentPurchases,
      profileViews,
      rating: seller.rating,
    };
  }

  /**
   * Get buyer dashboard statistics
   */
  async getBuyerDashboardStats(
    userId: string,
  ): Promise<BuyerDashboardStatsDto> {
    // Find the buyer record for this user
    const buyer = await this.prisma.buyer.findFirst({
      where: { userId },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }

    const buyerId = buyer.id;

    // Execute all queries in parallel for better performance
    const [
      totalPurchases,
      activePurchases,
      completedPurchases,
      totalSpent,
      recentPurchases,
      recommendedSellers,
    ] = await Promise.all([
      // Count total purchases
      this.prisma.purchase.count({
        where: { buyerId },
      }),

      // Count active purchases (pending + accepted)
      this.prisma.purchase.count({
        where: {
          buyerId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      }),

      // Count completed purchases
      this.prisma.purchase.count({
        where: {
          buyerId,
          status: 'COMPLETED',
        },
      }),

      // Calculate total spent (sum of all payments)
      this.prisma.payment.aggregate({
        where: {
          purchase: {
            buyerId,
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // Fetch recent purchases with related data
      this.prisma.purchase.findMany({
        where: { buyerId },
        take: 5,
        orderBy: { createdAt: 'desc' },
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
      }),

      // Find recommended sellers (top-rated sellers)
      this.prisma.seller.findMany({
        take: 5,
        orderBy: { rating: 'desc' },
        where: { rating: { gt: 0 } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
          services: {
            where: { isAvailable: true },
            take: 3,
          },
        },
      }),
    ]);

    // Placeholder for favorites - in a real app, this would come from a favorites table
    const favoriteSellers = [];

    return {
      totalPurchases,
      activePurchases,
      completedPurchases,
      totalSpent: totalSpent._sum.amount || 0,
      recentPurchases,
      favoriteSellers,
      recommendedSellers,
    };
  }
}
