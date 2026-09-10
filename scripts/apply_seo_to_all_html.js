import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://pokevault-legends.com';

const HTML_SEO_CONFIGS = {
  "shop.html": {
    title: "Marketplace Shop — Buy 64+ Authentic Pokémon Items | POKÉVAULT LEGENDS",
    description: "Browse the complete Pokémon marketplace: graded 1st Edition PSA slabs, plush toys, resin statues, vintage clothing, and gifts. Free vault archival shipping.",
    keywords: "pokemon shop, buy pokemon merchandise, graded cards marketplace, vintage pokemon store",
    url: `${SITE_URL}/shop.html`,
    ogImage: `${SITE_URL}/assets/charizard.png`
  },
  "categories.html": {
    title: "Browse All 18 Merchandise Categories — POKÉVAULT LEGENDS",
    description: "Explore 18 official Pokémon product departments: Trading Cards, Plush Toys, Figures, Apparel, Hats, Bags, Home Decor, Mugs, Gaming Gear, and Mystery Chests.",
    keywords: "pokemon categories, pokemon departments, buy pokemon plushies, pokemon figures store",
    url: `${SITE_URL}/categories.html`,
    ogImage: `${SITE_URL}/assets/pikachu.png`
  },
  "category.html": {
    title: "Pokémon Category Showcase — POKÉVAULT LEGENDS",
    description: "Explore authentic Pokémon merchandise in this category. Guaranteed 100% genuine items shipped from PokéVault.",
    keywords: "pokemon category, authentic pokemon items, pokevault marketplace",
    url: `${SITE_URL}/category.html`,
    ogImage: `${SITE_URL}/assets/gengar.png`
  },
  "about.html": {
    title: "About PokéVault Legends — Our Authentication & Archival Guarantee",
    description: "Learn about PokéVault Legends' 100% physical vault authentication process, temperature-controlled archival storage, and sonic-welded slab verification.",
    keywords: "about pokevault, pokemon card authentication, psa grading guarantee",
    url: `${SITE_URL}/about.html`,
    ogImage: `${SITE_URL}/assets/charizard.png`
  },
  "contact.html": {
    title: "Contact PokéVault Concierge — Collector Support & Vault Inquiries",
    description: "Get in touch with the PokéVault Legends concierge team for order tracking, card authentication, and vault storage inquiries.",
    keywords: "contact pokevault, pokemon support, vault concierge",
    url: `${SITE_URL}/contact.html`,
    ogImage: `${SITE_URL}/assets/pikachu.png`
  },
  "search.html": {
    title: "Search Catalog — POKÉVAULT LEGENDS Marketplace",
    description: "Search 64+ Pokémon merchandise products, cards, plushies, apparel, and figures across the PokéVault catalog.",
    keywords: "search pokemon store, pokemon catalog search",
    url: `${SITE_URL}/search.html`,
    ogImage: `${SITE_URL}/assets/rayquaza.png`
  },
  "wishlist.html": {
    title: "Your Saved Vault Wishlist — POKÉVAULT LEGENDS",
    description: "View and manage your saved Pokémon collector items and graded slabs in your PokéVault wishlist.",
    keywords: "pokemon wishlist, saved pokemon items",
    url: `${SITE_URL}/wishlist.html`,
    ogImage: `${SITE_URL}/assets/mew.png`
  },
  "cart.html": {
    title: "Shopping Cart — POKÉVAULT LEGENDS Secure Vault Dispatch",
    description: "Review items in your shopping cart and proceed to secure armored checkout with vault shipping guarantee.",
    keywords: "pokemon cart, checkout pokevault",
    url: `${SITE_URL}/cart.html`,
    ogImage: `${SITE_URL}/assets/charizard.png`
  }
};

Object.keys(HTML_SEO_CONFIGS).forEach(fileName => {
  if (!fs.existsSync(fileName)) return;
  const cfg = HTML_SEO_CONFIGS[fileName];
  let html = fs.readFileSync(fileName, 'utf8');

  // Build Head SEO block
  const seoBlock = `
  <!-- Primary Meta Tags -->
  <title>${cfg.title}</title>
  <meta name="description" content="${cfg.description}" />
  <meta name="keywords" content="${cfg.keywords}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <link rel="canonical" href="${cfg.url}" />

  <!-- OpenGraph / Facebook Meta Tags -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${cfg.url}" />
  <meta property="og:site_name" content="POKÉVAULT LEGENDS" />
  <meta property="og:title" content="${cfg.title}" />
  <meta property="og:description" content="${cfg.description}" />
  <meta property="og:image" content="${cfg.ogImage}" />

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${cfg.url}" />
  <meta name="twitter:title" content="${cfg.title}" />
  <meta name="twitter:description" content="${cfg.description}" />
  <meta name="twitter:image" content="${cfg.ogImage}" />
`;

  // Insert before stylesheet link or </head>
  if (html.includes('<title>')) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, seoBlock);
  } else {
    html = html.replace('</head>', `${seoBlock}\n</head>`);
  }

  fs.writeFileSync(fileName, html, 'utf8');
  console.log(`Successfully updated SEO meta tags in: ${fileName}`);
});
