/**
 * POKÉVAULT LEGENDS — Centralized Category Definitions
 * 18 Product Categories for complete Pokémon merchandise marketplace
 */

export const CATEGORIES_DATA = [
  {
    id: "trading-cards",
    slug: "trading-cards",
    name: "Trading Cards & Graded Slabs",
    shortName: "Trading Cards",
    description: "PSA & BGS authenticated vintage holographic cards, 1st Edition rarities, and trophy promos.",
    icon: "🃏",
    image: "/assets/charizard.png",
    count: 10,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #FFF056 0%, #FFD700 100%)"
  },
  {
    id: "plush-toys",
    slug: "plush-toys",
    name: "Plush Toys & Stuffed Pokémon",
    shortName: "Plush Toys",
    description: "Official Pokemon Center plushies, lifesize companions, and soft sleeping plush toys.",
    icon: "🧸",
    image: "/assets/plush_toy.png",
    count: 4,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #FFDE59 0%, #FF914D 100%)"
  },
  {
    id: "figures-statues",
    slug: "figures-statues",
    name: "Figures & Collectible Statues",
    shortName: "Figures & Statues",
    description: "Detailed scale figures, Nendoroids, resin battle dioramas, and articulated D-Arts statues.",
    icon: "🗿",
    image: "/assets/figure_statue.png",
    count: 4,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)"
  },
  {
    id: "clothing-apparel",
    slug: "clothing-apparel",
    name: "Clothing & Apparel",
    shortName: "Clothing",
    description: "Vintage Japanese pulp streetwear, embroidered hoodies, graphic tees, and jackets.",
    icon: "👕",
    image: "/assets/apparel_gengar_hoodie.png",
    count: 4,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #8A2387 0%, #E94057 100%)"
  },
  {
    id: "hats-caps",
    slug: "hats-caps",
    name: "Hats, Caps & Beanies",
    shortName: "Hats & Caps",
    description: "Classic Ash Ketchum trainer caps, embroidered snapbacks, and cozy winter beanies.",
    icon: "🧢",
    image: "/assets/hat_ash_ketchum.png",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #F27121 0%, #E94057 100%)"
  },
  {
    id: "backpacks-bags",
    slug: "backpacks-bags",
    name: "Backpacks & Bags",
    shortName: "Backpacks & Bags",
    description: "Loungefly mini backpacks, canvas messenger bags, and travel duffels.",
    icon: "🎒",
    image: "/assets/bag_charizard_backpack.png",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
  },
  {
    id: "toys-games",
    slug: "toys-games",
    name: "Toys & Board Games",
    shortName: "Toys & Games",
    description: "Monopoly Pokémon edition, 3D Nanoblock puzzles, and Poké Ball throwing blasters.",
    icon: "🎲",
    image: "/assets/toy_monopoly_kanto.png",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #fc4a1a 0%, #f7b731 100%)"
  },
  {
    id: "collectibles-pins",
    slug: "collectibles-pins",
    name: "Collectibles & Pins",
    shortName: "Pins & Pins",
    description: "Enamel gym badge pin sets, solid brass challenge coins, and metal key relics.",
    icon: "📌",
    image: "/assets/pin_kanto_badges.png",
    count: 3,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)"
  },
  {
    id: "home-decor",
    slug: "home-decor",
    name: "Home & Room Decor",
    shortName: "Home Decor",
    description: "Pikachu neon LED sign lamps, Gengar area rugs, and Snorlax bean bag floor cushions.",
    icon: "🏠",
    image: "/assets/decor_pikachu_neon.png",
    count: 3,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)"
  },
  {
    id: "mugs-drinkware",
    slug: "mugs-drinkware",
    name: "Mugs & Drinkware",
    shortName: "Mugs & Drinkware",
    description: "Heat-changing ceramic mugs, stainless steel water bottles, and glass tumblers.",
    icon: "☕",
    image: "/assets/mug_charizard_heat.jpg",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)"
  },
  {
    id: "stationery-notebooks",
    slug: "stationery-notebooks",
    name: "Stationery & Desk Gear",
    shortName: "Stationery",
    description: "Leather Pokédex journals, gel pen sets, desk mat pads, and sticky notes.",
    icon: "📝",
    image: "/assets/journal_pokedex_red.jpg",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)"
  },
  {
    id: "posters-art",
    slug: "posters-art",
    name: "Posters & Wall Art",
    shortName: "Posters & Art",
    description: "Vintage Japanese pulp comic art canvas prints, metallic foil posters, and acrylic panels.",
    icon: "🖼️",
    image: "/assets/canvas_charizard_art.jpg",
    count: 3,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)"
  },
  {
    id: "keychains-lanyards",
    slug: "keychains-lanyards",
    name: "Keychains & Lanyards",
    shortName: "Keychains",
    description: "3D metal Poké Ball keychains, rubber mascot pendants, and neck lanyards.",
    icon: "🔑",
    image: "/assets/keychain_pokeball_spin.jpg",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #D4145A 0%, #FBB03B 100%)"
  },
  {
    id: "phone-accessories",
    slug: "phone-accessories",
    name: "Phone & Mobile Accessories",
    shortName: "Phone Accessories",
    description: "MagSafe iPhone cases, Poké Ball PopSockets, and wireless charging pads.",
    icon: "📱",
    image: "/assets/phone_gengar_case.jpg",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)"
  },
  {
    id: "gaming-accessories",
    slug: "gaming-accessories",
    name: "Gaming Gear & Accessories",
    shortName: "Gaming Gear",
    description: "Nintendo Switch OLED carrying cases, TCG playmats, and Pro Controller grips.",
    icon: "🎮",
    image: "/assets/playmat_rayquaza_tcg.jpg",
    count: 3,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #000000 0%, #434343 100%)"
  },
  {
    id: "books-guides",
    slug: "books-guides",
    name: "Books & Strategy Guides",
    shortName: "Books & Guides",
    description: "Hardcover Pokédex master guides, vintage manga box sets, and official artbooks.",
    icon: "📚",
    image: "/assets/book_art_of_pokemon.jpg",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #EB5757 0%, #000000 100%)"
  },
  {
    id: "jewelry-accessories",
    slug: "jewelry-accessories",
    name: "Jewelry & Fine Watches",
    shortName: "Jewelry",
    description: "Sterling silver pendant necklaces, Poké Ball signet rings, and collector watches.",
    icon: "💍",
    image: "/assets/jewel_pikachu_pendant.png",
    count: 3,
    isFeatured: false,
    bannerColor: "linear-gradient(135deg, #B2FEFA 0%, #0ED2F7 100%)"
  },
  {
    id: "gifts-bundles",
    slug: "gifts-bundles",
    name: "Gifts & Mystery Chests",
    shortName: "Gift Boxes",
    description: "Master Vault mystery gift boxes, birthday collector bundles, and surprise chests.",
    icon: "🎁",
    image: "/assets/gift_kanto_box.jpg",
    count: 3,
    isFeatured: true,
    bannerColor: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)"
  }
];

export const getAllCategories = () => CATEGORIES_DATA;
export const getCategoryById = (id) => CATEGORIES_DATA.find(c => c.id === id || c.slug === id);
