import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../../src/generated/prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not defined. Make sure backend/.env exists and contains DATABASE_URL.',
  );
}

const adapter =
  new PrismaPg({
    connectionString: DATABASE_URL,
  });

const prisma =
  new PrismaClient({
    adapter,
  });

const SQL_FILE =
  path.join(
    __dirname,
    'legacy.sql',
  );

// ============================================================
// TYPES
// ============================================================

type SqlRow = Array<string | null>;

type LegacyCategory = {
  id: number;
  name: string | null;
  image: string | null;
  status: number;
};

type LegacyProduct = {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  types: string;
};

type LegacyVariant = {
  id: number;
  productId: number;
  name: string;
  price: number;
  sellingPrice: number;
  wholesalePrice: number;
  stock: number;
};

type LegacyImage = {
  id: number;
  productId: number;
  imageUrl: string;
};

type LegacyInfo = {
  id: number;
  productId: number;
  attribute: string;
  value: string;
};

type LegacyHighlight = {
  id: number;
  productId: number;
  attribute: string;
  value: string;
};

type LegacyBanner = {
  id: number;
  categoryId: number;
  image: string;
};

// ============================================================
// SQL PARSER
// ============================================================

function splitTuples(
  sql: string,
): string[] {
  const rows: string[] = [];

  let insideString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (
    let i = 0;
    i < sql.length;
    i++
  ) {
    const char = sql[i];

    if (insideString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === "'") {
        if (
          sql[i + 1] === "'"
        ) {
          i++;
          continue;
        }

        insideString = false;
      }

      continue;
    }

    if (char === "'") {
      insideString = true;
      continue;
    }

    if (char === '(') {
      if (depth === 0) {
        start = i + 1;
      }

      depth++;

      continue;
    }

    if (char === ')') {
      depth--;

      if (
        depth === 0 &&
        start !== -1
      ) {
        rows.push(
          sql.slice(
            start,
            i,
          ),
        );

        start = -1;
      }
    }
  }

  return rows;
}

function splitFields(
  row: string,
): string[] {
  const fields: string[] = [];

  let current = '';

  let insideString = false;
  let escaped = false;

  for (
    let i = 0;
    i < row.length;
    i++
  ) {
    const char = row[i];

    if (insideString) {
      current += char;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === "'") {
        if (
          row[i + 1] === "'"
        ) {
          current += "'";
          i++;
          continue;
        }

        insideString = false;
      }

      continue;
    }

    if (char === "'") {
      insideString = true;
      current += char;
      continue;
    }

    if (char === ',') {
      fields.push(
        current.trim(),
      );

      current = '';

      continue;
    }

    current += char;
  }

  fields.push(
    current.trim(),
  );

  return fields;
}

function parseSqlValue(
  value: string,
): string | null {
  const trimmed =
    value.trim();

  if (
    trimmed.toUpperCase() ===
    'NULL'
  ) {
    return null;
  }

  if (
    trimmed.startsWith("'") &&
    trimmed.endsWith("'")
  ) {
    return trimmed
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .replace(/''/g, "'");
  }

  return trimmed;
}

function extractTableRows(
  sql: string,
  tableName: string,
): SqlRow[] {
  const pattern = new RegExp(
    'INSERT INTO `' +
      tableName +
      '`[\\s\\S]*?VALUES\\s*([\\s\\S]*?);',
    'gi',
  );

  const result: SqlRow[] = [];

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sql)) !== null) {
    const tuples = splitTuples(match[1]);

    for (const tuple of tuples) {
      const fields = splitFields(tuple);

      result.push(
        fields.map((value) =>
          parseSqlValue(value),
        ),
      );
    }
  }

  return result;
}

// ============================================================
// HELPERS
// ============================================================

