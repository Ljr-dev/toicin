const bcrypt = require('bcrypt');
const { run, get, all } = require('./db');

const LEGACY_SPECS = [
  ['Motor', 'motor'],
  ['Bateria', 'battery'],
  ['Autonomia', 'autonomy'],
  ['Velocidade máxima', 'max_speed'],
  ['Tempo de carga', 'charging_time'],
  ['Peso suportado', 'max_weight'],
  ['Garantia', 'warranty'],
  ['Pagamento', 'payment_info']
];

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

  await run(`CREATE TABLE IF NOT EXISTS product_specs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    value TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  await run('CREATE INDEX IF NOT EXISTS idx_product_specs_product ON product_specs (product_id)');

  await run(`CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires INTEGER
  )`);
  await run('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires)');

  const settings = await get('SELECT id FROM settings LIMIT 1');
  if (!settings) {
    await run(`INSERT INTO settings
      (store_name, logo_url, hero_image_url, whatsapp, instagram, city, headline, description, primary_color, secondary_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      'Minha Loja',
      '',
      '',
      '',
      '',
      '',
      'Tudo o que você procura em um só lugar',
      'Produtos selecionados com qualidade, preço justo e atendimento direto pelo WhatsApp.',
      '#11c5a6',
      '#101828'
    ]);
  }

  const admin = await get('SELECT id FROM admins WHERE email = ?', ['admin@admin.com']);
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await run('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', ['Administrador', 'admin@admin.com', hash]);
  }

  const categoryCount = await get('SELECT COUNT(*) AS count FROM categories');
  if (!categoryCount.count) {
    await run('INSERT INTO categories (name, slug) VALUES (?, ?)', ['Geral', 'geral']);
  }

  const faq = await get('SELECT id FROM faqs LIMIT 1');
  if (!faq) {
    await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, 1)', ['Como faço para comprar?', 'Escolha o produto no catálogo e fale com a loja pelo WhatsApp. O atendimento combina pagamento, entrega ou retirada.']);
    await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, 1)', ['Vocês entregam na minha cidade?', 'Entre em contato pelo WhatsApp informando seu endereço para confirmar prazo e valor da entrega.']);
    await run('INSERT INTO faqs (question, answer, active) VALUES (?, ?, 1)', ['Quais formas de pagamento vocês aceitam?', 'As formas de pagamento podem variar por produto. Consulte o vendedor pelo WhatsApp.']);
  }

  await migrateLegacySpecs();
}

async function migrateLegacySpecs() {
  const products = await all('SELECT * FROM products');
  for (const product of products) {
    const existing = await get('SELECT COUNT(*) AS count FROM product_specs WHERE product_id = ?', [product.id]);
    if (existing.count > 0) continue;

    let order = 0;
    for (const [label, column] of LEGACY_SPECS) {
      if (!product[column]) continue;
      await run('INSERT INTO product_specs (product_id, label, value, sort_order) VALUES (?, ?, ?, ?)', [
        product.id,
        label,
        product[column],
        order
      ]);
      order += 1;
    }
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
