/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceTemplateDto } from './dto/service-template.dto';

@Injectable()
export class ServiceTemplatesService {
  constructor(private prisma: PrismaService) {
    // Seed some initial service templates if none exist
    this.seedTemplatesIfEmpty();
  }

  async findAll() {
    return this.prisma.serviceTemplate.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.serviceTemplate.findUnique({
      where: { id },
    });
  }

  async findByCategory(category: string) {
    return this.prisma.serviceTemplate.findMany({
      where: { category },
      orderBy: { title: 'asc' },
    });
  }

  async create(createServiceTemplateDto: ServiceTemplateDto) {
    return this.prisma.serviceTemplate.create({
      data: createServiceTemplateDto,
    });
  }

  async update(id: string, updateServiceTemplateDto: ServiceTemplateDto) {
    return this.prisma.serviceTemplate.update({
      where: { id },
      data: updateServiceTemplateDto,
    });
  }

  async remove(id: string) {
    return this.prisma.serviceTemplate.delete({
      where: { id },
    });
  }

  // Seed initial service templates
  private async seedTemplatesIfEmpty() {
    const count = await this.prisma.serviceTemplate.count();

    if (count === 0) {
      console.log('Seeding service templates...');

      const templates = [
        // Personal Services
        {
          title: 'Video Call 😘',
          description: 'You can have a video call with me for 15 minutes',
          recommendedPrice: 100,
          category: 'Personal Services',
        },
        {
          title: 'Message Me 🥰',
          description:
            'You can send me a message and I will reply to you in the next 48 hours',
          recommendedPrice: 100,
          category: 'Personal Services',
        },
        {
          title: 'Coffee Date ☕',
          description: 'Get a Coffee with me at Brick Lane Melbourne',
          recommendedPrice: 130,
          category: 'Personal Services',
        },

        // Travel & Experience
        {
          title: 'City Tour Guide',
          description:
            'We can explore the city together and I will show you around',
          recommendedPrice: 200,
          category: 'Travel & Experience',
        },
        {
          title: 'Photography Session',
          description:
            'Professional photography during tours or special occasions',
          recommendedPrice: 300,
          category: 'Travel & Experience',
        },
        {
          title: 'Local Experience Host',
          description: 'Provide unique local experiences for visitors',
          recommendedPrice: 150,
          category: 'Travel & Experience',
        },

        // Education
        {
          title: 'Language Tutoring',
          description: 'Teach languages to beginners or advanced learners',
          recommendedPrice: 50,
          category: 'Education',
        },
        {
          title: 'Academic Tutoring',
          description: 'Help students excel in specific academic subjects',
          recommendedPrice: 60,
          category: 'Education',
        },
        {
          title: 'Workshop Host',
          description: 'Host workshops on your area of expertise',
          recommendedPrice: 100,
          category: 'Education',
        },

        // Health & Fitness
        {
          title: 'Personal Training',
          description: 'Personalized workout plans and training sessions',
          recommendedPrice: 80,
          category: 'Health & Fitness',
        },
        {
          title: 'Nutrition Coaching',
          description: 'Custom meal plans to reach fitness goals',
          recommendedPrice: 120,
          category: 'Health & Fitness',
        },
        {
          title: 'Yoga Instruction',
          description: 'Private yoga sessions for individuals or groups',
          recommendedPrice: 70,
          category: 'Health & Fitness',
        },

        // Creative Services
        {
          title: 'Portrait Photography',
          description: 'Professional portrait photography sessions',
          recommendedPrice: 250,
          category: 'Creative Services',
        },
        {
          title: 'Graphic Design',
          description: 'Custom graphic design for personal or business needs',
          recommendedPrice: 100,
          category: 'Creative Services',
        },
        {
          title: 'Content Creation',
          description: 'Create engaging content for social media or websites',
          recommendedPrice: 150,
          category: 'Creative Services',
        },
      ];

      // Create all templates
      await this.prisma.serviceTemplate.createMany({
        data: templates,
      });

      console.log('Service templates seeded successfully!');
    }
  }
}
