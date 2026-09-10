import React from 'react';
import Link from 'next/link';
import ProductCard from '../../../components/ProductCard';
import { getCategoryById } from '../../../data/categories.js';
import { getProductsByCategory } from '../../../data/products.js';

export async function generateMetadata({ params }) {
  const cat = getCategoryById(params.slug);
  if (!cat) {
    return { title: 'Category Not Found | POKÉVAULT LEGENDS' };
  }
  return {
    title: `${cat.name} | POKÉVAULT LEGENDS`,
    description: cat.description,
    openGraph: {
      title: `${cat.name} — Pokémon Vault Marketplace`,
      description: cat.description,
      images: [cat.image]
    }
  };
}

export default function CategoryDetailPage({ params }) {
  const catSlug = params.slug;
  const category = getCategoryById(catSlug) || {
    id: catSlug,
    name: catSlug.replace('-', ' ').toUpperCase(),
    description: `Explore authentic Pokémon items in ${catSlug}.`,
    icon: '🏷️',
    bannerColor: 'linear-gradient(135deg, #FFF056 0%, #FFD700 100%)'
  };

  const products = getProductsByCategory(catSlug);

  return (
    <main>
      {/* CATEGORY HERO BANNER */}
      <header className="page-hero-banner" style={{ background: category.bannerColor || 'linear-gradient(135deg, #FFF056 0%, #FFD700 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/">Home</Link> <span>/</span> <Link href="/categories">Categories</Link> <span>/</span> <span className="current">{category.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>{category.icon || '🏷️'}</span>
            <h1 className="page-title" style={{ margin: 0 }}>{category.name.toUpperCase()}</h1>
          </div>
          <p className="page-subtitle">{category.description}</p>
        </div>
      </header>

      {/* CATEGORY PRODUCTS */}
      <div className="page-container" style={{ padding: '2.5rem 2rem 5rem' }}>
        <div className="shop-toolbar" style={{ marginBottom: '2rem' }}>
          <div className="results-count">Showing {products.length} Products in {category.name}</div>
          <Link href="/shop" className="btn-inspect" style={{ textDecoration: 'none' }}>Browse All Departments →</Link>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', color: 'var(--accent-red)', marginBottom: '0.5rem' }}>NO PRODUCTS IN THIS CATEGORY YET</h3>
            <p style={{ fontFamily: 'var(--font-mono)', color: '#666', marginBottom: '1.5rem' }}>Check back soon for new inventory drops!</p>
            <Link href="/shop" className="btn-pill" style={{ textDecoration: 'none' }}>Browse All Products →</Link>
          </div>
        ) : (
          <div className="cards-grid">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
