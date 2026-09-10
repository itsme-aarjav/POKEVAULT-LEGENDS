import '../../styles.css';
import { StoreProvider } from '../context/StoreContext';
import LayoutWrapper from '../components/LayoutWrapper';

export const metadata = {
  title: {
    default: 'POKÉVAULT LEGENDS — Official Pokémon Merchandise & Graded Slabs Marketplace',
    template: '%s | POKÉVAULT LEGENDS'
  },
  description: 'The world premier Pokémon merchandise marketplace and PSA/BGS slab vault. Collect authenticated cards, plushies, figures, apparel, and room decor.',
  keywords: ['Pokemon cards', 'PSA 10 slabs', 'Pokemon plush', 'Charizard shadowless', 'Pokemon center merch', 'Scale figures', 'Anime streetwear'],
  openGraph: {
    title: 'POKÉVAULT LEGENDS — Pokémon Merchandise & Graded Slabs',
    description: 'Explore 60+ authenticated Pokémon collectibles: PSA 10 slabs, lifesize plush, statues, and vintage apparel.',
    url: 'https://pokevault-legends.netlify.app',
    siteName: 'PokéVault Legends',
    images: [
      {
        url: 'https://pokevault-legends.netlify.app/assets/card-charizard.png',
        width: 1200,
        height: 630,
        alt: 'PokéVault Legends Marketplace'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'POKÉVAULT LEGENDS',
    description: 'Premier vault marketplace for Pokémon cards, plushies, figures & apparel.',
    images: ['https://pokevault-legends.netlify.app/assets/card-charizard.png']
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Inter:wght@400;600;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="halftone-overlay"></div>
        <StoreProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </StoreProvider>
      </body>
    </html>
  );
}
