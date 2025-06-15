import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { OnboardingGuard } from './auth/guards/onboarding.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PurchasesModule } from './purchases/purchases.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadsModule } from './uploads/uploads.module';
import { ServiceTemplatesModule } from './service-templates/service-templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    PurchasesModule,
    PaymentsModule,
    ReviewsModule,
    UploadsModule,
    ServiceTemplatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OnboardingGuard,
    },
  ],
})
export class AppModule {}
