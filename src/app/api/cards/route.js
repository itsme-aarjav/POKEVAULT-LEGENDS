import { dbQuery, isMySQLConfigured } from '../../../../server/db/mysql.js';
import { ALL_PRODUCTS } from '../../../data/products.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const era = searchParams.get('era');
    const search = searchParams.get('search');

    if (isMySQLConfigured()) {
      let conditions = [];
      let params = [];
      if (category && category !== 'all') {
        conditions.push('category = ?');
        params.push(category);
      }
      if (era && era !== 'all') {
        conditions.push('era_code = ?');
        params.push(era);
      }
      if (search) {
        conditions.push('(name LIKE ? OR rarity LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await dbQuery(`SELECT * FROM cards ${where}`, params);
      if (rows && rows.length > 0) {
        return Response.json({ success: true, count: rows.length, data: rows, source: 'mysql' });
      }
    }

    let list = [...ALL_PRODUCTS];
    if (category && category !== 'all') list = list.filter(c => c.category === category);
    if (era && era !== 'all') list = list.filter(c => c.eraCode === era);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.categoryName && c.categoryName.toLowerCase().includes(q)));
    }
    return Response.json({ success: true, count: list.length, data: list, source: 'local' });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
