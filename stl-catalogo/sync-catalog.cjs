const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error('Informe o caminho do HTML original.');
}

const html = fs.readFileSync(sourcePath, 'utf8');
const packId = '7dfe5afa-2474-4186-a2e9-c13535ec8957';
const itemsMarker = '{\\"items\\":[';
const start = html.indexOf(itemsMarker);
const end = html.indexOf('],\\"subcategories\\":', start);
if (start < 0 || end < 0) {
  throw new Error('Não foi possível localizar os produtos no HTML original.');
}

const escapedItems = html.slice(start + itemsMarker.length - 1, end + 1);
const parsedItems = JSON.parse(JSON.parse(`"${escapedItems}"`));
const itemsById = new Map();
for (const item of parsedItems) {
  if (item.pack_id !== packId) continue;
  const { id: sourceId, title, cover_url: coverUrl, file_count: fileCount, kind } = item;
  const formats = (item.formats || []).map((format) => format.toUpperCase());
  const extension = coverUrl
    ? path.extname(new URL(coverUrl).pathname).toLowerCase() || '.webp'
    : null;

  itemsById.set(sourceId, {
    id: `original-${sourceId}`,
    sourceId,
    name: title,
    category: 'Mascotes',
    format: formats.join(' / ') || 'STL',
    formats,
    image: extension ? `assets/original/${sourceId}${extension}` : null,
    imageSource: coverUrl,
    parts: Number(fileCount),
    size: 'Catálogo original',
    kind,
    downloadUrl: null,
  });
}

const items = [...itemsById.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
if (items.length !== 67) {
  throw new Error(`Esperados 67 produtos, mas foram extraídos ${items.length}.`);
}

const linksPath = path.join(__dirname, 'drive-links.json');
if (fs.existsSync(linksPath)) {
  const driveLinks = JSON.parse(fs.readFileSync(linksPath, 'utf8'));
  for (const item of items) item.downloadUrl = driveLinks[item.sourceId] || null;
}

const imageOverridesPath = path.join(__dirname, 'image-overrides.json');
if (fs.existsSync(imageOverridesPath)) {
  const imageOverrides = JSON.parse(fs.readFileSync(imageOverridesPath, 'utf8'));
  for (const item of items) {
    if (imageOverrides[item.sourceId]) item.image = imageOverrides[item.sourceId];
  }
}

const manualItemsPath = path.join(__dirname, 'manual-items.json');
if (fs.existsSync(manualItemsPath)) {
  const manualItems = JSON.parse(fs.readFileSync(manualItemsPath, 'utf8'));
  items.push(...manualItems);
  items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
}

const output = `// Gerado a partir de https://www.stlmodelo3d.site/pack/mascotes\nwindow.catalogItems = ${JSON.stringify(items, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, 'catalog-data.js'), output, 'utf8');
console.log(`Catálogo sincronizado: ${items.length} produtos.`);

if (process.argv.includes('--download-images')) {
  const assetsDir = path.join(__dirname, 'assets', 'original');
  fs.mkdirSync(assetsDir, { recursive: true });

  Promise.all(items.filter((item) => item.imageSource).map(async (item) => {
    const response = await fetch(item.imageSource);
    if (!response.ok) throw new Error(`Falha ao baixar a capa de ${item.name}: HTTP ${response.status}`);
    const target = path.join(__dirname, item.image);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  })).then(() => {
    console.log(`Capas baixadas: ${items.filter((item) => item.imageSource).length}.`);
  });
}
