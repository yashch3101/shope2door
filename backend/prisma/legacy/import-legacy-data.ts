import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AddressType,
  CouponType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../src/generated/prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
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
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === "'") {
        if (sql[i + 1] === "'") { i++; continue; }
        inside = false;
      }
      continue;
    }
    if (c === "'") { inside = true; continue; }
    if (c === '(') {
      if (depth === 0) start = i + 1;
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
      current += c;
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === "'") {
        if (row[i + 1] === "'") { current += "'"; i++; continue; }
        inside = false;
      }
      continue;
    }
    if (c === "'") { inside = true; current += c; continue; }
    if (c === ',') { fields.push(current.trim()); current = ''; continue; }
    current += c;
  }
  fields.push(current.trim());
  return fields;
}

function parseValue(value: string): string | null {
  const v = value.trim();
  if (v.toUpperCase() === 'NULL') return null;
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .replace(/''/g, "'");
  }
  return v;
}

function rows(sql: string, table: string): Row[] {
  const re = new RegExp(
    'INSERT INTO `' + table + '`[\\s\\S]*?VALUES\\s*([\\s\\S]*?);',
    'gi',
  );
  const out: Row[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    for (const tuple of splitTuples(m[1])) {
      out.push(splitFields(tuple).map(parseValue));
    }
  }
  return out;
}

function n(v: string | null, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function s(v: string | null, fallback = ''): string {
  return v?.trim() || fallback;
}

function phone(v: string | null): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, '');
  if (d.length === 10 && /^[6-9]\d{9}$/.test(d)) return d;
  if (d.length === 11 && d.startsWith('0') && /^[6-9]\d{9}$/.test(d.slice(1))) return d.slice(1);
  if (d.length === 12 && d.startsWith('91') && /^[6-9]\d{9}$/.test(d.slice(2))) return d.slice(2);
  return null;
}

function email(v: string | null): string | null {
  if (!v) return null;
  const e = v.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

function slugPart(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime()) && !/^\d{2}-\d{2}-\d{4}/.test(v)) return iso;
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (!m) return undefined;
  let hour = Number(m[4] ?? 0);
  const minute = Number(m[5] ?? 0);
  const ap = (m[6] ?? '').toUpperCase();
  if (ap === 'PM' && hour < 12) hour += 12;
  if (ap === 'AM' && hour === 12) hour = 0;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hour, minute);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function status(v: string | null): OrderStatus {
  switch ((v ?? '').trim().toLowerCase()) {
    case 'delivered': return OrderStatus.DELIVERED;
    case 'cancelled':
    case 'canceled': return OrderStatus.CANCELLED;
    case 'packed': return OrderStatus.PACKED;
    case 'dispatched': return OrderStatus.DISPATCHED;
    case 'out_for_delivery':
    case 'out for delivery': return OrderStatus.OUT_FOR_DELIVERY;
    case 'processing': return OrderStatus.PROCESSING;
    case 'confirmed': return OrderStatus.CONFIRMED;
    default: return OrderStatus.PENDING;
  }
}

function deriveCityState(address: string): { city: string; state: string } {
  const parts = address.split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[parts.length - 2] || 'Legacy',
      state: parts[parts.length - 1] || 'Legacy',
    };
  }
  return { city: 'Legacy', state: 'Legacy' };
}

