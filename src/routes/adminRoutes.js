const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { all, get, run } = require('../db');
const { saveProductImage, saveLogoImage, saveHeroImage, deleteUploadedFile } = require('../imageProcessor');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens sao permitidas'));
    return cb(null, true);
  }
});

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uniqueSlug(table, name, currentId) {
  const base = slugify(name) || 'item';
  let slug = base;
  let count = 2;
  while (true) {
    const row = await get(`SELECT id FROM ${table} WHERE slug = ?`, [slug]);
    if (!row || Number(row.id) === Number(currentId)) return slug;
    slug = `${base}-${count}`;
    count += 1;
  }
}

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Nao autenticado' });
  return next();
}

router.post('/login', async (req, res) => {
  const admin = await get('SELECT * FROM admins WHERE email = ?', [req.body.email]);
  if (!admin || !(await bcrypt.compare(req.body.password || '', admin.password_hash))) {
    return res.status(401).json({ error: 'Email ou senha invalidos' });
  }
  req.session.adminId = admin.id;
  req.session.adminName = admin.name;
  return res.json({ success: true, admin: { id: admin.id, name: admin.name, email: admin.email } });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.use(requireAdmin);

router.get('/dashboard', async (req, res) => {
  const total = await get('SELECT COUNT(*) AS count FROM products');
  const active = await get("SELECT COUNT(*) AS count FROM products WHERE status = 'active'");
  const faqs = await get('SELECT COUNT(*) AS count FROM faqs');
  res.json({ totalProducts: total.count, activeProducts: active.count, totalFaqs: faqs.count });
});

router.get('/products', async (req, res) => {
  const products = await all(`
    SELECT p.*, c.name AS category_name,
      COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1),
               (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)) AS main_image
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
  `);
  res.json(products);
});

router.get('/products/:id', async (req, res) => {
  const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Produto nao encontrado' });
  product.images = await all('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id', [product.id]);
  return res.json(product);
});

router.post('/products', upload.array('images', 12), async (req, res) => {
  const slug = await uniqueSlug('products', req.body.name);
  const result = await run(`INSERT INTO products
    (category_id, name, slug, price, short_description, full_description, motor, battery, autonomy, max_speed, charging_time, max_weight, warranty, payment_info, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    req.body.category_id || null, req.body.name, slug, req.body.price || 0, req.body.short_description, req.body.full_description,
    req.body.motor, req.body.battery, req.body.autonomy, req.body.max_speed, req.body.charging_time, req.body.max_weight,
    req.body.warranty, req.body.payment_info, req.body.status || 'active'
  ]);
  for (let index = 0; index < (req.files || []).length; index += 1) {
    const imageUrl = await saveProductImage(req.files[index]);
    await run('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)', [result.id, imageUrl, index === 0 ? 1 : 0]);
  }
  res.json({ success: true, id: result.id, slug });
});

router.put('/products/:id', upload.array('images', 12), async (req, res) => {
  const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Produto nao encontrado' });
  const slug = await uniqueSlug('products', req.body.name, req.params.id);
  await run(`UPDATE products SET category_id = ?, name = ?, slug = ?, price = ?, short_description = ?, full_description = ?,
    motor = ?, battery = ?, autonomy = ?, max_speed = ?, charging_time = ?, max_weight = ?, warranty = ?, payment_info = ?, status = ?
    WHERE id = ?`, [
    req.body.category_id || null, req.body.name, slug, req.body.price || 0, req.body.short_description, req.body.full_description,
    req.body.motor, req.body.battery, req.body.autonomy, req.body.max_speed, req.body.charging_time, req.body.max_weight,
    req.body.warranty, req.body.payment_info, req.body.status || 'active', req.params.id
  ]);
  const hasMain = await get('SELECT id FROM product_images WHERE product_id = ? AND is_main = 1', [req.params.id]);
  for (let index = 0; index < (req.files || []).length; index += 1) {
    const imageUrl = await saveProductImage(req.files[index]);
    await run('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)', [req.params.id, imageUrl, !hasMain && index === 0 ? 1 : 0]);
  }
  res.json({ success: true, slug });
});

router.delete('/products/:id', async (req, res) => {
  const images = await all('SELECT image_url FROM product_images WHERE product_id = ?', [req.params.id]);
  await run('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
  await run('DELETE FROM products WHERE id = ?', [req.params.id]);
  images.forEach((image) => deleteUploadedFile(image.image_url));
  res.json({ success: true });
});

router.get('/settings', async (req, res) => res.json(await get('SELECT * FROM settings LIMIT 1')));

router.put('/settings', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'hero_image', maxCount: 1 }
]), async (req, res) => {
  const current = await get('SELECT * FROM settings LIMIT 1');
  const logoUrl = req.files?.logo?.[0] ? await saveLogoImage(req.files.logo[0]) : req.body.logo_url || current.logo_url;
  const heroImageUrl = req.files?.hero_image?.[0] ? await saveHeroImage(req.files.hero_image[0]) : req.body.hero_image_url || current.hero_image_url;
  await run(`UPDATE settings SET store_name = ?, logo_url = ?, whatsapp = ?, instagram = ?, city = ?, headline = ?,
    description = ?, primary_color = ?, secondary_color = ?, hero_image_url = ? WHERE id = ?`, [
    req.body.store_name, logoUrl, req.body.whatsapp, req.body.instagram, req.body.city, req.body.headline,
    req.body.description, req.body.primary_color, req.body.secondary_color, heroImageUrl, current.id
  ]);
  res.json({ success: true });
});

router.get('/faqs', async (req, res) => res.json(await all('SELECT * FROM faqs ORDER BY id DESC')));

router.post('/faqs', async (req, res) => {
  const result = await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, ?)', [req.body.question, req.body.answer, req.body.active ? 1 : 0]);
  res.json({ success: true, id: result.id });
});

router.put('/faqs/:id', async (req, res) => {
  await run('UPDATE faqs SET question = ?, answer = ?, active = ? WHERE id = ?', [req.body.question, req.body.answer, req.body.active ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

router.delete('/faqs/:id', async (req, res) => {
  await run('DELETE FROM faqs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
