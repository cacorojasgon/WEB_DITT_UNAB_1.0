// Genera portafolio/index.html (grid + filtros), portafolio/<slug>/index.html
// (una página por ficha) y las entradas de sitemap.xml a partir de las fichas
// .md en content/fichas/ (formato: docs/plantilla-fichas-portafolio.md).
//
// Uso: node scripts/build-portfolio.mjs   (o `npm run portfolio`)
//
// content/fichas/*.md nunca se publica (ver .gitignore): puede contener
// notas internas y datos de contacto que el parser ignora a propósito, ya
// que solo lee el bloque ```...``` de cada ficha.
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const fichasDir = path.join(root, 'content/fichas');
const portafolioDir = path.join(root, 'portafolio');
const indexPath = path.join(portafolioDir, 'index.html');
const homePath = path.join(root, 'index.html');
const sitemapPath = path.join(root, 'sitemap.xml');
const SITE = 'https://ditt-unab.vercel.app';
const GENERATED_MARK = 'GENERATED:PORTFOLIO';

const AREAS = [
  'Salud y Bienestar', 'Seguridad y Estudios Migratorios', 'TICs', 'Ambiente y Sustentabilidad',
  'Transición Energética', 'AgTech, FoodTech y Bioeconomía',
  'Fomento al Emprendimiento, Innovación y Desarrollo Productivo',
  'Industrias Creativas, Patrimonio y Turismo', 'EdTech y Desarrollo de Capital Humano',
  'Futuro del Trabajo (WorkTech)', 'Manufactura Avanzada e Industria 4.0', 'FinTech y Economía Digital',
  'Construcción, Infraestructura y PropTech', 'Movilidad, Logística e Infraestructura Urbana',
  'Industria Extractiva'
];

const STATUSES = ['Licenciable', 'Spin-off / EBCT', 'Servicio tecnológico', 'En negociación', 'En evaluación'];

const STATUS_BADGE = {
  'Licenciable': 'badge--success',
  'Spin-off / EBCT': 'badge--navy',
  'Servicio tecnológico': 'badge--red',
  'En negociación': 'badge--warning',
  'En evaluación': 'badge--info'
};

const HEADER_KEYS = {
  1: 'nombre de la tecnologia',
  2: 'area',
  3: 'facultad',
  4: 'estado de transferencia',
  5: 'nivel de madurez',
  6: 'descripcion breve',
  7: 'problema que resuelve',
  8: 'solucion propuesta',
  9: 'ventajas competitivas',
  10: 'aplicaciones',
  11: 'proteccion intelectual',
  12: 'colaboracion buscada',
  13: 'imagen',
  14: 'contacto responsable'
};

const ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

