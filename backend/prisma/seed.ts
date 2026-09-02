import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// =====================================================
// CATEGORIES
// =====================================================

const categories = [
  {
    name: "Fruits & Vegetables",
    slug: "fruits-vegetables",
    icon: "🍎",
    sortOrder: 1,
  },
  {
    name: "Dairy, Bread & Eggs",
    slug: "dairy-bread-eggs",
    icon: "🍞",
    sortOrder: 2,
  },
  {
    name: "Drinks & Juices",
    slug: "drinks-juices",
    icon: "🧃",
    sortOrder: 3,
  },
  {
    name: "Namkeen & Biscuits",
    slug: "namkeen-biscuits",
    icon: "🍪",
    sortOrder: 4,
  },
  {
    name: "Chips & Snacks",
    slug: "chips-snacks",
    icon: "🍟",
    sortOrder: 5,
  },
  {
    name: "Tea, Coffee & Cake",
    slug: "tea-coffee-cake",
    icon: "☕",
    sortOrder: 6,
  },
  {
    name: "Atta, Rice & Dal",
    slug: "atta-rice-dal",
    icon: "🌾",
    sortOrder: 7,
  },
  {
    name: "Instant Food",
    slug: "instant-food",
    icon: "🍜",
    sortOrder: 8,
  },
  {
    name: "Water & Ice Cube",
    slug: "water-ice-cube",
    icon: "🧊",
    sortOrder: 9,
  },
  {
    name: "Ice Cream & Chocolate",
    slug: "ice-cream-chocolate",
    icon: "🍦",
    sortOrder: 10,
  },
  {
    name: "Oil, Ghee & Masala",
    slug: "oil-ghee-masala",
    icon: "🛢️",
    sortOrder: 11,
  },
  {
    name: "Chicken, Fish & Meat",
    slug: "chicken-fish-meat",
    icon: "🍗",
    sortOrder: 12,
  },
  {
    name: "Cleaning Essentials",
    slug: "cleaning-essentials",
    icon: "🧼",
    sortOrder: 13,
  },
  {
    name: "Personal Care",
    slug: "personal-care",
    icon: "🧴",
    sortOrder: 14,
  },
  {
    name: "Paan Corner",
    slug: "paan-corner",
    icon: "🍃",
    sortOrder: 15,
  },
  {
    name: "Sauces & Spreads",
    slug: "sauces-spreads",
    icon: "🥫",
    sortOrder: 16,
  },
];

// =====================================================
// PRODUCTS
// =====================================================

