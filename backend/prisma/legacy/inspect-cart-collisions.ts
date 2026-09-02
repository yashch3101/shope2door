import 'dotenv/config';

import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔍 CART COLLISION INSPECTION');
  console.log('================================================');
  console.log('');

  const legacyIds = [512, 513, 691, 692, 1119, 1120];

  const items = await prisma.cartItem.findMany({
    where: {
      legacyId: {
        in: legacyIds,
      },
    },
    include: {
      cart: {
        select: {
          id: true,
          userId: true,
        },
      },
      product: {
        select: {
          id: true,
          legacyId: true,
          name: true,
        },
      },
      variant: {
        select: {
          id: true,
          legacyId: true,
          name: true,
        },
      },
    },
    orderBy: {
      legacyId: 'asc',
    },
  });

  for (const item of items) {
    console.log('----------------------------------------------');

    console.log(`DB CartItem ID : ${item.id}`);
    console.log(`Legacy ID      : ${item.legacyId}`);
    console.log(`User ID        : ${item.cart.userId}`);
    console.log(`Product ID     : ${item.product.id}`);
    console.log(
      `Product Legacy : ${item.product.legacyId}`,
    );
    console.log(
      `Product Name   : ${item.product.name}`,
    );

    console.log(
      `Variant ID     : ${item.variant?.id ?? 'NULL'}`,
    );

    console.log(
      `Variant Legacy : ${item.variant?.legacyId ?? 'NULL'}`,
    );

    console.log(
      `Variant Name   : ${item.variant?.name ?? 'NULL'}`,
    );

    console.log(`Quantity       : ${item.quantity}`);

    console.log(
      `Image          : ${item.imageUrl ?? 'NULL'}`,
    );
  }

  console.log('');
  console.log('================================================');
  console.log(`Found ${items.length} collision rows in DB`);
  console.log('================================================');
  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error('❌ INSPECTION FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });