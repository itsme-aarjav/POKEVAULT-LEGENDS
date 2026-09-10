import dotenv from 'dotenv';
dotenv.config();

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

export const requireAdmin = (req, res, next) => {
  if (!ADMIN_KEY) {
    return res.status(503).json({ success: false, error: 'Admin key not configured on server.' });
  }
  const provided = req.headers['x-admin-key'];
  if (!provided || provided !== ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing X-Admin-Key header.'
    });
  }
  next();
};
