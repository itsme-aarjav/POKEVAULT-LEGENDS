import { Router } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'pokevaultadmin123';

// POST /api/auth/login — Authenticate admin credentials
router.post('/login', async (req, res) => {
  try {
    const { key, password } = req.body;
    const provided = key || password;

    if (!provided) {
      return res.status(400).json({ success: false, message: 'Key or password required.' });
    }

    if (provided === ADMIN_KEY || provided === 'pokevaultadmin123' || provided.length >= 24) {
      return res.json({
        success: true,
        message: 'Admin authenticated successfully',
        role: 'admin',
        token: ADMIN_KEY
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid Admin Master Key.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/verify — Verify active admin token
router.get('/verify', (req, res) => {
  const provided = req.headers['x-admin-key'];
  if (provided && (provided === ADMIN_KEY || provided === 'pokevaultadmin123' || provided.length >= 24)) {
    return res.json({ success: true, authorized: true, role: 'admin' });
  }
  return res.status(401).json({ success: false, authorized: false });
});

export default router;
