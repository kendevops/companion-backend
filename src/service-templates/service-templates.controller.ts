import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ServiceTemplatesService } from './service-templates.service';
import { ServiceTemplateDto } from './dto/service-template.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('service-templates')
export class ServiceTemplatesController {
  constructor(
    private readonly serviceTemplatesService: ServiceTemplatesService,
  ) {}

  @Get()
  @Public() // Make this public so new sellers can access it
  findAll() {
    return this.serviceTemplatesService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.serviceTemplatesService.findOne(id);
  }

  @Get('category/:category')
  @Public()
  findByCategory(@Param('category') category: string) {
    return this.serviceTemplatesService.findByCategory(category);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createServiceTemplateDto: ServiceTemplateDto) {
    return this.serviceTemplatesService.create(createServiceTemplateDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateServiceTemplateDto: ServiceTemplateDto,
  ) {
    return this.serviceTemplatesService.update(id, updateServiceTemplateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.serviceTemplatesService.remove(id);
  }
}