function normalize(str) {
  return String(str ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function slugify(str) {
  return normalize(str).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

// Los borradores de fichas a veces traen anotaciones internas del tipo
// "[PENDIENTE DE VALIDACIÓN]" (dato aún no confirmado por DITT). No deben
// publicarse tal cual: se recorta la frase que las contiene, o si el campo
// completo era solo eso, se trata como vacío.
function cleanPending(raw) {
  if (!raw) return '';
  let t = raw.trim();
  if (t.startsWith('[PENDIENTE DE VALIDACIÓN]')) return '';
  t = t.replace(/\s*\([^()]*\[PENDIENTE DE VALIDACIÓN\][^()]*\)/g, '');
  t = t.replace(/\s*[;:][^.]*\[PENDIENTE DE VALIDACIÓN\][^.]*\.?/g, '.');
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').replace(/\.{2,}/g, '.').trim();
  return t;
}

function afterArrow(lines) {
  const arrowIdx = lines.findIndex(l => l.includes('→'));
  if (arrowIdx === -1) return '';
  const sameLine = lines[arrowIdx].split('→')[1]?.trim();
  const rest = lines.slice(arrowIdx + 1).map(l => l.trim()).filter(Boolean);
  return [sameLine, ...rest].filter(Boolean).join(' ').trim();
}

function checkedOption(lines) {
  for (const l of lines) {
    const m = l.match(/\[\s*[xX]\s*\]\s*(.+)/);
    if (m) return m[1].trim();
  }
  return '';
}

function bulletList(lines) {
  return lines.map(l => l.trim()).filter(l => l.startsWith('-')).map(l => l.replace(/^-+\s*/, '').trim()).filter(Boolean);
}

function imageField(lines) {
  const out = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t.startsWith('-')) continue;
    const idx = t.indexOf(':');
    if (idx === -1) continue;
    const label = normalize(t.slice(1, idx));
    const value = t.slice(idx + 1).trim();
    if (!value) continue;
    if (label.includes('archivo') || label.includes('enlace')) out.archivo = value;
    else if (label.includes('alternativ')) out.alt = value;
    else if (label.includes('prompt')) out.prompt = value;
  }
  return out;
}

function resolveArea(raw) {
  if (!raw) return '';
  if (normalize(raw).startsWith('otra')) {
    const idx = raw.indexOf(':');
    const spec = idx !== -1 ? raw.slice(idx + 1).trim() : '';
    return spec && !/^_+$/.test(spec) ? spec : 'Otra';
  }
  return raw.trim();
}

function splitTitle(raw) {
  const idx = raw.search(/\s[–—]\s/);
  if (idx === -1) return raw.trim();
  return raw.slice(0, idx).trim();
}

function splitFields(blockLines) {
  const headers = [];
  blockLines.forEach((line, i) => {
    const m = line.match(/^\s*(\d{1,2})\.\s*(.+)$/);
    if (!m) return;
    const num = Number(m[1]);
    const key = HEADER_KEYS[num];
    if (key && normalize(m[2]).startsWith(key)) headers.push({ num, idx: i });
  });
  const fields = {};
  headers.forEach(({ num, idx }, i) => {
    const end = i + 1 < headers.length ? headers[i + 1].idx : blockLines.length;
    fields[num] = blockLines.slice(idx + 1, end);
  });
  return fields;
}

function parseFicha(blockLines, sourceLabel) {
  const fields = splitFields(blockLines);
  const errors = [];

  const nombreRaw = afterArrow(fields[1] || []);
  if (!nombreRaw) errors.push('nombre (campo 1) vacío');
  const nombre = splitTitle(nombreRaw);

  const area = resolveArea(checkedOption(fields[2] || []));
  if (!area) errors.push('área (campo 2) sin marcar');

  const facultad = afterArrow(fields[3] || []);
  if (!facultad) errors.push('facultad (campo 3) vacía');

  const estado = checkedOption(fields[4] || []);
  if (!STATUSES.includes(estado)) errors.push(`estado (campo 4) inválido: "${estado}"`);

  const trlRaw = afterArrow(fields[5] || []);
  const trlMatch = trlRaw.match(/[1-9]/);
  const trl = trlMatch ? trlMatch[0] : '';
  if (!trl) errors.push('TRL (campo 5) no numérico');

  const descripcionBreve = cleanPending(afterArrow(fields[6] || []));
  if (!descripcionBreve) errors.push('descripción breve (campo 6) vacía');

  const problema = cleanPending(afterArrow(fields[7] || []));
  if (!problema) errors.push('problema que resuelve (campo 7) vacío');

  const solucion = cleanPending(afterArrow(fields[8] || []));
  if (!solucion) errors.push('solución propuesta (campo 8) vacía');

  const ventajas = bulletList(fields[9] || []).map(cleanPending).filter(Boolean);
  if (ventajas.length < 1) errors.push('ventajas competitivas (campo 9) sin viñetas válidas');

  const aplicaciones = afterArrow(fields[10] || []).split(',').map(s => s.trim()).filter(Boolean);
  if (aplicaciones.length < 1) errors.push('aplicaciones (campo 10) vacías');

  const proteccion = cleanPending(afterArrow(fields[11] || [])) ||
    'Evaluación de protección y estrategia de transferencia disponible bajo confidencialidad.';

  const colaboracion = cleanPending(afterArrow(fields[12] || [])) ||
    'Escríbenos para conversar oportunidades de licenciamiento o colaboración.';

  const imagen = imageField(fields[13] || []);

  const codigoMatch = blockLines.join('\n').match(/FICHA DE TECNOLOGÍA\s*N[ºo°]\s*([\w-]+)/i);
  const codigo = codigoMatch ? codigoMatch[1] : '';

  if (errors.length) return { errors: errors.map(e => `[${sourceLabel}] ${e}`) };

  return {
    slug: slugify(nombre), codigo, nombre, facultad, area, estado, trl,
    descripcionBreve, problema, solucion, ventajas, aplicaciones, proteccion, colaboracion, imagen
  };
}

function renderCard(f, extraClass) {
  const tags = [f.area, ...f.aplicaciones].slice(0, 3);
  const cls = extraClass ? `card card--tech ${extraClass}` : 'card card--tech';
  return `<article class="${cls}" data-tech-card data-title="${escHtml(f.nombre.toLowerCase())}" data-area="${escHtml(f.area)}" data-status="${escHtml(f.estado)}" data-faculty="${escHtml(f.facultad)}" data-trl="${f.trl}">
    <div class="tech-card__top"><span class="badge ${STATUS_BADGE[f.estado]}">${escHtml(f.estado)}</span><span class="trl">TRL ${f.trl}</span></div>
    <h3>${escHtml(f.nombre)}</h3>
    <p class="muted">${escHtml(f.facultad)}</p>
    <p>${escHtml(f.descripcionBreve)}</p>
    <div class="tag-row">${tags.map(t => `<span>${escHtml(t)}</span>`).join('')}</div>
    <a class="link-arrow" href="/portafolio/${f.slug}">Ver ficha ${ARROW_SVG}</a>
  </article>`;
}

const HEAD_FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/main.css">';

function renderHead({ title, description, canonical }) {
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE}/assets/images/og-ditt.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/site.webmanifest">
  ${HEAD_FONTS}
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Dirección de Innovación y Transferencia Tecnológica UNAB","url":"${SITE}","email":"OTL@UNAB.CL","parentOrganization":{"@type":"CollegeOrUniversity","name":"Universidad Andrés Bello"}}</script>`;
}

