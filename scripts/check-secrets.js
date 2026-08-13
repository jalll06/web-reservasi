const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORED_DIRS = ['node_modules', '.git', '.vercel', 'dist'];
const SKIP_FILES = ['.env', '.env.local', '.env.production', '.env.test'];

// Only detect literal hardcoded assignments (e.g. KEY = 'value') or known key patterns.
const patterns = [
  { name: 'Midtrans server key (literal)', re: /MIDTRANS_SERVER_KEY\s*=\s*['\"]Mid-server-[A-Za-z0-9_-]{8,}['\"]/g },
  { name: 'Midtrans client key (literal)', re: /MIDTRANS_CLIENT_KEY\s*=\s*['\"]Mid-client-[A-Za-z0-9_-]{8,}['\"]/g },
  { name: 'Midtrans server key raw', re: /Mid-server-[A-Za-z0-9_-]{8,}/g },
  { name: 'Midtrans client key raw', re: /Mid-client-[A-Za-z0-9_-]{8,}/g },
  { name: 'Aiven password (AVNS_)', re: /AVNS_[A-Za-z0-9_-]{6,}/g },
  { name: 'DB_PASS literal assignment', re: /DB_PASS\s*=\s*['\"][^'\"]{6,}['\"]/g }
];

function isBinary(filename) {
  const ext = path.extname(filename).toLowerCase();
  const textExt = ['.js', '.json', '.html', '.css', '.md', '.env', '.txt', '.sql', '.yml', '.yaml'];
  return !textExt.includes(ext);
}

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (SKIP_FILES.includes(path.basename(rel))) return null;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 1024 * 1024) return null; // skip large files
    if (isBinary(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const hits = [];
    for (const p of patterns) {
      const m = content.match(p.re);
      if (m && m.length) hits.push({ name: p.name, matches: m.slice(0,5) });
    }
    if (hits.length) return { file: rel, hits };
    return null;
  } catch (e) {
    return null;
  }
}

function walk(dir) {
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full);
    if (IGNORED_DIRS.some(d => rel.split(path.sep)[0] === d)) continue;
    if (name.startsWith('.')) {
      // allow dotfiles except .env
      if (SKIP_FILES.includes(name)) continue;
    }
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results.push(...walk(full));
      } else {
        const r = scanFile(full);
        if (r) results.push(r);
      }
    } catch (e) { /* ignore */ }
  }
  return results;
}

const findings = walk(ROOT).filter(Boolean);
if (findings.length) {
  console.error('Secret scan failed — potential secrets found:');
  for (const f of findings) {
    console.error(`\n- ${f.file}`);
    for (const h of f.hits) {
      console.error(`  * ${h.name}: ${h.matches.join(', ')}`);
    }
  }
  process.exitCode = 1;
  process.exit(1);
} else {
  console.log('Secret scan passed — no obvious secrets found.');
  process.exit(0);
}
