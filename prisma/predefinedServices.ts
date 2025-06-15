/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const predefinedServices = [
  // Personal Services
  {
    name: 'Video Call 😘',
    description: 'You can have a video call with me for 15 minutes',
    category: 'Personal Services',
    basePrice: 100,
  },
  {
    name: 'Message Me 🥰',
    description:
      'You can send me a message and I will reply to you in the next 48 hours',
    category: 'Personal Services',
    basePrice: 100,
  },
  {
    name: 'Coffee Date ☕',
    description: 'Get a Coffee with me at Brick Lane Melbourne',
    category: 'Personal Services',
    basePrice: 130,
  },
  // Travel & Tourism
  {
    name: 'City Tour Guide',
    description: 'Show visitors the hidden gems and attractions of the city',
    category: 'Travel & Tourism',
    basePrice: 200.0,
  },
  {
    name: 'Travel Planning',
    description: 'Plan and organize complete travel itineraries',
    category: 'Travel & Tourism',
    basePrice: 300.0,
  },
  {
    name: 'Photography Tour',
    description: 'Guide photography tours to the best scenic locations',
    category: 'Travel & Tourism',
    basePrice: 250.0,
  },
  {
    name: 'Cultural Experience Guide',
    description: 'Provide authentic cultural experiences and local insights',
    category: 'Travel & Tourism',
    basePrice: 180.0,
  },
];

export async function seedPredefinedServices() {
  console.log('Seeding predefined services...');

  for (const service of predefinedServices) {
    await prisma.predefinedService.upsert({
      where: { name: service.name },
      update: {
        description: service.description,
        category: service.category,
        basePrice: service.basePrice,
        isActive: true,
      },
      create: service,
    });
  }

  console.log(`Seeded ${predefinedServices.length} predefined services`);
}

// Run this if called directly
if (require.main === module) {
  seedPredefinedServices()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
