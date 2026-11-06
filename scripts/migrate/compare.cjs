#!/usr/bin/env node
/* 원본 사이트 vs 새 허브 텍스트 대조 → scripts/migrate/report.md
   원본(_originals/<slug>)을 실제 브라우저로 띄워서 보이는 글자 조각을 전부 뽑고,
   새 화면(/<slug>)에 같은 글자가 있는지 확인. (숨김 탭 포함)
   실행: node scripts/serve.mjs 4173 & node scripts/migrate/compare.cjs */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const NEW = process.env.BASE || 'http://localhost:4173';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function serveDir(dir, port) {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(port, () => ok(s));
  });
}

const norm = (s) => s.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

async function texts(page, sel) {
  return page.evaluate((sel) => {
    const out = [];
    const root = document.querySelector(sel) || document.body;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => { const p = n.parentElement; if (!p || p.closest('script,style,noscript,title')) return NodeFilter.FILTER_REJECT; return n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    let n; while ((n = w.nextNode())) out.push(n.textContent);
    // 속성 속 의미 있는 값(복사용 텍스트, 링크)도 비교
    root.querySelectorAll('[data-copy]').forEach((e) => out.push('〔copy〕' + e.getAttribute('data-copy')));
    root.querySelectorAll('a[href^="http"]').forEach((e) => out.push('〔link〕' + e.getAttribute('href')));
    root.querySelectorAll('a[href^="tel:"]').forEach((e) => out.push('〔tel〕' + e.getAttribute('href')));
    return out;
  }, sel);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const report = ['# 원본 대비 대조 결과', '', '원본 화면(숨은 탭 포함)의 글자 조각·복사 버튼 값·링크·전화번호를 전부 뽑아서 새 화면에 그대로 있는지 확인한 결과야.', ''];
  const servers = [];
  let port = 4301;
  for (const slug of ['sapporo', 'gunsan', 'sydney']) {
    const srv = await serveDir(path.join(ROOT, '_originals', slug), port); servers.push(srv);
    await page.goto('http://localhost:' + port + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    // 원본 가운데 '지금/다음' 같은 시간 따라 바뀌는 글자는 제외
    let orig = await texts(page, 'body');
    port++;
    await page.goto(NEW + '/' + slug, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const neu = await texts(page, 'body');
    const hay = norm(neu.join('\n'));
    const missing = [];
    const seen = new Set();
    for (const raw of orig) {
      const t = norm(raw);
      if (!t || seen.has(t)) continue; seen.add(t);
      if (hay.indexOf(t) > -1) continue;
      missing.push(t);
    }
    report.push('## ' + slug, '', '- 원본 조각 ' + seen.size + '개 중 새 화면에 그대로 없는 것 ' + missing.length + '개', '');
    missing.forEach((m) => report.push('  - `' + m.replace(/`/g, "'").slice(0, 160) + '`'));
    report.push('');
    console.log(slug, seen.size, 'segments,', missing.length, 'not found verbatim');
  }
  servers.forEach((s) => s.close());
  await b.close();
  const notes = path.join(__dirname, 'notes.md');
  if (fs.existsSync(notes)) report.push('', fs.readFileSync(notes, 'utf8'));
  fs.writeFileSync(path.join(__dirname, 'report.md'), report.join('\n') + '\n');
  console.log('→ scripts/migrate/report.md');
})().catch((e) => { console.error(e); process.exit(1); });
