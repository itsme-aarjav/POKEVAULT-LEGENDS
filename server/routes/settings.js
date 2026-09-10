import { Router } from 'express';
import { dbQuery, isMySQLConfigured } from '../db/mysql.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// In-memory fallback settings
let memorySettings = {
  id: 'default',
  is_hype_drop_active: false,
  drop_password: 'POKEVAULTVIP',
  drop_timestamp: '2026-10-01T00:00:00.000Z',
  opt_in_count: 342,
  updated_at: new Date().toISOString()
};

// GET /api/settings — Retrieve store settings (Public)
router.get('/', async (req, res) => {
  try {
    if (isMySQLConfigured()) {
      const rows = await dbQuery('SELECT * FROM store_settings WHERE id = ? LIMIT 1', ['default']);
      if (rows && rows.length > 0) {
        return res.json({
          success: true,
          data: {
            id: rows[0].id,
            is_hype_drop_active: Boolean(rows[0].is_hype_drop_active),
            drop_password: rows[0].drop_password,
            drop_timestamp: rows[0].drop_timestamp,
            opt_in_count: rows[0].opt_in_count,
            updated_at: rows[0].updated_at
          }
        });
      }
    }
    return res.json({ success: true, data: memorySettings, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings — Update store settings [ADMIN PROTECTED]
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { is_hype_drop_active, drop_password, drop_timestamp, opt_in_count } = req.body;

    if (isMySQLConfigured()) {
      await dbQuery(`
        UPDATE store_settings
        SET is_hype_drop_active = COALESCE(?, is_hype_drop_active),
            drop_password = COALESCE(?, drop_password),
            drop_timestamp = COALESCE(?, drop_timestamp),
            opt_in_count = COALESCE(?, opt_in_count)
        WHERE id = 'default'
      `, [
        is_hype_drop_active !== undefined ? Boolean(is_hype_drop_active) : null,
        drop_password || null,
        drop_timestamp || null,
        opt_in_count !== undefined ? Number(opt_in_count) : null
      ]);

      const [updated] = await dbQuery('SELECT * FROM store_settings WHERE id = ?', ['default']);
      return res.json({ success: true, message: 'Settings updated in MySQL', data: updated });
    }

    // Local fallback update
    memorySettings = {
      ...memorySettings,
      is_hype_drop_active: is_hype_drop_active !== undefined ? Boolean(is_hype_drop_active) : memorySettings.is_hype_drop_active,
      drop_password: drop_password || memorySettings.drop_password,
      drop_timestamp: drop_timestamp || memorySettings.drop_timestamp,
      opt_in_count: opt_in_count !== undefined ? Number(opt_in_count) : memorySettings.opt_in_count,
      updated_at: new Date().toISOString()
    };

    return res.json({ success: true, message: 'Settings updated locally', data: memorySettings, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/opt-in — Public opt-in for hype drop notification
router.post('/opt-in', async (req, res) => {
  try {
    if (isMySQLConfigured()) {
      await dbQuery('UPDATE store_settings SET opt_in_count = opt_in_count + 1 WHERE id = ?', ['default']);
      const rows = await dbQuery('SELECT opt_in_count FROM store_settings WHERE id = ?', ['default']);
      return res.json({ success: true, opt_in_count: rows[0].opt_in_count });
    }

    memorySettings.opt_in_count += 1;
    return res.json({ success: true, opt_in_count: memorySettings.opt_in_count, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
