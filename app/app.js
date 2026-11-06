/* =====================================================================
   BK Trip 공통 렌더러
   - 모든 여행이 이 파일 하나를 같이 써.
   - 주소 /<slug> 로 들어오면 /trips/<slug>/trip.json 을 읽어서 화면을 그림.
   - trip.json 에 있는 섹션만 탭으로 보여줌. 필드 설명은 /trips/_schema.md
   - 내가 입력하는 값(체크, 가계부, 즐겨찾기)은 localStorage "trip:<slug>:<항목>"
   ===================================================================== */
(function () {
  'use strict';

  var SLUG = decodeURIComponent((location.pathname.split('/').filter(Boolean)[0] || '')).toLowerCase();
  var ROOT = document.getElementById('app');
  var NAV = document.getElementById('nav');
  var T = null;           // trip.json
  var BASE = '/trips/' + SLUG + '/';

  /* ---------- 저장소 ---------- */
  function key(k) { return 'trip:' + SLUG + ':' + k; }
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(key(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) {} }
  };
  var G = { // 여행 공통 설정 (테마 등)
    get: function (k, d) { try { var v = localStorage.getItem('bk:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('bk:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- 작은 도구들 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arr(x) { return Array.isArray(x) ? x : (x == null ? [] : [x]); }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function pad(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : null; }
  function idA(o) { return o && o.id ? ' id="' + esc(o.id) + '"' : ''; }
  function dc(n) { return n ? ' d' + n : ''; }
  function cl(c) { return c ? ' ' + c : ''; }
  function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, ''); }
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function parseDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? { y: +m[1], m: +m[2], d: +m[3], wd: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() } : null; }
  function tzOffsetMin() { var m = /^([+-])(\d{2}):?(\d{2})$/.exec(T.tz || '+09:00'); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : 540; }
  function localToday() { var t = new Date(Date.now() + tzOffsetMin() * 60000); return t.toISOString().slice(0, 10); }
  function dayDiff(a, b) { return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000); }
  function dayName(date) { var p = parseDate(date); return p ? p.m + '월 ' + p.d + '일 ' + WD[p.wd] + '요일' : ''; }
  function isKR() { return String(T.country || '').toUpperCase() === 'KR'; }

  /* ---------- 토스트 ---------- */
  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }
  function copyText(text, done, fail) {
    function fb() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); ok ? done && done() : fail && fail();
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done && done(); }, fb); else fb(); } catch (e) { fb(); }
  }

  /* =====================================================================
     현지어 텍스트: "문자열" 또는 { "ja": "原文", "ko": "읽는법/뜻" }
     ===================================================================== */
  function origKey(o) { for (var k in o) if (k !== 'ko' && k !== 'info' && typeof o[k] === 'string') return k; return null; }
  function lt(x) {
    if (x == null) return '';
    if (typeof x !== 'object') return String(x);
    var k = origKey(x);
    if (!k) return x.ko || '';
    return '<span lang="' + k + '">' + x[k] + '</span>' + (x.ko ? '(' + x.ko + ')' : '');
  }

  /* =====================================================================
     장소: { name, info, q, addr, map:{google,naver}, tel, rank }
     ===================================================================== */
  function placeQuery(p) {
    if (p.q) return p.q; if (p.addr) return p.addr;
    var n = p.name; if (n && typeof n === 'object') { var k = origKey(n); return k ? n[k] : n.ko; }
    return stripTags(n || '');
  }
  function mapUrl(p) {
    var m = p.map;
    if (typeof m === 'string') return m;
    if (m) { if (isKR() && m.naver) return m.naver; if (m.google) return m.google; if (m.naver) return m.naver; }
    var q = placeQuery(p); if (!q) return null;
    return isKR() ? 'https://map.naver.com/p/search/' + encodeURIComponent(q) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  function callOnly(t) { return /^(0120|0800|0570|050|070|080|090)/.test(t); }
  function telHref(t) { var s = String(t).trim(); return 'tel:' + (s[0] === '+' ? '+' : '') + s.replace(/[^0-9#*]/g, ''); }
  function placeChip(p, wide) {
    if (typeof p === 'string') p = { name: p };
    var n = p.name, b, sub = [];
    if (n && typeof n === 'object') {
      var k = origKey(n);
      b = '<b' + (k ? ' lang="' + k + '"' : '') + '>' + (k ? n[k] : (n.ko || '')) + '</b>';
      if (k && n.ko) sub.push(n.ko);
    } else b = '<b>' + (n || '') + '</b>';
    if (p.info) sub.push(p.info);
    var href = mapUrl(p), tel = '', at = '';
    if (p.tel) {
      var x = callOnly(p.tel), navi = !!T.telNavi && !x;
      at = ' data-tel="' + esc(p.tel) + '"' + (navi ? '' : ' data-telx="1"');
      tel = '<i class="tel' + (navi ? '' : ' x') + '"><em>' + (navi ? '내비' : '전화') + '</em>' + esc(p.tel) + '</i>';
    }
    return '<a class="pl' + (wide ? ' wide' : '') + '"' + (href ? ' href="' + esc(href) + '" target="_blank" rel="noopener"' : '') + at + '>' + b + (sub.length ? '<span>' + sub.join(' · ') + '</span>' : '') + tel + '</a>';
  }
  /* 국내(T맵) 스타일 장소 줄 */
  var IS_ANDROID = /Android/i.test(navigator.userAgent);
  function tmapHref(q) {
    return IS_ANDROID
      ? 'intent://search?name=' + encodeURIComponent(q) + '#Intent;scheme=tmap;package=com.skt.tmap.ku;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=' + encodeURIComponent('https://play.google.com/store/apps/details?id=com.skt.tmap.ku') + ';end'
      : 'tmap://search?name=' + encodeURIComponent(q);
  }
  var IC = {
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.8"/><path d="M10.5 5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8A1.3 1.3 0 0 0 2.5 3.8v5.4a1.3 1.3 0 0 0 1.3 1.3H5"/></svg>',
    nav: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14.2 1.8 1.9 6.9c-.6.2-.5 1.1.1 1.2l5 1 1 5c.1.6 1 .7 1.2.1l5.1-12.3c.2-.4-.2-.8-.6-.6z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 7l4.5 4.5L13.5 7"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    more: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
  };
  function actCopy(text, label, name) { return '<button class="act" type="button" data-copy="' + esc(text) + '"' + (name ? ' data-name="' + esc(name) + '"' : '') + '>' + IC.copy + (label || '복사') + '</button>'; }
  function actTmap(q, name) { return '<a class="act tmap" href="' + esc(tmapHref(q)) + '" data-tmap="' + esc(q) + '" aria-label="' + esc(name || q) + ' T맵으로 열기">' + IC.nav + 'T맵</a>'; }
  function actMap(p) { var u = mapUrl(p); return u ? '<a class="act" href="' + esc(u) + '" target="_blank" rel="noopener">' + IC.pin.replace('stroke-width="2"', 'stroke-width="2.2"') + '지도</a>' : ''; }
  function placeRow(p) {
    if (typeof p === 'string') p = { name: p };
    var nm = (p.name && typeof p.name === 'object') ? lt(p.name) : (p.name || '');
    var rank = p.rank ? '<span class="rank' + (/대안|plan ?b/i.test(p.rank) ? ' r-alt' : '') + '">' + esc(p.rank) + '</span>' : '';
    var q = p.q || p.addr;
    var sub = p.info || (q && q !== stripTags(nm) ? q : '');
    var btns = '';
    if (q) btns = '<div class="btns">' + (isKR() ? actTmap(q, stripTags(nm)) : actMap(p)) + actCopy(q, '복사', stripTags(nm)) + '</div>';
    else if (p.tel) btns = '<div class="btns">' + actCopy(p.tel, '복사') + '</div>';
    return '<div class="place"><div class="pt"><div class="pn">' + rank + nm + '</div>' + (sub ? '<div class="pq">' + sub + '</div>' : '') + (p.tel && q ? '<div class="pq"><a href="' + telHref(p.tel) + '">' + esc(p.tel) + '</a></div>' : '') + '</div>' + btns + '</div>';
  }

  /* ---------- 태그: "ok:추천" 또는 {text, tone} ---------- */
  function tagsHTML(tags, wrap) {
    tags = arr(tags); if (!tags.length) return '';
    var s = tags.map(function (t) {
      var text = t, tone = '';
      if (typeof t === 'object') { if (t.html) return t.html; text = t.text; tone = t.tone || ''; }
      else { var m = /^(ok|car|warn|stay|food|info|alt):(.*)$/.exec(t); if (m) { tone = m[1]; text = m[2]; } }
      return '<span class="tag' + cl(tone) + '">' + text + '</span>';
    }).join('');
    return wrap === false ? s : '<div class="tags">' + s + '</div>';
  }

  /* =====================================================================
     블록 — 모든 섹션에서 같이 쓰는 내용 조각
     ===================================================================== */
  function li(x) { return '<li>' + (typeof x === 'object' && x ? (x.title ? '<b>' + x.title + '</b> ' : '') + (x.text || '') : x) + '</li>'; }
  function listHTML(items, ordered) { var t = ordered ? 'ol' : 'ul'; return '<' + t + '>' + arr(items).map(li).join('') + '</' + t + '>'; }
  function bodyHTML(b) {
    var s = '';
    if (b.text) s += '<p>' + b.text + '</p>';
    if (b.paras) s += arr(b.paras).map(function (p) { return '<p>' + p + '</p>'; }).join('');
    if (b.items && b.type !== 'cards') s += listHTML(b.items, b.ordered);
    if (b.html) s += b.html;
    return s;
  }
  function cardHTML(c) {
    if (c.type && c.type !== 'card') return block(c);
    return '<div class="card' + dc(c.day) + '"' + idA(c) + '>' +
      (c.label ? '<div class="when">' + c.label + '</div>' : '') +
      (c.title ? '<h3>' + c.title + '</h3>' : '') +
      (c.place ? placeChip(c.place, true) : '') +
      (c.hours ? '<div class="hrs">' + c.hours + '</div>' : '') +
      bodyHTML(c) +
      (c.memo ? '<p class="memo">' + c.memo + '</p>' : '') +
      tagsHTML(c.tags) + '</div>';
  }
  var B = {
    head: function (b) { return '<div class="sec-head"' + idA(b) + '>' + (b.title ? '<h2>' + b.title + '</h2>' : '') + (b.text ? '<p>' + b.text + '</p>' : '') + (b.html || '') + '</div>'; },
    sub: function (b) { return '<h3 class="subhead"' + idA(b) + '>' + b.title + '</h3>' + (b.text ? '<p class="cap">' + b.text + '</p>' : ''); },
    text: function (b) { return '<p class="prose"' + idA(b) + '>' + b.text + '</p>'; },
    cap: function (b) { return '<p class="cap">' + b.text + '</p>'; },
    swipe: function () { return '<p class="swipe">표가 넓으면 옆으로 밀어서 봐.</p>'; },
    html: function (b) { return b.html || ''; },
    callout: function (b) { return '<div class="answer' + cl(b.tone) + dc(b.day) + '"' + idA(b) + '>' + (b.title ? '<strong>' + b.title + '</strong>' : '') + bodyHTML(b) + '</div>'; },
    note: function (b) { return '<div class="note' + cl(b.tone) + '"' + idA(b) + '>' + (b.title ? '<h3>' + b.title + '</h3>' : '') + bodyHTML(b) + '</div>'; },
    grid: function (b) { return '<div class="grid2' + dc(b.day) + '"' + idA(b) + '>' + arr(b.items).map(function (n) { return n.type ? block(n) : B.note(n); }).join('') + '</div>'; },
    cards: function (b) { return '<div class="grid2' + dc(b.day) + '"' + idA(b) + '>' + arr(b.items).map(cardHTML).join('') + '</div>'; },
    card: function (b) { return cardHTML(b); },
    group: function (b) { return '<div class="group-label' + dc(b.day) + '"' + idA(b) + '>' + b.title + '</div>'; },
    places: function (b) {
      var inner = '<div class="pls">' + arr(b.items).map(function (p) { return placeChip(p); }).join('') + '</div>';
      return b.label ? '<div class="wish-have"' + idA(b) + '><span class="tag ok">' + b.label + '</span>' + inner + '</div>' : inner;
    },
    placelist: function (b) { return '<div class="placelist">' + (b.title ? '<div class="lbl">' + b.title + '</div>' : '') + arr(b.items).map(placeRow).join('') + '</div>'; },
    table: function (b) {
      var t = b.html;
      if (!t) {
        var head = arr(b.head), rows = arr(b.rows);
        var cell = function (c, tag) { if (c && typeof c === 'object') return '<' + tag + (c.cls ? ' class="' + c.cls + '"' : '') + (c.colspan ? ' colspan="' + c.colspan + '"' : '') + '>' + (c.html || c.text || '') + '</' + tag + '>'; return '<' + tag + '>' + (c == null ? '' : c) + '</' + tag + '>'; };
        t = '<table' + (b.cls ? ' class="' + b.cls + '"' : '') + '>' + (head.length ? '<thead><tr>' + head.map(function (h) { return cell(h, 'th'); }).join('') + '</tr></thead>' : '') +
          '<tbody>' + rows.map(function (r) { var cells = Array.isArray(r) ? r : r.cells; return '<tr' + (r.cls ? ' class="' + r.cls + '"' : '') + '>' + cells.map(function (c) { return cell(c, 'td'); }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      }
      return '<div class="table-wrap"' + idA(b) + '>' + t + '</div>' + (b.swipe ? B.swipe() : '');
    },
    steps: function (b) { return '<ol class="steps' + dc(b.day) + '"' + idA(b) + '>' + arr(b.items).map(function (s) { return '<li><div><b>' + s.title + '</b>' + (s.text ? '<span>' + s.text + '</span>' : '') + '</div></li>'; }).join('') + '</ol>'; },
    contacts: function (b) {
      return '<div class="contacts' + cl(b.cls) + '"' + idA(b) + '>' + arr(b.items).map(function (c) {
        var main = '', btn = '';
        if (c.tel) { main = '<a class="num" href="' + telHref(c.tel) + '">' + esc(c.tel) + '</a>'; btn = '<button type="button" class="copy" data-copy="' + esc(c.copy || c.tel) + '">복사</button>'; }
        else if (c.say) { main = '<div class="num ja" lang="' + esc(c.lang || (T.local && T.local.lang) || 'ja') + '">' + c.say + '</div>'; btn = '<button type="button" class="copy" data-copy="' + esc(c.copy || stripTags(c.say)) + '">복사</button>'; }
        else if (c.map) { main = '<a class="num map" href="' + esc(c.map) + '" target="_blank" rel="noopener">' + (c.mapLabel || '구글맵으로 열기') + '</a>'; }
        return '<div class="contact"><div><div class="who">' + (c.who || '') + '</div>' + (c.what ? '<div class="what">' + c.what + '</div>' : '') + main + '</div>' + btn + '</div>';
      }).join('') + '</div>';
    },
    weather: function (b) {
      var n = arr(b.days).length;
      return '<div' + idA(b) + '><div class="wx" aria-label="날씨 예보"' + (n <= 4 ? ' style="--n:' + n + '"' : '') + '>' + arr(b.days).map(function (w, i) {
        return '<div class="d' + (w.day || i + 1) + '"><span class="d">' + (w.d || '') + '</span><span class="w">' + (w.w || '') + '</span><span class="t">' + (w.t || '') + '</span>' + (w.p ? '<span class="p">' + w.p + '</span>' : '') + (w.s ? '<span class="s">' + w.s + '</span>' : '') + '</div>';
      }).join('') + '</div>' + (b.cap ? '<p class="cap">' + b.cap + '</p>' : '') + '</div>';
    },
    dial: function (b) {
      return '<div class="quick" aria-label="' + esc(b.label || '자주 쓰는 연락처') + '">' + arr(b.items).map(function (q) {
        return '<a href="' + telHref(q.tel || q.v) + '"><span class="k">' + q.k + '</span><span class="v">' + (q.v || q.tel) + '</span></a>';
      }).join('') + '</div>';
    },
    jump: function (b) { return jumpHTML(b.items, b.label); },
    links: function (b) { return '<div class="sh-links">' + arr(b.items).map(function (l) { return '<a class="btn" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + l.text + '</a>'; }).join('') + '</div>' + (b.cap ? '<p class="cap">' + b.cap + '</p>' : ''); },
    foot: function (b) { return '<div class="foot"' + idA(b) + '>' + (b.title ? '<strong>' + b.title + '</strong>' : '') + (b.items ? listHTML(b.items) : '') + (b.html || '') + '</div>'; },
    ranked: function (b) { return (b.title ? '<div class="sec-head"><h2>' + b.title + '</h2>' + (b.text ? '<p>' + b.text + '</p>' : '') + '</div>' : '') + '<ol class="ranked">' + arr(b.items).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>'; },
    chips: function (b) { return '<div class="chipgroups">' + arr(b.groups).map(function (g) { return '<div class="chipgroup"><div class="cg-l">' + g.label + '</div>' + tagsHTML(g.items) + '</div>'; }).join('') + '</div>'; },
    rows: function (b) { return '<div class="kv">' + arr(b.items).map(function (r) { return '<div class="kv-row"><div class="kv-k">' + r.k + '</div><div class="kv-v">' + r.v + '</div></div>'; }).join('') + '</div>'; },
    image: function (b) { return '<figure class="fig"><img src="' + esc(asset(b.src)) + '" alt="' + esc(b.alt || '') + '" loading="lazy">' + (b.cap ? '<figcaption class="cap">' + b.cap + '</figcaption>' : '') + '</figure>'; },
    fold: function (b) { return '<details class="fold"' + (b.open ? ' open' : '') + idA(b) + '><summary><span class="sum-t">' + b.title + '</span>' + (b.count != null ? '<span class="s">' + b.count + '</span>' : '') + IC.chev + '</summary><div class="in">' + blocks(b.blocks) + '</div></details>'; },
    planb: function (b) { return planbHTML(b.items); },
    parking: function () { return parkingHTML(); },
    page: function (b) { return pageFrame(b.src, b.title); },
    stamps: function () { return stampsHTML(); },
    now: function () { return nowHTML(); },
    prep: function (b) { return prepHTML(b); },
    routemap: function (b) { return '<div class="mapcard">' + (b.title ? '<h2>' + b.title + '</h2>' : '') + (b.svg || '') + (b.cap ? '<p class="cap">' + b.cap + '</p>' : '') + (b.stamps === false ? '' : stampsHTML()) + '</div>'; },
    ledger: function () { return ledgerHTML(); }
  };
  function block(b) {
    if (!b) return '';
    if (typeof b === 'string') return b;
    var f = B[b.type || 'note'];
    return f ? f(b) : '';
  }
  function blocks(list) { return arr(list).map(block).join(''); }
  function asset(src) { if (!src) return ''; return /^(https?:)?\//.test(src) ? src : BASE + src; }
  function jumpHTML(items, label) {
    items = arr(items); if (!items.length) return '';
    return '<nav class="jump" aria-label="' + esc(label || '바로가기') + '">' + items.map(function (j) { return '<a href="' + esc(j.href) + '">' + j.text + '</a>'; }).join('') + '</nav>';
  }

  /* =====================================================================
     섹션 정의
     ===================================================================== */
  var SEC = {
    home: { t: '홈', ic: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>' },
    plan: { t: '일정', ic: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M6 8v8"/><path d="M11 6h9M11 18h9M11 12h6"/>' },
    eat: { t: '맛집', ic: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-2 2-2 2-4M12 8c0-2 2-2 2-4"/>' },
    wish: { t: '찜 목록', ic: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', parent: 'eat' },
    talk: { t: '회화', ic: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h6"/>' },
    shoot: { t: '촬영', ic: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.3" r="3.4"/>' },
    stay: { t: '숙소', d: '숙소·체크인·주차', ic: '<path d="M3 20V9l9-5 9 5v11"/><path d="M9 20v-6h6v6"/>' },
    todo: { t: '할 일', d: '출발 전에 할 일', ic: '<path d="m4 12 4 4 12-12"/><path d="M4 20h16"/>' },
    pack: { t: '짐', d: '짐 체크리스트', ic: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4h6v3"/>' },
    move: { t: '이동', d: '차량·택시·교통', ic: '<path d="M4 16v-4l2-5h12l2 5v4"/><path d="M4 16h16v2H4z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>' },
    money: { t: '돈', d: '예산·가계부', ic: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>' },
    planb: { t: '대안', d: '막힐 때 이렇게', ic: '<path d="M6 4v8a4 4 0 0 0 4 4h8"/><path d="m15 13 3 3-3 3"/><path d="M6 4 3 7M6 4l3 3"/>' },
    sos: { t: '비상', d: '긴급 연락처·주소', ic: '<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>' },
    more: { t: '더보기', ic: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>' }
  };
  var EXTRA_IC = '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5"/><path d="M8 13h8M8 17h5"/>';
  var ORDER_PRIMARY = ['home', 'plan', 'eat', 'talk', 'shoot'];
  var ORDER_MORE = ['stay', 'todo', 'pack', 'move', 'money', 'planb', 'sos'];
  var S = {}; // 실제 존재하는 섹션 id → 데이터
  var PARENT = {}; // 하위 화면 → 하단 탭 하이라이트용

  function secTitle(id) { var s = S[id]; return (s && s.title) || (SEC[id] && SEC[id].t) || id; }
  function backBtn(to) { return '<button type="button" class="back" data-go="' + to + '">' + IC.back + secTitle(to) + '</button>'; }
  function panel(id, label, inner, hidden) { return '<section class="panel" id="' + id + '" aria-label="' + esc(stripTags(label)) + '"' + (hidden ? ' hidden' : '') + '>' + inner + '</section>'; }

  /* =====================================================================
     홈
     ===================================================================== */
  function heroHTML() {
    var h = (S.home && S.home.hero) || {};
    var flights = arr(h.flights);
    return '<header class="hero">' +
      '<a class="hub-link" href="/">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>BK Trip</a>' +
      '<div class="hero-top"><div><h1>' + (h.title || T.title) + '</h1>' + ((h.when || T.subtitle) ? '<p class="when">' + (h.when || T.subtitle) + '</p>' : '') + '</div>' +
      '<div class="dday" id="dday"><b>-</b><span></span></div></div>' +
      (flights.length ? '<div class="flights">' + flights.map(function (f) { return '<div class="flight"><span class="k">' + f.k + '</span><span class="v">' + f.v + '</span>' + (f.s ? '<span class="s">' + f.s + '</span>' : '') + '</div>'; }).join('') + '</div>' : '') +
      (h.html || '') + '</header>';
  }
  function prepHTML(b) {
    var items = arr(b.items);
    return '<div class="prep" id="prep"><div class="prep-top"><div><h2>' + (b.title || '출발 전 체크') + '</h2>' + (b.text ? '<p>' + b.text + '</p>' : '') + '</div><div class="progress" id="quick-progress">0 / ' + items.length + '</div></div>' +
      '<div class="bar"><i id="quick-bar"></i></div><ul class="check mini" data-group="quick">' +
      items.map(function (it) { return '<li><label><input type="checkbox" id="' + esc(it.id) + '"' + (it.link ? ' data-link="' + esc(it.link) + '"' : '') + '><span><b>' + it.text + '</b></span></label></li>'; }).join('') +
      '</ul>' + (b.actions === false ? '' : '<div class="prep-acts">' + (S.todo ? '<button class="btn" type="button" data-go="todo">할 일 전체</button>' : '') + (S.pack ? '<button class="btn" type="button" data-go="pack">짐 전체</button>' : '') + '</div>') + '</div>';
  }
  function nowHTML() {
    return '<div class="now d1" id="now" aria-live="polite"><div class="now-top"><span class="now-label"><span class="pulse"></span><span id="now-label">첫 일정</span></span>' +
      '<div class="now-title" id="now-title"></div><div class="now-sub" id="now-sub"></div></div>' +
      '<div class="next" id="next" hidden><span class="t" id="next-t"></span><span class="w" id="next-w"></span><span class="in" id="next-in"></span></div>' +
      '<div class="now-acts"><a class="btn primary" id="now-map" href="#" target="_blank" rel="noopener" hidden>' + IC.pin + '<span>지도</span></a>' +
      '<button class="btn" type="button" id="now-tel" hidden aria-label="내비용 전화번호 복사"><em class="navi">내비</em><span></span></button>' +
      '<a class="btn" id="now-tmap" href="#" hidden>' + IC.nav + 'T맵</a>' +
      '<button class="btn" type="button" id="now-plan">일정에서 보기</button></div></div>';
  }
  function stampHTML(d, i) {
    var p = parseDate(d.date), st = d.stamp || {};
    var date = p ? p.m + '.' + ('0' + p.d).slice(-2) : '';
    var top = st.top || ('DAY ' + (i + 1));
    var place = st.place || d.label || '';
    var small = st.small != null ? st.small : (stripTags(place).length > 3);
    return '<span class="stamp d' + (i + 1) + '"' + (d.color ? ' style="--c:' + esc(d.color) + '"' : '') + ' aria-hidden="true"><span class="n">' + top + '</span><span class="p' + (small ? ' sm' : '') + '">' + place + '</span><span class="d">' + date + '</span></span>';
  }
  function stampsHTML() {
    if (!S.plan) return '';
    var n = arr(S.plan.days).length;
    return '<div class="stamps"' + (n <= 4 ? ' style="--n:' + n + '"' : '') + '>' + arr(S.plan.days).map(function (d, i) {
      return '<button type="button" data-day="' + (i + 1) + '" aria-label="' + (i + 1) + '일차 일정 보기">' + stampHTML(d, i) + '<span class="lab">' + (d.label || '') + '</span></button>';
    }).join('') + '</div>';
  }
  function renderHome() {
    var s = S.home || {};
    var bl = s.blocks;
    if (!bl) { bl = []; if (S.plan) bl.push({ type: 'now' }, { type: 'stamps' }); }
    return panel('home', '홈', heroHTML() + blocks(bl), true);
  }

  /* =====================================================================
     일정
     ===================================================================== */
  var ROWS = []; // 지금·다음 계산용
  function detailHTML(it) {
    var d = '';
    arr(it.details).forEach(function (g) {
      var inner = '';
      if (g.places) inner += arr(g.places).map(placeRow).join('');
      if (g.list) inner += '<ul class="notes">' + arr(g.list).map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>';
      if (g.html) inner += g.html;
      d += '<div>' + (g.label ? '<div class="lbl">' + g.label + '</div>' : '') + inner + '</div>';
    });
    if (it.alt) d += '<div class="alt">' + it.alt + '</div>';
    return d;
  }
  function rowHTML(it, d, di, ii, checkable, done) {
    var id = it.id || ('d' + (di + 1) + '-' + ii);
    var at = it.at || (!it.fork && pad(it.time) ? d.date + 'T' + pad(it.time) : '');
    var det = detailHTML(it), open = !!(UI.open && UI.open[id]);
    var acts = [];
    if (it.addr) {
      var a = typeof it.addr === 'string' ? { name: it.title, q: it.addr } : it.addr;
      var q = a.q || a.addr;
      acts.push(actCopy(q, '주소 복사', stripTags(a.name || '')));
      acts.push(isKR() ? actTmap(q, stripTags(a.name || '')) : actMap({ name: a.name, q: q, map: a.map }));
    }
    if (it.tel && !it.addr) acts.push('<a class="act" href="' + telHref(it.tel) + '">전화</a>');
    if (det) acts.push('<button class="act more-btn" type="button" aria-expanded="' + open + '" data-toggle="' + esc(id) + '">' + (open ? '접기' : '자세히') + IC.chev + '</button>');
    var cls = 'row' + (it.key ? ' key' : '') + (it.fork ? ' fork' : '') + (checkable && done ? ' checked' : '');
    return '<li class="' + cls + '"' + (at ? ' data-at="' + esc(at) + '"' : '') + ' data-id="' + esc(id) + '"' +
      (it.addr ? ' data-addr="' + esc(typeof it.addr === 'string' ? it.addr : (it.addr.q || it.addr.addr)) + '" data-addrname="' + esc(stripTags(typeof it.addr === 'string' ? it.title : (it.addr.name || it.title))) + '"' : '') + '>' +
      '<time>' + (it.time || '') + (it.dur ? '<small>' + it.dur + '</small>' : '') + '</time><div>' +
      '<div class="t">' + (it.icon ? '<span class="emo" aria-hidden="true">' + it.icon + '</span>' : '') + (it.title || '') + (it.badge ? ' <span class="tag' + cl(it.badgeTone || 'food') + '">' + it.badge + '</span>' : '') + '</div>' +
      (it.sub ? '<div class="m">' + it.sub + '</div>' : '') +
      (it.note ? '<div class="n">' + it.note + '</div>' : '') +
      (it.places && it.places.length ? '<div class="pls">' + arr(it.places).map(function (p) { return placeChip(p); }).join('') + '</div>' : '') +
      (acts.length ? '<div class="acts">' + acts.join('') + '</div>' : '') +
      tagsHTML(it.tags) + (it.html || '') +
      (det ? '<div class="detail"' + (open ? '' : ' hidden') + ' id="det-' + esc(id) + '">' + det + '</div>' : '') +
      '</div>' +
      (checkable && !it.fork ? '<button class="chk" type="button" aria-pressed="' + !!done + '" aria-label="' + esc(stripTags(it.title)) + ' 완료 표시" data-done="' + esc(id) + '">' + IC.check + '</button>' : '') +
      '</li>';
  }
  function dayPick(d, i) {
    var p = parseDate(d.date);
    var b = d.pick || (p ? p.d + ' ' + WD[p.wd] : 'DAY ' + (i + 1));
    return '<button type="button" class="d' + (i + 1) + '" data-day="' + (i + 1) + '" aria-pressed="false"' + (d.color ? ' style="--c:' + esc(d.color) + '"' : '') + '><b>' + b + '</b><span>' + (d.label || '') + '</span></button>';
  }
  function renderPlan() {
    var s = S.plan, days = arr(s.days), done = LS.get('plan', {});
    var checkable = !!s.checkable;
    var pick = days.length > 1 ? '<nav class="daypick" aria-label="날짜 선택" style="--n:' + days.length + '"' + (days.length > 4 ? ' data-many="1"' : '') + '>' + days.map(dayPick).join('') + '</nav>' : '';
    var arts = days.map(function (d, di) {
      var items = arr(d.items);
      var nDone = items.filter(function (it, ii) { return !it.fork && done[it.id || ('d' + (di + 1) + '-' + ii)]; }).length;
      var nAll = items.filter(function (it) { return !it.fork; }).length;
      var facts = arr(d.facts);
      return '<article class="day d' + (di + 1) + '" data-day="' + (di + 1) + '" id="day-' + (di + 1) + '"' + (d.color ? ' style="--c:' + esc(d.color) + '"' : '') + '>' +
        '<div class="day-head">' + stampHTML(d, di) + '<div>' +
        '<p class="wxline">' + (d.weather || dayName(d.date)) + '</p>' +
        '<h3>' + (d.title || d.label || ('DAY ' + (di + 1))) + '</h3>' + (d.summary ? '<p>' + d.summary + '</p>' : '') +
        (facts.length ? '<div class="facts">' + facts.map(function (f) { return '<span class="fact">' + (Array.isArray(f) ? f[0] + ' <b>' + f[1] + '</b>' : f) + '</span>'; }).join('') + '</div>' : '') +
        '</div>' + (checkable ? '<div class="ring" data-ring="' + (di + 1) + '" style="--p:' + (nAll ? Math.round(nDone / nAll * 100) : 0) + '">' + nDone + '/' + nAll + '</div>' : '') + '</div>' +
        arr(d.alerts).map(function (a) { return '<div class="note mini' + cl(a.tone) + '">' + (a.title ? '<h3>' + a.title + '</h3>' : '') + '<p>' + a.text + '</p></div>'; }).join('') +
        blocks(d.top) +
        (items.length ? '<ul class="rows' + (checkable ? ' checkable' : '') + '">' + items.map(function (it, ii) { var id = it.id || ('d' + (di + 1) + '-' + ii); return rowHTML(it, d, di, ii, checkable, done[id]); }).join('') + '</ul>' : '<p class="empty-day">아직 이 날 일정이 없어.</p>') +
        (d.foot ? '<div class="day-foot">' + d.foot + '</div>' : '') + blocks(d.blocks) + '</article>';
    }).join('');
    var nextbar = checkable ? '<div class="nextbar" id="nextbar" hidden><div class="nb-t"><div class="nb-l" id="nb-l">다음 목적지</div><div class="nb-n" id="nb-n"></div></div><span id="nb-acts"></span></div>' : '';
    return panel('plan', secTitle('plan'), pick + blocks(s.top) + arts + blocks(s.blocks) + nextbar, true);
  }

  /* =====================================================================
     맛집 · 찜 목록
     ===================================================================== */
  function countCards(s) { var n = 0; arr(s.groups).forEach(function (g) { n += arr(g.items).length; }); return n; }
  function eatSwitch(cur) {
    if (!(S.eat && S.wish)) return '';
    var n = countCards(S.wish);
    return '<div class="eatswitch" role="group" aria-label="맛집 보기"><button type="button"' + (cur === 'eat' ? '' : ' data-go="eat"') + ' aria-pressed="' + (cur === 'eat') + '">' + (S.eat.switchLabel || '동선 따라') + '</button>' +
      '<button type="button"' + (cur === 'wish' ? '' : ' data-go="wish"') + ' aria-pressed="' + (cur === 'wish') + '">' + (S.wish.switchLabel || '찜 목록') + ' <span class="n">' + n + '</span></button></div>';
  }
  function renderEatLike(id) {
    var s = S[id];
    var jump = s.jump || (arr(s.groups).length > 2 ? arr(s.groups).filter(function (g) { return g.id; }).map(function (g) { return { text: g.short || stripTags(g.title), href: '#' + g.id }; }) : []);
    var groups = arr(s.groups).map(function (g) {
      return B.group(g) + (arr(g.items).length ? '<div class="grid2' + dc(g.day) + '">' + arr(g.items).map(cardHTML).join('') + '</div>' : '') +
        (g.also ? B.places({ label: g.also.label || '일정에 이미 있는 곳', items: g.also.places }) : '') + blocks(g.blocks);
    }).join('');
    var back = (id === 'wish' && !S.eat) ? backBtn('more') : '';
    return panel(id, secTitle(id), back + eatSwitch(id) + jumpHTML(jump, secTitle(id) + ' 바로가기') + blocks(s.top) + groups + blocks(s.blocks), true);
  }

  /* =====================================================================
     숙소
     ===================================================================== */
  function renderStay() {
    var s = S.stay;
    var cards = arr(s.items).length ? '<div class="stays">' + arr(s.items).map(function (st, i) {
      return '<article class="stay-card pick d' + (st.day || i + 1) + '"' + idA(st) + '>' + (st.label ? '<span class="rank">' + st.label + '</span>' : '') + '<h3>' + st.title + '</h3>' +
        (st.place ? placeChip(st.place, true) : '') +
        (st.price ? '<div class="price">' + st.price + (st.priceNote ? ' <small>' + st.priceNote + '</small>' : '') + '</div>' : '') +
        (st.facts ? listHTML(st.facts) : '') + bodyHTML({ text: st.text, html: st.html }) + tagsHTML(st.tags) + '</article>';
    }).join('') + '</div>' : '';
    return panel('stay', secTitle('stay'), backBtn('more') + blocks(s.top) + cards + blocks(s.blocks), true);
  }

  /* =====================================================================
     체크리스트 (할 일 · 짐)
     ===================================================================== */
  function checkGroups(list, groups) {
    return arr(groups).map(function (g) {
      return '<div><div class="cl-head"><h3>' + g.title + '</h3>' + (g.due ? '<span class="due">' + g.due + '</span>' : '') + '</div>' +
        '<ul class="check" data-group="' + list + '">' + arr(g.items).map(function (it) {
          var tel = it.tel ? '<span class="s"><a href="' + telHref(it.tel) + '">' + esc(it.tel) + '</a></span>' : '';
          return '<li' + (it.tel ? ' class="has-act"' : '') + '><label><input type="checkbox" id="' + esc(it.id) + '"><span><b>' + it.text + '</b>' + (it.sub ? '<span class="s">' + it.sub + '</span>' : '') + tel + '</span></label>' + (it.tel ? actCopy(it.tel, '복사') : '') + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
  }
  function renderList(id) {
    var s = S[id];
    var head = s.head || { title: secTitle(id) };
    var h = '<div class="sec-head"><h2>' + head.title + '</h2>' + (head.text ? '<p>' + head.text + '</p>' : '') +
      '<div class="progress" id="' + id + '-progress">0 / 0</div><div class="bar"><i id="' + id + '-bar"></i></div></div>';
    return panel(id, secTitle(id), backBtn('more') + blocks(s.top) + h + checkGroups(id, s.groups) +
      '<button type="button" class="reset" data-reset="' + id + '">체크 전부 지우기</button>' + blocks(s.blocks), true);
  }

  /* =====================================================================
     돈 · 가계부
     ===================================================================== */
  var CUR = {};
  function ledgerHTML() {
    var m = S.money || {}, L = m.ledger || {};
    var cats = arr(L.categories).length ? L.categories : ['식비', '교통', '숙소', '쇼핑', '관광', '기타'];
    var unit = CUR.unit || '';
    return '<div class="ledger" id="ledger"><div class="lg-top"><div><h2>가계부</h2><p class="cap">쓴 돈을 적어두면 이 폰에 저장돼. ' + (CUR.krw ? '원화는 1' + esc(unit) + ' = ' + CUR.krw + '원으로 대충 계산.' : '') + '</p></div>' +
      '<div class="lg-sum"><b id="lg-total">0</b><span id="lg-krw"></span></div></div>' +
      (L.budget ? '<div class="lg-budget"><div class="bar"><i id="lg-bar"></i></div><p class="cap" id="lg-left"></p></div>' : '') +
      '<form class="lg-form" id="lg-form" autocomplete="off">' +
      '<input name="what" placeholder="뭐에 썼어? (예: 라멘)" aria-label="항목" required>' +
      '<input name="amt" inputmode="decimal" placeholder="금액" aria-label="금액" required>' +
      '<select name="cur" aria-label="통화">' + (CUR.code ? '<option value="local">' + esc(unit || CUR.code) + '</option>' : '') + '<option value="KRW">원</option></select>' +
      '<select name="cat" aria-label="분류">' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<select name="pay" aria-label="결제">' + ['카드', '현금'].map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>' +
      '<button class="btn primary" type="submit">추가</button></form>' +
      '<div id="lg-cats" class="lg-cats"></div><ul class="lg-list" id="lg-list"></ul>' +
      '<div class="lg-acts"><button type="button" class="reset" id="lg-copy">내역 복사</button><button type="button" class="reset" id="lg-clear">전부 지우기</button></div></div>';
  }
  function renderMoney() {
    var s = S.money;
    var lg = s.ledger === false ? '' : ledgerHTML();
    return panel('money', secTitle('money'), backBtn('more') + (s.ledgerFirst === false ? '' : lg) + blocks(s.top) + blocks(s.blocks) + (s.ledgerFirst === false ? lg : ''), true);
  }

  /* =====================================================================
     이동 · 대안 · 비상 · 추가 페이지
     ===================================================================== */
  function renderSimple(id) { var s = S[id]; return panel(id, secTitle(id), backBtn('more') + blocks(s.top) + blocks(s.blocks), true); }
  function planbHTML(items) {
    items = arr(items); if (!items.length) return '';
    return '<div class="planb">' + items.map(function (r) { return '<div class="trow"><b>' + r.if + '</b>' + r.then + '</div>'; }).join('') + '</div>';
  }
  function renderPlanb() {
    var s = S.planb;
    var head = s.head || { title: '막힐 때', text: '현장에서 일정이 꼬이면 여기서 바로 바꾸기.' };
    return panel('planb', secTitle('planb'), backBtn('more') + blocks(s.top) + '<div class="sec-head"><h2>' + head.title + '</h2>' + (head.text ? '<p>' + head.text + '</p>' : '') + '</div>' + (s.listTitle ? '<div class="lbl planb-l">' + s.listTitle + ' · ' + arr(s.items).length + '</div>' : '') + planbHTML(s.items) + blocks(s.blocks), true);
  }
  function parkingHTML() {
    if (!S.plan) return '';
    var out = [];
    arr(S.plan.days).forEach(function (d) {
      var p = parseDate(d.date);
      arr(d.items).forEach(function (it) {
        arr(it.details).forEach(function (g) {
          if (g.kind === 'park') out.push('<details class="fold"><summary><span class="sum-t">' + it.title + '</span><span class="s">' + (p ? WD[p.wd] + ' ' : '') + (it.time || '') + '</span>' + IC.chev + '</summary><div class="in">' + arr(g.places).map(placeRow).join('') + '</div></details>');
        });
      });
    });
    return out.join('');
  }
  function renderSos() {
    var s = S.sos;
    return panel('sos', secTitle('sos'), backBtn('more') + blocks(s.top) + (s.contacts ? B.contacts({ items: s.contacts }) : '') + blocks(s.blocks), true);
  }
  function pageFrame(src, title) {
    return '<div class="pageframe"><iframe src="' + esc(asset(src)) + '" title="' + esc(title || '페이지') + '" loading="lazy"></iframe><a class="btn" href="' + esc(asset(src)) + '" target="_blank" rel="noopener">새 창으로 크게 보기</a></div>';
  }
  function renderShoot() {
    var s = S.shoot;
    var inner = blocks(s.top) + (s.page ? pageFrame(s.page, '촬영 콘티') : '') + blocks(s.blocks);
    return panel('shoot', secTitle('shoot'), inner, true);
  }
  function renderExtra(p) { return panel('x-' + p.id, p.title, backBtn('more') + blocks(p.top) + blocks(p.blocks), true); }

  /* ---------- 더보기 ---------- */
  function moreItems() {
    var list = [];
    ORDER_MORE.forEach(function (id) { if (S[id] && NAVSET.indexOf(id) < 0) list.push({ id: id, t: secTitle(id), d: S[id].desc || SEC[id].d, ic: SEC[id].ic }); });
    if (S.wish && !S.eat) list.unshift({ id: 'wish', t: secTitle('wish'), d: S.wish.desc || '', ic: SEC.wish.ic });
    arr(T.extra).forEach(function (p) { list.push({ id: 'x-' + p.id, t: p.title, d: p.desc || '', ic: EXTRA_IC }); });
    ORDER_PRIMARY.forEach(function (id) { if (S[id] && NAVSET.indexOf(id) < 0 && id !== 'home') list.push({ id: id, t: secTitle(id), d: S[id].desc || '', ic: SEC[id].ic }); });
    return list;
  }
  function renderMore() {
    var items = moreItems();
    var head = (T.more && T.more.head) || { title: '더보기', text: '' };
    var menu = '<ul class="menu">' + items.map(function (m, i) {
      return '<li><button type="button" data-go="' + m.id + '" class="d' + ((i % 4) + 1) + '"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + m.ic + '</svg></span><span><span class="tt">' + m.t + '</span>' + (m.d ? '<span class="ds">' + m.d + '</span>' : '') + '</span>' + IC.more + '</button></li>';
    }).join('') + '</ul>';
    var theme = '<div class="setting"><span>화면 모드</span><div class="seg3" role="group" aria-label="화면 모드">' +
      [['auto', '자동'], ['light', '라이트'], ['dark', '다크']].map(function (o) { return '<button type="button" data-theme-set="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
    var hub = '<a class="btn hub-btn" href="/">BK Trip 전체 여행 목록</a>';
    return panel('more', '더보기', '<div class="sec-head"><h2>' + head.title + '</h2>' + (head.text ? '<p>' + head.text + '</p>' : '') + '</div>' + (items.length ? menu : '') + blocks(T.more && T.more.blocks) + theme + hub +
      (T.footer ? '<p class="cap">' + T.footer + '</p>' : ''), true);
  }

  /* =====================================================================
     회화
     ===================================================================== */
  function renderTalk() {
    var s = S.talk, sg = s.sign || {};
    var sign = '<header class="pb-sign"><div class="pb-sign-in">' + (sg.kicker ? '<div class="pb-sign-k">' + sg.kicker + '</div>' : '') + '<h1>' + (sg.title || '회화') + '</h1>' +
      (sg.facts ? '<div class="pb-sign-facts">' + arr(sg.facts).map(function (f) { return '<span class="pb-fact">' + f.k + ' <b>' + f.v + '</b></span>'; }).join('') + '</div>' : '') +
      (sg.legend ? '<p class="pb-legend">' + arr(sg.legend).map(function (l) { return '<span>' + l + '</span>'; }).join(' · ') + '</p>' : '') + '</div></header>';
    var bar = '<div class="pb-bar" id="pb-bar"><div class="pb-bar-row"><label class="pb-search" for="pb-q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="pb-q" type="search" placeholder="' + esc(s.placeholder || '검색') + '" autocomplete="off" enterkeyhint="search" aria-label="표현 검색"><button class="pb-clear" id="pb-qclear" type="button" aria-label="검색어 지우기" hidden>✕</button></label>' +
      '<button class="pb-speed" id="pb-speed" type="button" aria-pressed="false">음성 보통</button></div><nav class="pb-chips" id="pb-chips" aria-label="카테고리"></nav></div>';
    var show = '<div class="pb-show" id="pb-show" role="dialog" aria-modal="true" aria-labelledby="pb-show-jp" hidden><p class="pb-show-hint">' + (s.showHint || '이 화면을 보여주세요') + '</p>' +
      '<div class="pb-show-main"><p class="pb-show-jp" id="pb-show-jp"></p><p class="pb-show-pr" id="pb-show-pr"></p><p class="pb-show-ko" id="pb-show-ko"></p><p class="pb-tip" id="pb-show-tip" hidden></p></div>' +
      '<div class="pb-show-acts"><button class="pb-btn pb-go" id="pb-show-spk" type="button"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>듣기</button><button class="pb-btn" id="pb-show-close" type="button">닫기</button></div></div>';
    return panel('talk', secTitle('talk'), '<div class="pb-wrap">' + blocks(s.top) + sign + bar + '<p class="pb-count" id="pb-count"></p><main id="pb-list"></main><p class="pb-empty" id="pb-empty" hidden></p>' + (s.foot ? '<p class="pb-foot">' + s.foot + '</p>' : '') + blocks(s.blocks) + '</div>' + show, true);
  }

  /* =====================================================================
     하단 탭
     ===================================================================== */
  var NAVSET = [];
  function buildNav() {
    var explicit = arr(T.nav).filter(function (id) { return id === 'more' || S[id]; });
    var nav;
    if (explicit.length) nav = explicit;
    else {
      nav = ORDER_PRIMARY.filter(function (id) { return S[id]; });
      if (S.wish && !S.eat) { /* 찜 목록만 있는 여행 */ }
      var rest = ORDER_MORE.filter(function (id) { return S[id]; }).length + arr(T.extra).length + (S.wish && !S.eat ? 1 : 0);
      if (nav.length + rest <= 5) { ORDER_MORE.forEach(function (id) { if (S[id]) nav.push(id); }); if (S.wish && !S.eat) nav.push('wish'); if (arr(T.extra).length) nav.push('more'); }
      else nav.push('more');
    }
    NAVSET = nav;
    NAV.innerHTML = '<div class="nav-in" style="grid-template-columns:repeat(' + nav.length + ',minmax(0,1fr))">' + nav.map(function (id) {
      var label = id === 'more' ? '더보기' : ((S[id] && S[id].navLabel) || secTitle(id));
      return '<button type="button" data-go="' + id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SEC[id] ? SEC[id].ic : EXTRA_IC) + '</svg>' + label + '</button>';
    }).join('') + '</div>';
    // 하위 화면 → 부모 탭
    Object.keys(S).forEach(function (id) { if (nav.indexOf(id) < 0) PARENT[id] = (SEC[id] && SEC[id].parent && nav.indexOf(SEC[id].parent) > -1) ? SEC[id].parent : 'more'; });
    arr(T.extra).forEach(function (p) { PARENT['x-' + p.id] = 'more'; });
  }

  /* =====================================================================
     화면 전환
     ===================================================================== */
  var UI = {};
  var panels = [], ids = [];
  function go(id, keepScroll) {
    if (ids.indexOf(id) < 0) id = 'home';
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    var navId = PARENT[id] || id;
    $$('.nav [data-go]').forEach(function (b) { if (b.getAttribute('data-go') === navId) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    UI.tab = id; LS.set('ui', UI);
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    if (!keepScroll) window.scrollTo(0, 0);
    if (id === 'plan') updateNextbar();
  }
  var days = [], picks = [];
  function showDay(n) {
    n = String(n);
    days.forEach(function (d) { d.hidden = d.getAttribute('data-day') !== n; });
    picks.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-day') === n ? 'true' : 'false'); });
    UI.day = n; LS.set('ui', UI);
    updateNextbar();
  }

  /* ---------- D-day · 지금/다음 ---------- */
  var rows = [], focusRow = null;
  function mapOfRow(r) { if (!r) return null; var a = r.el.querySelector('a.pl[href]'); if (a) return a.href; var m = r.el.querySelector('.acts a.act[target]'); return m ? m.href : null; }
  function telOfRow(r) { if (!r || !T.telNavi) return null; var a = r.el.querySelector('a.pl[data-tel]:not([data-telx])'); return a ? a.getAttribute('data-tel') : null; }
  function fmtIn(ms) { var m = Math.round(ms / 60000); if (m < 60) return m + '분 뒤'; var h = Math.floor(m / 60); m = m % 60; if (h >= 48) return Math.round(h / 24) + '일 뒤'; return h + '시간' + (m ? ' ' + m + '분' : '') + ' 뒤'; }
  function tick() {
    var today = localToday();
    var dd = $('#dday');
    var dayIdx = null;
    if (S.plan) arr(S.plan.days).forEach(function (d, i) { if (d.date === today) dayIdx = String(i + 1); });
    picks.forEach(function (b) { b.classList.toggle('today', b.getAttribute('data-day') === dayIdx); });
    if (dd) {
      var diff = dayDiff(T.start, today), after = dayDiff(today, T.end || T.start);
      if (diff > 0) dd.innerHTML = '<b>D-' + diff + '</b><span>출발까지</span>';
      else if (after <= 0) dd.innerHTML = '<b>' + (1 - diff) + '일차</b><span>여행 중</span>';
      else dd.innerHTML = '<b>끝</b><span>다녀온 여행</span>';
      var prep = $('#prep'); if (prep) prep.hidden = diff <= 0 && !(S.home && S.home.keepPrep);
    }
    var box = $('#now'); if (!box || !rows.length) { if (box) box.hidden = true; return; }
    var now = Date.now(), cur = null, nxt = null;
    rows.forEach(function (r) { r.el.classList.remove('now', 'done'); if (r.at <= now) cur = r; else if (!nxt) nxt = r; });
    var lab = $('#now-label'), ti = $('#now-title'), sub = $('#now-sub'), nb = $('#next'), mapBtn = $('#now-map'), telBtn = $('#now-tel'), tmapBtn = $('#now-tmap');
    var show = null;
    if (!cur) { lab.textContent = '첫 일정'; ti.innerHTML = rows[0].title; sub.textContent = dayName(rows[0].date) + ' ' + rows[0].time; nb.hidden = true; show = rows[0]; focusRow = rows[0]; }
    else if (!nxt && now - cur.at > 6 * 3600000) { lab.textContent = '여행 끝'; ti.textContent = (S.home && S.home.endTitle) || '수고했어, 잘 다녀왔어'; sub.textContent = (S.home && S.home.endText) || '체크리스트는 다음 여행 때 지우고 다시 써.'; nb.hidden = true; show = null; focusRow = rows[rows.length - 1]; }
    else {
      cur.el.classList.add('now');
      rows.forEach(function (r) { if (r.at < cur.at && r.day === cur.day) r.el.classList.add('done'); });
      lab.textContent = '지금'; ti.innerHTML = cur.title; sub.textContent = dayName(cur.date) + ' ' + cur.time + '부터';
      if (nxt) { nb.hidden = false; $('#next-t').textContent = nxt.time; $('#next-w').innerHTML = '다음 · ' + nxt.title; $('#next-in').textContent = fmtIn(nxt.at - now) + (nxt.day !== cur.day ? ' (' + dayName(nxt.date) + ')' : ''); }
      else nb.hidden = true;
      show = mapOfRow(nxt) ? nxt : cur; focusRow = cur;
    }
    box.className = 'now d' + (focusRow ? focusRow.day : '1');
    var href = show ? mapOfRow(show) : null;
    if (href) { mapBtn.href = href; mapBtn.hidden = false; mapBtn.lastChild.textContent = show === nxt ? '다음 장소 지도' : (isKR() ? '지도' : '구글맵'); } else mapBtn.hidden = true;
    var tv = telOfRow(show);
    if (tv) { telBtn.setAttribute('data-v', tv); telBtn.lastChild.textContent = tv; telBtn.hidden = false; } else telBtn.hidden = true;
    var addr = show && show.el.getAttribute('data-addr');
    if (addr && isKR()) { tmapBtn.href = tmapHref(addr); tmapBtn.setAttribute('data-tmap', addr); tmapBtn.hidden = false; } else tmapBtn.hidden = true;
  }

  /* ---------- 일정 완료 체크 (checkable 여행) ---------- */
  function updateRing(di) {
    var art = $('#day-' + di); if (!art) return;
    var all = $$('.row:not(.fork)', art), d = all.filter(function (r) { return r.classList.contains('checked'); }).length;
    var ring = $('[data-ring="' + di + '"]', art);
    if (ring) { ring.style.setProperty('--p', all.length ? Math.round(d / all.length * 100) : 0); ring.textContent = d + '/' + all.length; }
  }
  function updateNextbar() {
    var bar = $('#nextbar'); if (!bar) return;
    var art = $('#plan article.day:not([hidden])');
    var r = art && $$('.row[data-addr]', art).filter(function (x) { return !x.classList.contains('checked'); })[0];
    if (!r || $('#plan').hidden) { bar.hidden = true; return; }
    bar.hidden = false;
    $('#nb-l').textContent = '다음 목적지 · ' + ($('time', r).firstChild ? $('time', r).firstChild.textContent : '');
    var nm = r.getAttribute('data-addrname'), q = r.getAttribute('data-addr');
    $('#nb-n').textContent = nm;
    $('#nb-acts').innerHTML = (isKR() ? actTmap(q, nm) : actMap({ q: q })) + actCopy(q, '주소 복사', nm);
  }

  /* ---------- 체크박스 저장 ---------- */
  var LISTS = ['todo', 'pack', 'quick'];
  var checkState = {};
  function boxStore(b) {
    // 저장 위치: 링크된 항목이면 그 목록, 아니면 자기 목록, 그 외 html 안 체크박스는 check
    var link = b.getAttribute('data-link');
    if (link) { var m = /^(\w+):(.+)$/.exec(link); if (m) return { list: m[1], id: m[2] }; }
    var g = b.closest('[data-group]'), grp = g && g.getAttribute('data-group');
    if (grp === 'todo' || grp === 'pack') return { list: grp, id: b.id };
    if (b.closest('#shoot')) return { list: 'shoot', id: b.id };
    return { list: 'check', id: b.id };
  }
  function getChecked(st) { checkState[st.list] = checkState[st.list] || LS.get(st.list, {}); return !!checkState[st.list][st.id]; }
  function setChecked(st, on) { checkState[st.list] = checkState[st.list] || LS.get(st.list, {}); if (on) checkState[st.list][st.id] = 1; else delete checkState[st.list][st.id]; LS.set(st.list, checkState[st.list]); }
  function refreshList(group) {
    var boxes = $$('[data-group="' + group + '"] input[type=checkbox]');
    var done = boxes.filter(function (b) { return b.checked; }).length;
    var p = $('#' + group + '-progress'), bar = $('#' + group + '-bar');
    if (p) p.textContent = done + ' / ' + boxes.length + ' 완료';
    if (bar) bar.style.width = (boxes.length ? done / boxes.length * 100 : 0) + '%';
    if (group === 'quick') { var pr = $('#prep'); if (pr) pr.classList.toggle('done', boxes.length > 0 && done === boxes.length); }
  }
  function shootRefresh() {
    var sh = $$('#shoot input[type=checkbox]'); if (!sh.length) return;
    var done = sh.filter(function (b) { return b.checked; }).length;
    var all = $('#sh-all'), bar = $('#sh-bar');
    if (all) all.textContent = done + ' / ' + sh.length;
    if (bar) bar.style.width = (sh.length ? done / sh.length * 100 : 0) + '%';
    $$('#shoot [data-shg]').forEach(function (g) { var bs = $$('input[type=checkbox]', g), d = bs.filter(function (x) { return x.checked; }).length; var p = $('[data-shp]', g); if (p) p.textContent = d + ' / ' + bs.length; });
  }
  function initChecks() {
    var all = $$('#app input[type=checkbox][id]');
    all.forEach(function (b) { b.checked = getChecked(boxStore(b)); });
    function sync(st, on) { all.forEach(function (x) { var s2 = boxStore(x); if (s2.list === st.list && s2.id === st.id) x.checked = on; }); }
    all.forEach(function (b) {
      b.addEventListener('change', function () { var st = boxStore(b); setChecked(st, b.checked); sync(st, b.checked); LISTS.forEach(refreshList); shootRefresh(); });
    });
    LISTS.forEach(refreshList); shootRefresh();
    $$('[data-reset]').forEach(function (btn) {
      var armed = false;
      btn.addEventListener('click', function () {
        if (!armed) { armed = true; btn.textContent = '한 번 더 누르면 지워져'; setTimeout(function () { armed = false; btn.textContent = '체크 전부 지우기'; }, 3000); return; }
        var g = btn.getAttribute('data-reset');
        $$('[data-group="' + g + '"] input[type=checkbox]').forEach(function (b) { var st = boxStore(b); setChecked(st, false); sync(st, false); });
        armed = false; btn.textContent = '지웠어'; LISTS.forEach(refreshList);
      });
    });
    var shReset = $('#sh-reset'), shArmed = false;
    if (shReset) shReset.addEventListener('click', function () {
      if (!shArmed) { shArmed = true; shReset.textContent = '한 번 더 누르면 지워져'; setTimeout(function () { shArmed = false; shReset.textContent = '체크 전부 지우기'; }, 3000); return; }
      $$('#shoot input[type=checkbox]').forEach(function (b) { b.checked = false; setChecked(boxStore(b), false); });
      shArmed = false; shReset.textContent = '지웠어'; shootRefresh();
    });
  }

  /* ---------- 가계부 ---------- */
  function fmtNum(n) { return (Math.round(n * 100) / 100).toLocaleString('ko-KR'); }
  function initLedger() {
    var form = $('#lg-form'); if (!form) return;
    var L = (S.money && S.money.ledger) || {};
    var list = LS.get('money', []);
    function toLocal(e) { return e.cur === 'KRW' ? (CUR.krw ? e.amt / CUR.krw : 0) : e.amt; }
    function toKRW(e) { return e.cur === 'KRW' ? e.amt : (CUR.krw ? e.amt * CUR.krw : 0); }
    function paint() {
      var tot = 0, krw = 0, cats = {};
      list.forEach(function (e) { tot += toLocal(e); krw += toKRW(e); cats[e.cat] = (cats[e.cat] || 0) + toKRW(e); });
      var unit = CUR.code ? (CUR.unit || CUR.code) : '원';
      $('#lg-total').textContent = CUR.code ? fmtNum(Math.round(tot)) + unit : fmtNum(krw) + '원';
      $('#lg-krw').textContent = CUR.code && CUR.krw ? '≈ ' + fmtNum(Math.round(krw)) + '원' : (list.length + '건');
      var bar = $('#lg-bar'), left = $('#lg-left');
      if (bar && L.budget) { var used = CUR.code ? tot : krw; bar.style.width = Math.min(100, used / L.budget * 100) + '%'; bar.classList.toggle('over', used > L.budget); left.textContent = '예산 ' + fmtNum(L.budget) + unit + ' 중 ' + (used > L.budget ? fmtNum(Math.round(used - L.budget)) + unit + ' 초과' : fmtNum(Math.round(L.budget - used)) + unit + ' 남음'); }
      $('#lg-cats').innerHTML = Object.keys(cats).map(function (c) { return '<span class="tag">' + esc(c) + ' ' + fmtNum(Math.round(cats[c])) + '원</span>'; }).join('');
      var byDate = {};
      list.forEach(function (e, i) { (byDate[e.date] = byDate[e.date] || []).push([e, i]); });
      $('#lg-list').innerHTML = Object.keys(byDate).sort().reverse().map(function (d) {
        return '<li class="lg-day"><span>' + esc(dayName(d) || d) + '</span></li>' + byDate[d].map(function (p) {
          var e = p[0];
          return '<li class="lg-row"><span class="lg-c">' + esc(e.cat) + '</span><span class="lg-w">' + esc(e.what) + '<small>' + esc(e.pay || '') + '</small></span><span class="lg-a">' + fmtNum(e.amt) + (e.cur === 'KRW' ? '원' : esc(CUR.unit || CUR.code || '')) + '</span><button type="button" class="lg-del" data-del="' + p[1] + '" aria-label="삭제">✕</button></li>';
        }).join('');
      }).join('') || '<li class="lg-empty">아직 적은 게 없어.</li>';
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = form.elements, amt = parseFloat(String(f.amt.value).replace(/[^0-9.]/g, ''));
      if (!f.what.value.trim() || !(amt > 0)) { toast('항목이랑 금액을 넣어줘'); return; }
      var today = localToday();
      var d = (today >= T.start && today <= (T.end || T.start)) ? today : today;
      list.push({ date: d, what: f.what.value.trim(), amt: amt, cur: f.cur.value === 'local' ? (CUR.code || 'KRW') : 'KRW', cat: f.cat.value, pay: f.pay.value, t: Date.now() });
      LS.set('money', list); f.what.value = ''; f.amt.value = ''; paint(); toast('적어뒀어');
    });
    $('#lg-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      if (b.getAttribute('data-armed')) { list.splice(+b.getAttribute('data-del'), 1); LS.set('money', list); paint(); }
      else { b.setAttribute('data-armed', '1'); b.textContent = '삭제?'; setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-armed'); b.textContent = '✕'; } }, 2500); }
    });
    $('#lg-copy').addEventListener('click', function () {
      var txt = list.map(function (e) { return e.date + ' ' + e.cat + ' ' + e.what + ' ' + e.amt + (e.cur === 'KRW' ? '원' : (CUR.unit || CUR.code)) + ' ' + (e.pay || ''); }).join('\n');
      copyText(txt || '(내역 없음)', function () { toast('가계부 내역 복사됨'); });
    });
    var armed = false;
    $('#lg-clear').addEventListener('click', function (e) {
      var b = e.currentTarget;
      if (!armed) { armed = true; b.textContent = '한 번 더 누르면 지워져'; setTimeout(function () { armed = false; b.textContent = '전부 지우기'; }, 3000); return; }
      list = []; LS.set('money', list); armed = false; b.textContent = '지웠어'; paint();
    });
    paint();
  }

  /* ---------- 회화북 ---------- */
  function initTalk() {
    var s = S.talk; if (!s) return;
    var lang = (T.local && T.local.lang) || 'ja', voice = (s.voice || (T.local && T.local.voice) || 'ja-JP');
    var RED = arr(s.red);
    var favs = new Set(LS.get('talk', [])), slow = !!G.get('talk-slow', false), mode = 'all', q = '';
    var cats = arr(s.categories).map(function (c) {
      return { id: c.id, g: c.group || '', t: c.title, c: c.chip || c.title, n: c.note || '', items: arr(c.phrases).map(function (p, i) { return { id: c.id + '-' + i, ko: p.mean || '', jp: p[lang] || p.ja || '', pr: p.ko || '', tip: p.tip || '', cat: c.id }; }) };
    });
    var all = []; cats.forEach(function (c) { all = all.concat(c.items); });
    var byId = {}; all.forEach(function (it) { byId[it.id] = it; });
    var list = $('#pb-list'), chips = $('#pb-chips'), count = $('#pb-count'), empty = $('#pb-empty'), input = $('#pb-q'), qclear = $('#pb-qclear'), speedBtn = $('#pb-speed');
    function norm(x) { return String(x).toLowerCase().replace(/[\s\-·~ー、。・/()（）?!？！]/g, ''); }
    var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
    var ICON_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/></svg>';
    var ICON_STAR_O = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    var html = '';
    cats.forEach(function (c) {
      html += '<section class="pb-cat' + (c.id === (s.redCategory || 'sign') ? ' pb-sign-cat' : '') + '" id="c-' + esc(c.id) + '" data-cat="' + esc(c.id) + '"><div class="pb-cat-h"><span class="pb-eyebrow">' + esc(c.g) + (c.g ? ' · ' : '') + c.items.length + '개</span><div class="pb-plate"><h2>' + esc(c.t) + '</h2></div>' + (c.n ? '<p class="pb-note">' + esc(c.n) + '</p>' : '') + '</div><ul class="pb-rows">';
      c.items.forEach(function (it) {
        var red = RED.indexOf(it.jp) > -1;
        it.key = norm(it.ko + it.jp + it.pr + it.tip);
        html += '<li class="pb-row" data-id="' + it.id + '"><button class="pb-open" type="button" data-act="show"><span class="pb-ko">' + esc(it.ko) + '</span><span class="pb-jp' + (red ? ' pb-red' : '') + '" lang="' + lang + '">' + esc(it.jp) + '</span><span class="pb-pr">' + esc(it.pr) + '</span>' + (it.tip ? '<span class="pb-tip">' + esc(it.tip) + '</span>' : '') + '</button>' +
          '<div class="pb-acts"><button class="pb-ib pb-spk" type="button" data-act="say" aria-label="듣기">' + ICON_PLAY + '</button><button class="pb-ib pb-star" type="button" data-act="fav" aria-label="저장" aria-pressed="false">' + ICON_STAR_O + '</button></div></li>';
      });
      html += '</ul></section>';
    });
    list.innerHTML = html;
    var rowEls = {}, secEls = {};
    $$('.pb-row', list).forEach(function (r) { rowEls[r.dataset.id] = r; });
    $$('.pb-cat', list).forEach(function (x) { secEls[x.dataset.cat] = x; });
    function paintStar(id) { var b = rowEls[id] && $('.pb-star', rowEls[id]); if (!b) return; var on = favs.has(id); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? '저장 해제' : '저장'); b.innerHTML = on ? ICON_STAR : ICON_STAR_O; }
    all.forEach(function (it) { if (favs.has(it.id)) paintStar(it.id); });
    chips.innerHTML = '<button class="pb-chip pb-on" type="button" data-chip="all">전체</button><button class="pb-chip pb-fav" type="button" data-chip="fav">★ 저장한 표현</button>' + cats.map(function (c) { return '<button class="pb-chip" type="button" data-chip="' + esc(c.id) + '">' + esc(c.c) + '</button>'; }).join('');
    function setChip(k) { $$('.pb-chip', chips).forEach(function (b) { b.classList.toggle('pb-on', b.dataset.chip === k); }); var on = $('.pb-chip.pb-on', chips); if (on) { try { chips.scrollTo({ left: Math.max(0, on.offsetLeft - 16), behavior: 'smooth' }); } catch (e) {} } }
    function apply() {
      var nq = norm(q), shown = 0;
      cats.forEach(function (c) { var any = 0; c.items.forEach(function (it) { var ok = (mode !== 'fav' || favs.has(it.id)) && (!nq || it.key.indexOf(nq) > -1); rowEls[it.id].hidden = !ok; if (ok) { any++; shown++; } }); secEls[c.id].hidden = !any; });
      count.textContent = (q ? ('‘' + q + '’ 검색 결과 ') : (mode === 'fav' ? '저장한 표현 ' : '')) + shown + '개' + (!q && mode === 'all' ? ' 표현 · ' + cats.length + '개 카테고리' : '');
      if (!shown) { empty.hidden = false; empty.textContent = mode === 'fav' && !q ? '아직 저장한 표현이 없어요. 문장 옆 ☆를 누르면 여기에 모여요.' : '검색 결과가 없어요. 한글 뜻, 현지어, 발음 어느 걸로든 찾을 수 있어요.'; } else empty.hidden = true;
    }
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.pb-chip'); if (!b) return;
      var k = b.dataset.chip;
      if (k === 'fav') { mode = 'fav'; setChip('fav'); apply(); window.scrollTo({ top: $('#pb-bar').offsetTop, behavior: 'smooth' }); return; }
      if (mode === 'fav') { mode = 'all'; apply(); }
      setChip(k);
      if (k === 'all') { $('#talk').scrollIntoView({ behavior: 'smooth' }); return; }
      var sx = secEls[k]; if (sx && !sx.hidden) sx.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var tmr;
    input.addEventListener('input', function () { q = input.value.trim(); qclear.hidden = !q; clearTimeout(tmr); tmr = setTimeout(apply, 120); });
    qclear.addEventListener('click', function () { input.value = ''; q = ''; qclear.hidden = true; apply(); input.focus(); });
    var canSpeak = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window), vc = null;
    function pickVoice() { try { var vs = speechSynthesis.getVoices() || []; var pre = voice.slice(0, 2).toLowerCase(); vc = vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(pre) === 0; })[0] || null; } catch (e) {} }
    if (canSpeak) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
    function clean(t) { return t.replace(/〇〇/g, '').replace(/\s*\/\s*/g, '、').replace(/[()（）]/g, '、').replace(/(SA|PA|ETC|ATM|USB|NOC)/g, function (m) { return m.split('').join(' '); }); }
    function speak(t) { if (!canSpeak) return; try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(clean(t)); u.lang = voice; if (vc) u.voice = vc; u.rate = slow ? 0.6 : 0.9; speechSynthesis.speak(u); } catch (e) {} }
    function paintSpeed() { speedBtn.setAttribute('aria-pressed', slow ? 'true' : 'false'); speedBtn.textContent = slow ? '음성 느리게' : '음성 보통'; }
    paintSpeed();
    if (!canSpeak) { speedBtn.hidden = true; $$('.pb-spk').forEach(function (b) { b.hidden = true; }); $('#pb-show-spk').hidden = true; }
    speedBtn.addEventListener('click', function () { slow = !slow; G.set('talk-slow', slow); paintSpeed(); });
    var show = $('#pb-show'), cur = null, lastFocus = null;
    function openShow(it) { cur = it; lastFocus = document.activeElement; $('#pb-show-jp').textContent = it.jp; $('#pb-show-jp').setAttribute('lang', lang); $('#pb-show-pr').textContent = it.pr; $('#pb-show-ko').textContent = it.ko; var tip = $('#pb-show-tip'); tip.hidden = !it.tip; tip.textContent = it.tip || ''; show.hidden = false; document.body.style.overflow = 'hidden'; $('#pb-show-close').focus(); }
    function closeShow() { show.hidden = true; document.body.style.overflow = ''; try { speechSynthesis.cancel(); } catch (e) {} if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    $('#pb-show-close').addEventListener('click', closeShow);
    $('#pb-show-spk').addEventListener('click', function () { if (cur) speak(cur.jp); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !show.hidden) closeShow(); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var it = byId[b.closest('.pb-row').dataset.id]; if (!it) return;
      var a = b.dataset.act;
      if (a === 'show') openShow(it);
      else if (a === 'say') speak(it.jp);
      else if (a === 'fav') { if (favs.has(it.id)) favs.delete(it.id); else favs.add(it.id); LS.set('talk', Array.from(favs)); paintStar(it.id); if (mode === 'fav') apply(); }
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) { if (mode === 'fav' || q) return; ents.forEach(function (en) { if (en.isIntersecting) setChip(en.target.dataset.cat); }); }, { rootMargin: '-200px 0px -60% 0px' });
      Object.keys(secEls).forEach(function (k) { io.observe(secEls[k]); });
    }
    apply();
  }

  /* ---------- 테마 ---------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme-set') === (t || 'auto') ? 'true' : 'false'); });
  }

  /* ---------- 클릭 처리 (전부 위임) ---------- */
  function bindClicks() {
    document.addEventListener('click', function (e) {
      var tm = e.target.closest('[data-tmap]');
      if (tm) { copyText(tm.getAttribute('data-tmap')); toast('주소 복사하고 T맵 여는 중'); return; }
      var cp = e.target.closest('[data-copy]');
      if (cp) {
        e.preventDefault();
        var v = cp.getAttribute('data-copy');
        copyText(v, function () {
          if (cp.classList.contains('copy') || cp.hasAttribute('data-copypre')) { var o = cp.textContent; cp.textContent = '복사됨'; setTimeout(function () { cp.textContent = o === '복사됨' ? '복사' : o; }, 1400); }
          toast('복사됨 · ' + (v.length > 30 ? v.slice(0, 30) + '…' : v));
        }, function () { toast('복사가 막혔어. 길게 눌러서 복사해: ' + v); });
        return;
      }
      var cpre = e.target.closest('[data-copypre]');
      if (cpre) { var pre = cpre.closest('.sh-prompt').querySelector('pre'); copyText(pre.textContent, function () { cpre.textContent = '복사됨'; setTimeout(function () { cpre.textContent = '복사'; }, 1600); }); return; }
      var th = e.target.closest('[data-theme-set]');
      if (th) { var t = th.getAttribute('data-theme-set'); G.set('theme', t); applyTheme(t); return; }
      var tg = e.target.closest('[data-toggle]');
      if (tg) {
        var id = tg.getAttribute('data-toggle'), det = document.getElementById('det-' + id); if (!det) return;
        UI.open = UI.open || {}; var open = det.hidden; det.hidden = !open; if (open) UI.open[id] = 1; else delete UI.open[id]; LS.set('ui', UI);
        tg.setAttribute('aria-expanded', String(open)); tg.innerHTML = (open ? '접기' : '자세히') + IC.chev; return;
      }
      var dn = e.target.closest('[data-done]');
      if (dn) {
        var rid = dn.getAttribute('data-done'), row = dn.closest('.row'), st = LS.get('plan', {});
        var on = !st[rid]; if (on) st[rid] = 1; else delete st[rid]; LS.set('plan', st);
        row.classList.toggle('checked', on); dn.setAttribute('aria-pressed', String(on));
        updateRing(row.closest('article').getAttribute('data-day')); updateNextbar(); return;
      }
      var tb = e.target.closest('#now-tel');
      if (tb) { var tv = tb.getAttribute('data-v'), sp = tb.lastChild; copyText(tv, function () { sp.textContent = '복사됨'; setTimeout(function () { sp.textContent = tv; }, 1400); }); return; }
      if (e.target.closest('#now-plan')) { go('plan'); if (focusRow) { showDay(focusRow.day); setTimeout(function () { focusRow.el.scrollIntoView({ block: 'center' }); }, 30); } return; }
      var st2 = e.target.closest('.stamps [data-day]');
      if (st2) { go('plan'); showDay(st2.getAttribute('data-day')); return; }
      var pk = e.target.closest('.daypick [data-day]');
      if (pk) { showDay(pk.getAttribute('data-day')); window.scrollTo(0, 0); return; }
      var b = e.target.closest('[data-go]');
      if (b) {
        e.preventDefault(); go(b.getAttribute('data-go'));
        var j = b.getAttribute('data-jump'); if (j) { var el = document.getElementById(j); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30); }
      }
    });
  }

  /* ---------- 오프라인 저장 요청 ---------- */
  function cacheTrip() {
    if (!('serviceWorker' in navigator)) return;
    var urls = [BASE + 'trip.json'];
    $$('#app img[src]').forEach(function (i) { urls.push(i.getAttribute('src')); });
    $$('#app iframe[src]').forEach(function (i) { urls.push(i.getAttribute('src')); });
    if (T.cover && T.cover.image) urls.push(asset(T.cover.image));
    navigator.serviceWorker.ready.then(function (reg) { if (reg.active) reg.active.postMessage({ type: 'cache-urls', urls: urls }); }).catch(function () {});
  }

  /* =====================================================================
     시작
     ===================================================================== */
  /* 비어 있는 섹션은 탭을 안 만듦 (new-trip 뼈대의 빈 칸들) */
  function hasContent(id, s) {
    if (id === 'home') return true;
    if (s.page) return true;
    if (id === 'money' && s.ledger !== false) return true;
    if (id === 'plan') return arr(s.days).length > 0;
    return ['groups', 'items', 'categories', 'contacts', 'blocks', 'top'].some(function (k) {
      if (k === 'groups') return arr(s.groups).some(function (g) { return arr(g.items).length || arr(g.blocks).length; });
      return arr(s[k]).length > 0;
    });
  }
  function fail(msg) {
    document.title = '여행을 못 찾았어 · BK Trip';
    ROOT.innerHTML = '<div class="notfound"><h1>여행을 못 찾았어</h1><p>' + msg + '</p><a class="btn primary" href="/">BK Trip 홈으로</a></div>';
    NAV.hidden = true;
  }
  function start(data) {
    T = data;
    var secs = T.sections || {};
    Object.keys(secs).forEach(function (k) { if (secs[k] && SEC[k] && k !== 'more' && hasContent(k, secs[k])) S[k] = secs[k]; });
    S.home = S.home || {};
    CUR = T.currency || {};
    UI = LS.get('ui', {});
    document.title = T.title + ' · BK Trip';
    var mt = document.querySelector('meta[name="description"]'); if (mt) mt.setAttribute('content', stripTags(T.summary || T.subtitle || T.title));
    if (T.local && T.local.lang) document.documentElement.setAttribute('data-local', T.local.lang);

    buildNav();
    var out = renderHome();
    if (S.plan) out += renderPlan();
    if (S.eat) out += renderEatLike('eat');
    if (S.wish) out += renderEatLike('wish');
    if (S.talk) out += renderTalk();
    if (S.shoot) out += renderShoot();
    if (S.stay) out += renderStay();
    if (S.todo) out += renderList('todo');
    if (S.pack) out += renderList('pack');
    if (S.move) out += renderSimple('move');
    if (S.money) out += renderMoney();
    if (S.planb) out += renderPlanb();
    if (S.sos) out += renderSos();
    arr(T.extra).forEach(function (p) { out += renderExtra(p); });
    out += renderMore();
    ROOT.innerHTML = out;

    panels = $$('#app > section.panel'); ids = panels.map(function (p) { return p.id; });
    days = $$('#plan article.day'); picks = $$('.daypick button');
    rows = $$('#plan .row[data-at]').map(function (r) {
      var art = r.closest('article'), di = +art.getAttribute('data-day') - 1, d = S.plan.days[di];
      var at = r.getAttribute('data-at'); var t = $('.t', r);
      return { el: r, at: Date.parse(at + ':00' + (T.tz || '+09:00')), day: String(di + 1), date: d.date, title: t ? t.innerHTML.replace(/<span class="tag[^"]*">.*?<\/span>/g, '').replace(/<span class="emo"[^>]*>.*?<\/span>/, '') : '', time: ($('time', r).firstChild || {}).textContent || '' };
    }).sort(function (a, b) { return a.at - b.at; });
    focusRow = rows[0] || null;

    bindClicks();
    initChecks();
    initLedger();
    initTalk();
    applyTheme(G.get('theme', 'auto'));
    tick(); setInterval(tick, 60000);

    var today = localToday(), todayIdx = null;
    if (S.plan) arr(S.plan.days).forEach(function (d, i) { if (d.date === today) todayIdx = String(i + 1); });
    if (days.length) showDay(todayIdx || UI.day || '1');
    var hash = (location.hash || '').replace('#', '');
    go(ids.indexOf(hash) > -1 ? hash : (UI.tab && ids.indexOf(UI.tab) > -1 ? UI.tab : 'home'), true);
    window.addEventListener('hashchange', function () { var h = (location.hash || '').replace('#', ''); if (ids.indexOf(h) > -1) go(h); });
    document.documentElement.classList.add('ready');
    cacheTrip();
  }

  if (!SLUG || !/^[a-z0-9][a-z0-9-]*$/.test(SLUG)) { location.replace('/'); return; }
  applyTheme(G.get('theme', 'auto'));
  fetch(BASE + 'trip.json').then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(start, function (e) {
    fail(String(e.message) === '404' ? '"' + esc(SLUG) + '" 여행이 아직 없어. 주소를 다시 확인해줘.' : '불러오지 못했어. 인터넷 연결을 확인하고 다시 열어줘. (한 번 열었던 여행은 오프라인에서도 보여)');
  });
})();
