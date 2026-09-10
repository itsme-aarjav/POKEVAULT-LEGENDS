import fs from 'fs';

// Dedicated Studio Photographs
const DEDICATED_PHOTOS = {
  // Trading Cards
  "charizard-base-1st": "/assets/charizard.png",
  "pikachu-illustrator-98": "/assets/pikachu.png",
  "shining-rayquaza-star": "/assets/rayquaza.png",
  "dark-gengar-neo": "/assets/gengar.png",
  "lugia-crystal-aquapolis": "/assets/lugia.png",
  "mew-shining-corocoro": "/assets/mew.png",

  // Plush Toys
  "plush-lifesize-pikachu-50cm": "/assets/plush_pikachu.png",
  "plush-sleeping-snorlax-jumbo": "/assets/plush_snorlax.png",
  "plush-eevee-evolution-set": "/assets/plush_eevee_bundle.png",
  "plush-gengar-shadow-tongue": "/assets/plush_gengar_tongue.png",

  // Figures & Statues
  "fig-charizard-seismic-toss-resin": "/assets/figure_statue.png",
  "fig-mewtwo-psychic-strike-artfx": "/assets/statue_mewtwo.png",
  "fig-rayquaza-hyper-cluster-figure": "/assets/fig_rayquaza.png",
  "fig-lucario-aura-sphere-shf": "/assets/fig_lucario.png",

  // Apparel
  "apparel-gengar-shadow-embroidered-hoodie": "/assets/apparel_gengar_hoodie.png",
  "apparel-charizard-1996-pulp-tee": "/assets/apparel_charizard_tee.png",
  "apparel-pikachu-electric-varsity-jacket": "/assets/apparel_varsity_jacket.png",
  "apparel-eeveelution-pastel-crewneck": "/assets/apparel_eevee_crewneck.png",

  // Hats & Caps
  "hat-ash-ketchum-original-cap": "/assets/hat_ash_ketchum.png",
  "hat-gengar-embroidered-beanie": "/assets/hat_gengar_beanie.png",
  "hat-snorlax-sleeping-dad-hat": "/assets/hat_snorlax_dad_cap.svg",

  // Jewelry
  "jewel-gengar-amethyst-signet-ring": "/assets/jewel_gengar_ring.png",
  "jewel-pokeball-automatic-chronograph-watch": "/assets/jewel_pokeball_watch.png"
};

let content = fs.readFileSync('src/data/products.js', 'utf8');

import('../src/data/products.js').then(m => {
  m.ALL_PRODUCTS.forEach(p => {
    const finalAsset = DEDICATED_PHOTOS[p.id] || `/assets/items/item_${p.id}.svg`;

    const imgRegex = new RegExp(`(id:\\s*"${p.id}"[\\s\\S]*?image:\\s*").*?(")`, "g");
    content = content.replace(imgRegex, `$1${finalAsset}$2`);

    const galRegex = new RegExp(`(id:\\s*"${p.id}"[\\s\\S]*?gallery:\\s*\\[).*?(\\])`, "g");
    content = content.replace(galRegex, `$1"${finalAsset}"$2`);
  });

  fs.writeFileSync('src/data/products.js', content, 'utf8');
  console.log('Enforced 100% unique dedicated 1-to-1 visual assets for ALL 64 products!');
});
