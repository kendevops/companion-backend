// import { User, Purchase, Payment } from '@prisma/client';

export class AdminDashboardStatsDto {
  totalUsers: number;
  totalSellers: number;
  totalBuyers: number;
  totalServices: number;
  totalPurchases: number;
  totalCompletedPurchases: number;
  totalRevenue: number;
  pendingPayouts: number;
  completionRate: number;
  recentPurchases: any[];
  recentUsers: any[];
}
