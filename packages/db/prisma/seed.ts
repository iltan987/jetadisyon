import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env['DATABASE_URL']!,
  }),
});

const platforms = [
  { name: 'Yemeksepeti', slug: 'yemeksepeti' },
  { name: 'Trendyol Go', slug: 'trendyol-go' },
  { name: 'Getir', slug: 'getir' },
  { name: 'Migros Yemek', slug: 'migros-yemek' },
];

async function main() {
  console.log('Seeding DeliveryPlatform...');
  for (const platform of platforms) {
    await prisma.deliveryPlatform.upsert({
      where: { slug: platform.slug },
      update: {},
      create: platform,
    });
  }
  console.log(`Seeded ${platforms.length} platforms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
