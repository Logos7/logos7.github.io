import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = JSON.parse(read('data/projects.json'));
const languages = ['en', 'pl', 'de', 'es'];
const translations = Object.fromEntries(languages.map(language => [language, {}]));
const outputs = new Map();
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fail = message => { throw new Error(message); };
const text = (value, key) => {
  if (typeof value === 'string') return escape(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`Invalid text: ${key}`);
  const fallback = value.en || value.pl || Object.values(value).find(item => typeof item === 'string' && item);
  if (!fallback) fail(`Missing text: ${key}`);
  for (const language of languages) {
    if (value[language] !== undefined && typeof value[language] !== 'string') fail(`Invalid translation: ${key}.${language}`);
    translations[language][key] = value[language] || fallback;
  }
  return escape(translations.en[key]);
};
const element = (tag, value, key, attrs = '') => `<${tag}${attrs}${typeof value === 'string' ? '' : ` data-i18n="${key}"`}>${text(value, key)}</${tag}>`;
const asset = src => {
  if (typeof src !== 'string' || !/^\/assets\/[a-zA-Z0-9_./-]+$/.test(src) || src.includes('..')) fail(`Invalid asset path: ${src}`);
  if (!fs.statSync(path.join(root, src.slice(1)), { throwIfNoEntry: false })?.isFile()) fail(`Missing image: ${src}`);
  return escape(src);
};
const url = value => {
  let parsed;
  try { parsed = new URL(value); } catch { fail(`Invalid repository URL: ${value}`); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || parsed.username || parsed.password || !/^\/[^/]+\/[^/]+\/?$/.test(parsed.pathname)) fail(`Expected a GitHub repository URL: ${value}`);
  return escape(value);
};
const image = (value, key, lazy = false) => {
  const alt = text(value.alt || '', `${key}.alt`);
  return `<img src="${asset(value.src)}" alt="${alt}"${typeof value.alt === 'object' ? ` data-i18n-attr="alt:${key}.alt"` : ''}${lazy ? ' loading="lazy"' : ''}/>`;
};
const localized = values => Object.fromEntries(languages.map((language, index) => [language, values[index]]));
const labels = {
  gallery: localized(['Gallery', 'Galeria', 'Galerie', 'Galería']),
  materials: localized(['Description and images', 'Opis i obrazki', 'Beschreibung und Bilder', 'Descripción e imágenes']),
  code: localized(['Description, images and source code', 'Opis, obrazki i kod źródłowy', 'Beschreibung, Bilder und Quellcode', 'Descripción, imágenes y código fuente'])
};
const ids = new Set();
for (const category of catalog.categories) {
  if (!/^[a-z0-9-]+$/.test(category.id) || ids.has(category.id) || category.id === 'all') fail(`Invalid or duplicate category: ${category.id}`);
  ids.add(category.id);
}
const projectIds = new Set();
for (const project of catalog.projects) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id) || projectIds.has(project.id)) fail(`Invalid or duplicate project: ${project.id}`);
  projectIds.add(project.id);
  if (!ids.has(project.category)) fail(`Unknown category: ${project.category}`);
  if (typeof project.name !== 'string' || !project.name.trim()) fail(`Missing name: ${project.id}`);
  if (project.repository) url(project.repository);
}
const filters = `<div aria-label="Project filters" class="filter-row reveal" data-i18n-attr="aria-label:projects.filtersLabel">
<button aria-pressed="true" class="filter-chip is-active" data-i18n="projects.filterAll" data-project-filter="all" type="button">All</button>
${catalog.categories.map(category => element('button', category.label, `catalog.category.${category.id}`, ` aria-pressed="false" class="filter-chip" data-project-filter="${category.id}" type="button"`)).join('\n')}
</div>`;
const cards = [];
for (const project of catalog.projects) {
  const key = `catalog.${project.id}`;
  const route = `/projects/${project.id}/`;
  const cover = project.cover ? image(project.cover, `${key}.cover`) : '<span aria-hidden="true"></span>';
  const artClass = project.cover ? '' : ' project-card-art';
  const repository = project.repository ? `<a class="project-card-repository" href="${url(project.repository)}" rel="noreferrer" target="_blank">GitHub ↗</a>` : '';
  cards.push(`<article class="project-card reveal" data-project-category="${project.category}">
<a class="project-card-media${artClass}" href="${route}" aria-label="${escape(project.name)}">${cover}</a>
<div class="project-card-body">
${element('span', project.status, `${key}.status`, ' class="status"')}
<div class="project-card-titlebar"><h3><a href="${route}">${escape(project.name)}</a></h3>${repository}</div>
${element('p', project.description, `${key}.description`)}
<div class="tags">${(project.tags || []).map((tag, index) => element('span', tag, `${key}.tag.${index}`, ' class="tag"')).join('')}</div>
</div></article>`);
  const sections = (project.sections || []).map((section, index) => {
    const prefix = `${key}.section.${index}`;
    return `${element('h2', section.title, `${prefix}.title`)}
${(section.paragraphs || []).map((paragraph, item) => element('p', paragraph, `${prefix}.paragraph.${item}`)).join('\n')}
${section.items?.length ? `<ul>${section.items.map((item, number) => element('li', item, `${prefix}.item.${number}`)).join('')}</ul>` : ''}`;
  }).join('\n');
  const gallery = project.gallery?.length ? `${element('h2', labels.gallery, 'catalog.gallery')}
<div class="project-gallery">${project.gallery.map((entry, index) => `<figure><a href="${asset(entry.src)}" target="_blank" rel="noreferrer">${image(entry, `${key}.gallery.${index}`, true)}</a>${entry.caption ? element('figcaption', entry.caption, `${key}.gallery.${index}.caption`) : ''}</figure>`).join('\n')}</div>` : '';
  const metadata = (project.metadata || []).map((entry, index) => `<div class="meta-item">${element('span', entry.label, `${key}.metadata.${index}.label`, ' class="meta-label"')}${element('span', entry.value, `${key}.metadata.${index}.value`, ' class="meta-value"')}</div>`).join('\n');
  const content = `<section class="project-hero"><div class="container project-hero-grid"><div class="reveal">
${project.eyebrow ? element('p', project.eyebrow, `${key}.eyebrow`, ' class="eyebrow"') : ''}
<h1>${Number.isInteger(project.headingSplit) ? `${escape(project.name.slice(0, project.headingSplit))}<span>${escape(project.name.slice(project.headingSplit))}</span>` : escape(project.name)}</h1>
${element('p', project.lead || project.description, `${key}.lead`)}
<div class="project-actions">
${project.repository ? `<a class="button button-primary" data-i18n="common.githubRepository" href="${url(project.repository)}" target="_blank" rel="noreferrer">GitHub repository →</a>` : ''}
${project.notice ? element('span', project.notice, `${key}.notice`, ' class="button button-disabled" aria-disabled="true"') : ''}
<a class="button" data-i18n="common.allProjects" href="/projects/">All projects</a>
</div></div><div class="project-cover${artClass} reveal">${cover}</div></div></section>
<section class="section"><div class="container project-layout"><article class="prose reveal">
${sections}
${project.callout ? element('div', project.callout, `${key}.callout`, ' class="callout"') : ''}
${gallery}
</article><aside class="sidebar reveal"><h3 data-i18n="common.information">Information</h3><div class="meta-list">${metadata}
<div class="meta-item"><span class="meta-label" data-i18n="common.materials">Materials</span>${element('span', project.repository ? labels.code : labels.materials, `${key}.materials`, ' class="meta-value"')}</div>
</div></aside></div></section>`;
  const metaDescription = text(project.metaDescription || project.description, `${key}.meta`);
  const replacements = {
    meta: `<meta name="description" content="${metaDescription}"${typeof (project.metaDescription || project.description) === 'object' ? ` data-i18n-attr="content:${key}.meta"` : ''}/>`,
    title: `<title>${escape(project.name)} — Logos7</title>`,
    palette: ['yantra', 'pieceborne', 'adi'].includes(project.id) ? project.id : 'projects',
    content
  };
  outputs.set(`projects/${project.id}/index.html`, read('templates/project.html').replace(/\{\{(\w+)\}\}/g, (_, name) => replacements[name] ?? fail(`Unknown template token: ${name}`)));
}
outputs.set('projects/index.html', read('templates/projects.html').replace(/\{\{(\w+)\}\}/g, (_, name) => ({ filters, cards: cards.join('\n') })[name] ?? fail(`Unknown template token: ${name}`)));
outputs.set('assets/js/project-translations.js', `window.Logos7Translations = window.Logos7Translations || {};\nfor (const [language, entries] of Object.entries(${JSON.stringify(translations, null, 2)})) {\n  Object.assign(window.Logos7Translations[language] ||= {}, entries);\n}\n`);
outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/projects/', ...catalog.projects.map(project => `/projects/${project.id}/`)].map(route => `<url><loc>https://logos7.github.io${route}</loc></url>`).join('\n')}\n</urlset>\n`);
let stale = false;
for (const [file, content] of outputs) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(path.join(root, file)) || read(file) !== content) { console.error(`Needs rebuilding: ${file}`); stale = true; }
  } else {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
}
if (stale) process.exitCode = 1;
else console.log(`${catalog.projects.length} projects: ${process.argv.includes('--check') ? 'up to date' : 'built'}.`);
