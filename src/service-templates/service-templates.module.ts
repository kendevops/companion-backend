import { Module } from '@nestjs/common';
import { ServiceTemplatesService } from './service-templates.service';
import { ServiceTemplatesController } from './service-templates.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceTemplatesController],
  providers: [ServiceTemplatesService],
  exports: [ServiceTemplatesService],
})
export class ServiceTemplatesModule {}
