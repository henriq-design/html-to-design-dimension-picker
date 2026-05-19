const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'bookmarklet.js');
const distPath = path.join(__dirname, '..', 'dist', 'bookmarklet.min.js');
const markerPath = path.join(__dirname, '..', 'marcador-codigoJS');

const source = fs.readFileSync(sourcePath, 'utf8');

const withoutComments = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const compact = withoutComments
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}()[\];,:=+\-*/<>])\s*/g, '$1')
  .trim();

const bookmarklet = `javascript:${encodeURIComponent(compact)}`;

fs.mkdirSync(path.dirname(distPath), { recursive: true });

fs.writeFileSync(distPath, bookmarklet, 'utf8');
fs.writeFileSync(markerPath, bookmarklet, 'utf8');

console.log('Bookmarklet generated:');
console.log(`- ${distPath}`);
console.log(`- ${markerPath}`);