import { Router } from 'express';
import { dbQuery, isMySQLConfigured } from '../db/mysql.js';
import { ALL_PRODUCTS } from '../../src/data/products.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// In-memory fallback stock database for all catalog products
export const memoryInventory = {};
ALL_PRODUCTS.forEach(c => {
  const stock = c.inStock !== undefined ? Number(c.inStock) : (c.in_stock !== undefined ? Number(c.in_stock) : 10);
  memoryInventory[c.id] = {
    cardId: c.id,
    stockQuantity: stock,
    reservedQuantity: 0,
    lowStockThreshold: 1,
    isInStock: stock > 0,
    lastRestockedAt: new Date().toISOString()
  };
});

// GET /api/inventory — Get stock levels for all products
router.get('/', async (req, res) => {
  try {
    if (isMySQLConfigured()) {
      const rows = await dbQuery(`
        SELECT i.*, c.name, c.grade, c.price, c.image, c.pokemon, c.category
        FROM inventory i
        LEFT JOIN cards c ON i.card_id = c.id
        ORDER BY i.stock_quantity ASC
      `);
      if (rows && rows.length > 0) {
        return res.json({ success: true, count: rows.length, data: rows, source: 'mysql' });
      }
    }
    return res.json({ success: true, count: Object.keys(memoryInventory).length, data: Object.values(memoryInventory), source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inventory/:cardId — Get stock level for a single card/product
router.get('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    if (isMySQLConfigured()) {
      const rows = await dbQuery(`
        SELECT i.*, c.name, c.grade, c.price, c.image
        FROM inventory i
        LEFT JOIN cards c ON i.card_id = c.id
        WHERE i.card_id = ?
        LIMIT 1
      `, [cardId]);
      if (rows && rows.length > 0) {
        return res.json({ success: true, data: rows[0], source: 'mysql' });
      }
    }

    if (!memoryInventory[cardId]) {
      const p = ALL_PRODUCTS.find(c => c.id === cardId);
      const stock = p ? (p.inStock !== undefined ? Number(p.inStock) : 10) : 10;
      memoryInventory[cardId] = {
        cardId,
        stockQuantity: stock,
        reservedQuantity: 0,
        lowStockThreshold: 1,
        isInStock: stock > 0,
        lastRestockedAt: new Date().toISOString()
      };
    }
    return res.json({ success: true, data: memoryInventory[cardId], source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/inventory/:cardId — Update stock quantity [ADMIN PROTECTED]
router.put('/:cardId', requireAdmin, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { stockQuantity, reservedQuantity, action } = req.body;

    // Validate quantities are non-negative numbers
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || Number(stockQuantity) < 0)) {
      return res.status(400).json({ success: false, message: 'stockQuantity must be a non-negative number' });
    }

    if (isMySQLConfigured()) {
      if (action === 'decrement') {
        await dbQuery(`
          UPDATE inventory
          SET stock_quantity = GREATEST(0, stock_quantity - 1),
              updated_at = CURRENT_TIMESTAMP
          WHERE card_id = ?
        `, [cardId]);
      } else if (stockQuantity !== undefined) {
        await dbQuery(`
          INSERT INTO inventory (card_id, stock_quantity, reserved_quantity, low_stock_threshold)
          VALUES (?, ?, COALESCE(?, 0), 1)
          ON DUPLICATE KEY UPDATE
            stock_quantity = VALUES(stock_quantity),
            reserved_quantity = COALESCE(?, reserved_quantity),
            updated_at = CURRENT_TIMESTAMP
        `, [cardId, Number(stockQuantity), reservedQuantity !== undefined ? Number(reservedQuantity) : null, reservedQuantity !== undefined ? Number(reservedQuantity) : null]);
      }

      // Also update cards table in_stock count
      if (stockQuantity !== undefined) {
        await dbQuery('UPDATE cards SET in_stock = ? WHERE id = ?', [Number(stockQuantity), cardId]);
      }

      const rows = await dbQuery('SELECT * FROM inventory WHERE card_id = ?', [cardId]);
      return res.json({ success: true, message: 'Inventory updated in MySQL', data: rows[0] });
    }

    // Local in-memory update
    if (!memoryInventory[cardId]) {
      memoryInventory[cardId] = { cardId, stockQuantity: 10, reservedQuantity: 0, lowStockThreshold: 1, isInStock: true };
    }
    if (action === 'decrement') {
      memoryInventory[cardId].stockQuantity = Math.max(0, memoryInventory[cardId].stockQuantity - 1);
    } else if (stockQuantity !== undefined) {
      memoryInventory[cardId].stockQuantity = Number(stockQuantity);
    }
    memoryInventory[cardId].isInStock = memoryInventory[cardId].stockQuantity > 0;
    return res.json({ success: true, message: 'Inventory updated locally', data: memoryInventory[cardId] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
