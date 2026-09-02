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
  console.log('🛠️ SHOPE2DOOR CART COLLISION REPAIR');
  console.log('================================================');
  console.log('');

  const repairs = [
    {
      existingLegacyId: 512,
      missingLegacyId: 513,
      expectedQuantity: 2,
      reason:
        'Legacy rows 512 + 513 represent the same user/product/variant.',
    },
    {
      existingLegacyId: 691,
      missingLegacyId: 692,
      expectedQuantity: 1,
      reason:
        'Legacy rows 691 + 692 represent the same user/product/variant; row 692 has quantity 0.',
    },
    {
      existingLegacyId: 1119,
      missingLegacyId: 1120,
      expectedQuantity: 2,
      reason:
        'Legacy rows 1119 + 1120 represent the same user/product/variant.',
    },
  ];

  await prisma.$transaction(async (tx) => {
    for (const repair of repairs) {
      const item = await tx.cartItem.findFirst({
        where: {
          legacyId: repair.existingLegacyId,
        },
      });

      if (!item) {
        throw new Error(
          `Cart item with legacyId ${repair.existingLegacyId} was not found`,
        );
      }

      console.log(
        `Legacy ${repair.existingLegacyId} + ${repair.missingLegacyId}`,
      );

      console.log(
        `Current quantity: ${item.quantity}`,
      );

      console.log(
        `Correct quantity: ${repair.expectedQuantity}`,
      );

      console.log(
        `Reason: ${repair.reason}`,
      );

      await tx.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity: repair.expectedQuantity,
        },
      });

      console.log('✅ Repaired');
      console.log('');
    }
  });

  console.log('================================================');
  console.log('🎉 CART COLLISION REPAIR COMPLETED');
  console.log('================================================');
  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error('❌ CART REPAIR FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });