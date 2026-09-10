import fs from 'fs';
import path from 'path';
import { ALL_PRODUCTS } from '../src/data/products.js';

const outDir = path.resolve('public/assets/items');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Generating 64 unique, dedicated product images for PokéVault catalog...`);

function xml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const DESIGN_THEMES = {
  'trading-cards': { bg1: '#111827', bg2: '#1F2937', accent: '#FFD700', badge: 'AUTHENTIC PSA / BGS SLAB', type: 'SLAB' },
  'plush-toys': { bg1: '#78350F', bg2: '#B45309', accent: '#FDE68A', badge: 'POKÉMON CENTER PLUSH', type: 'PLUSH' },
  'figures-statues': { bg1: '#0F172A', bg2: '#334155', accent: '#38BDF8', badge: '1/6 SCALE RESIN DIORAMA', type: 'STATUE' },
  'clothing-apparel': { bg1: '#18181B', bg2: '#27272A', accent: '#EC4899', badge: 'VINTAGE STREETWEAR APPAREL', type: 'APPAREL' },
  'hats-caps': { bg1: '#1E1B4B', bg2: '#312E81', accent: '#818CF8', badge: 'HEADWEAR & CAPS', type: 'HAT' },
  'backpacks-bags': { bg1: '#064E3B', bg2: '#047857', accent: '#34D399', badge: 'CANVAS & TRAVEL BAG', type: 'BAG' },
  'toys-games': { bg1: '#78350F', bg2: '#B45309', accent: '#FBBF24', badge: 'PLAYSET & BOARD GAME', type: 'TOY' },
  'collectibles-pins': { bg1: '#451A03', bg2: '#78350F', accent: '#F59E0B', badge: 'COLLECTOR METAL PIN', type: 'PIN' },
  'home-decor': { bg1: '#311042', bg2: '#581C87', accent: '#C084FC', badge: 'LED NEON & ROOM DECOR', type: 'DECOR' },
  'mugs-drinkware': { bg1: '#701A75', bg2: '#A21CAF', accent: '#F0ABFC', badge: 'CERAMIC & TUMBLER DRINKWARE', type: 'MUG' },
  'stationery-notebooks': { bg1: '#831843', bg2: '#BE185D', accent: '#F472B6', badge: 'OFFICE & JOURNAL STATIONERY', type: 'STATIONERY' },
  'posters-art': { bg1: '#0284C7', bg2: '#0369A1', accent: '#38BDF8', badge: 'VINTAGE CANVAS ART PRINT', type: 'ART' },
  'keychains-lanyards': { bg1: '#1E293B', bg2: '#475569', accent: '#94A3B8', badge: 'SPINNER KEYCHAIN & LANYARD', type: 'KEYCHAIN' },
  'phone-accessories': { bg1: '#0F766E', bg2: '#115E59', accent: '#2DD4BF', badge: 'TECH & MAGSAFE ACCESSORY', type: 'PHONE' },
  'gaming-accessories': { bg1: '#4C1D95', bg2: '#6D28D9', accent: '#A78BFA', badge: 'SWITCH & TCG GAMING GEAR', type: 'GAME' },
  'books-guides': { bg1: '#7F1D1D', bg2: '#991B1B', accent: '#FCA5A5', badge: 'MANGA & ARTBOOK GUIDE', type: 'BOOK' },
  'jewelry-accessories': { bg1: '#1E1B4B', bg2: '#312E81', accent: '#E0E7FF', badge: '925 STERLING JEWELRY', type: 'JEWELRY' },
  'gifts-bundles': { bg1: '#111827', bg2: '#1F2937', accent: '#FFF056', badge: 'MASTER VAULT MYSTERY CHEST', type: 'GIFT' }
};

function getCharacterColors(pokemon) {
  const p = (pokemon || '').toLowerCase();
  if (p.includes('charizard') || p.includes('charmander')) return { primary: '#EF4444', secondary: '#F97316', text: '#FEF2F2', icon: '🔥' };
  if (p.includes('pikachu') || p.includes('electric')) return { primary: '#EAB308', secondary: '#FACC15', text: '#FEFCE8', icon: '⚡' };
  if (p.includes('gengar') || p.includes('haunter') || p.includes('ghost')) return { primary: '#9333EA', secondary: '#A855F7', text: '#FAF5FF', icon: '👻' };
  if (p.includes('rayquaza') || p.includes('dragon')) return { primary: '#10B981', secondary: '#059669', text: '#ECFDF5', icon: '🐉' };
  if (p.includes('mew') || p.includes('psychic')) return { primary: '#EC4899', secondary: '#F472B6', text: '#FDF2F8', icon: '🔮' };
  if (p.includes('snorlax')) return { primary: '#0284C7', secondary: '#38BDF8', text: '#F0F9FF', icon: '💤' };
  if (p.includes('lugia') || p.includes('water')) return { primary: '#2563EB', secondary: '#60A5FA', text: '#EFF6FF', icon: '🌊' };
  if (p.includes('eevee') || p.includes('umbreon')) return { primary: '#F59E0B', secondary: '#D97706', text: '#FFFBEB', icon: '⭐' };
  return { primary: '#EF4444', secondary: '#F97316', text: '#FFFFFF', icon: '✨' };
}

let prodJsContent = fs.readFileSync('src/data/products.js', 'utf8');

ALL_PRODUCTS.forEach((p, idx) => {
  const theme = DESIGN_THEMES[p.category] || DESIGN_THEMES['trading-cards'];
  const charColor = getCharacterColors(p.pokemon);
  const itemNo = String(idx + 1).padStart(2, '0');

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}" />
      <stop offset="100%" stop-color="${theme.bg2}" />
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${charColor.primary}" />
      <stop offset="100%" stop-color="${charColor.secondary}" />
    </linearGradient>

    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF056" />
      <stop offset="50%" stop-color="#FFD700" />
      <stop offset="100%" stop-color="#FF914D" />
    </linearGradient>

    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1.5"/>
    </pattern>
  </defs>

  <rect width="600" height="600" fill="url(#bgGrad)" />
  <rect width="600" height="600" fill="url(#grid)" />

  <rect x="20" y="20" width="560" height="560" fill="none" stroke="#000000" stroke-width="8" rx="16" />
  <rect x="24" y="24" width="552" height="552" fill="none" stroke="${theme.accent}" stroke-width="3" rx="12" opacity="0.8" />

  <g transform="translate(40, 45)">
    <rect width="520" height="44" fill="#000000" rx="8" />
    <rect x="-3" y="-3" width="520" height="44" fill="url(#goldGrad)" rx="8" stroke="#000" stroke-width="3"/>
    <text x="20" y="27" font-family="'Impact', 'Arial Black', sans-serif" font-size="17" font-weight="900" fill="#000000" letter-spacing="1">
      ★ POKÉVAULT LEGENDS #${itemNo} — ${xml(theme.badge)}
    </text>
    <text x="490" y="27" font-family="'Courier New', monospace" font-size="16" font-weight="900" fill="#000000" text-anchor="end">
      $${Number(p.price).toFixed(2)}
    </text>
  </g>

  <g transform="translate(80, 110)">
    <rect x="15" y="15" width="410" height="370" fill="#000000" rx="16" />
    <rect x="0" y="0" width="410" height="370" fill="url(#cardGrad)" rx="16" stroke="#000000" stroke-width="5" />
    <path d="M0,0 L410,370 M410,0 L0,370" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="4" />

    <circle cx="205" cy="135" r="70" fill="#000000" opacity="0.3"/>
    <circle cx="205" cy="135" r="65" fill="#FFFFFF" opacity="0.95" stroke="#000000" stroke-width="4"/>
    <text x="205" y="158" font-size="70" text-anchor="middle">${charColor.icon}</text>

    <g transform="translate(20, 240)">
      <rect width="370" height="105" fill="#000000" rx="10" />
      <rect x="-3" y="-3" width="370" height="105" fill="#FFFFFF" rx="10" stroke="#000000" stroke-width="4" />
      <text x="185" y="32" font-family="'Impact', 'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#000000" text-anchor="middle">
        ${xml(p.name.substring(0, 32))}
      </text>
      <text x="185" y="55" font-family="'Trebuchet MS', sans-serif" font-size="13" font-weight="700" fill="#EF4444" text-anchor="middle">
        ${xml(p.categoryName || p.category)} • SKU: ${xml(p.sku || p.id)}
      </text>
      <text x="185" y="80" font-family="'Courier New', monospace" font-size="13" font-weight="800" fill="#15803D" text-anchor="middle">
        ★ RATING ${p.rating} (${p.reviewCount} REVIEWS) • ${xml(p.availability || 'IN STOCK')}
      </text>
    </g>
  </g>

  <g transform="translate(40, 510)">
    <rect width="520" height="45" fill="#000000" rx="8"/>
    <text x="20" y="28" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#FFF056">
      GUARANTEED 100% AUTHENTIC • CLIMATE CONTROLLED VAULT DISPATCH
    </text>
    <text x="500" y="28" font-family="'Impact', sans-serif" font-size="16" fill="#FFFFFF" text-anchor="end">
      POKÉVAULT.COM
    </text>
  </g>
</svg>`;

  const fileName = `item_${p.id}.svg`;
  fs.writeFileSync(path.join(outDir, fileName), svgContent, 'utf8');

  // Update image and gallery in products.js
  const itemPath = `/assets/items/item_${p.id}.svg`;
  const imgRegex = new RegExp(`(id:\\s*"${p.id}"[\\s\\S]*?image:\\s*").*?(")`, "g");
  prodJsContent = prodJsContent.replace(imgRegex, `$1${itemPath}$2`);

  const galRegex = new RegExp(`(id:\\s*"${p.id}"[\\s\\S]*?gallery:\\s*\\[).*?(\\])`, "g");
  prodJsContent = prodJsContent.replace(galRegex, `$1"${itemPath}"$2`);
});

fs.writeFileSync('src/data/products.js', prodJsContent, 'utf8');
console.log(`Successfully generated 64 1-to-1 unique SVG files and updated products.js!`);
