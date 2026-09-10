import React from 'react';
import Link from 'next/link';
import ProductDetailClient from './ProductDetailClient';
import { getProductById } from '../../../data/products.js';

export async function generateMetadata({ params }) {
  const product = getProductById(params.id);
  if (!product) {
    return { title: 'Product Not Found | POKÉVAULT LEGENDS' };
  }

  const title = `${product.name} — $${product.price.toFixed(2)} | POKÉVAULT LEGENDS`;
  const description = product.shortDescription || product.description;
  const imageUrl = `https://pokevault-legends.netlify.app${product.image}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://pokevault-legends.netlify.app/product/${product.id}`,
      siteName: 'PokéVault Legends',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.name
        }
      ],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default function ProductDetailPage({ params }) {
  const product = getProductById(params.id) || getProductById('pika-001');

  // JSON-LD Structured Data Schema for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: `https://pokevault-legends.netlify.app${product.image}`,
    description: product.description,
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: 'Pokémon Center / PokéVault'
    },
    offers: {
      '@type': 'Offer',
      url: `https://pokevault-legends.netlify.app/product/${product.id}`,
      priceCurrency: 'USD',
      price: product.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
