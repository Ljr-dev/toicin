const bcrypt = require('bcrypt');
const { run, get } = require('./db');

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_name TEXT,
    logo_url TEXT,
    hero_image_url TEXT,
    whatsapp TEXT,
    instagram TEXT,
    city TEXT,
    headline TEXT,
    description TEXT,
    primary_color TEXT,
    secondary_color TEXT
  )`);
  await ensureColumn('settings', 'hero_image_url', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    price REAL,
    short_description TEXT,
    full_description TEXT,
    motor TEXT,
    battery TEXT,
    autonomy TEXT,
    max_speed TEXT,
    charging_time TEXT,
    max_weight TEXT,
    warranty TEXT,
    payment_info TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    image_url TEXT,
    is_main INTEGER DEFAULT 0,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    answer TEXT,
    active INTEGER DEFAULT 1
  )`);

  const settings = await get('SELECT id FROM settings LIMIT 1');
  if (!settings) {
    await run(`INSERT INTO settings
      (store_name, logo_url, hero_image_url, whatsapp, instagram, city, headline, description, primary_color, secondary_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      'Loja Toicin',
      '',
      '',
      '5511999999999',
      'https://instagram.com/lojatoicin',
      'Sao Paulo',
      'Mobilidade eletrica para sua rotina',
      'Motos eletricas, bicicletas eletricas e scooters selecionadas para economia, estilo e praticidade.',
      '#11c5a6',
      '#101828'
    ]);
  }

  const admin = await get('SELECT id FROM admins WHERE email = ?', ['admin@admin.com']);
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await run('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', ['Administrador', 'admin@admin.com', hash]);
  }

  const categories = [
    ['Motos Eletricas', 'motos-eletricas'],
    ['Bicicletas Eletricas', 'bicicletas-eletricas'],
    ['Scooters', 'scooters']
  ];
  for (const [name, slug] of categories) {
    const exists = await get('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (!exists) await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
  }

  const faq = await get('SELECT id FROM faqs LIMIT 1');
  if (!faq) {
    await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, 1)', ['Os veiculos possuem garantia?', 'Sim. A garantia varia por modelo e fica descrita na pagina do produto.']);
    await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, 1)', ['Voces entregam em outras cidades?', 'Entre em contato pelo WhatsApp para confirmar disponibilidade de entrega para sua regiao.']);
    await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, 1)', ['Posso financiar ou parcelar?', 'As condicoes de pagamento podem variar por produto e campanha. Consulte o vendedor pelo WhatsApp.']);
  }
}

async function ensureColumn(table, column, definition) {
  const columns = await new Promise((resolve, reject) => {
    const { db } = require('./db');
    db.all(`PRAGMA table_info(${table})`, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

module.exports = { initDb };
