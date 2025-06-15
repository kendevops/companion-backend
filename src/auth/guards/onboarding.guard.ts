/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route should skip onboarding check
    const skipOnboardingCheck = this.reflector.getAllAndOverride<boolean>(
      'skipOnboardingCheck',
      [context.getHandler(), context.getClass()],
    );

    if (skipOnboardingCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only check onboarding for sellers
    if (!user || user.role !== UserRole.SELLER) {
      return true;
    }

    // Check if seller has completed onboarding
    const seller = await this.prisma.seller.findUnique({
      where: { userId: user.id },
    });

    if (!seller || !seller.onboardingCompleted) {
      throw new ForbiddenException({
        message: 'Onboarding required',
        requiresOnboarding: true,
      });
    }

    return true;
  }
}
