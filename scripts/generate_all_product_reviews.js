import fs from 'fs';
import path from 'path';
import { ALL_PRODUCTS } from '../src/data/products.js';

const FIRST_NAMES = [
  "PalletTownPro", "VaultArchivist", "KantoMaster99", "IndigoLeagueChamp", "ShadowCollector",
  "CosmicTrainer", "GengarFanatic", "PikachuCollector", "CharizardVault", "SnorlaxSleeper",
  "NeoDestinyMaster", "EeveelutionLover", "TCGInvestor_US", "TokyoRelicHunter", "GottaCatchEmAll",
  "CeruleanGymLeader", "CinnabarVolcano", "SilverCollector2026", "TrophyHunter", "PulpFictionFan",
  "VintageGakusei", "SlabProtector", "JohtoVoyager", "HoennChampion", "SinnohElite"
];

const POSITIVE_ASPECTS = {
  "trading-cards": [
    "Grading slab optical clarity is flawless. Verified cert serial with PSA database.",
    "Centering is 50/50 and foil sheen under LED spotlighting is museum quality.",
    "Armored temperature-controlled courier box arrived in less than 48 hours.",
    "The 3D vault inspection viewer on PokéVault gave me 100% buying confidence.",
    "Clean edges with zero silvering. Essential grail piece for any vintage TCG portfolio.",
    "Sonic-welded UV protection acrylic slab keeps this holy grail safe forever."
  ],
  "plush-toys": [
    "Ultra-soft high-density plush velvet fabric. Hypoallergenic micro-fill stuffing!",
    "Exactly 1:1 scale as described! Looks super adorable sitting on my bed setup.",
    "Official Pokémon Center tags attached with crisp embroidery details.",
    "Extremely cozy nap companion. My cat and I love snuggling with this giant plush!",
    "Stitching is rock solid and colors are vibrant. 10/10 quality control.",
    "Came packaged in a dust-proof sealed collector bag. Fast shipping!"
  ],
  "figures-statues": [
    "Resin cast details and hand-painted translucent flame effects are breathtaking!",
    "Heavyweight base display with built-in LED lighting features. Stunning centerpiece.",
    "Kotobukiya master sculpt accuracy is unmatched. Packaged in custom EVA foam.",
    "Zero flaws or paint bleed. The dynamic battle pose looks epic under cabinet lights.",
    "Collector box arrived pristine with official holographic authenticity seal.",
    "Assembly was smooth and seamless. A true museum-grade anime statue."
  ],
  "clothing-apparel": [
    "Heavyweight 450GSM organic fleece cotton. Super comfortable relaxed fit!",
    "Embroidery thread work is thick and crisp. Has survived 5 washes with zero fading.",
    "Vintage Japanese pulp comic print has rich halftone texture and bold colors.",
    "Sizing is spot on! Wore it to a gaming convention and got so many compliments.",
    "Ribbed cuffs and premium metal aglet drawstrings feel super high end.",
    "Best Pokémon streetwear item I own. Worth every single penny."
  ],
  "hats-caps": [
    "Sturdy 6-panel structured cap with official Kanto region embroidery detail.",
    "Clean retro snapback enclosure and crisp visor curve out of the box.",
    "High-density embroidery thread used for the logo. Very high quality headwear.",
    "Washed vintage twill fabric has an awesome retro aesthetic.",
    "Breathable eyelets and comfortable inner sweatband. Perfect daily wearer.",
    "Shipped in an uncrushable box so the crown kept its perfect shape!"
  ],
  "backpacks-bags": [
    "Durable heavy-duty canvas and metal hardware. Reinforced shoulder straps!",
    "Plenty of organized compartments and padded laptop sleeve slot.",
    "Official Loungefly metallic accents and custom inner lining print.",
    "Water-resistant material kept my gear dry during a rainy convention walk.",
    "Smooth zipper glides and heavy-duty MOLLE webbing loops.",
    "Spacious capacity without feeling bulky. High-end tactical streetwear feel."
  ],
  "default": [
    "Absolute 5-star quality! Exceeded my expectations in every way.",
    "Fast armored shipping, pristine condition, and 100% authentic merchandise.",
    "The details and craftmanship are incredible. PokéVault is the best marketplace!",
    "Beautiful packaging and presentation. Will definitely order again!",
    "Highly recommended for any serious collector or Pokémon enthusiast.",
    "Top tier customer support and fast dispatch!"
  ]
};

const REVIEWS_DATA = {};

ALL_PRODUCTS.forEach((product) => {
  const catKey = POSITIVE_ASPECTS[product.category] ? product.category : "default";
  const aspectList = POSITIVE_ASPECTS[catKey];

  const count = 5 + Math.floor(Math.random() * 2); // 5 or 6 reviews
  const productReviews = [];

  for (let i = 0; i < count; i++) {
    const author = FIRST_NAMES[(product.id.length * 3 + i * 7) % FIRST_NAMES.length];
    const rating = (i === 4 && count === 6) ? 4 : 5; // 5 stars mostly, occasional 4 star
    const month = ["July", "August", "June", "May"][i % 4];
    const day = 1 + ((i * 5 + 3) % 27);
    const date = `${month} ${day}, 2026`;
    const aspect = aspectList[i % aspectList.length];

    const titles = [
      `Flawless ${product.name}!`,
      `Must-Have for any ${product.pokemon} Fan`,
      `Premium Archival Quality — 10/10`,
      `Exceeded All Expectations!`,
      `Worth Every Cent!`,
      `Unmatched Vault Authenticity`
    ];

    productReviews.push({
      id: `rev-${product.id}-${i+1}`,
      author,
      avatar: ["🏆", "⚡", "🔥", "🔮", "✨", "👑"][i % 6],
      rating,
      date,
      verified: true,
      title: titles[i % titles.length],
      comment: `Purchased the ${product.name}. ${aspect} PokéVault delivered with ultra-fast dispatch and secure packaging.`
    });
  }

  REVIEWS_DATA[product.id] = productReviews;
});

const fileContent = `/**
 * POKÉVAULT LEGENDS — Master Product Customer Reviews Database
 * Contains 5-6 verified customer reviews for ALL 64 products in catalog.
 */

export const REVIEWS_DATABASE = ${JSON.stringify(REVIEWS_DATA, null, 2)};

export const getReviewsForProduct = (productId) => {
  return REVIEWS_DATABASE[productId] || [
    {
      id: "rev-default-1",
      author: "VaultCollector",
      avatar: "🏆",
      rating: 5,
      date: "August 2026",
      verified: true,
      title: "Verified Authentic Item",
      comment: "Full authenticity guarantee. Pristine condition and fast dispatch."
    }
  ];
};
`;

fs.writeFileSync(path.resolve('src/data/reviews.js'), fileContent, 'utf8');
console.log(`Successfully generated master reviews database for ALL ${ALL_PRODUCTS.length} products!`);
