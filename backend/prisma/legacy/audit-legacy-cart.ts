import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const SQL_FILE = path.join(__dirname, 'legacy.sql');

type Row = Array<string | null>;

function splitTuples(sql: string): string[] {
  const rows: string[] = [];

  let inside = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];

    if (inside) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (c === '\\') {
        escaped = true;
        continue;
      }

      if (c === "'") {
        if (sql[i + 1] === "'") {
          i++;
          continue;
        }

        inside = false;
      }

      continue;
    }

    if (c === "'") {
      inside = true;
      continue;
    }

    if (c === '(') {
      if (depth === 0) {
        start = i + 1;
      }

      depth++;
      continue;
    }

    if (c === ')') {
      depth--;

      if (depth === 0 && start !== -1) {
        rows.push(sql.slice(start, i));
        start = -1;
      }
    }
  }

  return rows;
}

function splitFields(row: string): string[] {
  const fields: string[] = [];

  let current = '';
  let inside = false;
  let escaped = false;

  for (let i = 0; i < row.length; i++) {
    const c = row[i];

    if (inside) {
      if (escaped) {
        current += c;
        escaped = false;
        continue;
      }

      if (c === '\\') {
        escaped = true;
        current += c;
        continue;
      }

      if (c === "'") {
        if (row[i + 1] === "'") {
          current += "'";
          i++;
          continue;
        }

        inside = false;
        continue;
      }

      current += c;
      continue;
    }

    if (c === "'") {
      inside = true;
      continue;
    }

    if (c === ',') {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += c;
  }

  fields.push(current.trim());

  return fields;
}

function parseValue(value: string): string | null {
  const v = value.trim();

  if (!v || v.toUpperCase() === 'NULL') {
    return null;
  }

  return v;
}

function rows(sql: string, table: string): Row[] {
  const regex = new RegExp(
    `INSERT\\s+INTO\\s+\\\`${table}\\\`[\\s\\S]*?VALUES\\s*`,
    'i',
  );

  const match = sql.match(regex);

  if (!match || match.index === undefined) {
    return [];
  }

  const start = match.index + match[0].length;

  const nextStatement = sql.indexOf(';', start);

  const valuesSql =
    nextStatement === -1
      ? sql.slice(start)
      : sql.slice(start, nextStatement);

  return splitTuples(valuesSql).map((tuple) =>
    splitFields(tuple).map(parseValue),
  );
}

function n(value: string | null): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔎 SHOPE2DOOR LEGACY CART DIAGNOSTIC');
  console.log('================================================');
  console.log('');

  if (!fs.existsSync(SQL_FILE)) {
    throw new Error(`Legacy SQL not found: ${SQL_FILE}`);
  }

  const sql = fs.readFileSync(SQL_FILE, 'utf8');

  const cartRows = rows(sql, 'cart_items');

  console.log(`Legacy SQL cart rows: ${cartRows.length}`);
  console.log('');

  const legacyIds = cartRows
    .map((r) => n(r[0]))
    .filter(Boolean);

  const dbItems = await prisma.cartItem.findMany({
    where: {
      legacyId: {
        not: null,
      },
    },
    select: {
      id: true,
      legacyId: true,
      cartId: true,
      productId: true,
      variantId: true,
      quantity: true,
    },
  });

  const importedLegacyIds = new Set(
    dbItems.map((item) => item.legacyId),
  );

  const missingLegacyIds = legacyIds.filter(
    (id) => !importedLegacyIds.has(id),
  );

  console.log(
    `Imported legacy cart rows: ${dbItems.length}`,
  );

  console.log(
    `Missing legacy cart IDs: ${missingLegacyIds.length}`,
  );

  console.log('');

  console.log('❌ MISSING LEGACY CART ROWS');
  console.log('------------------------------');

  for (const legacyId of missingLegacyIds) {
    const row = cartRows.find(
      (r) => n(r[0]) === legacyId,
    );

    if (!row) continue;

    console.log('');
    console.log(`Legacy cart ID : ${legacyId}`);
    console.log(`Legacy user ID : ${n(row[1])}`);
    console.log(`Legacy product : ${n(row[2])}`);
    console.log(
      `Legacy variant : ${row[3] ? n(row[3]) : 'NULL'}`,
    );
    console.log(`Quantity    : ${row[4]}`);
    console.log(`Image          : ${row[5] ?? 'NULL'}`);
  }

  console.log('');

  console.log('🔁 POSSIBLE USER/PRODUCT COLLISIONS');
  console.log('------------------------------');

  const collisionMap = new Map<
    string,
    number[]
  >();

  for (const row of cartRows) {
    const legacyId = n(row[0]);
    const userId = n(row[1]);
    const productId = n(row[2]);

    if (!legacyId || !userId || !productId) {
      continue;
    }

    const key = `${userId}:${productId}`;

    const existing =
      collisionMap.get(key) ?? [];

    existing.push(legacyId);

    collisionMap.set(key, existing);
  }

  let collisions = 0;

  for (const [key, ids] of collisionMap) {
    if (ids.length > 1) {
      collisions++;

      console.log(
        `${key} -> legacy cart IDs: ${ids.join(', ')}`,
      );
    }
  }

  if (collisions === 0) {
    console.log('No user/product collisions found.');
  } else {
    console.log('');
    console.log(
      `Total collision groups: ${collisions}`,
    );
  }

  console.log('');
  console.log('================================================');
  console.log('🔍 CART DIAGNOSTIC COMPLETE');
  console.log('================================================');
  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error('❌ CART DIAGNOSTIC FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });