/**
 * Catalog product schema formatting & normalization
 * Maps backend database fields (snake_case) and JSON payloads into consistent models.
 */

export function formatCardRecord(r) {
  if (!r) return null;
  let gallery = [];
  try { gallery = typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []); } catch {}
  if (!Array.isArray(gallery) || gallery.length === 0) {
    gallery = r.image ? [r.image] : ['/assets/card_detail.png'];
  }

  let specs = {};
  try { specs = typeof r.specs === 'string' ? JSON.parse(r.specs) : (r.specs || {}); } catch {}

  let tags = [];
  try { tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []); } catch {}

  const price = Number(r.price || 0);
  const originalPrice = r.original_price != null ? Number(r.original_price) : (r.originalPrice != null ? Number(r.originalPrice) : (price ? Math.round(price * 1.15) : 0));
  const discountPercent = r.discount_percent != null ? Number(r.discount_percent) : (r.discountPercent != null ? Number(r.discountPercent) : (originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0));
  const inStock = Number(r.in_stock != null ? r.in_stock : (r.inStock != null ? r.inStock : 10));
  const reviewCount = Number(r.review_count != null ? r.review_count : (r.reviewCount != null ? r.reviewCount : 1));
  const rating = Number(r.rating != null ? r.rating : 5.0);
  const subName = r.sub_name || r.subName || '';
  const category = r.category || 'trading-cards';
  const categoryName = r.category_name || r.categoryName || (category.replace(/-/g, ' ').toUpperCase());
  const shortDescription = r.short_description || r.shortDescription || r.description || '';
  const isFeatured = Boolean(r.is_featured ?? r.isFeatured);
  const isTrending = Boolean(r.is_trending ?? r.isTrending);
  const isBestseller = Boolean(r.is_bestseller ?? r.isBestseller);
  const isNew = Boolean(r.is_new ?? r.isNew);
  const eraCode = r.era_code || r.eraCode || '';

  return {
    ...r,
    id: String(r.id),
    name: r.name,
    sku: r.sku || `CARD-${String(r.id).toUpperCase()}`,
    subName,
    sub_name: subName,
    category,
    categoryName,
    category_name: categoryName,
    pokemon: r.pokemon || 'Pokémon',
    price,
    originalPrice,
    original_price: originalPrice,
    discountPercent,
    discount_percent: discountPercent,
    image: r.image || '/assets/card_detail.png',
    gallery,
    shortDescription,
    short_description: shortDescription,
    description: r.description || shortDescription,
    rating,
    reviewCount,
    review_count: reviewCount,
    inStock,
    in_stock: inStock,
    availability: inStock > 0 ? 'In Stock' : 'Out of Stock',
    tags,
    badge: r.badge || '',
    isFeatured,
    is_featured: isFeatured,
    isTrending,
    is_trending: isTrending,
    isBestseller,
    is_bestseller: isBestseller,
    isNew,
    is_new: isNew,
    specs,
    eraCode,
    era_code: eraCode
  };
}
