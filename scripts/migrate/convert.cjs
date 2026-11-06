#!/usr/bin/env node
/* 원본 3개(sapporo, gunsan, sydney) → trips/<slug>/trip.json 변환 (한 번 쓰는 이식 스크립트)
   실행: node scripts/migrate/convert.cjs
   필요: Playwright(Chromium). 클로드 클라우드 세션엔 기본으로 깔려 있음. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const ORIG = path.join(ROOT, '_originals');
const THEMES = require('../themes.json');
const LIB = fs.readFileSync(path.join(__dirname, 'dom-lib.js'), 'utf8');
const read = (p) => fs.readFileSync(path.join(ORIG, p), 'utf8');
const write = (slug, data) => {
  const dir = path.join(ROOT, 'trips', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'trip.json'), JSON.stringify(data, null, 1) + '\n');
  console.log('wrote trips/' + slug + '/trip.json', (JSON.stringify(data).length / 1024).toFixed(0) + 'KB');
};

async function withPage(html, tel, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { window.__TEL = t; }, tel || {});
  await page.addScriptTag({ content: LIB });
  const out = await page.evaluate(fn);
  await browser.close();
  return out;
}

/* =====================================================================
   삿포로
   ===================================================================== */
async function sapporo() {
  const idx = read('sapporo/index.html');
  const appjs = read('sapporo/app.js');
  const TEL = JSON.parse(/var TEL = (\{.*?\});/.exec(appjs)[1]);
  // 원본 로더처럼 part 를 끼워 넣은 한 장짜리 DOM 만들기
  let body = idx.slice(idx.indexOf('<body>') + 6, idx.indexOf('<script>window.SP_PARTS'));
  body = body.replace(/<div id="part-([\w]+)"><\/div>/g, (m, id) => read('sapporo/parts/' + id + '.html'));
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>';

  // 회화 데이터 (pb1, pb2)
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('sapporo/pb1.js').replace('window.D=[];', 'var D=[];window.D=D;'), ctx);
  vm.runInContext(read('sapporo/pb2.js'), ctx);
  const D = ctx.window.D;
  const RED = JSON.parse(/var RED=(\[.*?\]);/.exec(read('sapporo/pb3.js'))[1].replace(/'/g, '"'));

  const r = await withPage(html, TEL, () => {
    const C = window.CONV, $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.prototype.slice.call((el || document).querySelectorAll(s));
    const out = { warn: C.warn };

    /* 홈 */
    const home = $('#home');
    const hero = $('header.hero', home);
    out.title = C.inner($('h1', hero));
    out.when = C.inner($('.when', hero));
    out.flights = $$('.flight', hero).map(f => ({ k: C.inner($('.k', f)), v: C.inner($('.v', f)), s: C.inner($('.s', f)) }));
    const hb = [];
    C.kids(home).forEach(el => {
      if (el === hero) return;
      if (C.has(el, 'prep')) {
        hb.push({ type: 'prep', title: C.inner($('h2', el)), text: C.inner($('.prep-top p', el)), items: $$('li', el).map(li => { const i = $('input', li); const l = i.getAttribute('data-link'); return C.clean({ id: i.id, text: C.inner($('b', li)), link: l ? (/^p-/.test(l) ? 'pack:' : 'todo:') + l : undefined }); }) });
      } else if (C.has(el, 'now')) hb.push({ type: 'now' });
      else if (C.has(el, 'mapcard')) hb.push({ type: 'routemap', title: C.inner($('h2', el)), svg: $('svg', el).outerHTML, cap: C.inner($('.cap', el)) });
      else hb.push.apply(hb, C.blocks({ children: [el] }));
    });
    out.home = hb;

    /* 일정 */
    const picks = $$('#plan .daypick button');
    out.days = $$('#plan article.day').map((a, i) => C.day(a, picks[i]));

    /* 맛집 · 찜 */
    function eatLike(sec) {
      const top = [], groups = []; let g = null; let jump = null;
      C.kids(sec).forEach(el => {
        if (C.has(el, 'eatswitch')) return;
        if (C.has(el, 'jump')) { jump = $$('a', el).map(a => ({ text: C.inner(a), href: a.getAttribute('href') })); return; }
        if (C.has(el, 'group-label')) { g = C.clean({ id: el.id || undefined, title: C.inner(el), day: C.dayOf(el) }); g.items = []; groups.push(g); return; }
        if (g && C.has(el, 'grid2') && !g.blocks) { C.kids(el).forEach(c => g.items.push(C.card(c))); return; }
        if (g && C.has(el, 'wish-have')) { g.also = { label: C.inner($('.tag', el)), places: C.places($('.pls', el)) }; return; }
        if (g) { (g.blocks = g.blocks || []).push.apply(g.blocks, C.blocks({ children: [el] })); return; }
        top.push.apply(top, C.blocks({ children: [el] }));
      });
      // 바로가기 이름을 그룹 short 로
      (jump || []).forEach(j => { const gg = groups.find(x => '#' + x.id === j.href); if (gg && j.text !== gg.title) gg.short = j.text; });
      const auto = groups.filter(x => x.id).map(x => '#' + x.id).join();
      return { top, groups, jump: (jump && jump.map(j => j.href).join() !== auto) ? jump : undefined };
    }
    out.eat = eatLike($('#eat'));
    out.wish = eatLike($('#wish'));

    /* 회화 머리 */
    const talk = $('#talk');
    out.talk = {
      sign: { kicker: C.inner($('.pb-sign-k', talk)), title: C.inner($('.pb-sign h1', talk)), facts: $$('.pb-fact', talk).map(f => { const b = $('b', f); const k = f.firstChild.textContent.trim(); return { k, v: C.inner(b) }; }), legend: $$('.pb-legend span', talk).map(C.inner) },
      placeholder: $('#pb-q', talk).getAttribute('placeholder'),
      foot: C.inner($('.pb-foot', talk)),
      showHint: C.inner($('.pb-show-hint', talk))
    };

    /* 촬영 */
    const sh = $('#shoot');
    out.shoot = C.blocks(sh, { where: 'shoot' });

    /* 숙소 */
    const stay = $('#stay'); const stTop = [], stBlocks = []; let seen = false; let items = [];
    C.kids(stay).forEach(el => {
      if (C.has(el, 'back')) return;
      if (C.has(el, 'stays')) { seen = true; items = C.kids(el).map(a => { const c = { day: C.dayOf(a) }; C.kids(a).forEach(k => { if (C.has(k, 'rank')) c.label = C.inner(k); else if (k.tagName === 'H3') c.title = C.inner(k); else if (C.has(k, 'pl')) c.place = C.place(k); else if (C.has(k, 'price')) { const sm = $('small', k); c.priceNote = sm ? C.inner(sm) : undefined; if (sm) sm.remove(); c.price = C.inner(k); } else if (k.tagName === 'UL') c.facts = C.kids(k).map(C.inner); else if (C.has(k, 'tags')) c.tags = C.tags(k); else c.html = (c.html || '') + k.outerHTML; }); return C.clean(c); }); return; }
      (seen ? stBlocks : stTop).push.apply(seen ? stBlocks : stTop, C.blocks({ children: [el] }));
    });
    out.stay = { top: stTop, items, blocks: stBlocks };

    /* 체크리스트 */
    function list(sec) {
      const top = [], blocks = [], groups = []; let head = null; let phase = 0;
      C.kids(sec).forEach(el => {
        if (C.has(el, 'back') || C.has(el, 'reset')) { if (C.has(el, 'reset')) phase = 2; return; }
        if (C.has(el, 'sec-head') && $('.progress', el)) { head = C.clean({ title: C.inner($('h2', el)), text: $('p', el) ? C.inner($('p', el)) : undefined }); phase = 1; return; }
        if (C.isCheckGroup(el)) { groups.push(C.checkGroup(el)); phase = 1; return; }
        (phase === 0 ? top : blocks).push.apply(phase === 0 ? top : blocks, C.blocks({ children: [el] }));
      });
      return C.clean({ top, head, groups, blocks });
    }
    out.todo = list($('#todo'));
    out.pack = list($('#pack'));

    /* 이동 (렌트 + 택시), 돈, 비상 */
    out.car = C.blocks($('#car'), { where: 'car' });
    out.taxi = C.blocks($('#taxi'), { where: 'taxi' });
    out.money = C.blocks($('#money'), { where: 'money' });
    const sos = $('#sos'); const sosTop = [], sosBlocks = []; let contacts = null;
    C.kids(sos).forEach(el => { if (C.has(el, 'back')) return; if (!contacts && C.has(el, 'contacts')) { contacts = C.contacts(el).items; return; } (contacts ? sosBlocks : sosTop).push.apply(contacts ? sosBlocks : sosTop, C.blocks({ children: [el] })); });
    out.sos = { top: sosTop, contacts, blocks: sosBlocks };

    /* 더보기 메뉴 설명 */
    out.more = { head: { title: C.inner($('#more .sec-head h2')), text: C.inner($('#more .sec-head p')) }, menu: $$('#more .menu button').map(b => ({ go: b.getAttribute('data-go'), t: C.inner($('.tt', b)), d: C.inner($('.ds', b)) })) };
    /* 맛집 머리 */
    return out;
  });

  r.warn.forEach(w => console.warn('  [sapporo]', w));
  const menu = Object.fromEntries(r.more.menu.map(m => [m.go, m]));
  const talkCats = D.map(c => ({
    id: c.id, group: c.g, title: c.t, chip: c.c, note: c.n,
    phrases: c.s.trim().split('\n').filter(l => l.trim()).map(l => { const p = l.split('|'); const o = { mean: (p[0] || '').trim(), ja: (p[1] || '').trim(), ko: (p[2] || '').trim() }; if ((p[3] || '').trim()) o.tip = p[3].trim(); return o; })
  }));

  const trip = {
    schema: 1,
    slug: 'sapporo',
    title: '삿포로 3박 4일',
    subtitle: r.when,
    summary: '렌터카로 도는 홋카이도 단풍 여행 · 시코쓰호, 조잔케이 료칸, 오타루, 삿포로',
    region: '일본 홋카이도',
    country: 'JP',
    start: r.days[0].date,
    end: r.days[r.days.length - 1].date,
    tz: '+09:00',
    companions: ['여친'],
    local: { lang: 'ja', voice: 'ja-JP', label: '일본어' },
    currency: { code: 'JPY', unit: '엔', krw: 9.4 },
    telNavi: true,
    cover: { colors: ['#B83A2B', '#21607A'], glyph: '札幌' },
    theme: THEMES.sapporo,
    sections: {
      home: { hero: { title: r.title, when: r.when, flights: r.flights }, blocks: r.home },
      plan: { days: r.days },
      eat: { switchLabel: '동선 따라', top: r.eat.top, groups: r.eat.groups, jump: r.eat.jump },
      wish: { title: '찜 목록', switchLabel: '찜 목록', top: r.wish.top, groups: r.wish.groups, jump: r.wish.jump },
      talk: Object.assign({ title: '회화', red: RED, redCategory: 'sign', voice: 'ja-JP' }, r.talk, { categories: talkCats }),
      shoot: { title: '촬영', blocks: r.shoot },
      stay: { title: menu.stay.t, desc: menu.stay.d, top: r.stay.top, items: r.stay.items, blocks: r.stay.blocks },
      todo: Object.assign({ title: menu.todo.t, desc: menu.todo.d }, r.todo),
      pack: Object.assign({ title: menu.pack.t, desc: menu.pack.d }, r.pack),
      move: {
        title: '렌트·택시', desc: menu.car.t + ' (' + menu.car.d + ') · ' + menu.taxi.t + ' (' + menu.taxi.d + ')',
        top: [{ type: 'jump', items: [{ text: menu.car.t, href: '#mv-car' }, { text: menu.taxi.t, href: '#mv-taxi' }] }],
        blocks: [{ type: 'head', id: 'mv-car', title: menu.car.t, text: menu.car.d }].concat(r.car, [{ type: 'head', id: 'mv-taxi', title: menu.taxi.t, text: menu.taxi.d }], r.taxi)
      },
      money: { title: menu.money.t, desc: menu.money.d + ' · 가계부', ledger: { budget: 220000, categories: ['식비', '교통·주유', '주차·통행료', '숙소·세금', '쇼핑', '관광', '기타'] }, blocks: r.money },
      sos: { title: menu.sos.t, desc: menu.sos.d, top: r.sos.top, contacts: r.sos.contacts, blocks: r.sos.blocks }
    },
    nav: ['home', 'plan', 'eat', 'talk', 'shoot', 'more'],
    more: { head: r.more.head }
  };
  write('sapporo', trip);
}

/* =====================================================================
   군산 — 원본이 이미 JS 데이터라 그대로 옮김
   ===================================================================== */
async function gunsan() {
  const src = read('gunsan/index.html');
  const script = /<script>([\s\S]*?)<\/script>/.exec(src.slice(src.indexOf('<body>')))[1];
  const dataPart = script.slice(script.indexOf('const G ='), script.indexOf('/* ---------- state'));
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(dataPart.replace(/\bconst\b/g, 'var'), ctx);
  const { DAYS, STUCK, CALLS, PACK } = ctx;
  const heroSvg = /<svg class="hero-art"[\s\S]*?<\/svg>/.exec(src)[0];
  const footer = /<footer>([\s\S]*?)<\/footer>/.exec(src)[1].trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pl = (p, rank) => { const o = { name: esc(p.n) }; if (rank || p.r) o.rank = rank || p.r; if (p.q) o.q = p.q; if (p.d) o.info = esc(p.d); return o; };
  const days = [['thu', '2026-10-08', '원도심', '#B83A2B'], ['fri', '2026-10-09', '섬', '#21607A']].map(([k, date, label]) => {
    const D = DAYS[k];
    return {
      date, label, pick: D.name.slice(0, 1) + ' ' + date.slice(8).replace(/^0/, ''), title: D.title, summary: esc(D.lede),
      stamp: { top: k === 'thu' ? '1일차' : '2일차', place: k === 'thu' ? '원도심' : '장자도' },
      facts: D.facts,
      items: D.stops.map(s => {
        const it = { id: s.id, time: s.t, title: esc(s.title) };
        if (s.meta) it.sub = esc(s.meta);
        if (s.key) it.key = true;
        if (s.addr) it.addr = { name: esc(s.addr.n), q: s.addr.q };
        const det = [];
        if (s.park) det.push({ label: '주차', kind: 'park', places: s.park.map(p => pl(p, p.r)) });
        if (s.stopsOnWay) det.push({ label: '가는 길에 들를 곳 · 1~2곳만', places: s.stopsOnWay.map(p => pl(p)) });
        if (s.dinner) det.push({ label: '저녁 후보 · 주차 편한 곳', places: s.dinner.map(p => pl(p)) });
        if (s.notes) det.push({ label: '메모', list: s.notes.map(esc) });
        if (s.tel) { det.push({ label: '전화', places: [{ name: s.tel, tel: s.tel }] }); it.tel = s.tel; }
        if (s.alts) det.push({ label: s.id === 't6' ? '안 되면 여기로' : '대안', places: s.alts.map(p => pl(p)) });
        if (det.length) it.details = det;
        if (s.alt) it.alt = s.alt;
        return it;
      })
    };
  });
  const trip = {
    schema: 1,
    slug: 'gunsan',
    title: '군산 1박 2일',
    subtitle: '원도심 골목에서 장자도 노을까지',
    summary: '원도심 골목에서 장자도 노을까지 · 10/8~10/9',
    region: '전북 군산',
    country: 'KR',
    start: '2026-10-08',
    end: '2026-10-09',
    tz: '+09:00',
    companions: ['여친'],
    cover: { colors: ['#C2562F', '#1F5E73'], glyph: '군산' },
    theme: THEMES.gunsan,
    footer: esc(footer),
    sections: {
      home: {
        hero: { title: '군산 1박 2일', when: '2026. 10. 8 THU – 10. 9 FRI · 원도심 골목에서 장자도 노을까지' },
        blocks: [{ type: 'html', html: '<div class="hero-art-wrap">' + heroSvg + '</div>' }, { type: 'now' }, { type: 'stamps' }, { type: 'cap', text: esc(footer) }]
      },
      plan: { checkable: true, days },
      planb: { title: '대안', navLabel: '대안', desc: '막힐 때 바꿀 것 ' + STUCK.length + '가지', head: { title: '막힐 때', text: '현장에서 일정이 꼬이면 여기서 바로 바꾸기.' }, listTitle: '상황별로 바꿀 것', items: STUCK.map(([a, b]) => ({ if: esc(a), then: esc(b) })) },
      move: { title: '주차', desc: '구간별 주차 총정리', top: [{ type: 'head', title: '주차 총정리', text: '구간마다 한 곳에 세우고 걷기. 섬은 입구 요금표대로 내고 영수증은 챙기기.' }], blocks: [{ type: 'parking' }] },
      todo: { title: '출발 전 체크', navLabel: '체크', desc: '전화로 영업 확인', head: { title: '출발 전 체크', text: '연휴라 영업시간이 바뀔 수 있어. 전화로 한 번씩 확인.' }, groups: [{ title: '전화 확인', items: CALLS.map(([id, t, tel]) => tel ? { id, text: esc(t), tel } : { id, text: esc(t) }) }] },
      pack: { title: '챙길 것', desc: '짐 ' + PACK.length + '개', head: { title: '챙길 것' }, groups: [{ title: '챙길 것', items: PACK.map(([id, t]) => ({ id, text: esc(t) })) }] }
    },
    nav: ['home', 'plan', 'planb', 'todo', 'more']
  };
  write('gunsan', trip);
}

/* =====================================================================
   시드니 — HTML 탭 3개 → 템플릿 섹션으로 나눠 담기
   ===================================================================== */
async function sydney() {
  const src = read('sydney/index.html');
  const body = src.slice(src.indexOf('<body>') + 6, src.indexOf('<script>'));
  const checkItems = JSON.parse('[' + /const checkItems = \[([\s\S]*?)\];/.exec(src)[1].trim().replace(/,\s*$/, '') + ']');
  const r = await withPage('<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>', {}, () => {
    const C = window.CONV, $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.prototype.slice.call((el || document).querySelectorAll(s));
    const tone = (el) => C.has(el, 'alert-warn') ? 'warn' : C.has(el, 'alert-error') ? 'error' : C.has(el, 'alert-info') ? 'info' : C.has(el, 'info-green') ? 'ok' : C.has(el, 'info-yellow') ? 'warn' : C.has(el, 'info-purple') ? 'info' : '';
    const nl = (s) => s.replace(/\n/g, '<br>');
    const out = {};
    out.header = { sub: C.inner($('.header .sub')), title: C.inner($('.header h1')), info: C.inner($('.header .info')) };
    out.days = $$('#tab-itinerary .day-card').map(card => {
      const h = $('.day-head', card);
      return {
        color: h.getAttribute('data-color') || '#2563eb', num: C.inner($('.day-num', h)), date: C.inner($('.day-date', h)), title: C.inner($('.day-title', h)),
        alerts: $$('.day-body > .alert', card).map(a => ({ tone: tone(a), text: nl(C.inner(a)) })),
        items: $$('.day-body > .block', card).map(b => {
          const t = $('.block-title', b); const tag = $('.food-tag', t); let badge; if (tag) { badge = C.inner(tag); tag.remove(); }
          const d = $('.block-desc', b);
          return C.clean({ time: C.inner($('.block-time .t', b)), dur: $('.block-time .d', b) ? C.inner($('.block-time .d', b)) : undefined, icon: C.inner($('.block-icon', b)), title: C.inner(t), badge, note: d ? nl(C.inner(d)) : undefined });
        })
      };
    });
    // 검토 탭
    const rv = $('#tab-review'); const review = []; let cur = null;
    C.kids(rv).forEach(el => {
      if (C.has(el, 'section-title')) { cur = { title: C.inner(el), items: [] }; review.push(cur); return; }
      if (C.has(el, 'alert') || C.has(el, 'info-box')) cur.items.push({ kind: 'alert', tone: tone(el), text: nl(C.inner(el)) });
      else if (C.has(el, 'ev-row')) cur.items.push({ kind: 'ev', k: C.inner($('.ev-when', el)), v: C.inner($('.ev-action', el)) });
      else cur.items.push({ kind: 'html', html: el.outerHTML });
    });
    out.review = review;
    // 준비물 탭
    const es = $('#tab-essentials'); const ess = []; cur = null;
    C.kids(es).forEach(el => {
      if (C.has(el, 'section-title')) { cur = { title: C.inner(el), items: [] }; ess.push(cur); return; }
      if (C.has(el, 'app-group')) cur.items.push({ kind: 'apps', label: C.inner($('.app-cat', el)), items: $$('.app-tag', el).map(C.inner) });
      else if (C.has(el, 'hl-row')) { const n = $('.hl-num', el); n.remove(); cur.items.push({ kind: 'hl', text: C.inner(el) }); }
      else if (C.has(el, 'info-box')) cur.items.push({ kind: 'alert', tone: tone(el), text: nl(C.inner(el)) });
      else if (el.id === 'checklist') cur.items.push({ kind: 'checklist' });
      else cur.items.push({ kind: 'html', html: el.outerHTML });
    });
    out.ess = ess;
    out.footer = C.inner($('.footer'));
    return out;
  });

  const dates = ['2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26', '2026-04-27', '2026-04-28'];
  const labels = ['도착', '동물원', 'ANZAC', '드라이브', '하이랜즈', '귀국'];
  const days = r.days.map((d, i) => ({
    date: dates[i], label: labels[i], title: d.title, color: d.color,
    stamp: { top: 'DAY ' + (i + 1), place: d.num + '日'.replace('日', ''), small: false },
    alerts: d.alerts.map(a => ({ tone: a.tone, text: a.text })),
    items: d.items.map(it => { const o = { time: it.time, title: it.title }; if (it.dur) o.dur = it.dur; if (it.icon) o.icon = it.icon; if (it.badge) { o.badge = it.badge; o.badgeTone = 'food'; } if (it.note) o.note = it.note; return o; })
  }));
  days.forEach((d, i) => { d.stamp = { top: 'DAY ' + (i + 1), place: labels[i] }; });
  const sec = (title) => r.review.find(x => x.title.indexOf(title) > -1) || r.ess.find(x => x.title.indexOf(title) > -1);
  const alertsToNotes = (s) => s.items.filter(x => x.kind === 'alert').map(a => ({ type: 'note', tone: a.tone, text: a.text }));
  const review = sec('최종 검토'), card = sec('카드결제'), ev = sec('EV 충전'), park = sec('주차 참고'), anzac = sec('ANZAC'), apps = sec('필수 앱'), check = sec('체크리스트'), hl = sec('커플 하이라이트'), sos = sec('비상 연락처');
  const trip = {
    schema: 1,
    slug: 'sydney',
    title: '시드니 6일',
    subtitle: r.header.info,
    summary: '하버브리지 드라이브, 본다이, 그랜드 퍼시픽 드라이브 → Scribbly Farm 글램핑',
    region: '호주 시드니',
    country: 'AU',
    start: dates[0],
    end: dates[5],
    tz: '+10:00',
    companions: ['여친'],
    currency: { code: 'AUD', unit: '호주달러', krw: 920 },
    cover: { colors: ['#2563EB', '#D97706'], glyph: 'SYD' },
    theme: THEMES.sydney,
    footer: r.footer,
    sections: {
      home: {
        hero: { title: r.header.title, when: r.header.sub + ' · ' + r.header.info },
        blocks: [
          { type: 'now' }, { type: 'stamps' },
          { type: 'callout', title: review.title.replace(/^[^\p{L}\p{N}]+/u, ''), html: review.items.map(a => '<div class="note mini ' + a.tone + '"><p>' + a.text + '</p></div>').join('') },
          { type: 'ranked', title: hl.title, items: hl.items.map(x => x.text) },
          { type: 'head', title: anzac.title }
        ].concat(alertsToNotes(anzac))
      },
      plan: { days },
      todo: {
        title: '준비물·할 일', navLabel: '준비', desc: '필수 앱 · 체크리스트',
        head: { title: check.title.replace(/^[^\p{L}\p{N}]+/u, ''), text: '체크하면 이 폰에 저장돼.' },
        groups: [{ title: '출발 전 확인', items: checkItems.map((t, i) => ({ id: 'c' + i, text: t })) }],
        blocks: [{ type: 'head', title: apps.title }, { type: 'chips', groups: apps.items.filter(x => x.kind === 'apps').map(a => ({ label: a.label, items: a.items })) }]
      },
      move: {
        title: '렌트·EV·주차', desc: 'Polestar 2 충전 체크포인트 · 주차 앱',
        blocks: [{ type: 'head', title: ev.title }, { type: 'rows', items: ev.items.filter(x => x.kind === 'ev').map(x => ({ k: x.k, v: x.v })) }, { type: 'head', title: park.title }].concat(alertsToNotes(park))
      },
      money: { title: '돈·카드', navLabel: '돈', desc: '카드결제 안내 · 가계부', ledger: { categories: ['식비', '교통·충전', '주차', '숙소', '쇼핑', '관광', '기타'] }, blocks: [{ type: 'head', title: card.title }].concat(alertsToNotes(card)) },
      sos: { title: '비상 연락처', desc: '000 · 한국 대사관', top: [{ type: 'head', title: sos.title }], contacts: [{ who: '호주 비상번호', what: '경찰 / 소방 / 구급', tel: '000' }, { who: '한국 대사관', what: '주호주 대한민국 대사관 (캔버라)', tel: '+61-2-6270-4100' }], blocks: alertsToNotes(sos).map(n => Object.assign(n, { title: '원문 메모' })) }
    },
    nav: ['home', 'plan', 'todo', 'money', 'more']
  };
  write('sydney', trip);
}

(async () => {
  const which = process.argv.slice(2);
  const all = { sapporo, gunsan, sydney };
  for (const k of Object.keys(all)) if (!which.length || which.includes(k)) await all[k]();
})().catch(e => { console.error(e); process.exit(1); });
