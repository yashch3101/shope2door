import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n==============================================');
  console.log('🔎 FIND LEGACY USERS WITH ORDERS');
  console.log('==============================================\n');

  const users = await prisma.user.findMany({
    where: {
      legacyId: {
        not: null,
      },
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      legacyId: true,
      name: true,
      email: true,
      phone: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      legacyId: 'asc',
    },
  });

  const usersWithOrders = users.filter(
    (user) => user._count.orders > 0,
  );

  console.log(
    `Found ${usersWithOrders.length} legacy users with orders.\n`,
  );

  for (const user of usersWithOrders.slice(0, 20)) {
    console.log({
      legacyId: user.legacyId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      orderCount: user._count.orders,
      dbUserId: user.id,
    });
  }
}

main()
  .catch((error) => {
    console.error('\n❌ FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });