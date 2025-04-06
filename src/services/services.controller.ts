/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles(UserRole.SELLER)
  create(@Body() createServiceDto: CreateServiceDto, @Request() req) {
    return this.servicesService.create(createServiceDto, req.user.id);
  }

  @Get()
  findAll(@Query('query') query?: string) {
    return this.servicesService.findAll(query);
  }

  @Get('seller/:sellerId')
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.servicesService.findAllBySeller(sellerId);
  }

  @Get('my-services')
  @Roles(UserRole.SELLER)
  findMySellerId(@Request() req) {
    return this.servicesService.findAllByUserId(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SELLER)
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Request() req,
  ) {
    return this.servicesService.update(id, updateServiceDto, req.user.id);
  }

  @Patch(':id/toggle-availability')
  @Roles(UserRole.SELLER)
  toggleAvailability(@Param('id') id: string, @Request() req) {
    return this.servicesService.toggleAvailability(id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.servicesService.remove(id, req.user.id, req.user.role);
  }
}
