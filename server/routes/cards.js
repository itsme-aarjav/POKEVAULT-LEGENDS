import { Router } from 'express';
import { dbQuery, isMySQLConfigured } from '../db/mysql.js';
import { ALL_PRODUCTS } from '../../src/data/products.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Helper to safely parse JSON columns
const parseJsonField = (field, fallback = []) => {
  if (!field) return fallback;
  if (typeof field === 'object') return field;
  try { return JSON.parse(field); } catch { return fallback; }
};

// GET /api/cards or /api/products — Retrieve all products
router.get('/', async (req, res) => {
  try {
    const { category, era, search, trending, featured, pokemon } = req.query;

    if (isMySQLConfigured()) {
      let conditions = [];
      let params = [];

      if (category && category !== 'all') {
        conditions.push('category = ?');
        params.push(category);
      }
      if (era && era !== 'all') {
        conditions.push('era_code = ?');
        params.push(era);
      }
      if (pokemon && pokemon !== 'all') {
        conditions.push('LOWER(pokemon) = LOWER(?)');
        params.push(pokemon);
      }
      if (trending === 'true') {
        conditions.push('is_trending = 1');
      }
      if (featured === 'true') {
        conditions.push('is_featured = 1');
      }
      if (search) {
        conditions.push('(name LIKE ? OR rarity LIKE ? OR category_name LIKE ?)');
        const q = `%${search}%`;
        params.push(q, q, q);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbQuery(`SELECT * FROM cards ${whereClause} ORDER BY created_at DESC`, params);

      if (rows && rows.length > 0) {
        const formatted = rows.map(r => ({
          ...r,
          gallery: parseJsonField(r.gallery, []),
          tags: parseJsonField(r.tags, []),
          specs: parseJsonField(r.specs, {}),
          comicLore: parseJsonField(r.comic_lore, {}),
          isTrending: Boolean(r.is_trending),
          isFeatured: Boolean(r.is_featured),
          isBestseller: Boolean(r.is_bestseller),
          isNew: Boolean(r.is_new),
          price: Number(r.price),
          originalPrice: r.original_price ? Number(r.original_price) : null
        }));
        return res.json({ success: true, count: formatted.length, data: formatted, source: 'mysql' });
      }
    }

    // Fallback to master ALL_PRODUCTS catalog
    let list = [...ALL_PRODUCTS];
    if (category && category !== 'all') list = list.filter(c => c.category === category);
    if (pokemon && pokemon !== 'all') list = list.filter(c => c.pokemon.toLowerCase() === pokemon.toLowerCase());
    if (era && era !== 'all') list = list.filter(c => c.eraCode === era);
    if (trending === 'true') list = list.filter(c => c.isTrending);
    if (featured === 'true') list = list.filter(c => c.isFeatured);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.categoryName && c.categoryName.toLowerCase().includes(q)));
    }

    return res.json({ success: true, count: list.length, data: list, source: 'local' });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/:id — Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMySQLConfigured()) {
      const rows = await dbQuery('SELECT * FROM cards WHERE id = ? LIMIT 1', [id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        const formatted = {
          ...r,
          gallery: parseJsonField(r.gallery, []),
          tags: parseJsonField(r.tags, []),
          specs: parseJsonField(r.specs, {}),
          comicLore: parseJsonField(r.comic_lore, {}),
          isTrending: Boolean(r.is_trending),
          isFeatured: Boolean(r.is_featured),
          isBestseller: Boolean(r.is_bestseller),
          isNew: Boolean(r.is_new),
          price: Number(r.price),
          originalPrice: r.original_price ? Number(r.original_price) : null
        };
        return res.json({ success: true, data: formatted, source: 'mysql' });
      }
    }

    const product = ALL_PRODUCTS.find(c => c.id === id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: product, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cards — Add / Upsert Product [ADMIN PROTECTED]
router.post('/', requireAdmin, async (req, res) => {
  try {
    const p = req.body;
    if (!p.id || !p.name || !p.price) {
      return res.status(400).json({ success: false, message: 'id, name, and price are required' });
    }

    if (isMySQLConfigured()) {
      await dbQuery(`
        INSERT INTO cards (
          id, sku, name, sub_name, category, category_name, pokemon,
          price, original_price, discount_percent, image, gallery,
          short_description, description, rating, review_count, in_stock,
          availability, tags, badge, is_featured, is_trending, is_bestseller,
          is_new, specs, cross_sell_id, bundle_discount, tcg_market_price,
          era, era_code, card_no, release_year, grade, grade_score,
          grading_body, cert_number, hp, type, artist, holo_type, comic_lore
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), price=VALUES(price), in_stock=VALUES(in_stock),
          is_featured=VALUES(is_featured), is_trending=VALUES(is_trending),
          discount_percent=VALUES(discount_percent), cross_sell_id=VALUES(cross_sell_id);
      `, [
        p.id, p.sku || `SKU-${p.id}`, p.name, p.subName || null,
        p.category || 'trading-cards', p.categoryName || 'Trading Cards', p.pokemon || 'Pikachu',
        Number(p.price), p.originalPrice ? Number(p.originalPrice) : null, p.discountPercent || 0,
        p.image || '', JSON.stringify(p.gallery || []), p.shortDescription || null, p.description || null,
        Number(p.rating) || 5.0, Number(p.reviewCount) || 1, p.inStock !== undefined ? Number(p.inStock) : 10,
        p.availability || 'In Stock', JSON.stringify(p.tags || []), p.badge || null,
        Boolean(p.isFeatured), Boolean(p.isTrending), Boolean(p.isBestseller), Boolean(p.isNew),
        JSON.stringify(p.specs || {}), p.crossSellId || null, p.bundleDiscount || 10,
        p.tcgMarketPrice ? Number(p.tcgMarketPrice) : null, p.era || null, p.eraCode || null,
        p.cardNo || null, p.releaseYear || null, p.grade || null, p.gradeScore || null,
        p.gradingBody || null, p.certNumber || null, p.hp || null, p.type || null,
        p.artist || null, p.holoType || null, JSON.stringify(p.comicLore || {})
      ]);

      return res.json({ success: true, message: 'Product saved in MySQL', data: p });
    }

    return res.json({ success: true, message: 'Product saved locally', data: p, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
