import fs from 'fs';
import path from 'path';

const PHOTO_MAPPINGS = {
  "charizard-base-1st": "/assets/charizard.png",
  "pikachu-illustrator-98": "/assets/pikachu.png",
  "shining-rayquaza-star": "/assets/rayquaza.png",
  "dark-gengar-neo": "/assets/gengar.png",
  "lugia-crystal-aquapolis": "/assets/lugia.png",
  "mew-shining-corocoro": "/assets/mew.png",
  "gengar-masaki-holo-99": "/assets/gengar_comic.png",
  "mewtwo-gold-star-ex": "/assets/statue_mewtwo.png",
  "snorlax-1st-edition-jungle": "/assets/plush_snorlax.png",
  "eevee-heroes-special-art": "/assets/pikachu_illustrator_card_1785683346677.png",
  "plush-lifesize-pikachu-50cm": "/assets/plush_toy.png",
  "plush-sleeping-snorlax-jumbo": "/assets/plush_snorlax.png",
  "plush-eevee-evolution-set": "/assets/plush_toy.png",
  "plush-gengar-shadow-tongue": "/assets/gengar.png",
  "fig-charizard-seismic-toss-resin": "/assets/figure_statue.png",
  "fig-mewtwo-psychic-strike-artfx": "/assets/statue_mewtwo.png",
  "fig-rayquaza-hyper-cluster-figure": "/assets/rayquaza.png",
  "fig-lucario-aura-sphere-shf": "/assets/figure_statue.png",
  "apparel-gengar-shadow-embroidered-hoodie": "/assets/apparel_gengar_hoodie.png",
  "apparel-charizard-1996-pulp-tee": "/assets/charizard_comic.png",
  "apparel-pikachu-electric-varsity-jacket": "/assets/apparel_gengar_hoodie.png",
  "apparel-eeveelution-pastel-crewneck": "/assets/apparel_gengar_hoodie.png",
  "hat-ash-ketchum-original-cap": "/assets/hat_ash_ketchum.png",
  "hat-gengar-embroidered-beanie": "/assets/gengar_comic.png",
  "hat-snorlax-sleeping-dad-hat": "/assets/plush_snorlax.png",
  "bag-loungefly-charizard-mini-backpack": "/assets/bag_pikachu_backpack.png",
  "bag-pokeball-trainer-duffel": "/assets/bag_pikachu_backpack.png",
  "bag-gengar-crossbody-chest-pack": "/assets/bag_pikachu_backpack.png",
  "toy-pokemon-monopoly-kanto-edition": "/assets/book_manga_box.png",
  "toy-nanoblock-charizard-deluxe": "/assets/figure_statue.png",
  "toy-clip-n-go-poke-ball-belt-set": "/assets/pins_kanto_badges.png",
  "pin-kanto-gym-badges-master-box": "/assets/pins_kanto_badges.png",
  "coin-charizard-25th-commemorative": "/assets/pins_kanto_badges.png",
  "pin-gengar-shadow-holographic-jumbo-pin": "/assets/pins_kanto_badges.png",
  "decor-pikachu-neon-led-wall-sign": "/assets/decor_neon_pokeball.png",
  "decor-gengar-shadow-portal-area-rug": "/assets/decor_neon_pokeball.png",
  "decor-snorlax-beanbag-chair-cover": "/assets/plush_snorlax.png",
  "mug-charizard-flame-heat-morphing": "/assets/mug_charmander.png",
  "drinkware-pokeball-stainless-tumbler": "/assets/mug_charmander.png",
  "mug-eeveelution-constellation-glass": "/assets/mug_charmander.png",
  "stat-pokedex-hardcover-leather-journal": "/assets/book_manga_box.png",
  "stat-kanto-starter-gel-pen-set": "/assets/pins_kanto_badges.png",
  "stat-gengar-shadow-desk-pad-mat": "/assets/poster_kanto_map.png",
  "art-charizard-1996-pulp-canvas-print": "/assets/charizard_comic.png",
  "art-rayquaza-cosmic-holographic-foil-print": "/assets/rayquaza_comic.png",
  "art-pikachu-illustrator-retro-acrylic-panel": "/assets/pikachu_comic.png",
  "key-pokeball-heavy-metal-spinning-keychain": "/assets/pins_kanto_badges.png",
  "key-gengar-shadow-silicone-keychain": "/assets/pins_kanto_badges.png",
  "key-trainer-league-neck-lanyard-set": "/assets/pins_kanto_badges.png",
  "phone-gengar-magsafe-iphone-case": "/assets/gengar_comic.png",
  "phone-pokeball-wireless-charging-pad": "/assets/decor_neon_pokeball.png",
  "phone-pikachu-tail-popsocket-grip": "/assets/pins_kanto_badges.png",
  "game-switch-oled-charizard-case": "/assets/console_switch_oled.png",
  "game-tcg-rayquaza-stitched-playmat": "/assets/poster_kanto_map.png",
  "game-pro-controller-pikachu-grips": "/assets/console_switch_oled.png",
  "book-pokedex-hardcover-master-guide": "/assets/book_manga_box.png",
  "book-pokemon-adventures-manga-box-set": "/assets/book_manga_box.png",
  "book-art-of-pokemon-25-years-artbook": "/assets/book_manga_box.png",
  "jewel-silver-pikachu-pendant-necklace": "/assets/pins_kanto_badges.png",
  "jewel-gengar-amethyst-signet-ring": "/assets/jewel_gengar_ring.png",
  "jewel-pokeball-automatic-chronograph-watch": "/assets/jewel_pokeball_watch.png",
  "gift-master-vault-mystery-chest-xl": "/assets/mystery_master_box.png",
  "gift-kanto-starter-collector-box": "/assets/mystery_master_box.png",
  "gift-eevee-master-collector-bundle": "/assets/mystery_master_box.png"
};

let prodContent = fs.readFileSync('src/data/products.js', 'utf8');

Object.keys(PHOTO_MAPPINGS).forEach(id => {
  const photoPath = PHOTO_MAPPINGS[id];
  const imgRegex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?image:\\s*").*?(")`, "g");
  prodContent = prodContent.replace(imgRegex, `$1${photoPath}$2`);

  const galRegex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?gallery:\\s*\\[).*?(\\])`, "g");
  prodContent = prodContent.replace(galRegex, `$1"${photoPath}"$2`);
});

fs.writeFileSync('src/data/products.js', prodContent, 'utf8');
console.log('Successfully remapped all products to studio photography assets!');
