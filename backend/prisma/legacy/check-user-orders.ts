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
  const legacyId = 5;

  console.log('\n==============================================');
  console.log('🔍 LEGACY USER ORDER DIAGNOSTIC');
  console.log('==============================================\n');

  const user = await prisma.user.findUnique({
    where: {
      legacyId,
    },
    select: {
      id: true,
      legacyId: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
    },
  });

  if (!user) {
    console.log(`❌ No user found with legacyId ${legacyId}`);
    return;
  }

  console.log('👤 USER');
  console.log('------------------------------');
  console.log('DB User ID   :', user.id);
  console.log('Legacy ID    :', user.legacyId);
  console.log('Name         :', user.name);
  console.log('Email        :', user.email);
  console.log('Phone        :', user.phone);
  console.log('Active       :', user.isActive);

  const orders = await prisma.order.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      orderNumber: true,
      legacyId: true,
      status: true,
      createdAt: true,
      total: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log('\n📦 ORDERS LINKED TO THIS USER');
  console.log('------------------------------');
  console.log('Order count:', orders.length);

  if (orders.length === 0) {
    console.log('❌ ZERO ORDERS LINKED TO THIS USER');
  } else {
    for (const order of orders.slice(0, 20)) {
      console.log({
        id: order.id,
        orderNumber: order.orderNumber,
        legacyId: order.legacyId,
        status: order.status,
        total: order.total?.toString(),
        userId: order.userId,
        createdAt: order.createdAt,
      });
    }

    if (orders.length > 20) {
      console.log(`... and ${orders.length - 20} more orders`);
    }
  }

  console.log('\n==============================================');
  console.log('🔎 LEGACY ORDER SAMPLE');
  console.log('==============================================\n');

  const legacyOrders = await prisma.order.findMany({
    where: {
      legacyId: {
        not: null,
      },
    },
    select: {
      id: true,
      orderNumber: true,
      legacyId: true,
      userId: true,
    },
    orderBy: {
      legacyId: 'asc',
    },
    take: 20,
  });

  for (const order of legacyOrders) {
    console.log({
      legacyOrderId: order.legacyId,
      orderId: order.id,
      userId: order.userId,
      belongsToCurrentUser: order.userId === user.id,
    });
  }

  console.log('\n==============================================');
  console.log('🎉 DIAGNOSTIC COMPLETE');
  console.log('==============================================\n');
}

main()
  .catch((error) => {
    console.error('\n❌ DIAGNOSTIC FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
