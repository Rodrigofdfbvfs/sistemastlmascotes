const fs = require('fs');
const path = require('path');
const vm = require('vm');

const linksSourcePath = process.argv[2];
if (!linksSourcePath) throw new Error('Informe o arquivo com os links do Google Drive.');

const sandbox = { window: {} };
const catalogPath = path.join(__dirname, 'catalog-data.js');
vm.runInNewContext(fs.readFileSync(catalogPath, 'utf8'), sandbox);
const items = sandbox.window.catalogItems;

const lines = fs.readFileSync(linksSourcePath, 'utf8').split(/\r?\n/);
const pairs = [];
let pendingName = '';
for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;
  const link = line.match(/https:\/\/drive\.google\.com\/\S+/);
  if (!link) {
    pendingName = line;
    continue;
  }

  if (link.index > 0) pendingName = line.slice(0, link.index).trim();
  pairs.push({ name: pendingName, url: link[0] });
  pendingName = '';
}

if (pairs.length !== items.length) {
  throw new Error(`Foram encontrados ${pairs.length} links para ${items.length} produtos.`);
}

const driveLinks = {};
for (let index = 0; index < items.length; index += 1) {
  const item = items[index];
  const pair = pairs[index];
  driveLinks[item.sourceId] = pair.url;
  item.downloadUrl = pair.url;
}

fs.writeFileSync(path.join(__dirname, 'drive-links.json'), `${JSON.stringify(driveLinks, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  catalogPath,
  `// Gerado a partir de https://www.stlmodelo3d.site/pack/mascotes\nwindow.catalogItems = ${JSON.stringify(items, null, 2)};\n`,
  'utf8',
);

console.log(`Links associados: ${pairs.length}.`);