async function main() {
  if (!fs.existsSync(SQL_FILE)) throw new Error(`Legacy SQL not found: ${SQL_FILE}`);
  const sql = fs.readFileSync(SQL_FILE, 'utf8');

  console.log('================================================');
  console.log('🚀 SHOPE2DOOR LEGACY CUSTOMER/DATA IMPORT');
  console.log('================================================');

  const userRows = rows(sql, 'users');
  const addressRows = rows(sql, 'delivery_address');
  const cityRows = rows(sql, 'city');
  const districtRows = rows(sql, 'district');
  const cartRows = rows(sql, 'cart_items');
  const wishlistRows = rows(sql, 'wishlist');
  const orderRows = rows(sql, 'orders');
  const itemRows = rows(sql, 'order_items');
  const couponRows = rows(sql, 'coupon');
  const offlineRows = rows(sql, 'offline_maps');
  const storeRows = rows(sql, 'store_settings');
  const helpCallRows = rows(sql, 'help_call');
  const helpEmailRows = rows(sql, 'help_email');
  const helpWhatsappRows = rows(sql, 'help_whatsapp');
  const deliveryChargeRows = rows(sql, 'delivery_charge');
  const handlingRows = rows(sql, 'handling_charge');
  const freeDeliveryRows = rows(sql, 'free_delivey');
  const minimumRows = rows(sql, 'minimum_order_amout');
  const deliverTimeRows = rows(sql, 'deliver_time');

  console.log({
    users: userRows.length,
    addresses: addressRows.length,
    cities: cityRows.length,
    districts: districtRows.length,
    cartItems: cartRows.length,
    wishlist: wishlistRows.length,
    orders: orderRows.length,
    orderItems: itemRows.length,
  });

  // ----------------------------------------------------------
  // 1. USERS
  // ----------------------------------------------------------
  const userMap = new Map<number, string>();
  const placeholderPassword = await bcrypt.hash(
    `legacy-${crypto.randomBytes(32).toString('hex')}`,
    10,
  );

  let usersImported = 0;
  for (const r of userRows) {
    const legacyId = n(r[0]);
    if (!legacyId) continue;

    const rawPhone = s(r[1]);
    const normalizedPhone = phone(rawPhone);
    let safePhone = normalizedPhone;
    const name = s(r[2], `Customer ${legacyId}`);
    const legacyEmail = s(r[3]) || null;
    const normalizedEmail = email(r[3]);
    const active = s(r[4]).toLowerCase() !== 'inactive';
    const createdAt = parseDate(r[5]);

    let user = await prisma.user.findUnique({
      where: { legacyId },
      select: { id: true, email: true, phone: true },
    });

    // If the customer already registered in the new app with the same email
    // or phone, attach the legacy ID to that account instead of creating a duplicate.
    if (!user && normalizedEmail) {
      const byEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (byEmail && (!byEmail.legacyId || byEmail.legacyId === legacyId)) {
        user = byEmail;
      }
    }

    if (!user && normalizedPhone) {
      const byPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (byPhone && (!byPhone.legacyId || byPhone.legacyId === legacyId)) {
        user = byPhone;
      }
    }

    let finalEmail = normalizedEmail;
    if (!finalEmail) {
      finalEmail = `legacy-${normalizedPhone ?? legacyId}@legacy.shope2door.local`;
    }

    // ----------------------------------------------------------
    // PHONE CONFLICT PROTECTION
    // ----------------------------------------------------------
    //
    // Legacy phone numbers may collide with:
    // 1. another migrated legacy user
    // 2. a customer who already registered in the new app
    //
    // User.phone is UNIQUE in Prisma, so never overwrite another
    // account's phone number.
    // ----------------------------------------------------------

    let phoneForUser: string | null =
    safePhone;

    if (phoneForUser) {
    const phoneTaken =
        await prisma.user.findUnique({
        where: {
            phone: phoneForUser,
        },

        select: {
            id: true,
            legacyId: true,
        },
        });

    if (
        phoneTaken &&
        phoneTaken.id !== user?.id
    ) {
        console.warn(
        `⚠️ Legacy user ${legacyId}: phone ${phoneForUser} ` +
        `is already used by another account. ` +
        `Phone will be left unchanged/null to preserve account integrity.`,
        );

        phoneForUser = null;
    }
    }


    // ----------------------------------------------------------
    // CREATE NEW USER
    // ----------------------------------------------------------

    if (!user) {
    const emailTaken =
        await prisma.user.findUnique({
        where: {
            email: finalEmail,
        },

        select: {
            id: true,
        },
        });

    if (emailTaken) {
        finalEmail =
        `legacy-${legacyId}-${slugPart(name)}@legacy.shope2door.local`;
    }

    user =
        await prisma.user.create({
        data: {
            legacyId,

            name,

            email:
            finalEmail,

            legacyEmail,

            phone:
            phoneForUser,

            password:
            placeholderPassword,

            role:
            'CUSTOMER',

            isActive:
            active,

            ...(createdAt
            ? {
                createdAt,
                }
            : {}),
        },

        select: {
            id: true,
            email: true,
            phone: true,
        },
        });


    // ----------------------------------------------------------
    // UPDATE EXISTING / ALREADY REGISTERED USER
    // ----------------------------------------------------------

    } else {
    user =
        await prisma.user.update({
        where: {
            id: user.id,
        },

        data: {
            legacyId,

            name,

            legacyEmail:
            legacyEmail &&
            legacyEmail !== user.email
                ? legacyEmail
                : undefined,

            // IMPORTANT:
            // Only update phone when the legacy phone does not
            // belong to another account.
            //
            // If phoneForUser is null because of a conflict,
            // preserve the user's existing phone.
            ...(phoneForUser
            ? {
                phone:
                    phoneForUser,
                }
            : {}),

            isActive:
            active,

            ...(createdAt
            ? {
                createdAt,
                }
            : {}),
        },

        select: {
            id: true,
            email: true,
            phone: true,
        },
        });
    }

    userMap.set(legacyId, user.id);
    usersImported++;
  }
  console.log(`✅ Users imported/mapped: ${usersImported}`);

  // ----------------------------------------------------------
  // 2. ORPHAN LEGACY USER REFERENCES
  // ----------------------------------------------------------
  const referencedUserIds = new Set<number>();
  for (const r of orderRows) referencedUserIds.add(n(r[1]));
  for (const r of addressRows) referencedUserIds.add(n(r[1]));
  for (const r of cartRows) referencedUserIds.add(n(r[1]));
  for (const r of wishlistRows) referencedUserIds.add(n(r[1]));

  for (const legacyId of referencedUserIds) {
    if (!legacyId || userMap.has(legacyId)) continue;
    const synthetic = await prisma.user.create({
      data: {
        legacyId,
        name: `Legacy Customer ${legacyId}`,
        email: `legacy-${legacyId}@legacy.shope2door.local`,
        password: placeholderPassword,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true },
    });
    userMap.set(legacyId, synthetic.id);
    console.warn(`⚠️ Created synthetic legacy user ${legacyId} because old SQL references it but users row is missing.`);
  }

  // ----------------------------------------------------------
  // 3. DISTRICTS + CITIES
  // ----------------------------------------------------------
  let districtsImported = 0;
  for (const r of districtRows) {
    const legacyId = n(r[0]);
    if (!legacyId) continue;
    await prisma.district.upsert({
      where: { legacyId },
      create: { legacyId, name: s(r[1], `District ${legacyId}`) },
      update: { name: s(r[1], `District ${legacyId}`) },
    });
    districtsImported++;
  }

  const districtMap = new Map<number, string>();
  for (const d of await prisma.district.findMany({ select: { id: true, legacyId: true } })) {
    districtMap.set(d.legacyId, d.id);
  }

  let citiesImported = 0;
  for (const r of cityRows) {
    const legacyId = n(r[0]);
    const districtId = districtMap.get(n(r[1]));
    if (!legacyId || !districtId) continue;
    await prisma.city.upsert({
      where: { legacyId },
      create: {
        legacyId,
        name: s(r[2], `City ${legacyId}`),
        deliveryCharge: n(r[3]),
        districtId,
      },
      update: {
        name: s(r[2], `City ${legacyId}`),
        deliveryCharge: n(r[3]),
        districtId,
      },
    });
    citiesImported++;
  }
  console.log(`✅ Districts: ${districtsImported}, Cities: ${citiesImported}`);

  const cityMap = new Map<number, { name: string; districtName: string }>();
  const cityRecords = await prisma.city.findMany({
    include: { district: { select: { name: true } } },
  });
  for (const c of cityRecords) cityMap.set(c.legacyId, { name: c.name, districtName: c.district.name });

  // ----------------------------------------------------------
  // 4. ADDRESSES
  // ----------------------------------------------------------
  const addressMap = new Map<number, string>();
  let addressesImported = 0;
  for (const r of addressRows) {
    const legacyId = n(r[0]);
    const legacyUserId = n(r[1]);
    const userId = userMap.get(legacyUserId);
    if (!legacyId || !userId) continue;

    const fullAddress = s(r[4], 'Legacy address');
    const { city, state } = deriveCityState(fullAddress);
    const saved = await prisma.address.upsert({
      where: { legacyId },
      create: {
        legacyId,
        type: AddressType.HOME,
        name: s(r[2], 'Customer'),
        phone: phone(r[3]) ?? s(r[3], '0000000000'),
        addressLine1: fullAddress,
        landmark: s(r[6]) || null,
        city,
        state,
        pincode: s(r[5], '000000'),
        isDefault: addressesImported === 0,
        userId,
      },
      update: {
        name: s(r[2], 'Customer'),
        phone: phone(r[3]) ?? s(r[3], '0000000000'),
        addressLine1: fullAddress,
        landmark: s(r[6]) || null,
        city,
        state,
        pincode: s(r[5], '000000'),
        userId,
      },
      select: { id: true },
    });
    addressMap.set(legacyId, saved.id);
    addressesImported++;
  }
  console.log(`✅ Addresses imported: ${addressesImported}`);

  // ----------------------------------------------------------
  // 5. CARTS + CART ITEMS
  // ----------------------------------------------------------
  let cartImported = 0;
  for (const r of cartRows) {
    const legacyUserId = n(r[1]);
    const userId = userMap.get(legacyUserId);
    const legacyProductId = n(r[2]);
    const product = await prisma.product.findUnique({ where: { legacyId: legacyProductId }, select: { id: true } });
    if (!userId || !product) continue;

    const legacyVariantId = r[3] ? n(r[3]) : null;
    const variant = legacyVariantId
      ? await prisma.productVariant.findUnique({ where: { legacyId: legacyVariantId }, select: { id: true } })
      : null;

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      create: {
        legacyId: n(r[0]) || undefined,
        quantity: Math.max(1, n(r[4], 1)),
        imageUrl: s(r[5]) || null,
        cartId: cart.id,
        productId: product.id,
        variantId: variant?.id ?? null,
      },
      update: {
        quantity: Math.max(1, n(r[4], 1)),
        imageUrl: s(r[5]) || null,
        variantId: variant?.id ?? null,
      },
    });
    cartImported++;
  }
  console.log(`✅ Cart items imported: ${cartImported}`);

  // ----------------------------------------------------------
  // 6. WISHLIST
  // ----------------------------------------------------------
  let wishlistImported = 0;
  for (const r of wishlistRows) {
    const userId = userMap.get(n(r[1]));
    const product = await prisma.product.findUnique({ where: { legacyId: n(r[2]) }, select: { id: true } });
    if (!userId || !product) continue;

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      create: {
        legacyId: n(r[0]) || undefined,
        userId,
        productId: product.id,
        ...(parseDate(r[3]) ? { createdAt: parseDate(r[3]) } : {}),
      },
      update: {},
    });
    wishlistImported++;
  }
  console.log(`✅ Wishlist items imported: ${wishlistImported}`);

  // ----------------------------------------------------------
  // 7. COUPONS
  // ----------------------------------------------------------
  let couponsImported = 0;
  for (const r of couponRows) {
    const legacyId = n(r[0]);
    if (!legacyId) continue;
    const code = s(r[3]).toUpperCase();
    if (!code) continue;

    const discount = n(r[4]);
    const expiresAt = parseDate(r[5]);
    const isActive = ['1', 'active', 'enabled', 'true'].includes(s(r[6]).toLowerCase());
    const existing = await prisma.coupon.findUnique({ where: { legacyId } });
    const byCode = await prisma.coupon.findUnique({ where: { code } });
    const target = existing ?? byCode;

    if (target) {
      await prisma.coupon.update({
        where: { id: target.id },
        data: {
          legacyId,
          code,
          description: s(r[2]) || s(r[1]) || null,
          type: discount <= 100 ? CouponType.PERCENTAGE : CouponType.FIXED,
          value: discount,
          minOrderAmount: n(r[7]) || null,
          expiresAt: expiresAt ?? null,
          isActive,
        },
      });
    } else {
      await prisma.coupon.create({
        data: {
          legacyId,
          code,
          description: s(r[2]) || s(r[1]) || null,
          type: discount <= 100 ? CouponType.PERCENTAGE : CouponType.FIXED,
          value: discount,
          minOrderAmount: n(r[7]) || null,
          expiresAt: expiresAt ?? null,
          isActive,
        },
      });
    }
    couponsImported++;
  }
  console.log(`✅ Coupons imported: ${couponsImported}`);

  // ----------------------------------------------------------
  // 8. ORDERS + ORDER ITEMS + HISTORICAL PAYMENT RECORD
  // ----------------------------------------------------------
  const orderMap = new Map<number, string>();
  const itemRowsByOrder = new Map<number, Row[]>();
  for (const r of itemRows) {
    const id = n(r[1]);
    const list = itemRowsByOrder.get(id) ?? [];
    list.push(r);
    itemRowsByOrder.set(id, list);
  }

  let ordersImported = 0;
  let orderItemsImported = 0;
  let paymentsImported = 0;

  for (const r of orderRows) {
    const legacyOrderId = n(r[0]);
    const legacyUserId = n(r[1]);
    const userId = userMap.get(legacyUserId);
    if (!legacyOrderId || !userId) continue;

    const orderStatus = status(r[8]);
    const placedAt = parseDate(r[10]) ?? new Date();
    const cityInfo = cityMap.get(n(r[13]));

    // The old orders table does not contain a delivery_address_id.
    // We therefore create a historical address snapshot from the customer's
    // first saved legacy address, while preserving the legacy location/city.
    const firstAddress = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const existingOrder = await prisma.order.findUnique({
        where: { legacyId: legacyOrderId },
        select: { id: true, addressId: true },
        });

        let historicalAddressId: string;

        if (existingOrder) {
        // Existing migrated order already has a valid Address relation.
        historicalAddressId = existingOrder.addressId;
        } else {
        const historicalAddress = await prisma.address.create({
            data: {
            type: AddressType.OTHER,

            name:
                firstAddress?.name ??
                `Legacy Customer ${legacyUserId}`,

            phone:
                firstAddress?.phone ??
                '0000000000',

            addressLine1:
                firstAddress?.addressLine1 ??
                `Legacy order location ${n(r[13])}`,

            landmark:
                firstAddress?.landmark ??
                null,

            city:
                cityInfo?.name ??
                firstAddress?.city ??
                'Legacy',

            state:
                cityInfo?.districtName ??
                firstAddress?.state ??
                'Legacy',

            pincode:
                firstAddress?.pincode ??
                '000000',

            isDefault: false,

            userId,
            },

            select: {
            id: true,
            },
        });

        historicalAddressId =
            historicalAddress.id;
        }

    const customer = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, email: true },
    });

    const orderData = {
      orderNumber: `LEGACY-${legacyOrderId}`,
      status: orderStatus,
      subtotal: n(r[2]),
      discount: n(r[4]),
      deliveryFee: n(r[5]),
      tax: 0,
      handlingCharge: n(r[6]),
      total: n(r[7]),
      customerName: customer?.name ?? `Legacy Customer ${legacyUserId}`,
      customerPhone: customer?.phone ?? '0000000000',
      customerEmail: customer?.email ?? `legacy-${legacyUserId}@legacy.shope2door.local`,
      deliveryDate: s(r[11]) || null,
      deliveryTime: s(r[12]) || null,
      gift: s(r[14]) || null,
      legacyLocationId: n(r[13]) || null,
      addressId: historicalAddressId,
      userId,
      couponCode: s(r[3]) === 'null' ? null : s(r[3]) || null,
      notes: 'Migrated from legacy ShopE2Door database',
      placedAt,
      confirmedAt: orderStatus !== OrderStatus.PENDING ? placedAt : null,
      deliveredAt: orderStatus === OrderStatus.DELIVERED ? placedAt : null,
      cancelledAt: orderStatus === OrderStatus.CANCELLED ? placedAt : null,
    } as const;

    const savedOrder = existingOrder
      ? await prisma.order.update({ where: { id: existingOrder.id }, data: orderData, select: { id: true } })
      : await prisma.order.create({ data: { ...orderData, legacyId: legacyOrderId }, select: { id: true } });

    orderMap.set(legacyOrderId, savedOrder.id);
    ordersImported++;

    for (const item of itemRowsByOrder.get(legacyOrderId) ?? []) {
      const product = await prisma.product.findUnique({
        where: { legacyId: n(item[2]) },
        select: { id: true, name: true, sku: true, price: true, mrp: true, images: true },
      });
      if (!product) {
        console.warn(`⚠️ Order ${legacyOrderId}: product ${n(item[2])} missing; item skipped`);
        continue;
      }

      const variant = item[3]
        ? await prisma.productVariant.findUnique({ where: { legacyId: n(item[3]) }, select: { id: true, sellingPrice: true, price: true } })
        : null;

      const quantity = Math.max(1, n(item[4], 1));
      const unitPrice = Number(variant?.sellingPrice ?? product.price ?? 0);
      const mrp = Number(variant?.price ?? product.mrp ?? unitPrice);

      const existingItem = await prisma.orderItem.findUnique({ where: { legacyId: n(item[0]) }, select: { id: true } });
      const itemData = {
        quantity,
        unitPrice,
        mrp,
        total: unitPrice * quantity,
        productName: product.name,
        productSku: product.sku,
        productImage: s(item[5]) || product.images[0] || null,
        orderId: savedOrder.id,
        productId: product.id,
        variantId: variant?.id ?? null,
      };

      if (existingItem) {
        await prisma.orderItem.update({ where: { id: existingItem.id }, data: itemData });
      } else {
        await prisma.orderItem.create({ data: { ...itemData, legacyId: n(item[0]) } });
      }
      orderItemsImported++;
    }

    const paymentMethod = s(r[9]).toUpperCase() === 'ONLINE'
      ? PaymentMethod.ONLINE
      : PaymentMethod.COD;
    const paymentStatus = orderStatus === OrderStatus.DELIVERED
      ? PaymentStatus.SUCCESS
      : orderStatus === OrderStatus.CANCELLED && paymentMethod === PaymentMethod.ONLINE
        ? PaymentStatus.FAILED
        : PaymentStatus.PENDING;

    const existingPayment = await prisma.payment.findFirst({
      where: { orderId: savedOrder.id, method: paymentMethod },
      select: { id: true },
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount: n(r[7]),
          status: paymentStatus,
          paidAt: paymentStatus === PaymentStatus.SUCCESS ? placedAt : null,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          amount: n(r[7]),
          method: paymentMethod,
          status: paymentStatus,
          userId,
          orderId: savedOrder.id,
          paidAt: paymentStatus === PaymentStatus.SUCCESS ? placedAt : null,
        },
      });
    }
    paymentsImported++;
  }

  console.log(`✅ Orders: ${ordersImported}`);
  console.log(`✅ Order items: ${orderItemsImported}`);
  console.log(`✅ Historical payment records: ${paymentsImported}`);

  // ----------------------------------------------------------
  // 9. STORE / DELIVERY / HELP / MAP SETTINGS
  // ----------------------------------------------------------
  const store = storeRows[0];
  if (store) {
    await prisma.storeSettings.upsert({
      where: { legacyId: n(store[0]) },
      create: {
        legacyId: n(store[0]),
        isClosed: n(store[1]) === 1,
        closedMessage: s(store[2]) || 'Store is currently closed',
      },
      update: {
        isClosed: n(store[1]) === 1,
        closedMessage: s(store[2]) || 'Store is currently closed',
      },
    });
  }

  const deliveryCharge = n(deliveryChargeRows[0]?.[1]);
  const handlingCharge = n(handlingRows[0]?.[1]);
  const freeDeliveryAbove = n(freeDeliveryRows[0]?.[1]);
  const minimumOrderAmount = n(minimumRows[0]?.[1]);
  const deliveryTime = s(deliverTimeRows[0]?.[1]) || null;

  const existingDeliverySettings = await prisma.deliverySettings.findFirst();
  if (existingDeliverySettings) {
    await prisma.deliverySettings.update({
      where: { id: existingDeliverySettings.id },
      data: { deliveryCharge, handlingCharge, freeDeliveryAbove, minimumOrderAmount, deliveryTime },
    });
  } else {
    await prisma.deliverySettings.create({
      data: { deliveryCharge, handlingCharge, freeDeliveryAbove, minimumOrderAmount, deliveryTime },
    });
  }

  const helpData = {
    phone: s(helpCallRows[0]?.[1]) || null,
    email: s(helpEmailRows[0]?.[1]) || null,
    whatsapp: s(helpWhatsappRows[0]?.[1]) || null,
  };
  const existingHelp = await prisma.helpSettings.findFirst();
  if (existingHelp) {
    await prisma.helpSettings.update({ where: { id: existingHelp.id }, data: helpData });
  } else {
    await prisma.helpSettings.create({ data: helpData });
  }

  for (const r of offlineRows) {
    const legacyId = n(r[0]);
    if (!legacyId) continue;
    await prisma.offlineMap.upsert({
      where: { legacyId },
      create: {
        legacyId,
        regionName: s(r[1], `Region ${legacyId}`),
        mapFileUrl: s(r[2]),
        fileSizeMb: r[3] ? n(r[3]) : null,
        uploadedAt: parseDate(r[4]),
      },
      update: {
        regionName: s(r[1], `Region ${legacyId}`),
        mapFileUrl: s(r[2]),
        fileSizeMb: r[3] ? n(r[3]) : null,
        uploadedAt: parseDate(r[4]),
      },
    });
  }

  console.log('');
  console.log('================================================');
  console.log('🎉 LEGACY CUSTOMER/DATA IMPORT COMPLETED');
  console.log('================================================');
  console.log('⚠️ Legacy passwords were not available in the old users table.');
  console.log('⚠️ Legacy customer login must therefore use the new OTP migration flow.');
  console.log('⚠️ Old orders did not contain a delivery_address_id; historical address snapshots were reconstructed from saved customer addresses + legacy location.');
  console.log('================================================');
}

main()
  .catch(error => {
    console.error('❌ LEGACY IMPORT FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
