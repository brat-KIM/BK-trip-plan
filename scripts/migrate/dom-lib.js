/* 원본 HTML → trip.json 블록 변환기 (브라우저 안에서 실행됨)
   scripts/migrate/convert.cjs 가 Playwright 페이지에 주입해서 씀. 한 번 쓰고 끝나는 이식용 코드. */
window.CONV = (function () {
  var TEL = window.__TEL || {};
  var warn = [];
  function txt(el) { return el ? el.textContent.trim().replace(/\s+/g, ' ') : ''; }
  function inner(el) { return el ? el.innerHTML.trim() : ''; }
  function dayOf(el) { var m = / d(\d)\b/.exec(' ' + (el.className || '') + ' '); return m ? +m[1] : undefined; }
  function kids(el) { return Array.prototype.slice.call(el.children); }
  function has(el, c) { return el.classList && el.classList.contains(c); }
  function clean(o) { Object.keys(o).forEach(function (k) { if (o[k] === undefined || o[k] === '' || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; }); return o; }

  function place(a) {
    var b = a.querySelector(':scope > b'), sp = a.querySelector(':scope > span');
    var p = {};
    var href = a.getAttribute('href');
    if (href) p.map = { google: href };
    var spanTxt = sp ? inner(sp) : '';
    var segs = spanTxt ? spanTxt.split(' · ') : [];
    if (b && b.getAttribute('lang')) {
      var lang = b.getAttribute('lang');
      p.name = {}; p.name[lang] = inner(b);
      if (segs.length) p.name.ko = segs.shift();
    } else {
      p.name = b ? inner(b) : '';
    }
    if (segs.length) p.info = segs.join(' · ');
    try { var q = new URL(href).searchParams.get('query'); if (q && TEL[q]) p.tel = TEL[q]; } catch (e) {}
    var extra = kids(a).filter(function (c) { return c !== b && c !== sp; });
    if (extra.length) warn.push('place extra: ' + a.outerHTML.slice(0, 120));
    return clean(p);
  }
  function places(el) { return Array.prototype.slice.call(el.querySelectorAll(':scope > a.pl')).map(place); }
  function tags(el) {
    return kids(el).map(function (t) {
      if (t.tagName === 'SPAN' && has(t, 'tag')) {
        var tone = Array.prototype.slice.call(t.classList).filter(function (c) { return c !== 'tag'; })[0];
        var h = inner(t);
        return tone ? tone + ':' + h : h;
      }
      return { html: t.outerHTML };
    });
  }
  // ul/ol/p 본문 → items/paras/html
  function body(el, skip) {
    var o = {};
    var cs = kids(el).filter(function (c) { return skip.indexOf(c) < 0; });
    if (cs.length === 1 && (cs[0].tagName === 'UL' || cs[0].tagName === 'OL') && !cs[0].className) {
      o.items = kids(cs[0]).map(inner); if (cs[0].tagName === 'OL') o.ordered = true; return o;
    }
    if (cs.length && cs.every(function (c) { return c.tagName === 'P' && !c.className; })) { o.paras = cs.map(inner); return o; }
    if (cs.length) o.html = cs.map(function (c) { return c.outerHTML; }).join('');
    return o;
  }
  function note(el) {
    var tone = has(el, 'warn') ? 'warn' : has(el, 'ok') ? 'ok' : undefined;
    var h = el.querySelector(':scope > h3');
    return clean(Object.assign({ type: 'note', tone: tone, id: el.id || undefined, title: h ? inner(h) : undefined }, body(el, [h])));
  }
  function callout(el) {
    var tone = has(el, 'lake') ? 'lake' : has(el, 'pick') ? 'pick' : undefined;
    var h = el.querySelector(':scope > strong');
    return clean(Object.assign({ type: 'callout', tone: tone, day: dayOf(el), id: el.id || undefined, title: h ? inner(h) : undefined }, body(el, [h])));
  }
  function card(el) {
    var c = { id: el.id || undefined };
    var rest = [];
    kids(el).forEach(function (k) {
      if (has(k, 'when')) c.label = inner(k);
      else if (k.tagName === 'H3') c.title = inner(k);
      else if (k.tagName === 'A' && has(k, 'pl')) c.place = place(k);
      else if (has(k, 'hrs')) c.hours = inner(k);
      else if (k.tagName === 'P' && has(k, 'memo')) c.memo = inner(k);
      else if (k.tagName === 'P' && !k.className) (c.paras = c.paras || []).push(inner(k));
      else if (has(k, 'tags')) c.tags = tags(k);
      else rest.push(k);
    });
    if (rest.length) {
      // 순서를 지키기 위해: 나머지가 있으면 문단과 함께 html 로
      if (rest.length === 1 && (rest[0].tagName === 'UL' || rest[0].tagName === 'OL') && !rest[0].className && !c.paras) { c.items = kids(rest[0]).map(inner); if (rest[0].tagName === 'OL') c.ordered = true; }
      else c.html = rest.map(function (r) { return r.outerHTML; }).join('');
    }
    if (c.paras && c.paras.length === 1) { c.text = c.paras[0]; delete c.paras; }
    return clean(c);
  }
  function contacts(el) {
    return clean({
      type: 'contacts', cls: has(el, 'navi') ? 'navi' : undefined, id: el.id || undefined,
      items: kids(el).map(function (ct) {
        var d = ct.querySelector(':scope > div'), c = {};
        c.who = inner(d.querySelector('.who'));
        var w = d.querySelector('.what'); if (w) c.what = inner(w);
        var num = d.querySelector('.num');
        var cp = ct.querySelector(':scope > .copy');
        if (num && num.tagName === 'A' && /^tel:/.test(num.getAttribute('href'))) { c.tel = txt(num); if (cp && cp.getAttribute('data-copy') !== c.tel) c.copy = cp.getAttribute('data-copy'); }
        else if (num && has(num, 'ja')) { c.say = inner(num); c.lang = num.getAttribute('lang') || 'ja'; if (cp && cp.getAttribute('data-copy') !== txt(num)) c.copy = cp.getAttribute('data-copy'); }
        else if (num && has(num, 'map')) { c.map = num.getAttribute('href'); c.mapLabel = inner(num); }
        return clean(c);
      })
    });
  }
  function steps(el) {
    return clean({ type: 'steps', day: dayOf(el), id: el.id || undefined, items: kids(el).map(function (li) { var d = li.querySelector(':scope > div'); var b = d.querySelector(':scope > b'), s = d.querySelector(':scope > span'); return clean({ title: inner(b), text: s ? inner(s) : undefined }); }) });
  }
  function grid(el) {
    var cs = kids(el);
    if (cs.every(function (c) { return has(c, 'card'); })) return clean({ type: 'cards', day: dayOf(el), id: el.id || undefined, items: cs.map(card) });
    return clean({ type: 'grid', day: dayOf(el), id: el.id || undefined, items: cs.map(function (c) { return has(c, 'note') ? note(c) : has(c, 'card') ? Object.assign({ type: 'card' }, card(c)) : { type: 'html', html: c.outerHTML }; }) });
  }
  function table(el) { var t = el.querySelector(':scope > table'); return clean({ type: 'table', id: el.id || undefined, html: t ? t.outerHTML : inner(el) }); }
  function weather(el) {
    var wx = el.querySelector('.wx'), cap = el.querySelector(':scope > .cap');
    return clean({ type: 'weather', days: kids(wx).map(function (d) { return clean({ day: dayOf(d), d: inner(d.querySelector('.d')), w: inner(d.querySelector('.w')), t: inner(d.querySelector('.t')), p: d.querySelector('.p') ? inner(d.querySelector('.p')) : undefined, s: d.querySelector('.s') ? inner(d.querySelector('.s')) : undefined }); }), cap: cap ? inner(cap) : undefined });
  }
  function foot(el) {
    var s = el.querySelector(':scope > strong'), ul = el.querySelector(':scope > ul');
    var rest = kids(el).filter(function (c) { return c !== s && c !== ul; });
    return clean({ type: 'foot', title: s ? inner(s) : undefined, items: ul ? kids(ul).map(inner) : undefined, html: rest.length ? rest.map(function (r) { return r.outerHTML; }).join('') : undefined });
  }

  // 일반 블록 변환: 컨테이너의 자식들을 블록 배열로
  function blocks(container, opts) {
    opts = opts || {};
    var out = [];
    kids(container).forEach(function (el) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      if (el.tagName === 'BUTTON' && (has(el, 'back') || has(el, 'reset'))) return;
      if (has(el, 'eatswitch') || has(el, 'menu')) return;
      if (has(el, 'jump') && opts.skipJump) return;
      if (has(el, 'sec-head')) {
        var h2 = el.querySelector(':scope > h2'), p = el.querySelector(':scope > p');
        var extra = kids(el).filter(function (c) { return c !== h2 && c !== p; });
        if (extra.length) warn.push('sec-head extra in ' + (opts.where || '') + ': ' + extra.map(function (e) { return e.className; }).join(','));
        out.push(clean({ type: 'head', id: el.id || undefined, title: h2 ? inner(h2) : undefined, text: p ? inner(p) : undefined }));
      }
      else if (has(el, 'answer')) out.push(callout(el));
      else if (has(el, 'note')) out.push(note(el));
      else if (has(el, 'grid2')) out.push(grid(el));
      else if (has(el, 'card')) out.push(Object.assign({ type: 'card' }, card(el)));
      else if (has(el, 'group-label')) out.push(clean({ type: 'group', id: el.id || undefined, day: dayOf(el), title: inner(el) }));
      else if (has(el, 'wish-have')) out.push({ type: 'places', label: inner(el.querySelector(':scope > .tag')), items: places(el.querySelector('.pls')) });
      else if (has(el, 'table-wrap')) out.push(table(el));
      else if (el.tagName === 'P' && has(el, 'swipe')) { var last = out[out.length - 1]; if (last && last.type === 'table') last.swipe = true; else out.push({ type: 'swipe' }); }
      else if (el.tagName === 'P' && has(el, 'cap')) out.push({ type: 'cap', text: inner(el) });
      else if (el.tagName === 'OL' && has(el, 'steps')) out.push(steps(el));
      else if (has(el, 'contacts')) out.push(contacts(el));
      else if (has(el, 'foot')) out.push(foot(el));
      else if (has(el, 'jump')) out.push({ type: 'jump', items: Array.prototype.slice.call(el.querySelectorAll('a')).map(function (a) { return { text: inner(a), href: a.getAttribute('href') }; }) });
      else if (has(el, 'quick')) out.push({ type: 'dial', items: kids(el).map(function (a) { return { k: inner(a.querySelector('.k')), v: inner(a.querySelector('.v')), tel: a.getAttribute('href').replace(/^tel:/, '') }; }) });
      else if (el.tagName === 'DIV' && !el.className && el.querySelector(':scope > .wx')) out.push(weather(el));
      else out.push({ type: 'html', html: el.outerHTML });
    });
    return out;
  }

  // 일정 하루
  function day(art, pickBtn) {
    var head = art.querySelector('.day-head'), st = head.querySelector('.stamp');
    var hd = head.querySelector(':scope > div');
    var wx = hd.querySelector('.wxline'), h3 = hd.querySelector('h3');
    var ps = Array.prototype.slice.call(hd.querySelectorAll(':scope > p')).filter(function (p) { return p !== wx; });
    var rowsEl = art.querySelectorAll('.rows > li');
    var date = null;
    var items = Array.prototype.slice.call(rowsEl).map(function (li) {
      var it = {};
      var time = li.querySelector(':scope > time'); it.time = inner(time);
      var d = li.querySelector(':scope > div');
      var extra = [];
      kids(d).forEach(function (k) {
        if (has(k, 't')) it.title = inner(k);
        else if (has(k, 'n')) it.note = inner(k);
        else if (has(k, 'pls')) it.places = places(k);
        else if (has(k, 'tags')) it.tags = tags(k);
        else extra.push(k.outerHTML);
      });
      if (extra.length) it.html = extra.join('');
      if (has(li, 'key')) it.key = true;
      if (has(li, 'fork')) it.fork = true;
      var at = li.getAttribute('data-at');
      if (at) { if (!date) date = at.slice(0, 10); if (at.slice(11) !== it.time) it.at = at; }
      return clean(it);
    });
    var rest = kids(art).filter(function (k) { return !has(k, 'day-head') && !has(k, 'rows') && !has(k, 'day-foot'); });
    if (rest.length) warn.push('day extra: ' + rest.map(function (r) { return r.className; }).join(','));
    var foot = art.querySelector('.day-foot');
    return clean({
      date: date, label: pickBtn ? inner(pickBtn.querySelector('span')) : undefined,
      stamp: clean({ top: inner(st.querySelector('.n')), place: inner(st.querySelector('.p')), small: st.querySelector('.p.sm') ? true : undefined }),
      weather: wx ? inner(wx) : undefined, title: inner(h3), summary: ps.map(inner).join('<br>') || undefined,
      items: items, foot: foot ? inner(foot) : undefined
    });
  }

  // 체크리스트 묶음 (cl-head + ul.check)
  function checkGroup(div) {
    var h = div.querySelector('.cl-head'), ul = div.querySelector('ul.check');
    return clean({
      title: inner(h.querySelector('h3')), due: h.querySelector('.due') ? inner(h.querySelector('.due')) : undefined,
      items: kids(ul).map(function (li) {
        var inp = li.querySelector('input'), sp = li.querySelector('label > span');
        var b = sp.querySelector(':scope > b'), s = sp.querySelector(':scope > .s');
        return clean({ id: inp.id, text: inner(b), sub: s ? inner(s) : undefined });
      })
    });
  }
  function isCheckGroup(el) { return el.tagName === 'DIV' && !el.className && el.querySelector(':scope > .cl-head') && el.querySelector(':scope > ul.check'); }

  return { blocks: blocks, day: day, place: place, places: places, card: card, tags: tags, checkGroup: checkGroup, isCheckGroup: isCheckGroup, contacts: contacts, callout: callout, note: note, weather: weather, inner: inner, txt: txt, dayOf: dayOf, kids: kids, has: has, clean: clean, warn: warn };
})();