function renderHeader() {
  return `<a class="skip-link" href="#contenido">Saltar al contenido</a>
<header class="site-header" data-header>
  <div class="container header__inner">
    <a class="brand" href="/" aria-label="Ir al inicio DITT UNAB">
      <img src="/assets/images/logos/ditt-color.png" alt="Dirección de Innovación y Transferencia Tecnológica UNAB" width="211" height="50">
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Abrir menú">
      <span></span><span></span><span></span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Navegación principal">
      <a href="/">Inicio</a><a href="/servicios">Servicios</a><a href="/portafolio" aria-current="page" class="is-active">Portafolio</a><a href="/recursos">Recursos</a><a href="/contacto">Contacto</a>
      <a class="btn btn--primary btn--sm" href="/declarar">Declarar invención</a>
    </nav>
  </div>
</header>`;
}

function renderFooter() {
  return `<footer class="site-footer">
  <div class="container footer__grid">
    <div class="footer__brand">
      <img src="/assets/images/logos/ditt-white.png" alt="DITT UNAB" width="211" height="50">
      <p>Dirección de Innovación y Transferencia Tecnológica · Vicerrectoría de Investigación y Doctorado · Universidad Andrés Bello.</p>
      <div class="footer__contact"><a href="mailto:OTL@UNAB.CL">OTL@UNAB.CL</a><span>·</span><a href="tel:+56226618000">+56 2 2661 8000</a></div>
    </div>
    <div><h2>DITT</h2><ul><li><a href="/">Inicio</a></li><li><a href="/portafolio">Portafolio</a></li><li><a href="/servicios">Servicios</a></li><li><a href="/contacto">Contacto</a></li></ul></div><div><h2>Recursos</h2><ul><li><a href="/recursos/declarar-invencion">Antes de declarar tu invención</a></li><li><a href="/recursos/preguntas-frecuentes">Preguntas frecuentes</a></li><li><a href="/recursos/casos-exito">Casos de éxito</a></li><li><a href="/recursos/propiedad-intelectual">Propiedad intelectual</a></li><li><a href="/recursos/modelos-contrato">Modelos de contrato</a></li></ul></div><div><h2>UNAB</h2><ul><li><a href="/institucional/vicerrectoria-investigacion">Vicerrectoría de Investigación</a></li><li><a href="/institucional/facultades">Facultades</a></li><li><a href="/institucional/campus-sedes">Campus y sedes</a></li></ul></div><div><h2>Legal</h2><ul><li><a href="/privacidad">Privacidad</a></li><li><a href="/accesibilidad">Accesibilidad</a></li><li><a href="/sitemap.xml">Mapa del sitio</a></li></ul></div>
  </div>
  <div class="footer__bottom"><div class="container"><span>© 2026 Universidad Andrés Bello®. Conectar · Innovar · Liderar.</span><span>Santiago, Chile</span></div></div>
</footer>
<script src="/assets/js/main.js" defer></script>`;
}

