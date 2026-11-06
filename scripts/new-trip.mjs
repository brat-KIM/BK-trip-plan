#!/usr/bin/env node
/* 새 여행 추가
   node scripts/new-trip.mjs <slug> "<제목>" <시작일> <종료일> [옵션]
   예) node scripts/new-trip.mjs osaka "오사카 2박 3일" 2027-01-10 2027-01-12 --region "일본 오사카" --country JP --with 여친

   하는 일
   1) trips/<slug>/trip.json 뼈대 생성 (날짜별 빈 일정 + 빈 섹션들)
   2) trips/<slug>/img/ 폴더 생성
   3) trips.json 목록에 자동 등록
   옵션: --region "<지역>"  --country <JP|KR|AU…>  --with "<동행1>,<동행2>"  --tz +09:00  --summary "<한줄 소개>"
         --glyph "<커버 큰 글자>"  --theme <sunset|night|jade|harbour|coast|dawn>  --force(덮어쓰기)
   테마(하늘색·포스터 그림)는 나라 기준으로 자동으로 골라 넣음. 나중에 trip.json 의 theme 만 고치면 바뀜. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESERVED = new Set(['app', 'trips', 'assets', 'scripts', 'index', 'sw', 'manifest', 'robots', '_originals', 'api', 'static']);
const PALETTES = [['#B83A2B', '#21607A'], ['#9A650C', '#4E5D6C'], ['#2F6B4F', '#B83A2B'], ['#21607A', '#9A650C'], ['#6E4A86', '#1F6F78'], ['#A8541E', '#2F6B4F'], ['#1F6F78', '#6E4A86'], ['#2563EB', '#D97706']];
const TZ = { JP: '+09:00', KR: '+09:00', TW: '+08:00', CN: '+08:00', HK: '+08:00', TH: '+07:00', VN: '+07:00', SG: '+08:00', AU: '+10:00', US: '-05:00', GB: '+00:00', FR: '+01:00' };
const LOCAL = { JP: { lang: 'ja', voice: 'ja-JP', label: '일본어' }, TW: { lang: 'zh', voice: 'zh-TW', label: '중국어' }, CN: { lang: 'zh', voice: 'zh-CN', label: '중국어' }, TH: { lang: 'th', voice: 'th-TH', label: '태국어' }, VN: { lang: 'vi', voice: 'vi-VN', label: '베트남어' }, FR: { lang: 'fr', voice: 'fr-FR', label: '프랑스어' } };
const CUR = { JP: { code: 'JPY', unit: '엔' }, TW: { code: 'TWD', unit: '대만달러' }, AU: { code: 'AUD', unit: '호주달러' }, US: { code: 'USD', unit: '달러' }, TH: { code: 'THB', unit: '바트' }, VN: { code: 'VND', unit: '동' }, FR: { code: 'EUR', unit: '유로' }, GB: { code: 'GBP', unit: '파운드' } };

/* 디자인 D 테마 — 나라별 기본값. 색·그림은 trips/_schema.md 의 theme 항목, 예시는 scripts/themes.json */
const THEMES = {
  sunset: { preset: 'mountains', sky: ['#1B1020', '#4A1A2C', '#A63A2E', '#E58A55', '#3E5B5E'], sun: '#FF8A5B', hill1: '#6B3242', hill2: '#2C2F3A', water: '#2F6E8A', accent: '#FF6B4A',
    poster: { paper: '#F3E7D3', sun: '#D7381F', hill1: '#5C7A5A', hill2: '#2E4A3A', water: '#2F6E8A' } },
  night: { preset: 'city', sky: ['#0B1030', '#25205A', '#5B2A7A', '#C24C7A', '#2A3A6A'], sun: '#FFD36E', hill1: '#1E2448', hill2: '#2C3466', water: '#1A2550', accent: '#FF5E8A',
    poster: { paper: '#F3E7D3', sun: '#E8463A', hill1: '#1B2A49', hill2: '#2F6E8A', water: '#1B2A49' } },
  jade: { preset: 'mountains', sky: ['#0E2A2A', '#1F5A52', '#4E9A7A', '#C9D9A0', '#3A6A6A'], sun: '#FFE9A8', hill1: '#2E5A48', hill2: '#1C3A32', water: '#2F6E8A', accent: '#F2B544',
    poster: { paper: '#E9F0E2', sun: '#E8A23A', hill1: '#3C7A5A', hill2: '#1C3A32', water: '#2F6E8A' } },
  harbour: { preset: 'harbour', sky: ['#0A2A66', '#1D63C2', '#4C9BEB', '#8FD0FF', '#1D5AAE'], sun: '#F4D9A6', hill1: '#F3E7D3', water: '#0A2F6A', ink: '#0A2A66', accent: '#FF6B4A',
    poster: { paper: '#0E4DA4', sun: '#F4D9A6', water: '#0A2F6A' } },
  coast: { preset: 'coast', sky: ['#2A2340', '#8A4A4E', '#E07A4A', '#F2A05B', '#B04A3A'], sun: '#E25D3A', hill1: '#1B2A49', hill2: '#1B2A49', water: '#2C3E52', accent: '#E8B032', accent2: '#E8B032',
    poster: { paper: '#E8B032', sun: '#E25D3A', hill2: '#1B2A49', water: '#1B2A49', accent2: '#E8B032' } },
  dawn: { preset: 'coast', sky: ['#1E2A4A', '#4A5A8A', '#B07A9A', '#F2B6A0', '#5A7AA0'], sun: '#FFE0B0', hill1: '#2A3A5A', hill2: '#2A3A5A', water: '#3A5A80', accent: '#FF7A6A',
    poster: { paper: '#F6E3DA', sun: '#F07A5A', hill2: '#2A3A5A', water: '#3A5A80' } }
};
const THEME_BY_COUNTRY = { JP: 'sunset', KR: 'coast', TW: 'night', CN: 'night', HK: 'night', SG: 'night', US: 'night', TH: 'jade', VN: 'jade', AU: 'harbour', NZ: 'jade', GB: 'dawn', FR: 'dawn', IT: 'coast', ES: 'coast' };

