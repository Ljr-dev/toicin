const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { all, get, run } = require('../db');
const asyncHandler = require('../asyncHandler');
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

const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map();

function loginThrottle(req, res, next) {
  const key = req.ip || 'desconhecido';
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && now - entry.start > LOGIN_WINDOW) loginAttempts.delete(key);
  const current = loginAttempts.get(key);
  if (current && current.count >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
  }
  return next();
}

function registerFailedLogin(req) {
  const key = req.ip || 'desconhecido';
  const entry = loginAttempts.get(key) || { start: Date.now(), count: 0 };
  entry.count += 1;
  loginAttempts.set(key, entry);
  if (loginAttempts.size > 5000) loginAttempts.clear();
}

function parsePrice(value) {
  let normalized = String(value ?? '').trim();

  if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }

  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function parseSpecs(raw) {
  if (!raw) return [];
  let list;
  try {
    list = JSON.parse(String(raw).replace(/^\uFEFF/, ''));
  } catch {
    const error = new Error('Lista de especificações inválida');
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      label: String(item?.label ?? '').trim(),
      value: String(item?.value ?? '').trim()
    }))
    .filter((item) => item.label && item.value);
}

async function replaceSpecs(productId, specs) {
  await run('DELETE FROM product_specs WHERE product_id = ?', [productId]);
  for (let index = 0; index < specs.length; index += 1) {
    await run('INSERT INTO product_specs (product_id, label, value, sort_order) VALUES (?, ?, ?, ?)', [
      productId,
      specs[index].label,
      specs[index].value,
      index
    ]);
  }
}

router.post('/login', loginThrottle, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const admin = email ? await get('SELECT * FROM admins WHERE email = ?', [email]) : null;
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    registerFailedLogin(req);
    return res.status(401).json({ error: 'Email ou senha inválidos' });
  }
  loginAttempts.delete(req.ip || 'desconhecido');
  req.session.adminId = admin.id;
  req.session.adminName = admin.name;
  return res.json({ success: true, admin: { id: admin.id, name: admin.name, email: admin.email } });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.use(requireAdmin);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const total = await get('SELECT COUNT(*) AS count FROM products');
  const active = await get("SELECT COUNT(*) AS count FROM products WHERE status = 'active'");
  const faqs = await get('SELECT COUNT(*) AS count FROM faqs');
  const categories = await get('SELECT COUNT(*) AS count FROM categories');
  res.json({ totalProducts: total.count, activeProducts: active.count, totalFaqs: faqs.count, totalCategories: categories.count });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const products = await all(`
    SELECT p.*, c.name AS category_name,
      COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1),
               (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)) AS main_image
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC, p.id DESC
  `);
  res.json(products);
}));

router.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  product.images = await all('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id', [product.id]);
  product.specs = await all('SELECT label, value FROM product_specs WHERE product_id = ? ORDER BY sort_order, id', [product.id]);
  return res.json(product);
}));

router.post('/products', upload.array('images', 12), asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'O nome do produto é obrigatório' });
  const specs = parseSpecs(req.body.specs);

  const slug = await uniqueSlug('products', name);
  const result = await run(`INSERT INTO products
    (category_id, name, slug, price, short_description, full_description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    req.body.category_id || null,
    name,
    slug,
    parsePrice(req.body.price),
    req.body.short_description || '',
    req.body.full_description || '',
    req.body.status === 'inactive' ? 'inactive' : 'active'
  ]);

  for (let index = 0; index < (req.files || []).length; index += 1) {
    const imageUrl = await saveProductImage(req.files[index]);
    await run('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)', [result.id, imageUrl, index === 0 ? 1 : 0]);
  }

  await replaceSpecs(result.id, specs);
  res.json({ success: true, id: result.id, slug });
}));

router.put('/products/:id', upload.array('images', 12), asyncHandler(async (req, res) => {
  const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'O nome do produto é obrigatório' });
  const specs = parseSpecs(req.body.specs);

  await run(`UPDATE products SET category_id = ?, name = ?, price = ?, short_description = ?, full_description = ?,
    status = ?, motor = NULL, battery = NULL, autonomy = NULL, max_speed = NULL, charging_time = NULL,
    max_weight = NULL, warranty = NULL, payment_info = NULL
    WHERE id = ?`, [
    req.body.category_id || null,
    name,
    parsePrice(req.body.price),
    req.body.short_description || '',
    req.body.full_description || '',
    req.body.status === 'inactive' ? 'inactive' : 'active',
    req.params.id
  ]);

  const hasMain = await get('SELECT id FROM product_images WHERE product_id = ? AND is_main = 1', [req.params.id]);
  for (let index = 0; index < (req.files || []).length; index += 1) {
    const imageUrl = await saveProductImage(req.files[index]);
    await run('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)', [req.params.id, imageUrl, !hasMain && index === 0 ? 1 : 0]);
  }

  await replaceSpecs(req.params.id, specs);
  res.json({ success: true, slug: product.slug });
}));

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const images = await all('SELECT image_url FROM product_images WHERE product_id = ?', [req.params.id]);
  await run('DELETE FROM product_specs WHERE product_id = ?', [req.params.id]);
  await run('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
  await run('DELETE FROM products WHERE id = ?', [req.params.id]);
  images.forEach((image) => deleteUploadedFile(image.image_url));
  res.json({ success: true });
}));

router.get('/categories', asyncHandler(async (req, res) => {
  res.json(await all(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c ORDER BY c.name
  `));
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'O nome da categoria é obrigatório' });
  const slug = await uniqueSlug('categories', name);
  const result = await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
  res.json({ success: true, id: result.id, slug });
}));

