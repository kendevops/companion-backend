import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UserRole, Service } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createServiceDto: CreateServiceDto,
    userId: string,
  ): Promise<Service> {
    // Get the seller ID from the user ID
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Only sellers can create services');
    }

    return this.prisma.service.create({
      data: {
        ...createServiceDto,
        sellerId: seller.id,
      },
    });
  }

  async findAll(query?: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: {
        isAvailable: true,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        seller: {
          include: {
            user: {
              select: {
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllBySeller(sellerId: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: {
        sellerId,
      },
    });
  }

  async findAllByUserId(userId: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: {
        seller: {
          userId,
        },
      },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            user: {
              select: {
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
    userId: string,
  ): Promise<Service> {
    // Get the service to check ownership
    const service = await this.findOne(id);

    // Get the seller associated with the user
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Only sellers can update services');
    }

    // Check if the user is the owner of the service
    if (service.sellerId !== seller.id) {
      throw new ForbiddenException('You can only update your own services');
    }

    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
    });
  }

  async remove(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Service> {
    // Get the service to check ownership
    const service = await this.findOne(id);

    // If admin, allow deletion regardless of ownership
    if (userRole === UserRole.ADMIN) {
      return this.prisma.service.delete({ where: { id } });
    }

    // Get the seller associated with the user
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Only sellers can delete services');
    }

    // Check if the user is the owner of the service
    if (service.sellerId !== seller.id) {
      throw new ForbiddenException('You can only delete your own services');
    }

    return this.prisma.service.delete({
      where: { id },
    });
  }

  async toggleAvailability(id: string, userId: string): Promise<Service> {
    // Get the service to check ownership
    const service = await this.findOne(id);

    // Get the seller associated with the user
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Only sellers can update services');
    }

    // Check if the user is the owner of the service
    if (service.sellerId !== seller.id) {
      throw new ForbiddenException('You can only update your own services');
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        isAvailable: !service.isAvailable,
      },
    });
  }
}
