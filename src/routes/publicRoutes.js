const express = require('express');
const { all, get } = require('../db');

const router = express.Router();

function mapProduct(row) {
  return {
    ...row,
    price: Number(row.price || 0),
    images: row.images ? row.images.split('|').filter(Boolean) : []
  };
}

router.get('/settings', async (req, res) => {
  res.json(await get('SELECT * FROM settings LIMIT 1'));
});

router.get('/categories', async (req, res) => {
  res.json(await all('SELECT * FROM categories ORDER BY name'));
});

router.get('/faqs', async (req, res) => {
  res.json(await all('SELECT * FROM faqs WHERE active = 1 ORDER BY id DESC'));
});

router.get('/products', async (req, res) => {
  const params = [];
  let where = "WHERE p.status = 'active'";
  if (req.query.category) {
    where += ' AND c.slug = ?';
    params.push(req.query.category);
  }

  const products = await all(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
      COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1),
               (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)) AS main_image
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${where}
    ORDER BY p.created_at DESC
  `, params);
  res.json(products.map(mapProduct));
});

router.get('/products/:slug', async (req, res) => {
  const product = await get(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ? AND p.status = 'active'
  `, [req.params.slug]);

  if (!product) return res.status(404).json({ error: 'Produto nao encontrado' });

  product.images = await all('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id', [product.id]);
  product.faqs = await all('SELECT * FROM faqs WHERE active = 1 ORDER BY id DESC');
  product.settings = await get('SELECT * FROM settings LIMIT 1');
  return res.json(product);
});

module.exports = router;
