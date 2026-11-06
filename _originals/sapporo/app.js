window.SP_INIT = function () {
  var CHILD = { stay: 'more', todo: 'more', pack: 'more', car: 'more', taxi: 'more', money: 'more', sos: 'more', wish: 'eat' };
  var panels = Array.prototype.slice.call(document.querySelectorAll('section.panel'));
  var ids = panels.map(function (p) { return p.id; });
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('.nav [data-go]'));
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- 내비 전화번호 (구글 지도 2026.10.15 확인) ---------- */
  var TEL = {"北海道ラーメン道場 新千歳空港":"0123-23-0111","グルメ回転寿司 函太郎 新千歳空港":"0123-25-3310","57番寿司 新千歳空港":"0123-45-6767","きのとや 新千歳空港店":"0123-29-6161","札幌農学校 新千歳空港":"050-5897-0394","タイムズカー 新千歳空港店":"0123-45-8756","山線鉄橋 支笏湖":"0123-25-2404","北の美味もん店 ヘキスイ 支笏湖":"0123-25-4115","定山渓 ゆらく草庵":"011-595-3001","食堂こんの 定山渓":"011-598-2759","北のかっぱ 定山渓":"011-598-5151","松尾ジンギスカン 定山渓":"011-598-3673","セイコーマート 定山渓温泉":"011-598-4333","二見吊橋 定山渓":"011-598-2012","小樽市観光駐車場":"0134-24-9477","おたる政寿司 ぜん庵":"0134-64-7030","政寿司 本店 小樽":"0134-64-1101","伊勢鮨 小樽":"0134-23-1425","なると本店 小樽":"0134-32-3280","北一硝子 三号館":"0134-33-1993","小樽オルゴール堂 本館":"0134-22-1108","LeTAO 本店 小樽":"0120-314-521","小樽運河クルーズ":"0134-31-1733","京王プラザホテル札幌":"011-271-0111","RAZAN焼肉レストラン すすきの南4条店":"011-211-8400","根室花まる JRタワーステラプレイス店":"011-209-5330","根室花まる 大同生命札幌ビルmiredo店":"011-218-7870","ポケモンセンターサッポロ":"011-232-3212","きのとや 大丸札幌店":"011-252-6161","雪印パーラー 札幌本店":"011-251-7530","北菓楼 札幌本館":"0800-500-0318","きのとや大通公園店 KINOTOYA cafe":"011-233-6161","六花亭 札幌本店":"0120-126-666","札幌市時計台":"011-231-0838","さっぽろテレビ塔":"011-241-1131","徳光珈琲 大通店":"011-281-1100","札幌三越":"011-271-3311","狸小路商店街":"011-241-5125","札幌千秋庵 本店":"011-205-0207","かに本家 札幌駅前本店":"011-222-0018","氷雪の門 札幌":"011-521-3046","海味 はちきょう 本店":"011-222-8940","スープカレー GARAKU sitatte sapporo店":"011-215-1717","パフェ、珈琲、酒、佐藤":"011-233-3007","夜パフェ専門店 パフェテリア ミル":"011-522-9432","MEGAドン・キホーテ 札幌狸小路本店":"0570-096-811","二条市場 札幌":"011-222-5308","北海道大学 イチョウ並木":"011-706-4680","ENEOS フレンドリー千歳SS":"0123-24-1177","北菓楼 新千歳空港店":"0123-46-2226","ペンネンノルデ 支笏湖":"0123-25-4020","支笏湖ビジターセンター":"0123-25-2404","定山源泉公園":"011-598-2012","大黒屋商店 定山渓":"011-598-2043","ジェイグラッセ 定山渓":"011-598-2323","エクスクラメーションベーカリー 定山渓":"011-252-7710","日本橋 寿司 小樽":"0134-33-3773","籔半 小樽":"0134-33-1212","滝波食堂 小樽":"0134-23-1426","澤崎水産 小樽":"0134-23-2112","運河倉庫 小樽":"0134-25-8810","世壱屋 小樽運河店":"0134-65-7251","北一硝子 三号館 北一ホール":"0134-33-1993","小樽かま栄 工場直売店":"0134-25-5802","六花亭 小樽運河店":"0120-126-666","大正硝子館 本店":"0134-32-5101","あまとう 小樽":"0134-22-3942","プレスカフェ 小樽":"0134-24-8028","成吉思汗だるま 本店":"011-552-6013","すみれ 札幌すすきの店":"011-200-4567","二条市場 大磯 札幌":"011-219-5252","えびそば一幻 総本店":"011-513-0098","札幌味噌ラーメン専門店 けやき すすきの本店":"011-552-4601","ISHIYA CAFÉ 札幌大通本店":"011-231-1483","札幌かに家 本店":"011-222-1117","四季 花まる すすきの店":"011-520-0870","炉ばた焼 ウタリ":"011-512-3570","パフェ、珈琲、酒、佐々木":"011-212-1375","夜パフェ専門店 Parfaiteria PaL":"011-200-0559","札幌ステラプレイス":"011-209-5100","大丸札幌店":"050-1780-6000","札幌海鮮丼専門店 すしどんぶり":"050-5448-6520","弟子屈ラーメン 元祖さっぽろラーメン横丁":"011-532-0007","一蘭 札幌すすきの店":"050-3733-3064","Suage Soup Curry 南4条西5":"011-233-2911","奥芝商店 実家":"011-596-6552","焼肉 しぶき 南3条西4":"011-221-0444","成吉思汗だるま 4・4店":"011-551-8844","Sapporo Jingisukan Hitsujiza":"011-600-0192","Lambguchi Kazuya":"080-3295-8277","Saburo Honten Sapporo":"011-200-9722","マジサンド 札幌":"011-207-6777","ラストミント 札幌 パンケーキ":"050-3116-4124","K.L.I.M すすきの":"011-206-0920","どんぐり ココノススキノ店":"011-206-0692","B2nd 札幌 南2条西3":"011-222-4283","THE GALLERY BOX SAPPORO":"070-1447-2833","札幌PARCO":"011-214-2111","世壱屋 札幌南2条店":"011-215-0808","丼兵衛 二条市場":"011-330-8859","スープカレー GARAKU 本店":"011-252-9843","奥芝商店 駅前創成寺":"011-207-0266","奥芝商店 時計台ビル":"011-590-4700","Izakaya Oiyo 札幌駅北3条店":"011-232-5777","どんぐり 大通店":"011-210-5252","JRタワー展望室 T38":"011-209-5500","セイコーマート 道庁北店":"011-241-7227","ほわん 定山渓 クレープ":"080-4505-1932","定団渓 定山渓 だんご":"011-215-1692","Birch 定山渓":"050-1722-1711","柳月 小樽 堺町":"0134-64-5222","回転寿しトリトン 栄町店":"011-731-3333","回転寿司 まつりや 山鼻店":"050-5267-7015","Sapporo Engine ラーメン":"011-215-1560","サンドリア 札幌":"011-512-5993"};
  function callOnly(t) { return /^(0120|0800|0570|050|070|080|090)/.test(t); }
  Array.prototype.forEach.call(document.querySelectorAll('a.pl'), function (a) {
    var q = null; try { q = new URL(a.href).searchParams.get('query'); } catch (e) {}
    var t = q && TEL[q]; if (!t || a.querySelector('.tel')) return;
    var x = callOnly(t);
    a.setAttribute('data-tel', t); if (x) a.setAttribute('data-telx', '1');
    var i = document.createElement('i'); i.className = 'tel' + (x ? ' x' : '');
    i.innerHTML = '<em>' + (x ? '전화' : '내비') + '</em>' + t;
    a.appendChild(i);
  });
  var telBtn = null, nowActs = document.querySelector('#now .now-acts');
  if (nowActs) {
    telBtn = document.createElement('button'); telBtn.type = 'button'; telBtn.className = 'btn'; telBtn.id = 'now-tel'; telBtn.hidden = true;
    telBtn.setAttribute('aria-label', '내비용 전화번호 복사');
    telBtn.innerHTML = '<em class="navi">내비</em><span></span>';
    var mb0 = document.getElementById('now-map'); nowActs.insertBefore(telBtn, mb0 ? mb0.nextSibling : null);
    telBtn.addEventListener('click', function () {
      var v = telBtn.getAttribute('data-v'), sp = telBtn.lastChild;
      try { navigator.clipboard.writeText(v).then(function () { sp.textContent = '복사됨'; setTimeout(function () { sp.textContent = v; }, 1400); }, function () {}); } catch (e) {}
    });
  }
  function telOf(r) { if (!r) return null; var a = r.el.querySelector('a.pl[data-tel]:not([data-telx])'); return a ? a.getAttribute('data-tel') : null; }

  function go(id, keepScroll) {
    if (ids.indexOf(id) < 0) id = 'home';
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    var navId = CHILD[id] || id;
    navBtns.forEach(function (b) { if (b.getAttribute('data-go') === navId) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    store('sp-tab', id);
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    if (!keepScroll) window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (!b) return;
    e.preventDefault();
    go(b.getAttribute('data-go'));
    var j = b.getAttribute('data-jump');
    if (j) { var el = document.getElementById(j); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30); }
  });

  /* ---------- 일차 전환 ---------- */
  var days = Array.prototype.slice.call(document.querySelectorAll('#plan article.day'));
  var pick = Array.prototype.slice.call(document.querySelectorAll('.daypick button'));
  function showDay(n) {
    n = String(n);
    days.forEach(function (d) { d.hidden = d.getAttribute('data-day') !== n; });
    pick.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-day') === n ? 'true' : 'false'); });
    store('sp-day', n);
  }
  pick.forEach(function (b) { b.addEventListener('click', function () { showDay(b.getAttribute('data-day')); window.scrollTo(0, 0); }); });
  Array.prototype.forEach.call(document.querySelectorAll('.stamps [data-day]'), function (b) {
    b.addEventListener('click', function () { go('plan'); showDay(b.getAttribute('data-day')); });
  });

  /* ---------- 지금 · 다음 ---------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll('#plan .row[data-at]')).map(function (r) {
    return { el: r, at: Date.parse(r.getAttribute('data-at') + ':00+09:00'), day: r.closest('article').getAttribute('data-day'), title: (r.querySelector('.t') || {}).textContent || '', time: (r.querySelector('time') || {}).textContent || '' };
  }).sort(function (a, b) { return a.at - b.at; });
  var DAYNAME = { 1: '10월 17일 토요일', 2: '10월 18일 일요일', 3: '10월 19일 월요일', 4: '10월 20일 화요일' };
  var dayToday = null;
  function mapOf(r) { var a = r && r.el.querySelector('a.pl'); return a ? a.href : null; }
  function fmtIn(ms) { var m = Math.round(ms / 60000); if (m < 60) return m + '분 뒤'; var h = Math.floor(m / 60); m = m % 60; return h + '시간' + (m ? ' ' + m + '분' : '') + ' 뒤'; }
  var focusRow = rows[0];
  function tick() {
    var now = Date.now();
    var kst = new Date(now + 9 * 3600000);
    var ymd = kst.toISOString().slice(0, 10);
    var dmap = { '2026-10-17': '1', '2026-10-18': '2', '2026-10-19': '3', '2026-10-20': '4' };
    dayToday = dmap[ymd] || null;
    pick.forEach(function (b) { b.classList.toggle('today', b.getAttribute('data-day') === dayToday); });
    var dd = document.getElementById('dday');
    var dep = Date.UTC(2026, 9, 17), today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
    var diff = Math.round((dep - today) / 86400000);
    if (diff > 0) dd.innerHTML = '<b>D-' + diff + '</b><span>출발까지</span>';
    else if (dayToday) dd.innerHTML = '<b>' + dayToday + '일차</b><span>여행 중</span>';
    else dd.innerHTML = '<b>끝</b><span>다녀온 여행</span>';
    var prep = document.getElementById('prep'); if (prep) prep.hidden = diff <= 0;

    var cur = null, nxt = null;
    rows.forEach(function (r) { r.el.classList.remove('now', 'done'); if (r.at <= now) cur = r; else if (!nxt) nxt = r; });
    var box = document.getElementById('now'), lab = document.getElementById('now-label'), ti = document.getElementById('now-title'), sub = document.getElementById('now-sub');
    var nb = document.getElementById('next'), mapBtn = document.getElementById('now-map');
    var show = null;
    if (!cur) {
      lab.textContent = '첫 일정'; ti.textContent = rows[0].title; sub.textContent = DAYNAME[rows[0].day] + ' ' + rows[0].time;
      nb.hidden = true; show = rows[0]; focusRow = rows[0];
    } else if (!nxt && now - cur.at > 6 * 3600000) {
      lab.textContent = '여행 끝'; ti.textContent = '수고했어, 잘 다녀왔어'; sub.textContent = '체크리스트는 다음 여행 때 지우고 다시 써.';
      nb.hidden = true; show = null; focusRow = rows[rows.length - 1];
    } else {
      cur.el.classList.add('now');
      rows.forEach(function (r) { if (r.at < cur.at && r.day === cur.day) r.el.classList.add('done'); });
      lab.textContent = '지금'; ti.textContent = cur.title; sub.textContent = DAYNAME[cur.day] + ' ' + cur.time + '부터';
      if (nxt) {
        nb.hidden = false;
        document.getElementById('next-t').textContent = nxt.time;
        document.getElementById('next-w').textContent = '다음 · ' + nxt.title;
        document.getElementById('next-in').textContent = fmtIn(nxt.at - now) + (nxt.day !== cur.day ? ' (' + DAYNAME[nxt.day] + ')' : '');
      } else nb.hidden = true;
      show = mapOf(nxt) ? nxt : cur; focusRow = cur;
    }
    box.className = 'now d' + (focusRow ? focusRow.day : '1');
    var href = show ? mapOf(show) : null;
    if (href) { mapBtn.href = href; mapBtn.hidden = false; mapBtn.lastChild.textContent = show === nxt ? '다음 장소 지도' : '구글맵'; } else mapBtn.hidden = true;
    var tv = telOf(show);
    if (telBtn) { if (tv) { telBtn.setAttribute('data-v', tv); telBtn.lastChild.textContent = tv; telBtn.hidden = false; } else telBtn.hidden = true; }
  }
  document.getElementById('now-plan').addEventListener('click', function () {
    go('plan'); if (focusRow) { showDay(focusRow.day); setTimeout(function () { focusRow.el.scrollIntoView({ block: 'center' }); }, 30); }
  });
  tick(); setInterval(tick, 60000);

  var startDay = dayToday || store('sp-day') || '1';
  showDay(startDay);
  var hash = (location.hash || '').replace('#', '');
  go(ids.indexOf(hash) > -1 ? hash : (store('sp-tab') || 'home'), true);
  window.addEventListener('hashchange', function () { var h = (location.hash || '').replace('#', ''); if (ids.indexOf(h) > -1) go(h); });

  /* ---------- 체크리스트 ---------- */
  function refresh(group) {
    var boxes = document.querySelectorAll('[data-group="' + group + '"] input[type=checkbox]');
    var done = 0;
    boxes.forEach(function (b) { if (b.checked) done++; });
    var p = document.getElementById(group + '-progress');
    var bar = document.getElementById(group + '-bar');
    if (p) p.textContent = done + ' / ' + boxes.length + ' 완료';
    if (bar) bar.style.width = (boxes.length ? (done / boxes.length * 100) : 0) + '%';
    if (group === 'quick') { var pr = document.getElementById('prep'); if (pr) pr.classList.toggle('done', boxes.length > 0 && done === boxes.length); }
  }
  var GROUPS = ['todo', 'pack', 'quick'];
  var allBoxes = Array.prototype.slice.call(document.querySelectorAll('.check input[type=checkbox]'));
  function keyOf(b) { return b.getAttribute('data-link') || b.id; }
  function setKey(k, on) {
    store('hk-' + k, on ? '1' : '0');
    allBoxes.forEach(function (x) { if (keyOf(x) === k) x.checked = on; });
    GROUPS.forEach(refresh);
  }
  allBoxes.forEach(function (b) {
    if (store('hk-' + keyOf(b)) === '1') b.checked = true;
    b.addEventListener('change', function () { setKey(keyOf(b), b.checked); });
  });
  GROUPS.forEach(refresh);
  document.querySelectorAll('[data-reset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var g = btn.getAttribute('data-reset');
      document.querySelectorAll('[data-group="' + g + '"] input[type=checkbox]').forEach(function (b) { setKey(keyOf(b), false); });
    });
  });

  /* ---------- 촬영 콘티 체크 ---------- */
  var shBoxes = Array.prototype.slice.call(document.querySelectorAll('#shoot .sh-shots input[type=checkbox]'));
  function shRefresh() {
    var done = 0;
    shBoxes.forEach(function (b) { if (b.checked) done++; });
    var all = document.getElementById('sh-all'), bar = document.getElementById('sh-bar');
    if (all) all.textContent = done + ' / ' + shBoxes.length;
    if (bar) bar.style.width = (shBoxes.length ? done / shBoxes.length * 100 : 0) + '%';
    Array.prototype.forEach.call(document.querySelectorAll('#shoot [data-shg]'), function (g) {
      var bs = g.querySelectorAll('input[type=checkbox]'), d = 0;
      Array.prototype.forEach.call(bs, function (x) { if (x.checked) d++; });
      var p = g.querySelector('[data-shp]'); if (p) p.textContent = d + ' / ' + bs.length;
    });
  }
  shBoxes.forEach(function (b) {
    if (store('sh-' + b.id) === '1') b.checked = true;
    b.addEventListener('change', function () { store('sh-' + b.id, b.checked ? '1' : '0'); shRefresh(); });
  });
  shRefresh();
  var shReset = document.getElementById('sh-reset'), shArmed = false;
  if (shReset) shReset.addEventListener('click', function () {
    if (!shArmed) { shArmed = true; shReset.textContent = '한 번 더 누르면 지워져'; setTimeout(function () { shArmed = false; shReset.textContent = '체크 전부 지우기'; }, 3000); return; }
    shBoxes.forEach(function (b) { b.checked = false; store('sh-' + b.id, '0'); });
    shArmed = false; shReset.textContent = '지웠어'; shRefresh();
  });
  document.querySelectorAll('[data-copypre]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.closest('.sh-prompt').querySelector('pre');
      var ok = function () { btn.textContent = '복사됨'; setTimeout(function () { btn.textContent = '복사'; }, 1600); };
      var fallback = function () { var r = document.createRange(); r.selectNodeContents(pre); var w = window.getSelection(); w.removeAllRanges(); w.addRange(r); btn.textContent = '선택됨'; setTimeout(function () { btn.textContent = '복사'; }, 1600); };
      try { navigator.clipboard.writeText(pre.textContent).then(ok, fallback); } catch (e) { fallback(); }
    });
  });

  /* ---------- 복사 ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var v = btn.getAttribute('data-copy');
      var done = function () { btn.textContent = '복사됨'; setTimeout(function () { btn.textContent = '복사'; }, 1400); };
      var fallback = function () {
        var num = btn.parentElement.querySelector('.num');
        if (num && window.getSelection) { var r = document.createRange(); r.selectNodeContents(num); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        btn.textContent = '선택됨'; setTimeout(function () { btn.textContent = '복사'; }, 1400);
      };
      try { navigator.clipboard.writeText(v).then(done, fallback); } catch (err) { fallback(); }
    });
  });
};