function numberValue(
  value: string | null,
  fallback = 0,
): number {
  if (
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const result =
    Number(value);

  return Number.isFinite(result)
    ? result
    : fallback;
}

function textValue(
  value: string | null,
  fallback = '',
): string {
  return value?.trim() ||
    fallback;
}

function slugify(
  value: string,
): string {
  return value
    .normalize('NFKD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      '-',
    )
    .replace(
      /^-+|-+$/g,
      '',
    )
    .slice(0, 200);
}

async function uniqueSlug(
  base: string,
  legacyId: number,
): Promise<string> {
  const cleanBase =
    slugify(base) ||
    `product-${legacyId}`;

  const existing =
    await prisma.product.findUnique(
      {
        where: {
          slug: cleanBase,
        },
        select: {
          id: true,
          legacyId: true,
        },
      },
    );

  if (
    !existing ||
    existing.legacyId ===
      legacyId
  ) {
    return cleanBase;
  }

  return `${cleanBase}-legacy-${legacyId}`;
}

async function uniqueCategorySlug(
  base: string,
  legacyId: number,
): Promise<string> {
  const cleanBase =
    slugify(base) ||
    `category-${legacyId}`;

  const existing =
    await prisma.category.findUnique(
      {
        where: {
          slug: cleanBase,
        },
        select: {
          id: true,
          legacyId: true,
        },
      },
    );

  if (
    !existing ||
    existing.legacyId ===
      legacyId
  ) {
    return cleanBase;
  }

  return `${cleanBase}-legacy-${legacyId}`;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log(
    '================================================',
  );
  console.log(
    '🚀 SHOPE2DOOR LEGACY CATALOG IMPORT',
  );
  console.log(
    '================================================',
  );
  console.log('');

  if (
    !fs.existsSync(SQL_FILE)
  ) {
    throw new Error(
      `Legacy SQL file not found:\n${SQL_FILE}`,
    );
  }

  console.log(
    `📄 SQL source: ${SQL_FILE}`,
  );

  const sql =
    fs.readFileSync(
      SQL_FILE,
      'utf8',
    );

  // ========================================================
  // PARSE
  // ========================================================

  console.log('');
  console.log(
    '🔎 Parsing legacy SQL...',
  );

  const categoryRows =
    extractTableRows(
      sql,
      'main_category',
    );

  const productRows =
    extractTableRows(
      sql,
      'products',
    );

  const variantRows =
    extractTableRows(
      sql,
      'product_variants',
    );

  const imageRows =
    extractTableRows(
      sql,
      'product_images',
    );

  const infoRows =
    extractTableRows(
      sql,
      'product_info',
    );

  const highlightRows =
    extractTableRows(
      sql,
      'product_highlights',
    );

  const bannerRows =
    extractTableRows(
      sql,
      'banner',
    );

  console.log(
    `📦 Categories parsed: ${categoryRows.length}`,
  );

  console.log(
    `🛒 Products parsed: ${productRows.length}`,
  );

  console.log(
    `🔀 Variants parsed: ${variantRows.length}`,
  );

  console.log(
    `🖼️ Images parsed: ${imageRows.length}`,
  );

  console.log(
    `ℹ️ Product info parsed: ${infoRows.length}`,
  );

  console.log(
    `⭐ Highlights parsed: ${highlightRows.length}`,
  );

  console.log(
    `🎨 Banners parsed: ${bannerRows.length}`,
  );

  // ========================================================
  // NORMALIZE
  // ========================================================

  const categories: LegacyCategory[] =
    categoryRows.map(
      (row) => ({
        id: numberValue(row[0]),
        name:
          row[1],
        image:
          row[2],
        status:
          numberValue(
            row[3],
            1,
          ),
      }),
    );

  const products: LegacyProduct[] =
    productRows.map(
      (row) => ({
        id: numberValue(row[0]),
        name:
          textValue(row[1]),
        description:
          textValue(row[2]),
        categoryId:
          numberValue(row[3]),
        types:
          textValue(row[4]),
      }),
    );

  const variants: LegacyVariant[] =
    variantRows.map(
      (row) => ({
        id: numberValue(row[0]),
        productId:
          numberValue(row[1]),
        name:
          textValue(row[2]),
        price:
          numberValue(row[3]),
        sellingPrice:
          numberValue(row[4]),
        wholesalePrice:
          numberValue(row[5]),
        stock:
          numberValue(row[6]),
      }),
    );

  const images: LegacyImage[] =
    imageRows.map(
      (row) => ({
        id: numberValue(row[0]),
        productId:
          numberValue(row[1]),
        imageUrl:
          textValue(row[2]),
      }),
    );

  const infos: LegacyInfo[] =
    infoRows.map(
      (row) => ({
        id: numberValue(row[0]),
        productId:
          numberValue(row[1]),
        attribute:
          textValue(row[2]),
        value:
          textValue(row[3]),
      }),
    );

  const highlights:
    LegacyHighlight[] =
    highlightRows.map(
      (row) => ({
        id: numberValue(row[0]),
        productId:
          numberValue(row[1]),
        attribute:
          textValue(row[2]),
        value:
          textValue(row[3]),
      }),
    );

  const banners: LegacyBanner[] =
    bannerRows.map(
      (row) => ({
        id: numberValue(row[0]),
        categoryId:
          numberValue(row[1]),
        image:
          textValue(row[2]),
      }),
    );

  // ========================================================
  // INDEXES
  // ========================================================

  const variantsByProduct =
    new Map<
      number,
      LegacyVariant[]
    >();

  for (
    const variant of variants
  ) {
    const list =
      variantsByProduct.get(
        variant.productId,
      ) ?? [];

    list.push(variant);

    variantsByProduct.set(
      variant.productId,
      list,
    );
  }

  const imagesByProduct =
    new Map<
      number,
      LegacyImage[]
    >();

  for (
    const image of images
  ) {
    const list =
      imagesByProduct.get(
        image.productId,
      ) ?? [];

    list.push(image);

    imagesByProduct.set(
      image.productId,
      list,
    );
  }

  const infoByProduct =
    new Map<
      number,
      LegacyInfo[]
    >();

  for (
    const info of infos
  ) {
    const list =
      infoByProduct.get(
        info.productId,
      ) ?? [];

    list.push(info);

    infoByProduct.set(
      info.productId,
      list,
    );
  }

  const highlightsByProduct =
    new Map<
      number,
      LegacyHighlight[]
    >();

  for (
    const highlight of highlights
  ) {
    const list =
      highlightsByProduct.get(
        highlight.productId,
      ) ?? [];

    list.push(highlight);

    highlightsByProduct.set(
      highlight.productId,
      list,
    );
  }

  const categoryMap =
    new Map<
      number,
      string
    >();

  const productMap =
    new Map<
      number,
      string
    >();

  // ========================================================
  // CATEGORY IMPORT
  // ========================================================

  console.log('');
  console.log(
    '📦 Importing categories...',
  );

  let categoryImported = 0;

  for (
    const category of categories
  ) {
    const name =
      category.name?.trim() ||
      `Category ${category.id}`;

    const slug =
      await uniqueCategorySlug(
        name,
        category.id,
      );

    const result =
      await prisma.category.upsert(
        {
          where: {
            legacyId:
              category.id,
          },

          create: {
            legacyId:
              category.id,

            name,

            slug,

            image:
              category.image,

            isActive:
              category.status === 1,

            sortOrder:
              category.id,
          },

          update: {
            name,

            slug,

            image:
              category.image,

            isActive:
              category.status === 1,

            sortOrder:
              category.id,
          },
        },
      );

    categoryMap.set(
      category.id,
      result.id,
    );

    categoryImported++;
  }

  console.log(
    `✅ Categories imported: ${categoryImported}`,
  );

  // ========================================================
  // PRODUCT IMPORT
  // ========================================================

  console.log('');
  console.log(
    '🛒 Importing products...',
  );

  let productImported = 0;
  let productSkipped = 0;

  for (
    const product of products
  ) {
    const categoryId =
      categoryMap.get(
        product.categoryId,
      );

    if (!categoryId) {
      console.warn(
        `⚠️ Product ${product.id} skipped: category ${product.categoryId} missing`,
      );

      productSkipped++;

      continue;
    }

    const productVariants =
      variantsByProduct.get(
        product.id,
      ) ?? [];

    if (productVariants.length === 0) {
      console.warn(
        `⚠️ Product ${product.id} has no variant — importing with fallback pricing/stock`,
      );
    }

    const primaryVariant =
      [...productVariants].sort(
        (a, b) =>
          a.id - b.id,
      )[0];

    // Some legacy products do not have a variant.
    // Do NOT skip those products. Preserve the product record and
    // use safe fallback values for required Product pricing fields.
    const price =
      primaryVariant?.sellingPrice ?? 0;

    const mrp =
      primaryVariant?.price ?? 0;

    const costPrice =
      primaryVariant?.wholesalePrice ?? null;

    const productImages =
      imagesByProduct.get(
        product.id,
      ) ?? [];

    const imageUrls =
      productImages
        .sort(
          (a, b) =>
            a.id - b.id,
        )
        .map(
          (image) =>
            image.imageUrl,
        )
        .filter(Boolean);

    const slug =
      await uniqueSlug(
        product.name,
        product.id,
      );

    const stock =
      productVariants.reduce(
        (sum, variant) =>
          sum + variant.stock,
        0,
      );

    const existing =
      await prisma.product.findUnique(
        {
          where: {
            legacyId:
              product.id,
          },

          select: {
            id: true,
          },
        },
      );

    let saved;

    if (existing) {
      saved =
        await prisma.product.update(
          {
            where: {
              id: existing.id,
            },

            data: {
              name:
                product.name,

              slug,

              description:
                product.description ||
                null,

              legacyTypes:
                product.types ||
                null,

              price,

              mrp,

              costPrice,

              stock,

              categoryId,

              images:
                imageUrls,

              isActive: true,
            },
          },
        );
    } else {
      saved =
        await prisma.product.create(
          {
            data: {
              legacyId:
                product.id,

              name:
                product.name,

              slug,

              description:
                product.description ||
                null,

              legacyTypes:
                product.types ||
                null,

              price,

              mrp,

              costPrice,

              stock,

              images:
                imageUrls,

              categoryId,

              isActive: true,

              isFeatured:
                product.types
                  .toLowerCase()
                  .includes(
                    'best selling',
                  ) ||
                product.types
                  .toLowerCase()
                  .includes(
                    'hot deals',
                  ),
            },
          },
        );
    }

    productMap.set(
      product.id,
      saved.id,
    );

    productImported++;
  }

  console.log(
    `✅ Products imported: ${productImported}`,
  );

  console.log(
    `⚠️ Products skipped: ${productSkipped}`,
  );

  // ========================================================
  // VARIANTS
  // ========================================================

  console.log('');
  console.log(
    '🔀 Importing variants...',
  );

  let variantsImported = 0;
  let variantsSkipped = 0;

  for (
    const variant of variants
  ) {
    const productId =
      productMap.get(
        variant.productId,
      );

    if (!productId) {
      variantsSkipped++;
      continue;
    }

    await prisma.productVariant.upsert(
      {
        where: {
          legacyId:
            variant.id,
        },

        create: {
          legacyId:
            variant.id,

          name:
            variant.name,

          price:
            variant.price,

          sellingPrice:
            variant.sellingPrice,

          wholesalePrice:
            variant.wholesalePrice,

          stock:
            variant.stock,

          productId,
        },

        update: {
          name:
            variant.name,

          price:
            variant.price,

          sellingPrice:
            variant.sellingPrice,

          wholesalePrice:
            variant.wholesalePrice,

          stock:
            variant.stock,

          productId,
        },
      },
    );

    variantsImported++;
  }

  console.log(
    `✅ Variants imported: ${variantsImported}`,
  );

  console.log(
    `⚠️ Variants skipped: ${variantsSkipped}`,
  );

  // ========================================================
  // IMAGES
  // ========================================================

  console.log('');
  console.log(
    '🖼️ Importing product images...',
  );

  let imagesImported = 0;
  let imagesSkipped = 0;

  for (
    const image of images
  ) {
    const productId =
      productMap.get(
        image.productId,
      );

    if (!productId) {
      imagesSkipped++;
      continue;
    }

    await prisma.productImage.upsert(
      {
        where: {
          legacyId:
            image.id,
        },

        create: {
          legacyId:
            image.id,

          imageUrl:
            image.imageUrl,

          sortOrder:
            image.id,

          productId,
        },

        update: {
          imageUrl:
            image.imageUrl,

          productId,
        },
      },
    );

    imagesImported++;
  }

  console.log(
    `✅ Images imported: ${imagesImported}`,
  );

  console.log(
    `⚠️ Images skipped: ${imagesSkipped}`,
  );

  // ========================================================
  // INFO
  // ========================================================

  console.log('');
  console.log(
    'ℹ️ Importing product info...',
  );

  let infoImported = 0;
  let infoSkipped = 0;

  for (
    const info of infos
  ) {
    const productId =
      productMap.get(
        info.productId,
      );

    if (!productId) {
      infoSkipped++;
      continue;
    }

    await prisma.productInfo.upsert(
      {
        where: {
          legacyId:
            info.id,
        },

        create: {
          legacyId:
            info.id,

          attribute:
            info.attribute,

          value:
            info.value,

          productId,
        },

        update: {
          attribute:
            info.attribute,

          value:
            info.value,

          productId,
        },
      },
    );

    infoImported++;
  }

  console.log(
    `✅ Product info imported: ${infoImported}`,
  );

  // ========================================================
  // HIGHLIGHTS
  // ========================================================

  console.log('');
  console.log(
    '⭐ Importing product highlights...',
  );

  let highlightsImported = 0;
  let highlightsSkipped = 0;

  for (
    const highlight of highlights
  ) {
    const productId =
      productMap.get(
        highlight.productId,
      );

    if (!productId) {
      highlightsSkipped++;
      continue;
    }

    await prisma.productHighlight.upsert(
      {
        where: {
          legacyId:
            highlight.id,
        },

        create: {
          legacyId:
            highlight.id,

          attribute:
            highlight.attribute,

          value:
            highlight.value,

          productId,
        },

        update: {
          attribute:
            highlight.attribute,

          value:
            highlight.value,

          productId,
        },
      },
    );

    highlightsImported++;
  }

  console.log(
    `✅ Highlights imported: ${highlightsImported}`,
  );

  // ========================================================
  // BANNERS
  // ========================================================

  console.log('');
  console.log(
    '🎨 Importing banners...',
  );

  let bannersImported = 0;
  let bannersSkipped = 0;

  for (
    const banner of banners
  ) {
    // A few legacy banners reference categories that are not present
    // in main_category. Banner.categoryId is optional in the new schema,
    // so preserve the banner with categoryId = null instead of skipping it.
    const categoryId =
      categoryMap.get(
        banner.categoryId,
      ) ?? null;

    await prisma.banner.upsert(
      {
        where: {
          legacyId:
            banner.id,
        },

        create: {
          legacyId:
            banner.id,

          image:
            banner.image,

          categoryId,

          isActive:
            true,

          sortOrder:
            banner.id,
        },

        update: {
          image:
            banner.image,

          categoryId,

          isActive:
            true,

          sortOrder:
            banner.id,
        },
      },
    );

    bannersImported++;
  }

  console.log(
    `✅ Banners imported: ${bannersImported}`,
  );

  console.log(
    `⚠️ Banners skipped: ${bannersSkipped}`,
  );

  // ========================================================
  // FINAL REPORT
  // ========================================================

  console.log('');
  console.log(
    '================================================',
  );
  console.log(
    '🎉 CATALOG IMPORT COMPLETED',
  );
  console.log(
    '================================================',
  );

  console.log(
    `📦 Categories : ${categoryImported}`,
  );

  console.log(
    `🛒 Products   : ${productImported}`,
  );

  console.log(
    `🔀 Variants   : ${variantsImported}`,
  );

  console.log(
    `🖼️ Images     : ${imagesImported}`,
  );

  console.log(
    `ℹ️ Info       : ${infoImported}`,
  );

  console.log(
    `⭐ Highlights : ${highlightsImported}`,
  );

  console.log(
    `🎨 Banners    : ${bannersImported}`,
  );

  console.log(
    '================================================',
  );
}

main()
  .catch((error) => {
    console.error('');
    console.error(
      '❌ LEGACY IMPORT FAILED',
    );
    console.error('');
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });