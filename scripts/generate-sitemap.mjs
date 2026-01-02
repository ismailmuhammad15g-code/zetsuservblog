import fs from 'fs';
import path from 'path';

const SITEMAP_PATH = path.resolve('public', 'sitemap.xml');
const BASE_URL = 'https://glittery-lily-2ef5cc.netlify.app';

const pages = [
    '/',
    '/login',
    '/register',
    '/about',
    // Add dynamic routes here if needed
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
        .map(
            (page) => `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '/' ? '1.0' : '0.8'}</priority>
  </url>`
        )
        .join('')}
</urlset>`;

fs.writeFileSync(SITEMAP_PATH, sitemap);
console.log(`Sitemap generated at ${SITEMAP_PATH}`);
