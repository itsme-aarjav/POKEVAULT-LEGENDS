-- ============================================================================
-- POKÉVAULT LEGENDS — PRODUCTION MYSQL 8.0 DATABASE SCHEMA (AWS RDS / EC2)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pokevault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pokevault;

-- 1. CARDS / PRODUCTS TABLE
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

-- 2. INVENTORY TABLE
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

-- 3. ORDERS TABLE
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
    order_status VARCHAR(50) DEFAULT 'received',
    payment_method VARCHAR(50) DEFAULT 'PayPal',
    payment_status VARCHAR(50) DEFAULT 'completed',
    tracking_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_email (customer_email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ORDER ITEMS TABLE
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

-- 5. STORE SETTINGS TABLE (Hype Drop & VIP Gate Lock)
CREATE TABLE IF NOT EXISTS store_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    is_hype_drop_active BOOLEAN DEFAULT FALSE,
    drop_password VARCHAR(100) DEFAULT 'POKEVAULTVIP',
    drop_timestamp VARCHAR(100),
    opt_in_count INT DEFAULT 342,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Store Settings Record
INSERT INTO store_settings (id, is_hype_drop_active, drop_password, drop_timestamp, opt_in_count)
VALUES ('default', FALSE, 'POKEVAULTVIP', '2026-10-01T00:00:00.000Z', 342)
ON DUPLICATE KEY UPDATE id=id;
