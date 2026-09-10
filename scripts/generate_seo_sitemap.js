import fs from 'fs';
import path from 'path';
import { ALL_PRODUCTS } from '../src/data/products.js';
import { CATEGORIES_DATA } from '../src/data/categories.js';
import { BLOG_POSTS } from '../src/data/blogs.js';

const SITE_URL = 'https://pokevault-legends.com';
const TODAY = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Core Storefront Pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/shop.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/categories.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contact.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${SITE_URL}/verify.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/rewards.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/track.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/mystery-vault.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

// Blog Posts (5 Authority Articles)
BLOG_POSTS.forEach(b => {
  xml += `  <url>
    <loc>${SITE_URL}/blog-post.html?slug=${b.slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.88</priority>
    <image:image>
      <image:loc>${SITE_URL}${b.heroImage}</image:loc>
      <image:title>${b.title.replace(/&/g, '&amp;')}</image:title>
      <image:caption>${b.subtitle.replace(/&/g, '&amp;')}</image:caption>
    </image:image>
  </url>\n`;
});

// Categories
CATEGORIES_DATA.forEach(cat => {
  xml += `  <url>
    <loc>${SITE_URL}/category.html?id=${cat.id}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
});

// Products (all 64 items)
ALL_PRODUCTS.forEach(p => {
  xml += `  <url>
    <loc>${SITE_URL}/product.html?id=${p.id}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${SITE_URL}${p.image}</image:loc>
      <image:title>${p.name.replace(/&/g, '&amp;')}</image:title>
      <image:caption>${(p.shortDescription || p.name).replace(/&/g, '&amp;')}</image:caption>
    </image:image>
  </url>\n`;
});

xml += `</urlset>`;

// Write sitemap.xml to root and public/
fs.writeFileSync(path.resolve('sitemap.xml'), xml, 'utf8');
if (fs.existsSync('public')) {
  fs.writeFileSync(path.resolve('public/sitemap.xml'), xml, 'utf8');
}
console.log(`Successfully generated sitemap.xml containing ${6 + CATEGORIES_DATA.length + ALL_PRODUCTS.length} URLs!`);

// Write robots.txt
const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /checkout.html
Disallow: /order-confirmation.html
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.resolve('robots.txt'), robotsTxt, 'utf8');
if (fs.existsSync('public')) {
  fs.writeFileSync(path.resolve('public/robots.txt'), robotsTxt, 'utf8');
}
console.log('Successfully generated robots.txt!');
