import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const publicDir = path.join(root, 'public');

const validation = spawnSync(process.execPath, ['scripts/validate-links.mjs'], {
  cwd: root,
  stdio: 'inherit'
});

if (validation.status !== 0) {
  process.exit(validation.status ?? 1);
}

const staticEntries = [
  'index.html',
  '404.html',
  'assets',
  'servicios',
  'portafolio',
  'postular',
  'contacto',
  'recursos',
  'institucional',
  'privacidad',
  'accesibilidad',
  'favicon.svg',
  'site.webmanifest',
  'sitemap.xml',
  'robots.txt'
];

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const entry of staticEntries) {
  const from = path.join(root, entry);
  const to = path.join(publicDir, entry);
  if (!fs.existsSync(from)) {
    console.warn(`Aviso: no se encontro ${entry}, se omite.`);
    continue;
  }
  fs.cpSync(from, to, { recursive: true });
}

console.log(`Build OK: sitio estatico generado en ${path.relative(root, publicDir)}/`);
