import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, StatsService, OnboardingService],
  controllers: [UsersController, StatsController, OnboardingController],
  exports: [UsersService, StatsService],
})
export class UsersModule {}
