/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Request, ForbiddenException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * Get dashboard statistics based on user role
   */
  @Get('dashboard-stats')
  async getDashboardStats(@Request() req) {
    const { id, role } = req.user as { id: string; role: UserRole };

    switch (role) {
      case UserRole.ADMIN:
        return this.statsService.getAdminDashboardStats();

      case UserRole.SELLER:
        return this.statsService.getSellerDashboardStats(id);

      case UserRole.BUYER:
        return this.statsService.getBuyerDashboardStats(id);

      default:
        throw new ForbiddenException('Invalid user role');
    }
  }

  /**
   * Admin-only endpoint to get all dashboard stats
   */
  @Get('admin-dashboard-stats')
  @Roles(UserRole.ADMIN)
  getAdminDashboardStats() {
    return this.statsService.getAdminDashboardStats();
  }

  /**
   * Seller-only endpoint to get seller dashboard stats
   */
  @Get('seller-dashboard-stats')
  @Roles(UserRole.SELLER)
  getSellerDashboardStats(@Request() req) {
    return this.statsService.getSellerDashboardStats(req.user.id);
  }

  /**
   * Buyer-only endpoint to get buyer dashboard stats
   */
  @Get('buyer-dashboard-stats')
  @Roles(UserRole.BUYER)
  getBuyerDashboardStats(@Request() req) {
    return this.statsService.getBuyerDashboardStats(req.user.id);
  }
}
