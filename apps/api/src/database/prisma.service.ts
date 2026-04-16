import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type { PrismaClient } from '@repo/db';
import { prisma } from '@repo/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: PrismaClient = prisma;

  async onModuleInit(): Promise<void> {
    await prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await prisma.$disconnect();
  }
}
