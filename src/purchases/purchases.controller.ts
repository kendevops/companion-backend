import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles(UserRole.BUYER)
  create(@Body() createPurchaseDto: CreatePurchaseDto, @Request() req) {
    return this.purchasesService.create(createPurchaseDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.purchasesService.findAll(req.user.id, req.user.role);
  }

  @Get('status/:status')
  getByStatus(@Param('status') status: string, @Request() req) {
    return this.purchasesService.getPurchasesByStatus(
      status,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.purchasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePurchaseDto: UpdatePurchaseDto,
    @Request() req,
  ) {
    return this.purchasesService.update(
      id,
      updatePurchaseDto,
      req.user.id,
      req.user.role,
    );
  }
}