router.put('/categories/:id', asyncHandler(async (req, res) => {
  const category = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'O nome da categoria é obrigatório' });

  const slug = await uniqueSlug('categories', name, req.params.id);
  await run('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, req.params.id]);
  res.json({ success: true, slug });
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const products = await get('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [req.params.id]);
  if (products.count > 0) {
    return res.status(400).json({ error: 'Existem produtos nesta categoria. Mova-os para outra categoria antes de excluir.' });
  }
  await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

router.get('/settings', asyncHandler(async (req, res) => res.json((await get('SELECT * FROM settings LIMIT 1')) || {})));

router.put('/password', asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 8 caracteres' });
  }

  const admin = await get('SELECT * FROM admins WHERE id = ?', [req.session.adminId]);
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    return res.status(400).json({ error: 'Senha atual incorreta' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await run('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admin.id]);
  res.json({ success: true });
}));

router.put('/settings', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'hero_image', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const current = await get('SELECT * FROM settings LIMIT 1');
  if (!current) return res.status(404).json({ error: 'Configurações não encontradas' });
  const logoUrl = req.files?.logo?.[0] ? await saveLogoImage(req.files.logo[0]) : req.body.logo_url || current.logo_url;
  const heroImageUrl = req.files?.hero_image?.[0] ? await saveHeroImage(req.files.hero_image[0]) : req.body.hero_image_url || current.hero_image_url;
  await run(`UPDATE settings SET store_name = ?, logo_url = ?, whatsapp = ?, instagram = ?, city = ?, headline = ?,
    description = ?, primary_color = ?, secondary_color = ?, hero_image_url = ? WHERE id = ?`, [
    req.body.store_name || current.store_name,
    logoUrl,
    req.body.whatsapp ?? current.whatsapp,
    req.body.instagram ?? current.instagram,
    req.body.city ?? current.city,
    req.body.headline ?? current.headline,
    req.body.description ?? current.description,
    req.body.primary_color || current.primary_color,
    req.body.secondary_color || current.secondary_color,
    heroImageUrl,
    current.id
  ]);
  res.json({ success: true });
}));

router.get('/faqs', asyncHandler(async (req, res) => res.json(await all('SELECT * FROM faqs ORDER BY id DESC'))));

router.post('/faqs', asyncHandler(async (req, res) => {
  const question = String(req.body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'A pergunta é obrigatória' });
  const result = await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, ?)', [question, req.body.answer || '', req.body.active ? 1 : 0]);
  res.json({ success: true, id: result.id });
}));

router.put('/faqs/:id', asyncHandler(async (req, res) => {
  const question = String(req.body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'A pergunta é obrigatória' });
  await run('UPDATE faqs SET question = ?, answer = ?, active = ? WHERE id = ?', [question, req.body.answer || '', req.body.active ? 1 : 0, req.params.id]);
  res.json({ success: true });
}));

router.delete('/faqs/:id', asyncHandler(async (req, res) => {
  await run('DELETE FROM faqs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

module.exports = router;
