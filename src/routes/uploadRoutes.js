const express = require('express');
const multer = require('multer');
const { run, get } = require('../db');
const { saveProductImage, deleteUploadedFile } = require('../imageProcessor');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens sao permitidas'));
    return cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Nao autenticado' });
  return next();
}

router.post('/products/:id/images', requireAdmin, upload.array('images', 12), async (req, res) => {
  const product = await get('SELECT id FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Produto nao encontrado' });
  const hasMain = await get('SELECT id FROM product_images WHERE product_id = ? AND is_main = 1', [req.params.id]);
  for (let index = 0; index < req.files.length; index += 1) {
    const imageUrl = await saveProductImage(req.files[index]);
    await run('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)', [
      req.params.id,
      imageUrl,
      !hasMain && index === 0 ? 1 : 0
    ]);
  }
  res.json({ success: true });
});

router.delete('/images/:id', requireAdmin, async (req, res) => {
  const image = await get('SELECT * FROM product_images WHERE id = ?', [req.params.id]);
  if (!image) return res.status(404).json({ error: 'Imagem nao encontrada' });
  await run('DELETE FROM product_images WHERE id = ?', [req.params.id]);
  deleteUploadedFile(image.image_url);
  res.json({ success: true });
});

router.put('/images/:id/main', requireAdmin, async (req, res) => {
  const image = await get('SELECT * FROM product_images WHERE id = ?', [req.params.id]);
  if (!image) return res.status(404).json({ error: 'Imagem nao encontrada' });
  await run('UPDATE product_images SET is_main = 0 WHERE product_id = ?', [image.product_id]);
  await run('UPDATE product_images SET is_main = 1 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
