import dotenv from 'dotenv';
import { ALL_PRODUCTS } from '../../src/data/products.js';

dotenv.config();

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const MYSQL_USER = process.env.MYSQL_USER || 'pokevault';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'pokevault_secret';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'pokevault';

let pool = null;
let isConnected = false;

// ─── Initialize MySQL Connection Pool ─────────────────────────────────────────
export const createMySQLPool = async () => {
  try {
    const mysql = await import('mysql2/promise');
    pool = mysql.default.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    return pool;
  } catch (err) {
    pool = null;
    return null;
  }
};

export const isMySQLConfigured = () => isConnected;

// ─── Safe Query Execution with Pool ──────────────────────────────────────────
export const dbQuery = async (sql, params = []) => {
  if (!pool || !isConnected) return null;
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.warn('[MySQL Query Error]:', err.message);
    return null;
  }
};

// ─── Database Initialization & Auto-Seeder ──────────────────────────────────
export const initMySQLDatabase = async () => {
  try {
    if (!pool) {
      await createMySQLPool();
    }
    if (!pool) {
      isConnected = false;
      console.log(`[MySQL Status]: ⚠️ MySQL driver or database not available. Running in Local In-Memory Fallback Mode.`);
      return;
    }

    // 1. Test basic connectivity
    const connection = await pool.getConnection();
    isConnected = true;
    console.log(`[MySQL Status]: ✅ Connected to MySQL Database at ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`);
    connection.release();

    // 2. Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(100) PRIMARY KEY,
        sku VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        sub_name VARCHAR(255),
        category VARCHAR(100) NOT NULL DEFAULT 'trading-cards',
        category_name VARCHAR(100) NOT NULL DEFAULT 'Trading Cards',
        pokemon VARCHAR(100) NOT NULL DEFAULT 'Pikachu',
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2),
        discount_percent INT DEFAULT 0,
        image VARCHAR(550) NOT NULL,
        gallery JSON,
        short_description TEXT,
        description TEXT,
        rating DECIMAL(3, 2) DEFAULT 5.0,
        review_count INT DEFAULT 1,
        in_stock INT DEFAULT 10,
        availability VARCHAR(50) DEFAULT 'In Stock',
        tags JSON,
        badge VARCHAR(100),
        is_featured BOOLEAN DEFAULT FALSE,
        is_trending BOOLEAN DEFAULT FALSE,
        is_bestseller BOOLEAN DEFAULT FALSE,
        is_new BOOLEAN DEFAULT FALSE,
        specs JSON,
        cross_sell_id VARCHAR(100),
        bundle_discount INT DEFAULT 10,
        tcg_market_price DECIMAL(10, 2),
        era VARCHAR(100),
        era_code VARCHAR(50),
        card_no VARCHAR(50),
        release_year VARCHAR(20),
        grade VARCHAR(50),
        grade_score VARCHAR(20),
        grading_body VARCHAR(20),
        cert_number VARCHAR(100),
        hp VARCHAR(20),
        type VARCHAR(50),
        artist VARCHAR(255),
        holo_type VARCHAR(50),
        comic_lore JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_pokemon (pokemon),
        INDEX idx_era_code (era_code),
        INDEX idx_trending (is_trending),
        INDEX idx_featured (is_featured)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_id VARCHAR(100) UNIQUE NOT NULL,
        stock_quantity INT NOT NULL DEFAULT 10,
        reserved_quantity INT NOT NULL DEFAULT 0,
        low_stock_threshold INT NOT NULL DEFAULT 1,
        warehouse_location VARCHAR(100) DEFAULT 'Vault Alpha-1',
        last_restocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_inventory_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        shipping_address TEXT NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0.00,
        promo_code VARCHAR(50),
        insurance_included BOOLEAN DEFAULT TRUE,
        insurance_cost DECIMAL(10, 2) DEFAULT 9.99,
        total_amount DECIMAL(10, 2) NOT NULL,
        order_status VARCHAR(50) DEFAULT 'dispatched',
        payment_method VARCHAR(50) DEFAULT 'PayPal',
        payment_status VARCHAR(50) DEFAULT 'completed',
        tracking_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_email (customer_email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        card_id VARCHAR(100) NOT NULL,
        card_name VARCHAR(255) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        subtotal DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
        is_hype_drop_active BOOLEAN DEFAULT FALSE,
        drop_password VARCHAR(100) DEFAULT 'POKEVAULTVIP',
        drop_timestamp VARCHAR(100),
        opt_in_count INT DEFAULT 342,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Auto-seed catalog if empty
    const [cardCountRows] = await pool.query('SELECT COUNT(*) as total FROM cards');
    const totalCards = cardCountRows[0].total;

    if (totalCards === 0 && ALL_PRODUCTS && ALL_PRODUCTS.length > 0) {
      console.log(`[MySQL Seeder]: Seeding ${ALL_PRODUCTS.length} Pokémon products into MySQL...`);
      for (const item of ALL_PRODUCTS) {
        await pool.query(`
          INSERT INTO cards (
            id, sku, name, sub_name, category, category_name, pokemon,
            price, original_price, discount_percent, image, gallery,
            short_description, description, rating, review_count, in_stock,
            availability, tags, badge, is_featured, is_trending, is_bestseller,
            is_new, specs, cross_sell_id, bundle_discount, tcg_market_price,
            era, era_code, card_no, release_year, grade, grade_score,
            grading_body, cert_number, hp, type, artist, holo_type, comic_lore
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE name=VALUES(name);
        `, [
          item.id,
          item.sku || `SKU-${item.id}`,
          item.name || 'Unknown Pokémon',
          item.subName || null,
          item.category || 'trading-cards',
          item.categoryName || 'Trading Cards',
          item.pokemon || 'Pikachu',
          Number(item.price) || 0,
          item.originalPrice ? Number(item.originalPrice) : null,
          item.discountPercent || 0,
          item.image || '',
          JSON.stringify(item.gallery || []),
          item.shortDescription || null,
          item.description || null,
          Number(item.rating) || 5.0,
          Number(item.reviewCount) || 1,
          item.inStock !== undefined ? Number(item.inStock) : 10,
          item.availability || 'In Stock',
          JSON.stringify(item.tags || []),
          item.badge || null,
          Boolean(item.isFeatured),
          Boolean(item.isTrending),
          Boolean(item.isBestseller),
          Boolean(item.isNew),
          JSON.stringify(item.specs || {}),
          item.crossSellId || null,
          item.bundleDiscount || 10,
          item.tcgMarketPrice ? Number(item.tcgMarketPrice) : null,
          item.era || null,
          item.eraCode || null,
          item.cardNo || null,
          item.releaseYear || null,
          item.grade || null,
          item.gradeScore || null,
          item.gradingBody || null,
          item.certNumber || null,
          item.hp || null,
          item.type || null,
          item.artist || null,
          item.holoType || null,
          JSON.stringify(item.comicLore || {})
        ]);

        await pool.query(`
          INSERT INTO inventory (card_id, stock_quantity, reserved_quantity, low_stock_threshold, warehouse_location)
          VALUES (?, ?, 0, 1, 'Vault Alpha-1')
          ON DUPLICATE KEY UPDATE stock_quantity=VALUES(stock_quantity);
        `, [item.id, item.inStock !== undefined ? Number(item.inStock) : 10]);
      }
      console.log(`[MySQL Seeder]: ✅ Successfully seeded ${ALL_PRODUCTS.length} products and inventory items!`);
    } else {
      console.log(`[MySQL Status]: Schema ready. Existing products in DB: ${totalCards}`);
    }
  } catch (err) {
    isConnected = false;
    console.warn(`[MySQL Status]: ⚠️ Database not reachable (${err.message}). Running in Local In-Memory Fallback Mode.`);
  }
};

export { pool };
