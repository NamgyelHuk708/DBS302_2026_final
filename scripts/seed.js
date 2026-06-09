require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../src/models/User');
const Category = require('../src/models/Category');
const Product  = require('../src/models/Product');
const Order    = require('../src/models/Order');
const Inventory= require('../src/models/Inventory');

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', level: 0 },
  { name: 'Clothing',    slug: 'clothing',    level: 0 },
  { name: 'Books',       slug: 'books',       level: 0 },
];

function makeProduct(name, catId, sellerId, attrs, basePrice) {
  const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 9999);
  return {
    name, slug, basePrice, seller: sellerId, category: catId,
    description: `Description for ${name}`,
    attributes:  attrs,
    tags:        [name.split(' ')[0].toLowerCase(), 'featured'],
    isActive:    true,
    variants: [{
      sku:   'SKU-' + Math.floor(Math.random() * 99999),
      price: basePrice,
      stock: Math.floor(Math.random() * 100) + 10,
    }],
  };
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Clearing old data...');
  await Promise.all([User, Category, Product, Order, Inventory].map(M => M.deleteMany({})));

  // Categories
  const cats = await Category.insertMany(CATEGORIES);
  const [elec, cloth, books] = cats;

  // Users — password pre-hashed since insertMany skips pre-save hooks
  const hashedPw = await bcrypt.hash('Password123', 12);
  const users = await User.insertMany([
    { name: 'Namgyel',     email: 'admin@druk.com',      password: hashedPw, role: 'admin'    },
    { name: 'Dorji Tshering', email: 'seller@druk.com',    password: hashedPw, role: 'seller'   },
    { name: 'Karma Wangmo',    email: 'karma@druk.com',     password: hashedPw, role: 'customer' },
    { name: 'Tenzin Dorji',    email: 'tenzin@druk.com',    password: hashedPw, role: 'customer' },
    { name: 'Pemba Dema',      email: 'pemba@druk.com',     password: hashedPw, role: 'customer' },
    { name: 'Kinley Wangdi',   email: 'kinley@druk.com',    password: hashedPw, role: 'customer' },
    { name: 'Sonam Zangmo',    email: 'sonam@druk.com',     password: hashedPw, role: 'customer' },
    { name: 'Tashi Dorji',     email: 'tashi@druk.com',     password: hashedPw, role: 'customer' },
    { name: 'Dawa Yangzom',    email: 'dawa@druk.com',      password: hashedPw, role: 'customer' },
    { name: 'Norbu Wangchuk',  email: 'norbu@druk.com',     password: hashedPw, role: 'customer' },
  ]);

  const seller = users.find(u => u.role === 'seller')._id;

  // Products (50 total across 3 categories)
  const productDocs = [
    // Electronics (20 products)
    ...Array.from({ length: 20 }, (_, i) => makeProduct(
      `Laptop Model ${i + 1}`, elec._id, seller,
      { ram: ['8GB', '16GB', '32GB'][i % 3], storage: ['256GB', '512GB', '1TB'][i % 3], brand: 'TechBrand' },
      300 + i * 50
    )),
    // Clothing (20 products)
    ...Array.from({ length: 20 }, (_, i) => makeProduct(
      `T-Shirt Style ${i + 1}`, cloth._id, seller,
      { fabric: ['cotton', 'polyester', 'linen'][i % 3], fit: ['slim', 'regular', 'loose'][i % 3] },
      15 + i * 5
    )),
    // Books (10 products)
    ...Array.from({ length: 10 }, (_, i) => makeProduct(
      `Book Title ${i + 1}`, books._id, seller,
      { author: `Author ${i + 1}`, pages: 200 + i * 30, genre: ['fiction', 'tech', 'self-help'][i % 3] },
      10 + i * 3
    )),
  ];

  // Demo product — fixed SKU for reliable demo commands
  const demoProductDoc = {
    name: 'Demo Laptop Pro', slug: 'demo-laptop-pro',
    basePrice: 999, seller, category: elec._id,
    description: 'Demo product with fixed SKU for demonstration purposes.',
    attributes: { ram: '16GB', storage: '512GB', brand: 'DemoBrand' },
    tags: ['laptop', 'demo', 'featured'],
    isActive: true,
    variants: [{ sku: 'DEMO-SKU-001', price: 999, stock: 100 }],
  };
  productDocs.push(demoProductDoc);

  const products = await Product.insertMany(productDocs);
  console.log(`${products.length} products created (includes Demo Laptop Pro with DEMO-SKU-001)`);

  // Inventory for each product variant
  const invDocs = products.flatMap(p =>
    p.variants.map(v => ({
      product: p._id, variantSku: v.sku,
      quantity: v.stock ?? 100, lowStockThreshold: 10,
    }))
  );
  await Inventory.insertMany(invDocs);

  // Orders (20 orders with varied statuses)
  const customers = users.filter(u => u.role === 'customer');
  const statuses  = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  const orderDocs = Array.from({ length: 20 }, (_, i) => {
    const customer = customers[i % customers.length];
    const product  = products[i % products.length];
    const variant  = product.variants[0];
    const qty      = Math.floor(Math.random() * 3) + 1;
    const status   = statuses[i % statuses.length];
    return {
      orderNumber: `ORD-SEED-${1000 + i}`,
      user:        customer._id,
      items: [{
        product:    product._id,
        variantSku: variant.sku,
        name:       product.name,
        price:      variant.price,
        quantity:   qty,
        subtotal:   variant.price * qty,
      }],
      shippingAddress: { street: `${i + 1} Main St`, city: 'Thimphu', country: 'BT' },
      totalAmount:  variant.price * qty,
      status,
      paymentMethod: 'cod',
      paymentStatus: status === 'delivered' ? 'paid' : 'pending',
      statusHistory: [{ status, timestamp: new Date() }],
    };
  });

  await Order.insertMany(orderDocs);
  console.log('20 orders created');
  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
