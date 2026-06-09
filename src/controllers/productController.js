const Product   = require('../models/Product');
const Inventory = require('../models/Inventory');
require('../models/Category');
require('../models/User');
const redis     = require('../services/redisService');
const { v4: uuidv4 } = require('uuid');

const CACHE_TTL = parseInt(process.env.CACHE_TTL_PRODUCT) || 3600;

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:cache:${id}`;

    // 1. Check cache (cache-aside pattern)
    const cached = await redis.get(cacheKey);
    if (cached) {
      const visitorId = req.user?.id || req.ip;
      await redis.pfadd(`uv:product:${id}`, visitorId);
      await redis.zincrby('trending:products', 1, id);
      return res.json({ source: 'cache', product: cached });
    }

    // 2. Cache miss — fetch from MongoDB
    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('seller', 'name email');

    if (!product || !product.isActive)
      return res.status(404).json({ error: 'Product not found' });

    // 3. Store in cache with jittered TTL (prevents cache stampede)
    const jitter = Math.floor(Math.random() * 300);
    await redis.set(cacheKey, product, CACHE_TTL + jitter);

    const visitorId = req.user?.id || req.ip;
    await redis.pfadd(`uv:product:${id}`, visitorId);
    await redis.zincrby('trending:products', 1, id);

    if (req.user?.id) {
      await redis.lpush(`recently:viewed:${req.user.id}`, id);
    }

    res.json({ source: 'database', product });
  } catch (err) { next(err); }
};

exports.getProducts = async (req, res, next) => {
  try {
    const {
      search, category, minPrice, maxPrice,
      sort = '-createdAt', page = 1, limit = 20,
    } = req.query;

    const filter = { isActive: true };

    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const slug = req.body.name.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 6);
    const product = await Product.create({ ...req.body, slug, seller: req.user.id });

    if (product.variants?.length) {
      const inventoryDocs = product.variants.map(v => ({
        product:    product._id,
        variantSku: v.sku,
        quantity:   v.stock || 0,
      }));
      await Inventory.insertMany(inventoryDocs);
    }

    res.status(201).json({ product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Cache invalidation — delete stale entry on update
    await redis.del(`product:cache:${req.params.id}`);

    res.json({ product });
  } catch (err) { next(err); }
};
