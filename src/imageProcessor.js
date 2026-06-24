const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

function createFileName(prefix = 'image') {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
}

async function saveProductImage(file) {
  const filename = createFileName('produto');
  const outputPath = path.join(uploadDir, filename);
  await sharp(file.buffer)
    .rotate()
    .resize(1200, 900, { fit: 'contain', background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);
  return `/uploads/${filename}`;
}

async function saveLogoImage(file) {
  const filename = createFileName('logo');
  const outputPath = path.join(uploadDir, filename);
  await sharp(file.buffer)
    .rotate()
    .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outputPath);
  return `/uploads/${filename}`;
}

async function saveHeroImage(file) {
  const filename = createFileName('fundo');
  const outputPath = path.join(uploadDir, filename);
  await sharp(file.buffer)
    .rotate()
    .resize(1920, 1080, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(outputPath);
  return `/uploads/${filename}`;
}

function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filePath = path.join(__dirname, '..', 'public', imageUrl);
  if (filePath.startsWith(uploadDir) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  uploadDir,
  saveProductImage,
  saveLogoImage,
  saveHeroImage,
  deleteUploadedFile
};
