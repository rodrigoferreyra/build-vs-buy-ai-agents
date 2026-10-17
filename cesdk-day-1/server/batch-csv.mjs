/**
 * Headless CE.SDK: CSV data-merge + PDF/X export.
 * Checklist: 37, 45, 47, 60, 61
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import CreativeEngine from '@cesdk/node';
import { exportPDFX, checkPDFX } from '@imgly/pdfx-exporter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadLicense() {
  if (process.env.CESDK_LICENSE || process.env.VITE_CESDK_LICENSE) {
    return process.env.CESDK_LICENSE || process.env.VITE_CESDK_LICENSE;
  }
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return undefined;
  const text = readFileSync(envPath, 'utf8');
  const m = text.match(/VITE_CESDK_LICENSE(?:_KEY)?\s*=\s*(.+)/);
  return m?.[1]?.trim();
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

const license = loadLicense();
if (!license) {
  console.error('Missing CESDK_LICENSE / VITE_CESDK_LICENSE');
  process.exit(1);
}

const csvPath = resolve(__dirname, 'sample-batch.csv');
const outDir = resolve(__dirname, 'out');
mkdirSync(outDir, { recursive: true });
const rows = parseCsv(readFileSync(csvPath, 'utf8'));

const engine = await CreativeEngine.init({
  license,
  baseURL: 'https://cdn.img.ly/packages/imgly/cesdk-node/1.83.0/assets',
});

try {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const scene = engine.scene.create();
    let page = engine.block.findByType('page')[0];
    if (page == null) {
      page = engine.block.create('page');
      engine.block.appendChild(scene, page);
    }

    engine.variable.setString('name', row.name ?? '');
    engine.variable.setString('headline', row.headline ?? '');

    const text = engine.block.create('text');
    engine.block.setString(
      text,
      'text/text',
      `${row.headline ?? ''} — ${row.name ?? ''}`,
    );
    engine.block.appendChild(page, text);

    const png = await engine.block.export(page, { mimeType: 'image/png' });
    writeFileSync(
      resolve(outDir, `row-${i + 1}.png`),
      Buffer.from(await png.arrayBuffer()),
    );

    try {
      const pdfx = await exportPDFX(engine, {
        outputStandard: 'PDF/X-4',
        outputProfile: 'fogra39',
        title: `batch-${i + 1}`,
      });
      writeFileSync(
        resolve(outDir, `row-${i + 1}.pdfx.pdf`),
        Buffer.from(await pdfx.arrayBuffer()),
      );
      const violations = await checkPDFX(pdfx, 'PDF/X-4');
      console.log(`row ${i + 1}: PDF/X-4 violations=${violations.length}`);
    } catch (err) {
      const pdf = await engine.block.export(page, {
        mimeType: 'application/pdf',
      });
      writeFileSync(
        resolve(outDir, `row-${i + 1}.pdf`),
        Buffer.from(await pdf.arrayBuffer()),
      );
      console.warn(
        `row ${i + 1}: PDF/X failed (${err?.message || err}); wrote plain PDF`,
      );
    }
  }
  console.log(`OK: wrote ${rows.length} row(s) to ${outDir}`);
} finally {
  engine.dispose();
}