const products = [
  // ---------------------------------------------------
  // FRUITS & VEGETABLES
  // ---------------------------------------------------

  {
    name: "Fresh Apples",
    slug: "fresh-apples",
    sku: "FRUIT-APPLE-001",
    brand: "Fresh Farm",
    description: "Fresh and naturally sweet apples.",
    price: "180",
    mrp: "200",
    stock: 50,
    unit: "kg",
    weight: "1 kg",
    categorySlug: "fruits-vegetables",
  },
  {
    name: "Fresh Bananas",
    slug: "fresh-bananas",
    sku: "FRUIT-BANANA-001",
    brand: "Fresh Farm",
    description: "Fresh ripe bananas.",
    price: "60",
    mrp: "70",
    stock: 80,
    unit: "dozen",
    weight: "1 dozen",
    categorySlug: "fruits-vegetables",
  },

  // ---------------------------------------------------
  // DAIRY BREAD EGGS
  // ---------------------------------------------------

  {
    name: "Amul Taaza Milk",
    slug: "amul-taaza-milk",
    sku: "DAIRY-MILK-001",
    brand: "Amul",
    description: "Fresh toned milk.",
    price: "28",
    mrp: "30",
    stock: 100,
    unit: "packet",
    weight: "500 ml",
    categorySlug: "dairy-bread-eggs",
  },
  {
    name: "Brown Bread",
    slug: "brown-bread",
    sku: "DAIRY-BREAD-001",
    brand: "Harvest Gold",
    description: "Soft and fresh brown bread.",
    price: "45",
    mrp: "50",
    stock: 60,
    unit: "packet",
    weight: "400 g",
    categorySlug: "dairy-bread-eggs",
  },

  // ---------------------------------------------------
  // DRINKS & JUICES
  // ---------------------------------------------------

  {
    name: "Coca Cola",
    slug: "coca-cola",
    sku: "DRINK-COKE-001",
    brand: "Coca Cola",
    description: "Refreshing carbonated soft drink.",
    price: "40",
    mrp: "45",
    stock: 100,
    unit: "bottle",
    weight: "500 ml",
    categorySlug: "drinks-juices",
  },
  {
    name: "Real Mixed Fruit Juice",
    slug: "real-mixed-fruit-juice",
    sku: "DRINK-REAL-001",
    brand: "Real",
    description: "Mixed fruit juice.",
    price: "110",
    mrp: "120",
    stock: 70,
    unit: "pack",
    weight: "1 L",
    categorySlug: "drinks-juices",
  },

  // ---------------------------------------------------
  // NAMKEEN & BISCUITS
  // ---------------------------------------------------

  {
    name: "Haldiram's Aloo Bhujia",
    slug: "haldirams-aloo-bhujia",
    sku: "NAMKEEN-001",
    brand: "Haldiram's",
    description: "Crispy and spicy aloo bhujia.",
    price: "65",
    mrp: "70",
    stock: 80,
    unit: "packet",
    weight: "200 g",
    categorySlug: "namkeen-biscuits",
  },
  {
    name: "Parle-G Biscuits",
    slug: "parle-g-biscuits",
    sku: "BISCUIT-PARLEG-001",
    brand: "Parle",
    description: "Classic glucose biscuits.",
    price: "25",
    mrp: "30",
    stock: 120,
    unit: "packet",
    weight: "250 g",
    categorySlug: "namkeen-biscuits",
  },

  // ---------------------------------------------------
  // CHIPS & SNACKS
  // ---------------------------------------------------

  {
    name: "Lay's Classic Salted",
    slug: "lays-classic-salted",
    sku: "CHIPS-LAYS-001",
    brand: "Lay's",
    description: "Classic salted potato chips.",
    price: "20",
    mrp: "20",
    stock: 150,
    unit: "packet",
    weight: "50 g",
    categorySlug: "chips-snacks",
  },
  {
    name: "Kurkure Masala Munch",
    slug: "kurkure-masala-munch",
    sku: "SNACK-KURKURE-001",
    brand: "Kurkure",
    description: "Crunchy masala snack.",
    price: "20",
    mrp: "20",
    stock: 150,
    unit: "packet",
    weight: "55 g",
    categorySlug: "chips-snacks",
  },

  // ---------------------------------------------------
  // TEA COFFEE CAKE
  // ---------------------------------------------------

  {
    name: "Tata Tea Gold",
    slug: "tata-tea-gold",
    sku: "TEA-TATA-001",
    brand: "Tata",
    description: "Premium blend tea.",
    price: "140",
    mrp: "150",
    stock: 60,
    unit: "packet",
    weight: "250 g",
    categorySlug: "tea-coffee-cake",
  },
  {
    name: "Nescafe Classic",
    slug: "nescafe-classic",
    sku: "COFFEE-NESCAFE-001",
    brand: "Nescafe",
    description: "Instant coffee.",
    price: "165",
    mrp: "180",
    stock: 50,
    unit: "jar",
    weight: "50 g",
    categorySlug: "tea-coffee-cake",
  },

  // ---------------------------------------------------
  // ATTA RICE DAL
  // ---------------------------------------------------

  {
    name: "Aashirvaad Atta",
    slug: "aashirvaad-atta",
    sku: "ATTA-AASHIRVAAD-001",
    brand: "Aashirvaad",
    description: "Whole wheat flour.",
    price: "280",
    mrp: "300",
    stock: 70,
    unit: "bag",
    weight: "5 kg",
    categorySlug: "atta-rice-dal",
  },
  {
    name: "India Gate Basmati Rice",
    slug: "india-gate-basmati-rice",
    sku: "RICE-INDIAGATE-001",
    brand: "India Gate",
    description: "Premium basmati rice.",
    price: "420",
    mrp: "450",
    stock: 50,
    unit: "bag",
    weight: "5 kg",
    categorySlug: "atta-rice-dal",
  },

  // ---------------------------------------------------
  // INSTANT FOOD
  // ---------------------------------------------------

  {
    name: "Maggi 2-Minute Noodles",
    slug: "maggi-2-minute-noodles",
    sku: "INSTANT-MAGGI-001",
    brand: "Maggi",
    description: "Instant masala noodles.",
    price: "14",
    mrp: "15",
    stock: 200,
    unit: "packet",
    weight: "70 g",
    categorySlug: "instant-food",
  },
  {
    name: "Yippee Magic Masala",
    slug: "yippee-magic-masala",
    sku: "INSTANT-YIPPEE-001",
    brand: "Sunfeast",
    description: "Instant masala noodles.",
    price: "14",
    mrp: "15",
    stock: 180,
    unit: "packet",
    weight: "70 g",
    categorySlug: "instant-food",
  },

  // ---------------------------------------------------
  // WATER & ICE
  // ---------------------------------------------------

  {
    name: "Bisleri Mineral Water",
    slug: "bisleri-mineral-water",
    sku: "WATER-BISLERI-001",
    brand: "Bisleri",
    description: "Packaged drinking water.",
    price: "20",
    mrp: "20",
    stock: 200,
    unit: "bottle",
    weight: "1 L",
    categorySlug: "water-ice-cube",
  },
  {
    name: "Ice Cubes",
    slug: "ice-cubes",
    sku: "ICE-CUBE-001",
    brand: "Fresh Ice",
    description: "Clean and hygienic ice cubes.",
    price: "50",
    mrp: "60",
    stock: 50,
    unit: "pack",
    weight: "1 kg",
    categorySlug: "water-ice-cube",
  },

  // ---------------------------------------------------
  // ICE CREAM & CHOCOLATE
  // ---------------------------------------------------

  {
    name: "Cadbury Dairy Milk",
    slug: "cadbury-dairy-milk",
    sku: "CHOCO-CADBURY-001",
    brand: "Cadbury",
    description: "Classic milk chocolate.",
    price: "50",
    mrp: "55",
    stock: 100,
    unit: "bar",
    weight: "45 g",
    categorySlug: "ice-cream-chocolate",
  },
  {
    name: "Kwality Wall's Cornetto",
    slug: "kwality-walls-cornetto",
    sku: "ICECREAM-CORNETTO-001",
    brand: "Kwality Wall's",
    description: "Crunchy cone ice cream.",
    price: "40",
    mrp: "45",
    stock: 80,
    unit: "piece",
    weight: "105 ml",
    categorySlug: "ice-cream-chocolate",
  },

  // ---------------------------------------------------
  // OIL GHEE MASALA
  // ---------------------------------------------------

  {
    name: "Fortune Refined Soyabean Oil",
    slug: "fortune-refined-soyabean-oil",
    sku: "OIL-FORTUNE-001",
    brand: "Fortune",
    description: "Refined soyabean cooking oil.",
    price: "155",
    mrp: "165",
    stock: 70,
    unit: "bottle",
    weight: "1 L",
    categorySlug: "oil-ghee-masala",
  },
  {
    name: "MDH Garam Masala",
    slug: "mdh-garam-masala",
    sku: "MASALA-MDH-001",
    brand: "MDH",
    description: "Aromatic garam masala.",
    price: "85",
    mrp: "90",
    stock: 70,
    unit: "packet",
    weight: "100 g",
    categorySlug: "oil-ghee-masala",
  },

  // ---------------------------------------------------
  // CHICKEN FISH MEAT
  // ---------------------------------------------------

  {
    name: "Fresh Chicken Curry Cut",
    slug: "fresh-chicken-curry-cut",
    sku: "MEAT-CHICKEN-001",
    brand: "Fresh Meat",
    description: "Fresh chicken curry cut.",
    price: "220",
    mrp: "240",
    stock: 40,
    unit: "kg",
    weight: "1 kg",
    categorySlug: "chicken-fish-meat",
  },
  {
    name: "Fresh Rohu Fish",
    slug: "fresh-rohu-fish",
    sku: "FISH-ROHU-001",
    brand: "Fresh Fish",
    description: "Fresh rohu fish.",
    price: "260",
    mrp: "280",
    stock: 30,
    unit: "kg",
    weight: "1 kg",
    categorySlug: "chicken-fish-meat",
  },

  // ---------------------------------------------------
  // CLEANING
  // ---------------------------------------------------

  {
    name: "Surf Excel Matic",
    slug: "surf-excel-matic",
    sku: "CLEAN-SURF-001",
    brand: "Surf Excel",
    description: "Powerful laundry detergent.",
    price: "230",
    mrp: "250",
    stock: 60,
    unit: "packet",
    weight: "2 kg",
    categorySlug: "cleaning-essentials",
  },
  {
    name: "Harpic Toilet Cleaner",
    slug: "harpic-toilet-cleaner",
    sku: "CLEAN-HARPIC-001",
    brand: "Harpic",
    description: "Toilet cleaning liquid.",
    price: "95",
    mrp: "105",
    stock: 80,
    unit: "bottle",
    weight: "500 ml",
    categorySlug: "cleaning-essentials",
  },

  // ---------------------------------------------------
  // PERSONAL CARE
  // ---------------------------------------------------

  {
    name: "Dove Shampoo",
    slug: "dove-shampoo",
    sku: "CARE-DOVE-001",
    brand: "Dove",
    description: "Daily care shampoo.",
    price: "190",
    mrp: "210",
    stock: 60,
    unit: "bottle",
    weight: "340 ml",
    categorySlug: "personal-care",
  },
  {
    name: "Colgate Strong Teeth",
    slug: "colgate-strong-teeth",
    sku: "CARE-COLGATE-001",
    brand: "Colgate",
    description: "Daily toothpaste for strong teeth.",
    price: "95",
    mrp: "105",
    stock: 100,
    unit: "tube",
    weight: "200 g",
    categorySlug: "personal-care",
  },

  // ---------------------------------------------------
  // PAAN CORNER
  // ---------------------------------------------------

  {
    name: "Fresh Paan Leaves",
    slug: "fresh-paan-leaves",
    sku: "PAAN-LEAVES-001",
    brand: "Fresh Paan",
    description: "Fresh paan leaves.",
    price: "30",
    mrp: "40",
    stock: 40,
    unit: "pack",
    weight: "10 leaves",
    categorySlug: "paan-corner",
  },
  {
    name: "Elaichi",
    slug: "elaichi",
    sku: "PAAN-ELAICHI-001",
    brand: "Premium",
    description: "Aromatic cardamom.",
    price: "80",
    mrp: "90",
    stock: 50,
    unit: "packet",
    weight: "50 g",
    categorySlug: "paan-corner",
  },

  // ---------------------------------------------------
  // SAUCES & SPREADS
  // ---------------------------------------------------

  {
    name: "Kissan Tomato Ketchup",
    slug: "kissan-tomato-ketchup",
    sku: "SAUCE-KISSAN-001",
    brand: "Kissan",
    description: "Classic tomato ketchup.",
    price: "120",
    mrp: "130",
    stock: 70,
    unit: "bottle",
    weight: "500 g",
    categorySlug: "sauces-spreads",
  },
  {
    name: "Nutella Hazelnut Spread",
    slug: "nutella-hazelnut-spread",
    sku: "SPREAD-NUTELLA-001",
    brand: "Nutella",
    description: "Hazelnut cocoa spread.",
    price: "350",
    mrp: "380",
    stock: 40,
    unit: "jar",
    weight: "350 g",
    categorySlug: "sauces-spreads",
  },
];

