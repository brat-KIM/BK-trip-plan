/* 모바일(갤럭시 폭 360px) 화면 점검: 허브 + 여행별 모든 탭을 열어서 콘솔 에러·깨진 링크/이미지·가로 넘침·중복 id 확인
   node scripts/serve.mjs 4173 &  →  node scripts/check.cjs [slug,slug]   (BASE=https://bk-trip-plan.vercel.app 로 실사이트도 가능, SHOTS=1 이면 스크린샷 저장, OUT=폴더) */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = (process.env.OUT || require('os').tmpdir()) + '/';
const slugs = (process.argv[2] || require('../trips.json').trips.map(t => t.slug).join(',')).split(',');
const shots = process.env.SHOTS === '1';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ko-KR', colorScheme: process.env.DARK ? 'dark' : 'light' });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!/fonts\.g/.test(r.url())) errs.push('reqfail: ' + r.url() + ' ' + (r.failure() || {}).errorText); });
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) errs.push('http ' + r.status() + ': ' + r.url()); });
  // hub
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  if (shots) await page.screenshot({ path: OUT + 'hub.png', fullPage: true });
  console.log('hub cards:', await page.$$eval('.tcard', a => a.map(x => x.getAttribute('href') + ' ' + x.querySelector('h3').textContent)));
  for (const slug of slugs) {
    await page.goto(BASE + '/' + slug, { waitUntil: 'networkidle' });
    const ids = await page.$$eval('#app > section.panel', s => s.map(x => x.id));
    const nav = await page.$$eval('#nav [data-go]', s => s.map(x => x.getAttribute('data-go') + ':' + x.textContent.trim()));
    console.log(slug, 'panels:', ids.join(','), '| nav:', nav.join(' '));
    for (const id of ids) {
      await page.evaluate(id => { location.hash = id; }, id);
      await page.waitForTimeout(80);
      const vis = await page.$eval('#' + id, el => !el.hidden);
      if (!vis) errs.push(slug + ' panel not shown: ' + id);
      // horizontal overflow check
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ov > 1) errs.push(slug + '#' + id + ' horizontal overflow ' + ov + 'px');
      if (shots) await page.screenshot({ path: OUT + slug + '-' + id + '.png', fullPage: true });
    }
    // broken internal anchors / data-go targets
    const bad = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('a[href^="#"]').forEach(a => { const h = a.getAttribute('href').slice(1); if (h && !document.getElementById(h)) out.push('anchor #' + h); });
      document.querySelectorAll('[data-go]').forEach(a => { const h = a.getAttribute('data-go'); if (!document.getElementById(h)) out.push('data-go ' + h); });
      document.querySelectorAll('[data-jump]').forEach(a => { const h = a.getAttribute('data-jump'); if (!document.getElementById(h)) out.push('data-jump ' + h); });
      document.querySelectorAll('img').forEach(i => { if (!i.complete || !i.naturalWidth) out.push('img ' + i.src); });
      const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; });
      Object.keys(ids).forEach(k => { if (ids[k] > 1) out.push('dup id ' + k + ' x' + ids[k]); });
      return out;
    });
    bad.forEach(x => errs.push(slug + ' ' + x));
  }
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
  await b.close();
})();
