import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsService } from './stats.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, StatsService],
  controllers: [UsersController],
  exports: [UsersService, StatsService],
})
export class UsersModule {}
