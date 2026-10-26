// Builds ONE self-contained HTML file (all JS, CSS and images inlined) so it can be previewed by double-clicking it.
//   npm run build:preview          -> dist-preview/campusconnect-test-preview.html  (has the "View as Admin/Student" TEST switch)
//   npm run build:preview:student  -> dist-preview/campusconnect-student.html       (student only, no admin code)
//   npm run build:preview:admin    -> dist-preview/campusconnect-admin.html         (admin only, no student screens)
//   npm run build:preview:org      -> dist-preview/campusconnect-org.html           (org managers only)
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2] || 'test';
const cfg = {
  test: { entry: 'src/main-test.jsx', html: 'index.html', file: 'campusconnect-test-preview.html', scripts: ['jsQR/1.4.0/jsQR.min.js'] },
  student: { entry: 'src/main-student.jsx', html: 'index.html', file: 'campusconnect-student.html', scripts: [] },
  org: { entry: 'src/main-org.jsx', html: 'org/index.html', file: 'campusconnect-org.html', scripts: ['jsQR/1.4.0/jsQR.min.js'] },
  admin: { entry: 'src/main-admin.jsx', html: 'admin/index.html', file: 'campusconnect-admin.html', scripts: ['jsQR/1.4.0/jsQR.min.js'] },
}[target];
if (!cfg) throw new Error('Use: test | student | admin | org');

const out = await build({
  entryPoints: [cfg.entry],
  bundle: true,
  minify: true,
  write: false,
  outdir: 'out',
  format: 'iife',
  jsx: 'automatic',
  target: 'es2019',
  loader: { '.jpg': 'dataurl', '.png': 'dataurl', '.jsx': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});
const js = out.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = out.outputFiles.find((f) => f.path.endsWith('.css')).text;
const cdn = cfg.scripts.map((s) => `<script src="https://cdnjs.cloudflare.com/ajax/libs/${s}"></script>`).join('\n');

const tpl = readFileSync(cfg.html, 'utf8')
  .replace(/<script src="https:\/\/cdnjs[^>]*><\/script>\n?/g, '')
  .replace(/<script type="module"[^>]*><\/script>/, '')
  .replace('</head>', () => `${cdn}\n<style>${css}</style>\n</head>`)
  .replace('</body>', () => `<script>${js.replace(/<\/script>/gi, '<\\/script>')}</script>\n</body>`);

mkdirSync('dist-preview', { recursive: true });
writeFileSync('dist-preview/' + cfg.file, tpl);
console.log('Wrote dist-preview/' + cfg.file + ' (' + Math.round(tpl.length / 1024) + ' KB)');
