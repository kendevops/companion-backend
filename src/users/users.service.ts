import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const { role, ...userData } = createUserDto;

        // Create user with transaction to handle role-specific data
        return this.prisma.$transaction(async (prisma) => {
            // Create the base user
            const user = await prisma.user.create({
                data: userData as Prisma.UserCreateInput,
            });

            // Create role-specific record
            switch (role) {
                case UserRole.ADMIN:
                    await prisma.admin.create({
                        data: {
                            userId: user.id,
                        },
                    });
                    break;
                case UserRole.SELLER:
                    await prisma.seller.create({
                        data: {
                            userId: user.id,
                            profilePictures: [],
                            verified: false,
                            rating: 0,
                        },
                    });
                    break;
                case UserRole.BUYER:
                    await prisma.buyer.create({
                        data: {
                            userId: user.id,
                        },
                    });
                    break;
            }

            return user;
        });
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }