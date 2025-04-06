/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed the database...');

  // Clean the database
  await prisma.review.deleteMany();
  await prisma.purchaseService.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.service.deleteMany();
  await prisma.contactDetails.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  await prisma.admin.create({
    data: {
      userId: admin.id,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create sellers
  const sellers = [
    {
      name: 'Sophia Reynolds',
      email: 'sophia@example.com',
      username: 'sophiarey',
      password: 'password123',
      profilePictures: ['/uploads/sophia1.jpg', '/uploads/sophia2.jpg'],
      bio: 'Professional stylist with 5+ years of experience helping clients discover their personal style.',
      verified: true,
      rating: 4.8,
      contactDetails: {
        phoneNumber: '+1234567890',
        instagram: 'sophiastyle',
        wechat: 'sophiastyle',
      },
      services: [
        {
          title: 'Personal Shopping',
          description:
            'I will help you find the perfect outfits for any occasion.',
          price: 150,
        },
        {
          title: 'Style Consultation',
          description: 'Get professional advice on your style.',
          price: 120,
        },
        {
          title: 'Wardrobe Organization',
          description:
            'I will help you organize your wardrobe for maximum efficiency.',
          price: 200,
        },
      ],
    },
    {
      name: 'Marcus Chen',
      email: 'marcus@example.com',
      username: 'marcuschen',
      password: 'password123',
      profilePictures: ['/uploads/marcus1.jpg'],
      bio: 'Professional photographer and city guide with in-depth knowledge of local attractions.',
      verified: true,
      rating: 4.6,
      contactDetails: {
        phoneNumber: '+1987654321',
        instagram: 'marcusexplores',
        wechat: 'marcuschen',
      },
      services: [
        {
          title: 'City Tour Guide',
          description:
            'Explore the hidden gems of the city with a local guide.',
          price: 200,
        },
        {
          title: 'Photography Session',
          description: 'Professional photography during your tour.',
          price: 300,
        },
      ],
    },
  ];

  for (const sellerData of sellers) {
    const hashedPassword = await bcrypt.hash(sellerData.password, 10);

    const user = await prisma.user.create({
      data: {
        name: sellerData.name,
        email: sellerData.email,
        username: sellerData.username,
        password: hashedPassword,
        role: UserRole.SELLER,
      },
    });

    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        profilePictures: sellerData.profilePictures,
        verified: sellerData.verified,
        rating: sellerData.rating,
      },
    });

    await prisma.contactDetails.create({
      data: {
        sellerId: seller.id,
        phoneNumber: sellerData.contactDetails.phoneNumber,
        instagram: sellerData.contactDetails.instagram,
        wechat: sellerData.contactDetails.wechat,
      },
    });

    for (const serviceData of sellerData.services) {
      await prisma.service.create({
        data: {
          sellerId: seller.id,
          title: serviceData.title,
          description: serviceData.description,
          price: serviceData.price,
          isAvailable: true,
        },
      });
    }

    console.log('Created seller:', user.email);
  }

  // Create buyers
  const buyers = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: 'password123',
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      password: 'password123',
    },
  ];

  for (const buyerData of buyers) {
    const hashedPassword = await bcrypt.hash(buyerData.password, 10);

    const user = await prisma.user.create({
      data: {
        name: buyerData.name,
        email: buyerData.email,
        username: buyerData.username,
        password: hashedPassword,
        role: UserRole.BUYER,
      },
    });

    await prisma.buyer.create({
      data: {
        userId: user.id,
      },
    });

    console.log('Created buyer:', user.email);
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
