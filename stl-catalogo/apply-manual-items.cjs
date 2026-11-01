const fs = require('fs');
const path = require('path');
const vm = require('vm');

const catalogPath = path.join(__dirname, 'catalog-data.js');
const manualItemsPath = path.join(__dirname, 'manual-items.json');
const sandbox = { window: {} };

vm.runInNewContext(fs.readFileSync(catalogPath, 'utf8'), sandbox);

const originalItems = sandbox.window.catalogItems.filter((item) => !item.id.startsWith('manual-'));
const manualItems = JSON.parse(fs.readFileSync(manualItemsPath, 'utf8'));
const items = [...originalItems, ...manualItems].sort((a, b) =>
  a.name.localeCompare(b.name, 'pt-BR', { numeric: true }),
);

const output = `// Gerado a partir de https://www.stlmodelo3d.site/pack/mascotes\nwindow.catalogItems = ${JSON.stringify(items, null, 2)};\n`;
fs.writeFileSync(catalogPath, output, 'utf8');
console.log(`Catálogo atualizado: ${items.length} produtos, ${manualItems.length} manuais.`);