function die(msg) { console.error('✗ ' + msg); console.error('사용법: node scripts/new-trip.mjs <slug> "<제목>" <시작일 YYYY-MM-DD> <종료일 YYYY-MM-DD> [--region "지역"] [--country JP] [--with "여친"]'); process.exit(1); }

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { const k = argv[i].slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; opt[k] = v; }
  else pos.push(argv[i]);
}
const [slug, title, start, endArg] = pos;
const end = endArg || start;
if (!slug || !title || !start) die('slug, 제목, 시작일은 꼭 필요해.');
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) die('slug는 영어 소문자·숫자·하이픈만 돼. (예: osaka, jeju-2027)');
if (RESERVED.has(slug)) die('"' + slug + '"는 시스템이 쓰는 이름이라 못 써.');
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z'));
if (!isDate(start) || !isDate(end)) die('날짜는 2027-01-10 처럼 YYYY-MM-DD 로.');
if (end < start) die('종료일이 시작일보다 빨라.');

const dir = path.join(ROOT, 'trips', slug);
const file = path.join(dir, 'trip.json');
if (fs.existsSync(file) && !opt.force) die('trips/' + slug + '/trip.json 이 이미 있어. 덮어쓰려면 --force');

const country = String(opt.country || 'KR').toUpperCase();
const companions = opt.with ? String(opt.with).split(',').map((s) => s.trim()).filter(Boolean) : [];
let h = 0; for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
const colors = PALETTES[h % PALETTES.length];
const first = title.replace(/\s.*$/, '');
const glyph = opt.glyph || (/^[ -~]+$/.test(first) ? first.toUpperCase().slice(0, 8) : first.slice(0, 4));
const themeName = THEMES[opt.theme] ? opt.theme : THEME_BY_COUNTRY[country] || Object.keys(THEMES)[h % Object.keys(THEMES).length];
const glyphFont = /^[ -~]+$/.test(glyph) ? 'limelight' : /[가-힣]/.test(glyph) ? 'blackhan' : 'dela';
const theme = { ...JSON.parse(JSON.stringify(THEMES[themeName])), glyph, glyphFont };

const days = [];
for (let t = Date.parse(start + 'T00:00:00Z'), i = 0; t <= Date.parse(end + 'T00:00:00Z'); t += 86400000, i++) {
  days.push({ date: new Date(t).toISOString().slice(0, 10), label: '', title: '', summary: '', items: [] });
}

const trip = {
  _help: '필드 설명은 /trips/_schema.md. 빈 섹션은 화면에 안 나와. 채우면 탭이 생겨.',
  schema: 1,
  slug,
  title,
  subtitle: '',
  summary: opt.summary || '',
  region: opt.region || '',
  country,
  start,
  end,
  tz: opt.tz || TZ[country] || '+09:00',
  companions,
  ...(LOCAL[country] ? { local: LOCAL[country] } : {}),
  ...(CUR[country] ? { currency: { ...CUR[country], krw: 0 } } : {}),
  cover: { colors, glyph },
  theme,
  sections: {
    home: { hero: { flights: [] } },
    plan: { days },
    eat: { groups: [] },
    stay: { items: [] },
    move: { blocks: [] },
    todo: { head: { title: '출발 전 할 일' }, groups: [] },
    pack: { head: { title: '짐 체크리스트' }, groups: [] },
    money: { ledger: { budget: 0 }, blocks: [] },
    ...(LOCAL[country] ? { talk: { sign: { title: LOCAL[country].label + ' 회화' }, categories: [] } } : {}),
    planb: { items: [] },
    sos: { contacts: [] },
    shoot: { blocks: [] }
  },
  extra: []
};

fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
if (!fs.existsSync(path.join(dir, 'img', '.gitkeep'))) fs.writeFileSync(path.join(dir, 'img', '.gitkeep'), '');
fs.writeFileSync(file, JSON.stringify(trip, null, 1) + '\n');

const listFile = path.join(ROOT, 'trips.json');
const list = fs.existsSync(listFile) ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : { trips: [] };
list.trips = (list.trips || []).filter((t) => t.slug !== slug);
list.trips.push({ slug, title, region: trip.region, start, end, companions, cover: { colors, glyph }, theme, summary: trip.summary });
list.trips.sort((a, b) => (a.start < b.start ? 1 : -1));
fs.writeFileSync(listFile, JSON.stringify(list, null, 1) + '\n');

const n = days.length;
console.log('✓ trips/' + slug + '/trip.json 만들었어 (' + (n === 1 ? '당일치기' : (n - 1) + '박 ' + n + '일') + ', 일정 칸 ' + n + '개)');
console.log('✓ trips.json 에 등록했어 (테마: ' + themeName + ' · 커버 글자 “' + glyph + '”)');
console.log('→ 이제 trip.json 을 채우고 커밋·푸시하면 /' + slug + ' 로 열려.');
