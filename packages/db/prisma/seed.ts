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

const holidayTypes = [
  { name: '1 Ocak — Yılbaşı', category: 'FIXED_DATE' as const },
  { name: '23 Nisan — Ulusal Egemenlik', category: 'FIXED_DATE' as const },
  { name: '1 Mayıs — Emek ve Dayanışma', category: 'FIXED_DATE' as const },
  { name: "19 Mayıs — Atatürk'ü Anma", category: 'FIXED_DATE' as const },
  { name: '15 Temmuz — Demokrasi', category: 'FIXED_DATE' as const },
  { name: '30 Ağustos — Zafer Bayramı', category: 'FIXED_DATE' as const },
  { name: '29 Ekim — Cumhuriyet Bayramı', category: 'FIXED_DATE' as const },
  { name: 'Ramazan Ayı', category: 'LUNAR' as const },
  { name: 'Ramazan Bayramı', category: 'LUNAR' as const },
  { name: 'Kurban Bayramı', category: 'LUNAR' as const },
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

  console.log('Seeding HolidayType...');
  for (const holidayType of holidayTypes) {
    await prisma.holidayType.upsert({
      where: { name: holidayType.name },
      update: {},
      create: holidayType,
    });
  }

  console.log(`Seeded ${platforms.length} platforms and ${holidayTypes.length} holiday types.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
