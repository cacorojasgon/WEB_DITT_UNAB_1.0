import fs from 'fs';
import path from 'path';
const root = process.cwd();
const htmlFiles = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) { if (!['node_modules','.vercel'].includes(entry.name)) walk(full); } else if (entry.name.endsWith('.html')) htmlFiles.push(full); } }
walk(root);
const missing = [];
function existsForHref(href) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http') || href.startsWith('/api/')) return true;
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '/sitemap.xml') return fs.existsSync(path.join(root, 'sitemap.xml'));
  const target = path.join(root, clean.replace(/^\//, ''));
  return fs.existsSync(target) || fs.existsSync(target + '.html') || fs.existsSync(path.join(target, 'index.html'));
}
for (const file of htmlFiles) { const html = fs.readFileSync(file, 'utf8'); const regex = /(?:href|src)="([^"]+)"/g; let match; while ((match = regex.exec(html))) { const href = match[1]; if (href.startsWith('data:')) continue; if (!existsForHref(href)) missing.push({ file: path.relative(root, file), href }); } }
if (missing.length) { console.error('Links faltantes:'); for (const item of missing) console.error('-', item.file, '->', item.href); process.exit(1); }
console.log('Validación OK:', htmlFiles.length, 'HTML revisados y enlaces internos resueltos.');
