import {
  Controller,
  Get,
  Post,
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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
