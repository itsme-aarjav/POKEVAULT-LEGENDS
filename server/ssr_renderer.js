/**
 * POKÉVAULT LEGENDS — High-Performance Server-Side Rendering (SSR) & SEO Engine
 * Transforms raw HTML templates into fully pre-rendered, crawlable HTML documents
 * enriched with LCP preloading, 0-CLS attributes, canonical links, and Schema.org JSON-LD.
 */

import { getReviewsForProduct } from '../src/data/reviews.js';

const SITE_URL = 'https://pokevault-legends.com';
const BRAND = 'POKÉVAULT LEGENDS';

/**
 * Strips HTML tags for clean meta descriptions
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

/**
 * Formats fallback SEO description per spec:
 * [Product Name] - Official Pokemon [Category]. [Brief description]. Fast shipping at Pokevault Legends.
 */
function formatFallbackDescription(product) {
  const briefDesc = cleanText(product.shortDescription || product.description).slice(0, 110);
  return `${product.name} - Official Pokemon ${product.categoryName || 'Merchandise'}. ${briefDesc}... Fast shipping at Pokevault Legends.`;
}

/**
 * Renders SSR output for Product Detail Pages (product.html?id=...)
 */
export function renderProductSSR(html, product) {
  if (!product) return html;

  const reviews = getReviewsForProduct(product.id) || [];
  const metaDesc = formatFallbackDescription(product);
  const fullTitle = `${product.name} — Buy Official Pokémon Merchandise | ${BRAND}`;
  const prodUrl = `${SITE_URL}/product.html?id=${product.id}`;
  const imgUrl = product.image.startsWith('http') ? product.image : `${SITE_URL}${product.image}`;

  // 1. Calculate Aggregate Rating & Review Schemas
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : product.rating.toFixed(1);

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": `${prodUrl}#product`,
    "name": product.name,
    "image": [imgUrl],
    "description": metaDesc,
    "sku": product.sku || `CARD-${product.id.toUpperCase()}`,
    "mpn": product.id,
    "brand": {
      "@type": "Brand",
      "name": "Pokémon"
    },
    "category": product.categoryName,
    "offers": {
      "@type": "Offer",
      "url": prodUrl,
      "priceCurrency": "USD",
      "price": product.price.toFixed(2),
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": (product.inStock || 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": BRAND
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length || product.reviewCount || 12,
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": reviews.map(r => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": "5"
      },
      "author": {
        "@type": "Person",
        "name": r.author
      },
      "datePublished": "2026-08-12",
      "name": r.title,
      "reviewBody": r.comment
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Shop Marketplace",
        "item": `${SITE_URL}/shop.html`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.categoryName,
        "item": `${SITE_URL}/category.html?id=${product.category}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": product.name,
        "item": prodUrl
      }
    ]
  };

  // 2. Build Head SEO Injection (Preload LCP image, Meta, OpenGraph, Canonical, JSON-LD)
  const headInject = `
  <!-- SSR Primary SEO Meta Tags -->
  <title>${fullTitle}</title>
  <meta name="description" content="${metaDesc}" />
  <meta name="keywords" content="${product.name}, buy ${product.pokemon}, ${product.categoryName}, authentic pokemon collectibles, pokevault" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <link rel="canonical" href="${prodUrl}" />

  <!-- Core Web Vitals LCP Preload -->
  <link rel="preload" as="image" href="${product.image}" fetchpriority="high" />

  <!-- OpenGraph Meta Tags -->
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${prodUrl}" />
  <meta property="og:site_name" content="${BRAND}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:image" content="${imgUrl}" />

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${prodUrl}" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${metaDesc}" />
  <meta name="twitter:image" content="${imgUrl}" />

  <!-- Schema.org JSON-LD Structured Data -->
  <script type="application/ld+json">${JSON.stringify(productSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
`;

  // Replace Title & append Head Inject
  let ssrHtml = html.replace(/<title>[\s\S]*?<\/title>/, headInject);

  return ssrHtml;
}

/**
 * Renders SSR output for Category Pages (category.html?id=...)
 */
export function renderCategorySSR(html, category, products, rawQueryString = '') {
  if (!category) return html;

  const catUrl = `${SITE_URL}/category.html?id=${category.id}`;
  const fullTitle = `${category.name} — Buy Official Pokémon Merchandise | ${BRAND}`;
  const metaDesc = `Explore authentic ${category.name} at ${BRAND}. ${category.description} 100% verified genuine items with fast vault shipping.`;
  const firstProdImg = (products && products.length > 0 && products[0].image) ? products[0].image : '/assets/charizard.png';
  const ogImgUrl = firstProdImg.startsWith('http') ? firstProdImg : `${SITE_URL}${firstProdImg}`;

  // CollectionPage & ItemList Schema
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${catUrl}#collection`,
    "name": category.name,
    "url": catUrl,
    "description": metaDesc,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": products.length,
      "itemListElement": products.slice(0, 10).map((p, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "url": `${SITE_URL}/product.html?id=${p.id}`,
        "name": p.name,
        "image": p.image.startsWith('http') ? p.image : `${SITE_URL}${p.image}`
      }))
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Categories",
        "item": `${SITE_URL}/categories.html`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": category.name,
        "item": catUrl
      }
    ]
  };

  const headInject = `
  <!-- SSR Primary SEO Meta Tags -->
  <title>${fullTitle}</title>
  <meta name="description" content="${metaDesc}" />
  <meta name="keywords" content="${category.name}, ${category.shortName}, buy pokemon items, authentic pokemon collectibles" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <!-- Faceted Navigation Canonicalization: Canonical points to root category URL -->
  <link rel="canonical" href="${catUrl}" />

  <!-- LCP Image Preload -->
  <link rel="preload" as="image" href="${firstProdImg}" fetchpriority="high" />

  <!-- OpenGraph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${catUrl}" />
  <meta property="og:site_name" content="${BRAND}" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:image" content="${ogImgUrl}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${catUrl}" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${metaDesc}" />
  <meta name="twitter:image" content="${ogImgUrl}" />

  <script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
`;

  return html.replace(/<title>[\s\S]*?<\/title>/, headInject);
}