function pickRelated(target, all) {
  const others = all.filter(x => x.slug !== target.slug);
  const sameArea = others.filter(x => x.area === target.area);
  const rest = others.filter(x => x.area !== target.area);
  return [...sameArea, ...rest].slice(0, 2);
}

function renderDetailPage(f, related) {
  const canonical = `${SITE}/portafolio/${f.slug}`;
  const head = renderHead({ title: `${f.nombre} | Portafolio DITT UNAB`, description: f.descripcionBreve, canonical });
  const contactoHref = `/contacto?tecnologia=${encodeURIComponent(f.nombre)}`;
  const codigoRow = f.codigo ? `<div><dt>Código DITT</dt><dd>${escHtml(f.codigo)}</dd></div>` : '';
  const relatedHtml = related.length ? `<section class="section section--white"><div class="container"><div class="section-header">
    <p class="eyebrow">Relacionadas</p>
    <h2>Otras tecnologías del área</h2>
  </div><div class="card-grid card-grid--3">${related.map(renderCard).join('')}</div></div></section>` : '';
  return `<!doctype html>
<!-- ${GENERATED_MARK} — no editar a mano, se regenera con \`npm run portfolio\` -->
<html lang="es">
<head>
  ${head}
</head>
<body>
${renderHeader()}
<nav class="breadcrumbs container" aria-label="Breadcrumb"><ol><li><a href="/">Inicio</a></li><li><a href="/portafolio">Portafolio</a></li><li><span>${escHtml(f.nombre)}</span></li></ol></nav>
<main id="contenido">
<section class="page-hero page-hero--tech"><div class="container"><p class="eyebrow">${escHtml(f.area)}</p><h1>${escHtml(f.nombre)}</h1><p>${escHtml(f.descripcionBreve)}</p><div class="tech-meta"><span class="badge ${STATUS_BADGE[f.estado]}">${escHtml(f.estado)}</span><span class="trl">TRL ${f.trl}</span><span>${escHtml(f.facultad)}</span></div></div></section>
<section class="section"><div class="container detail-grid"><article class="card card--rich"><h2>Problema que resuelve</h2><p>${escHtml(f.problema)}</p><h2>Solución propuesta</h2><p>${escHtml(f.solucion)}</p><h2>Ventajas competitivas</h2><ul class="check-list">${f.ventajas.map(v => `<li>${escHtml(v)}</li>`).join('')}</ul><h2>Aplicaciones</h2><div class="tag-row tag-row--large">${f.aplicaciones.map(a => `<span>${escHtml(a)}</span>`).join('')}</div></article><aside class="card detail-aside"><h2>Ficha rápida</h2><dl class="fact-list"><div><dt>Área</dt><dd>${escHtml(f.area)}</dd></div><div><dt>Facultad</dt><dd>${escHtml(f.facultad)}</dd></div><div><dt>TRL</dt><dd>${f.trl}</dd></div><div><dt>Estado</dt><dd>${escHtml(f.estado)}</dd></div>${codigoRow}<div><dt>Protección</dt><dd>${escHtml(f.proteccion)}</dd></div><div><dt>Colaboración buscada</dt><dd>${escHtml(f.colaboracion)}</dd></div></dl><a class="btn btn--primary btn--full" href="${contactoHref}">Solicitar información</a><a class="btn btn--ghost btn--full" href="/portafolio">Volver al portafolio</a></aside></div></section>
${relatedHtml}
</main>
${renderFooter()}
</body>
</html>
`;
}

function renderAreaOptions(usedAreas) {
  const extra = usedAreas.filter(a => !AREAS.includes(a));
  return '<option value="Todas">Todas</option>' + [...AREAS, ...extra].map(a => `<option value="${escHtml(a)}">${escHtml(a)}</option>`).join('');
}

function renderStatusOptions() {
  return '<option value="Todos">Todos</option>' + STATUSES.map(s => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
}

function replaceBetween(content, startMarker, endMarker, inner) {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`No se encontró el marcador ${startMarker} en portafolio/index.html`);
  }
  return content.slice(0, startIdx + startMarker.length) + inner + content.slice(endIdx);
}

function cleanupStaleDetailPages(currentSlugs) {
  if (!fs.existsSync(portafolioDir)) return;
  for (const entry of fs.readdirSync(portafolioDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || currentSlugs.has(entry.name)) continue;
    const idxFile = path.join(portafolioDir, entry.name, 'index.html');
    if (!fs.existsSync(idxFile)) continue;
    if (fs.readFileSync(idxFile, 'utf8').includes(GENERATED_MARK)) {
      fs.rmSync(path.join(portafolioDir, entry.name), { recursive: true, force: true });
      console.log(`Eliminado (ya no está en content/fichas/): portafolio/${entry.name}/`);
    }
  }
}

