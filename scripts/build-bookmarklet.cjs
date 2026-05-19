const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'bookmarklet.js');
const distPath = path.join(__dirname, '..', 'dist', 'bookmarklet.min.js');
const markerPath = path.join(__dirname, '..', 'marcador-codigoJS');

const source = fs.readFileSync(sourcePath, 'utf8');

// Keep the source text intact. Regex minification can corrupt strings,
// template literals, inline CSS, and visible modal copy.
const compact = source.trim();

const bookmarklet = `javascript:${encodeURIComponent(compact)}`;

fs.mkdirSync(path.dirname(distPath), { recursive: true });

fs.writeFileSync(distPath, bookmarklet, 'utf8');
fs.writeFileSync(markerPath, bookmarklet, 'utf8');

console.log('Bookmarklet generated:');
console.log(`- ${distPath}`);
console.log(`- ${markerPath}`);
