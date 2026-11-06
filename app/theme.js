/* =====================================================================
   BK Trip 테마 — 여행마다 "그 나라의 하늘 + 포스터 한 장"
   trip.json / trips.json 의 theme 값만 보고 하늘색·평면 포스터 그림을 그림.
   허브(index.html)와 여행 화면(app.js)이 같이 씀.

   theme = {
     preset: "mountains" | "coast" | "harbour" | "city",   // 그림 종류
     sky: ["#1B1020", "#4A1A2C", ...],                       // 하늘 그라데이션 (위 → 아래)
     sun, hill1, hill2, water, accent, accent2,              // 그림 색
     rails: true,                                            // coast 에 철길 추가
     glyph: "札幌", glyphFont: "dela" | "blackhan" | "limelight" | "mincho",
     poster: { paper, sun, hill1, hill2, water, accent2 }    // 허브 포스터 카드용 색 (종이 바탕)
   }
   ===================================================================== */
(function () {
  'use strict';
  var DEF = {
    preset: 'mountains',
    sky: ['#1B1020', '#4A1A2C', '#A63A2E', '#E58A55', '#3E5B5E'],
    sun: '#FF8A5B', hill1: '#6B3242', hill2: '#2C2F3A', water: '#2F6E8A',
    accent: '#FF6B4A', accent2: '#E8B032', ink: '#1B2A49',
    poster: { paper: '#F3E7D3', sun: '#D7381F', hill1: '#5C7A5A', hill2: '#2E4A3A', water: '#2F6E8A' }
  };
  function merge(t) {
    t = t || {};
    var o = {}, k;
    for (k in DEF) o[k] = DEF[k];
    for (k in t) if (t[k] != null) o[k] = t[k];
    o.poster = {};
    for (k in DEF.poster) o.poster[k] = DEF.poster[k];
    if (t.poster) for (k in t.poster) o.poster[k] = t.poster[k];
    return o;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* 그림 — 390 x 220 좌표, 바닥이 아래에 붙음. mode: "sky"(하늘 위) | "poster"(종이 바탕) */
  var PRESET = {
    mountains: function (c) {
      return '<circle cx="300" cy="72" r="80" fill="' + c.sun + '" opacity=".16"/>' +
        '<circle cx="300" cy="72" r="42" fill="' + c.sun + '"/>' +
        '<path d="M0 150 L66 80 L118 130 L188 60 L248 126 L304 92 L390 148 L390 220 L0 220Z" fill="' + c.hill1 + '"/>' +
        '<path d="M0 190 L58 148 L130 176 L200 136 L272 180 L336 154 L390 172 L390 220 L0 220Z" fill="' + c.hill2 + '"/>' +
        '<rect x="0" y="196" width="390" height="24" fill="' + c.water + '"/>' +
        '<path d="M40 206 Q195 198 350 206" stroke="#F3E7D3" stroke-width="1.5" fill="none" opacity=".45"/>';
    },
    coast: function (c, t) {
      var s = '<circle cx="282" cy="96" r="74" fill="' + c.sun + '" opacity=".14"/>' +
        '<circle cx="282" cy="96" r="40" fill="' + c.sun + '"/>' +
        '<path d="M0 140 C40 118 84 108 134 116 C164 106 206 108 238 140 Z" fill="' + c.hill2 + '"/>' +
        '<path d="M300 138 C324 124 352 120 390 126 L390 140 Z" fill="' + c.hill2 + '"/>' +
        '<rect x="0" y="138" width="390" height="82" fill="' + c.water + '"/>' +
        '<line x1="258" y1="156" x2="306" y2="156" stroke="#FFE3B4" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
        '<line x1="266" y1="170" x2="298" y2="170" stroke="#FFE3B4" stroke-width="3" stroke-linecap="round" opacity=".45"/>';
      if (t.rails) s += '<path d="M118 220 L180 140 M262 220 L200 140" stroke="' + c.accent2 + '" stroke-width="4"/>' +
        '<path d="M136 204 L244 204 M150 186 L230 186 M162 170 L218 170 M172 156 L208 156 M180 146 L200 146" stroke="' + c.accent2 + '" stroke-width="2.5"/>';
      return s;
    },
    harbour: function (c) {
      var rays = '';
      [[70, 104], [160, 194], [236, 270], [320, 354]].forEach(function (r) { rays += '<path d="M195 200 L' + r[0] + ' -40 L' + r[1] + ' -40Z"/>'; });
      rays += '<path d="M195 200 L0 40 L0 4Z"/><path d="M195 200 L390 40 L390 4Z"/>';
      return '<g fill="' + c.sun + '" opacity=".34">' + rays + '</g>' +
        '<path d="M-12 200 C88 50 302 50 402 200" fill="none" stroke="' + c.accent + '" stroke-width="13" stroke-linecap="round"/>' +
        '<path d="M-12 200 C88 50 302 50 402 200" fill="none" stroke="' + c.ink + '" stroke-width="3"/>' +
        '<path d="M60 200 L60 138 M128 200 L128 100 M195 200 L195 88 M262 200 L262 100 M330 200 L330 138" stroke="' + c.ink + '" stroke-width="3"/>' +
        '<path d="M238 200 L272 152 L294 200 Z M290 200 L322 144 L348 200 Z M342 200 L368 162 L390 180 L390 200 Z" fill="' + (c.hill1 || '#F3E7D3') + '"/>' +
        '<rect x="0" y="198" width="390" height="22" fill="' + c.water + '"/>' +
        '<path d="M30 210 Q195 202 360 210" stroke="' + c.sun + '" stroke-width="1.5" fill="none" opacity=".5"/>';
    },
    city: function (c) {
      var b = '', xs = [[0, 120, 40], [40, 92, 34], [74, 140, 28], [102, 70, 44], [146, 110, 30], [176, 54, 38], [214, 96, 34], [248, 128, 26], [274, 80, 42], [316, 112, 36], [352, 90, 38]];
      xs.forEach(function (x, i) { b += '<rect x="' + x[0] + '" y="' + x[1] + '" width="' + x[2] + '" height="' + (200 - x[1]) + '" fill="' + (i % 2 ? c.hill1 : c.hill2) + '"/>'; });
      var w = '';
      xs.forEach(function (x, i) { if (i % 3 === 0) for (var y = x[1] + 12; y < 186; y += 18) w += '<rect x="' + (x[0] + 8) + '" y="' + y + '" width="6" height="6" fill="' + c.sun + '" opacity=".75"/>'; });
      return '<circle cx="300" cy="64" r="70" fill="' + c.sun + '" opacity=".14"/><circle cx="300" cy="64" r="34" fill="' + c.sun + '"/>' + b + w +
        '<rect x="0" y="198" width="390" height="22" fill="' + c.water + '"/>';
    }
  };

  function art(theme, mode, h) {
    var t = merge(theme), c = {}, k;
    for (k in t) if (typeof t[k] === 'string') c[k] = t[k];
    if (mode === 'poster') for (k in t.poster) c[k] = t.poster[k];
    var fn = PRESET[t.preset] || PRESET.mountains;
    var bg = mode === 'poster' ? '<rect x="-20" y="-60" width="430" height="300" fill="' + (t.poster.paper || '#F3E7D3') + '"/>' : '';
    return '<svg class="art" viewBox="0 0 390 ' + (h || 220) + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<g transform="translate(0 ' + ((h || 220) - 220) + ')">' + bg + fn(c, t) + '</g></svg>';
  }
  function sky(theme) {
    var t = merge(theme), s = t.sky, n = s.length;
    return 'linear-gradient(176deg,' + s.map(function (col, i) { return col + ' ' + Math.round(i / Math.max(1, n - 1) * 100) + '%'; }).join(',') + ')';
  }
  var GLYPH = { dela: "'Dela Gothic One',sans-serif", blackhan: "'Black Han Sans',sans-serif", limelight: "'Limelight',serif", mincho: "'Zen Old Mincho',serif" };
  function vars(theme) {
    var t = merge(theme);
    return {
      '--sky': sky(t),
      '--accent': t.accent,
      '--accent2': t.accent2,
      '--deep': t.ink,
      '--t1': t.accent, '--t2': t.water, '--t3': t.hill1, '--t4': t.accent2, '--t5': t.hill2,
      '--glyph-font': GLYPH[t.glyphFont] || GLYPH.blackhan,
      /* 포스터 큰 글자: 종이가 밝으면 남색 글자 + 해 색 그림자, 어두우면 크림 글자 + 남색 그림자 */
      '--pg-c': light(t.poster.paper) ? t.ink : '#F3E7D3',
      '--pg-s': light(t.poster.paper) ? (t.poster.sun || t.accent) : t.ink
    };
  }
  function light(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return true;
    var n = parseInt(m[1], 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.4;
  }
  function apply(el, theme) { var v = vars(theme); for (var k in v) el.style.setProperty(k, v[k]); }

  window.BKTheme = { merge: merge, art: art, sky: sky, vars: vars, apply: apply, esc: esc, presets: Object.keys(PRESET) };
})();
