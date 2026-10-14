import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_HOST = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306;
const DB_USER = process.env.DB_USER || process.env.MYSQL_USER || 'pokevault';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD || '');
const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'pokevault';

async function seed() {
  console.log(`[db-seed] Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
  } catch (err) {
    console.error(`[db-seed] Failed to connect to MySQL:`, err.message);
    process.exit(1);
  }

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    const schemaCandidates = [
      path.resolve(__dirname, 'mysql_schema.sql'),
      path.resolve(__dirname, '../catalog-service/src/mysql_schema.sql')
    ];
    const schemaPath = schemaCandidates.find(p => fs.existsSync(p));
    if (!schemaPath) {
      throw new Error('mysql_schema.sql not found');
    }

    let schemaSql = fs.readFileSync(schemaPath, 'utf8');
    schemaSql = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS\s+[a-zA-Z0-9_]+[^;]*;/gi, '')
      .replace(/USE\s+[a-zA-Z0-9_]+;/gi, '');

    await connection.query(schemaSql);
    console.log('[db-seed] Schema validated successfully.');

    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM cards');
    const cardCount = rows[0]?.count || 0;

    if (cardCount > 0) {
      console.log(`[db-seed] Cards table already contains ${cardCount} records. Skipping card seeding.`);
    } else {
      const dataCandidates = [
        path.resolve(__dirname, '../catalog-service/src/data/products.json'),
        path.resolve(__dirname, 'data/products.json')
      ];
      const dataPath = dataCandidates.find(p => fs.existsSync(p));
      let products = [];

      if (dataPath) {
        products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      } else {
        try {
          const mod = await import('../../src/data/products.js');
          products = mod.ALL_PRODUCTS || [];
        } catch {
          products = [];
        }
      }

      console.log(`[db-seed] Cards table is empty. Seeding ${products.length} initial items...`);

      for (const p of products) {
        const stockQty = p.inStock != null ? Number(p.inStock) : (p.in_stock != null ? Number(p.in_stock) : 10);
        await connection.query(`
          INSERT INTO cards (
            id, sku, name, sub_name, category, category_name, pokemon, price,
            original_price, discount_percent, image, gallery, short_description,
            description, rating, review_count, in_stock, availability, tags,
            badge, is_featured, is_trending, is_bestseller, is_new, specs, era_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), in_stock=VALUES(in_stock)
        `, [
          p.id,
          p.sku || `SKU-${p.id}`,
          p.name,
          p.subName || p.sub_name || null,
          p.category || 'trading-cards',
          p.categoryName || p.category_name || 'Trading Cards',
          p.pokemon || 'Pikachu',
          p.price || 0,
          p.originalPrice ?? p.original_price ?? null,
          p.discountPercent ?? p.discount_percent ?? 0,
          p.image || '',
          JSON.stringify(p.gallery || [p.image]),
          p.shortDescription || p.short_description || '',
          p.description || '',
          p.rating || 5.0,
          p.reviewCount ?? p.review_count ?? 1,
          stockQty,
          p.availability || (stockQty > 0 ? 'In Stock' : 'Out of Stock'),
          JSON.stringify(p.tags || []),
          p.badge || null,
          p.isFeatured ? 1 : 0,
          p.isTrending ? 1 : 0,
          p.isBestseller ? 1 : 0,
          p.isNew ? 1 : 0,
          JSON.stringify(p.specs || {}),
          p.eraCode || p.era_code || null
        ]);

        await connection.query(`
          INSERT INTO inventory (card_id, stock_quantity, reserved_quantity, low_stock_threshold, warehouse_location)
          VALUES (?, ?, 0, 1, 'Vault Alpha-1')
          ON DUPLICATE KEY UPDATE stock_quantity=VALUES(stock_quantity)
        `, [p.id, stockQty]);
      }
      console.log(`[db-seed] Seeded ${products.length} cards and inventory records.`);
    }

    const adminKey = process.env.ADMIN_SECRET_KEY || 'pokevaultadmin';
    const passwordHash = crypto.createHash('sha256').update(adminKey).digest('hex');

    await connection.query(`
      INSERT INTO admin_users (username, password_hash, role)
      VALUES ('admin', ?, 'admin')
      ON DUPLICATE KEY UPDATE role=VALUES(role)
    `, [passwordHash]);

    console.log('[db-seed] Default admin user verified.');
    console.log('[db-seed] Database seeding completed successfully.');
  } catch (err) {
    console.error('[db-seed] Error executing database seed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (process.env.NODE_ENV !== 'test') {
  seed();
}

export { seed };