function updateSitemap(fichas) {
  const lines = fs.readFileSync(sitemapPath, 'utf8').split('\n');
  const filtered = lines.filter(l => !new RegExp(`<loc>${SITE}/portafolio/[a-z0-9-]+</loc>`).test(l));
  const idx = filtered.findIndex(l => l.includes(`<loc>${SITE}/portafolio</loc>`));
  const newEntries = fichas.map(f => `  <url><loc>${SITE}/portafolio/${f.slug}</loc></url>`);
  filtered.splice(idx + 1, 0, ...newEntries);
  fs.writeFileSync(sitemapPath, filtered.join('\n'));
}

function main() {
  if (!fs.existsSync(fichasDir)) {
    console.error(`No existe ${path.relative(root, fichasDir)}/. Crea la carpeta y agrega archivos .md con fichas.`);
    process.exit(1);
  }
  const files = fs.readdirSync(fichasDir).filter(f => f.endsWith('.md')).sort();
  if (!files.length) {
    console.warn('No hay fichas .md en content/fichas/. No se genera nada.');
    return;
  }

  const fichas = [];
  const errors = [];
  const seenSlugs = new Map();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(fichasDir, file), 'utf8');
    const fenced = [...raw.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(m => m[1]);
    const blocks = fenced.length ? fenced : [raw];
    blocks.forEach((block, i) => {
      const label = `${file}${blocks.length > 1 ? ` #${i + 1}` : ''}`;
      const result = parseFicha(block.split('\n'), label);
      if (result.errors) {
        errors.push(...result.errors);
        return;
      }
      if (seenSlugs.has(result.slug)) {
        errors.push(`[${label}] slug duplicado "${result.slug}" (ya usado por ${seenSlugs.get(result.slug)})`);
        return;
      }
      seenSlugs.set(result.slug, label);
      fichas.push(result);
    });
  }

  if (errors.length) {
    console.error('Errores al procesar fichas:\n' + errors.map(e => ` - ${e}`).join('\n'));
    process.exit(1);
  }

  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  const usedAreas = [...new Set(fichas.map(f => f.area))];
  indexHtml = replaceBetween(indexHtml, '<!--PORTFOLIO:AREA_OPTIONS-->', '<!--/PORTFOLIO:AREA_OPTIONS-->', renderAreaOptions(usedAreas));
  indexHtml = replaceBetween(indexHtml, '<!--PORTFOLIO:STATUS_OPTIONS-->', '<!--/PORTFOLIO:STATUS_OPTIONS-->', renderStatusOptions());
  const countText = fichas.length === 1 ? '1 tecnología disponible' : `${fichas.length} tecnologías disponibles`;
  indexHtml = replaceBetween(indexHtml, '<!--PORTFOLIO:COUNT-->', '<!--/PORTFOLIO:COUNT-->', countText);
  indexHtml = replaceBetween(indexHtml, '<!--PORTFOLIO:GRID-->', '<!--/PORTFOLIO:GRID-->', fichas.map(renderCard).join(''));
  fs.writeFileSync(indexPath, indexHtml);

  const currentSlugs = new Set(fichas.map(f => f.slug));
  cleanupStaleDetailPages(currentSlugs);
  for (const f of fichas) {
    const dir = path.join(portafolioDir, f.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderDetailPage(f, pickRelated(f, fichas)));
  }

  updateSitemap(fichas);

  // Home: "Tecnologías destacadas" — las 3 de mayor TRL (más maduras primero).
  if (fs.existsSync(homePath)) {
    const featured = [...fichas].sort((a, b) => b.trl - a.trl).slice(0, 3);
    let homeHtml = fs.readFileSync(homePath, 'utf8');
    homeHtml = replaceBetween(homeHtml, '<!--PORTFOLIO:FEATURED-->', '<!--/PORTFOLIO:FEATURED-->', featured.map(f => renderCard(f, 'card--featured')).join(''));
    fs.writeFileSync(homePath, homeHtml);
  }

  console.log(`Portafolio generado: ${fichas.length} tecnologías desde ${files.length} archivo(s) en content/fichas/.`);
}

main();
