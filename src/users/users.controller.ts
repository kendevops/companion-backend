/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { StatsService } from './stats.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly statsService: StatsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Get('sellers')
  findSellers(@Query('query') query?: string) {
    return this.usersService.findSellers(query);
  }

  @Get('sellers/:id')
  findSeller(@Param('id') id: string) {
    return this.usersService.findSellerDetail(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    // Only allow admins or the user themselves to access
    if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Only allow admins or the user themselves to update
    if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
      throw new ForbiddenException(
        'You do not have permission to update this resource',
      );
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

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
