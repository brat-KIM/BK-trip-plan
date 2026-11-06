#!/usr/bin/env node
/* 새 여행 추가
   node scripts/new-trip.mjs <slug> "<제목>" <시작일> <종료일> [옵션]
   예) node scripts/new-trip.mjs osaka "오사카 2박 3일" 2027-01-10 2027-01-12 --region "일본 오사카" --country JP --with 여친

   하는 일
   1) trips/<slug>/trip.json 뼈대 생성 (날짜별 빈 일정 + 빈 섹션들)
   2) trips/<slug>/img/ 폴더 생성
   3) trips.json 목록에 자동 등록
   옵션: --region "<지역>"  --country <JP|KR|AU…>  --with "<동행1>,<동행2>"  --tz +09:00  --summary "<한줄 소개>"  --glyph "<커버 글자>"  --force(덮어쓰기) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESERVED = new Set(['app', 'trips', 'assets', 'scripts', 'index', 'sw', 'manifest', 'robots', '_originals', 'api', 'static']);
const PALETTES = [['#B83A2B', '#21607A'], ['#9A650C', '#4E5D6C'], ['#2F6B4F', '#B83A2B'], ['#21607A', '#9A650C'], ['#6E4A86', '#1F6F78'], ['#A8541E', '#2F6B4F'], ['#1F6F78', '#6E4A86'], ['#2563EB', '#D97706']];
const TZ = { JP: '+09:00', KR: '+09:00', TW: '+08:00', CN: '+08:00', HK: '+08:00', TH: '+07:00', VN: '+07:00', SG: '+08:00', AU: '+10:00', US: '-05:00', GB: '+00:00', FR: '+01:00' };
const LOCAL = { JP: { lang: 'ja', voice: 'ja-JP', label: '일본어' }, TW: { lang: 'zh', voice: 'zh-TW', label: '중국어' }, CN: { lang: 'zh', voice: 'zh-CN', label: '중국어' }, TH: { lang: 'th', voice: 'th-TH', label: '태국어' }, VN: { lang: 'vi', voice: 'vi-VN', label: '베트남어' }, FR: { lang: 'fr', voice: 'fr-FR', label: '프랑스어' } };
const CUR = { JP: { code: 'JPY', unit: '엔' }, TW: { code: 'TWD', unit: '대만달러' }, AU: { code: 'AUD', unit: '호주달러' }, US: { code: 'USD', unit: '달러' }, TH: { code: 'THB', unit: '바트' }, VN: { code: 'VND', unit: '동' }, FR: { code: 'EUR', unit: '유로' }, GB: { code: 'GBP', unit: '파운드' } };

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
const glyph = opt.glyph || title.replace(/\s.*$/, '').slice(0, 4);

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
list.trips.push({ slug, title, region: trip.region, start, end, companions, cover: { colors, glyph }, summary: trip.summary });
list.trips.sort((a, b) => (a.start < b.start ? 1 : -1));
fs.writeFileSync(listFile, JSON.stringify(list, null, 1) + '\n');

const n = days.length;
console.log('✓ trips/' + slug + '/trip.json 만들었어 (' + (n === 1 ? '당일치기' : (n - 1) + '박 ' + n + '일') + ', 일정 칸 ' + n + '개)');
console.log('✓ trips.json 에 등록했어');
console.log('→ 이제 trip.json 을 채우고 커밋·푸시하면 /' + slug + ' 로 열려.');