// =====================================================
// SEED
// =====================================================

async function main() {
  console.log("🌱 Starting Shope2door database seed...\n");

  // ---------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------

  console.log("📦 Seeding categories...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`✅ ${categories.length} categories ready.\n`);

  // ---------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------

  console.log("🛒 Seeding products...");

  for (const product of products) {
    const category = await prisma.category.findUnique({
      where: {
        slug: product.categorySlug,
      },
    });

    if (!category) {
      throw new Error(
        `Category not found: ${product.categorySlug}`,
      );
    }

    await prisma.product.upsert({
      where: {
        sku: product.sku,
      },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        unit: product.unit,
        weight: product.weight,
        brand: product.brand,
        categoryId: category.id,
        isActive: true,
      },
      create: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        brand: product.brand,
        description: product.description,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        unit: product.unit,
        weight: product.weight,
        images: [],
        categoryId: category.id,
        isActive: true,
        isFeatured: false,
      },
    });
  }

  console.log(`✅ ${products.length} products ready.\n`);

  // ---------------------------------------------------
  // COUPONS
  // ---------------------------------------------------

  console.log("🎟️ Seeding coupons...");

  await prisma.coupon.upsert({
    where: {
      code: "WELCOME50",
    },
    update: {
      isActive: true,
      value: "50",
      type: "FIXED",
      minOrderAmount: "299",
      maxDiscount: "50",
    },
    create: {
      code: "WELCOME50",
      description: "Get ₹50 off on orders above ₹299",
      type: "FIXED",
      value: "50",
      minOrderAmount: "299",
      maxDiscount: "50",
      usageLimit: 1000,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: {
      code: "SAVE10",
    },
    update: {
      isActive: true,
      value: "10",
      type: "PERCENTAGE",
      minOrderAmount: "499",
      maxDiscount: "100",
    },
    create: {
      code: "SAVE10",
      description: "Get 10% off on orders above ₹499",
      type: "PERCENTAGE",
      value: "10",
      minOrderAmount: "499",
      maxDiscount: "100",
      usageLimit: 1000,
      isActive: true,
    },
  });

  console.log("✅ Coupons ready.\n");

  // ---------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------

  const categoryCount = await prisma.category.count();
  const productCount = await prisma.product.count();
  const couponCount = await prisma.coupon.count();

  console.log("======================================");
  console.log("🎉 SEED COMPLETED SUCCESSFULLY");
  console.log("======================================");
  console.log(`📦 Categories : ${categoryCount}`);
  console.log(`🛒 Products   : ${productCount}`);
  console.log(`🎟️ Coupons    : ${couponCount}`);
  console.log("======================================\n");
}

// =====================================================
// EXECUTION
// =====================================================

main()
  .catch((error) => {
    console.error("\n❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });