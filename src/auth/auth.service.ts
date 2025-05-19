/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  // Store password reset tokens temporarily (would use a proper storage in production)
  private passwordResetTokens: Map<string, { email: string; expires: Date }> =
    new Map();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // Check if the user is a seller and get onboarding status
    let onboardingRequired = false;
    let nextOnboardingStep: string | null = null;

    if (user.role === UserRole.SELLER) {
      // Get the seller record
      const seller = await this.prisma.seller.findFirst({
        where: { userId: user.id },
      });

      if (!seller || !seller.onboardingCompleted) {
        onboardingRequired = true;

        // Determine next step
        if (!seller || !seller.bio || seller.profilePictures.length === 0) {
          nextOnboardingStep = 'profile';
        } else {
          // Check if services exist
          const servicesCount = await this.prisma.service.count({
            where: { sellerId: seller.id },
          });

          if (servicesCount < 3) {
            nextOnboardingStep = 'services';
          } else {
            nextOnboardingStep = 'complete';
          }
        }
      }
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user with email or username already exists
    const existingEmail = await this.usersService.findByEmail(
      registerDto.email,
    );
    if (existingEmail) {
      throw new BadRequestException('Email already in use');
    }

    const existingUsername = await this.usersService.findByUsername(
      registerDto.username,
    );
    if (existingUsername) {
      throw new BadRequestException('Username already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create the user based on role
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Return the JWT token and user info
    return this.login(user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Check if the user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      // Still return a success response
      return {
        message:
          'If your email is registered, you will receive a password reset link.',
      };
    }

    // Generate a reset token
    const token = uuidv4();

    // Set token expiration (1 hour)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Store the token (in a real app, this would be stored in a database)
    this.passwordResetTokens.set(token, { email, expires });

    // In a real application, you would send an email with the reset link
    // For this demo, we'll just return the token
    const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    console.log(`Password reset link for ${email}: ${resetLink}`);

    return {
      message:
        'If your email is registered, you will receive a password reset link.',
      // Only for development/demo purposes:
      token,
      resetLink,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Check if the token exists and is valid
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Check if the token has expired
    if (tokenData.expires < new Date()) {
      // Remove expired token
      this.passwordResetTokens.delete(token);
      throw new BadRequestException('Token has expired');
    }

    // Find the user by email
    const user = await this.usersService.findByEmail(tokenData.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Remove the used token
    this.passwordResetTokens.delete(token);

    return { message: 'Password has been reset successfully' };
  }
}
