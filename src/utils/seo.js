/**
 * POKÉVAULT LEGENDS — Centralized SEO Controller
 * Injects OpenGraph meta tags, Twitter cards, canonical links, and Schema.org JSON-LD structured data.
 */

const SITE_URL = 'https://pokevault-legends.com';
const BRAND_NAME = 'POKÉVAULT LEGENDS';

/**
 * Updates head meta tags dynamically
 */
export function updateMetaTags({ title, description, image, url, type = 'website', keywords }) {
  const fullTitle = title.includes(BRAND_NAME) ? title : `${title} — ${BRAND_NAME}`;
  document.title = fullTitle;

  const setMeta = (attrName, attrVal, content) => {
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const setLink = (rel, href) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // Standard Meta
  setMeta('name', 'description', description);
  if (keywords) setMeta('name', 'keywords', keywords);
  setMeta('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

  // Canonical
  const fullUrl = url ? (url.startsWith('http') ? url : `${SITE_URL}${url}`) : window.location.href;
  setLink('canonical', fullUrl);

  // OpenGraph
  setMeta('property', 'og:site_name', BRAND_NAME);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:url', fullUrl);
  if (image) {
    const fullImg = image.startsWith('http') ? image : `${SITE_URL}${image}`;
    setMeta('property', 'og:image', fullImg);
  }

  // Twitter Cards
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', description);
  if (image) {
    const fullImg = image.startsWith('http') ? image : `${SITE_URL}${image}`;
    setMeta('name', 'twitter:image', fullImg);
  }
}

/**
 * Injects JSON-LD Structured Data Script into <head>
 */
export function injectJsonLd(schemaId, data) {
  let script = document.getElementById(schemaId);
  if (!script) {
    script = document.createElement('script');
    script.id = schemaId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/**
 * Injects Product & Breadcrumb Schema.org JSON-LD for item details page
 */
export function injectProductSeo(product, reviews = []) {
  if (!product) return;

  const fullImg = product.image ? (product.image.startsWith('http') ? product.image : `${SITE_URL}${product.image}`) : undefined;
  const prodUrl = `${SITE_URL}/product.html?id=${product.id}`;

  // 1. Schema.org Product JSON-LD
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": fullImg ? [fullImg] : [],
    "description": product.description || product.shortDescription,
    "sku": product.sku || product.id,
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
      "availability": product.inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": BRAND_NAME
      }
    }
  };

  // Add Aggregate Rating if reviews exist
  if (reviews && reviews.length > 0) {
    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1"
    };

    productSchema.review = reviews.map(r => ({
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
    }));
  }

  injectJsonLd('jsonld-product', productSchema);

  // 2. BreadcrumbList JSON-LD
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
        "name": "Shop",
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

  injectJsonLd('jsonld-breadcrumb', breadcrumbSchema);

  // Update Page Meta
  updateMetaTags({
    title: `${product.name} — Buy Authentic Pokémon Merchandise`,
    description: `${product.description} Guaranteed authentic by ${BRAND_NAME}. Fast armored dispatch worldwide.`,
    image: product.image,
    url: `/product.html?id=${product.id}`,
    type: 'product',
    keywords: `${product.name}, ${product.pokemon}, ${product.categoryName}, buy pokemon merchandise, authentic pokemon collectibles`
  });
}
