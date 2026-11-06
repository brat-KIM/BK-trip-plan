# trip.json 필드 설명서

여행 하나 = `trips/<slug>/trip.json` 하나. 공통 렌더러(`/app/`)가 이 파일만 읽어서 화면을 그린다.
**있는 섹션만 탭이 생기고, 비어 있으면 안 보인다.** (`node scripts/new-trip.mjs`가 빈 칸 뼈대를 만들어 줌)

- 문자열에는 간단한 HTML을 써도 된다: `<b>`, `<small>`, `<br>`, `<span lang="ja">支笏湖</span>(시코쓰호)`, `<a href="…" target="_blank" rel="noopener">`
- 사진은 `trips/<slug>/img/` 에 넣고 `"img/파일.jpg"` 처럼 상대경로로 쓴다.
- 지도는 **링크만** 쓴다(유료 지도 API 안 씀). 구글맵/네이버지도 URL을 넣거나, `q`(검색어·주소)만 넣으면 자동으로 링크를 만든다.
- 사용자가 화면에서 입력하는 값(체크, 가계부, 회화 즐겨찾기)은 브라우저 `localStorage`의 `trip:<slug>:<항목>` 키에 저장된다. trip.json에는 안 들어간다.

---

## 1. 맨 위 (여행 기본 정보)

| 필드 | 예시 | 설명 |
|---|---|---|
| `schema` | `1` | 형식 버전. 그대로 둔다 |
| `slug` | `"sapporo"` | 주소 `/sapporo`. 영어 소문자·숫자·하이픈 |
| `title` | `"삿포로 3박 4일"` | 카드·탭 제목 |
| `subtitle` | `"10월 17일 토요일부터…"` | 홈 제목 아래 한 줄. 비우면 날짜·지역으로 자동 생성 |
| `summary` | `"렌터카 단풍 여행 · …"` | 허브 카드 한줄 소개 |
| `region` | `"일본 홋카이도"` | 허브 카드 커버에 표시 |
| `country` | `"JP"` / `"KR"` / `"AU"` | `KR`이면 지도=네이버, 길찾기=T맵 버튼. 그 외는 구글맵 |
| `start`, `end` | `"2026-10-17"` | 여행 시작·종료일. 허브의 진행중/다가오는/지난 분류, D-day 계산 |
| `tz` | `"+09:00"` | 현지 시차. "지금·다음 일정" 계산용 |
| `companions` | `["여친"]` | 동행 |
| `local` | `{"lang":"ja","voice":"ja-JP","label":"일본어"}` | 현지어. 회화 음성·`{ja, ko}` 필드에 씀 |
| `currency` | `{"code":"JPY","unit":"엔","krw":9.4}` | 가계부 통화. `krw`=1단위가 몇 원인지(대충, 직접 고쳐서 씀) |
| `telNavi` | `true` | 일본 렌트카처럼 내비에 전화번호를 찍는 여행이면 장소 칩에 "내비 번호" 배지 |
| `theme` | 아래 "테마" 참고 | **디자인 D: 그 나라 하늘색 + 평면 포스터 그림 + 커버 큰 글자.** 여행 화면 위쪽 하늘·허브 포스터 카드가 이걸로 그려짐 |
| `cover` | `{"colors":["#B83A2B","#21607A"],"glyph":"札幌"}` | 옛 커버 정보(예비용). 지금 화면은 `theme`을 씀 |
| `nav` | `["home","plan","eat","talk","shoot"]` | 하단 탭(선택, 최대 5개). **없으면 표준 탭이 자동**. "더보기(⋯)"는 항상 따로 붙음 |
| `footer` | `"…"` | 더보기 맨 아래 작은 글씨 |
| `more` | `{"head":{"title":"더보기","text":"…"}}` | 더보기 화면 머리말(선택) |
| `sections` | `{…}` | 아래 2번 |
| `extra` | `[{…}]` | 템플릿에 안 맞는 고유 페이지. 아래 4번 |

trips.json(허브 목록)에도 `slug, title, region, start, end, companions, cover, theme, summary`가 같은 값으로 들어간다. **둘 다 고쳐야 허브 카드가 바뀐다.**
trips.json에만 쓰는 것: `"draft": true` → 허브에 포스터는 뜨지만 눌러도 안 열림("준비 중"). trip.json을 다 만들면 지운다. `start`가 없으면 "날짜 미정"으로 뜬다.

### 테마 `theme` (나라 느낌 내는 곳)

```json
"theme": {
  "preset": "mountains",
  "sky": ["#1B1020", "#4A1A2C", "#A63A2E", "#E58A55", "#3E5B5E"],
  "sun": "#FF8A5B", "hill1": "#6B3242", "hill2": "#2C2F3A", "water": "#2F6E8A",
  "accent": "#FF6B4A", "accent2": "#E8B032", "ink": "#1B2A49",
  "glyph": "札幌", "glyphFont": "dela",
  "poster": { "paper": "#F3E7D3", "sun": "#D7381F", "hill1": "#5C7A5A", "hill2": "#2E4A3A", "water": "#2F6E8A" }
}
```
| 필드 | 설명 |
|---|---|
| `preset` | 배경 그림: `mountains`(산·호수) · `coast`(바다·섬, `"rails": true`면 철길 추가) · `harbour`(항구·다리·빛줄기) · `city`(야경 빌딩) · `islands`(잔잔한 바다 섬들 + 페리) |
| `landmark` | **그 여행지 대표 랜드마크 (필수)**: `"tvtower"`(삿포로 TV타워) · `"udon"`(사누키 우동) · `"yadon"`(야돈) · 여러 개면 `["udon","yadon"]`. 없는 여행지는 `app/theme.js`의 `LANDMARK`에 새로 그려 넣는다 (예: 베이징=만리장성, 두바이=버즈 알 아랍·사막 선인장, 파리=에펠탑) |
| `sky` | 하늘 그라데이션 색 (위 → 아래, 3~5개). 그 나라 하늘·노을 느낌 |
| `sun`, `hill1`, `hill2`, `water` | 그림 색 (해 · 앞산/섬 · 뒷산 · 물) |
| `accent` | 스티커(D-day)·강조 색. `accent2`는 철길·보조 강조 |
| `ink` | 진한 남색 계열(그림자·버튼 글자). 없으면 `#1B2A49` |
| `glyph` | 커버 큰 글자. **그 나라 글자로**: 국내=한글(`"군산"`, `"제주"`), 일본=한자(`"札幌"`, `"高松"`), 중국=한자(`"北京"`), 영어권=영문 대문자(`"SYDNEY"`), 그 외=현지 글자나 영문 |
| `glyphFont` | 큰 글자 서체: `dela`(굵은 일본풍) · `blackhan`(굵은 한글) · `limelight`(아르데코 영문) · `mincho`(붓글씨풍 한자) |
| `poster` | 허브 포스터 카드 색 (`paper`=종이 바탕, 나머지는 그림 색). 종이가 밝으면 글자가 자동으로 남색 |

빠진 값은 기본값(삿포로 노을)으로 채운다. 예시 모음은 `scripts/themes.json`(삿포로·군산·시드니·다카마쓰 + 도쿄 야경·제주 옥빛).
`new-trip.mjs`가 나라별로 골라 넣어 줌: JP=노을 산(sunset), KR=바다(coast), TW·HK·SG·US=야경(night), TH·VN·NZ=옥빛 산(jade), AU=항구(harbour), GB·FR=새벽(dawn). `--theme night` 처럼 직접 고를 수도 있다.

### 하단 탭 (표준)

- 해외: **홈 · 일정 · 맛집 · 회화 · 촬영** + ⋯(더보기)
- 국내(회화 없음): **홈 · 일정 · 맛집 · 체크 · 촬영** + ⋯ (체크 = `todo`)
- 비어 있는 섹션은 빠지고, 나머지(숙소·이동·짐·돈·대안·비상·추가 페이지)는 전부 ⋯ 안 타일로 감
- 바꾸고 싶으면 `nav`에 최대 5개 직접 지정 (군산·시드니는 옛 사이트 탭 그대로 지정돼 있음)

### 현지어 표기 `{ "ja": "原文", "ko": "읽는법/뜻" }`

일본어(현지어)가 들어가는 곳은 항상 한국어를 같이 쓴다.

```json
"name": { "ja": "北海道ラーメン道場", "ko": "홋카이도 라멘도장" }
```
→ 화면: **北海道ラーメン道場** 홋카이도 라멘도장. (중국어면 `"zh"`, 영어면 그냥 문자열)

### 장소 `place`

```json
{
  "name": { "ja": "政寿司 本店", "ko": "마사즈시 본점" },
  "info": "11:00 예약 · 전용 주차 15대",
  "map": { "google": "https://www.google.com/maps/search/?api=1&query=政寿司+本店+小樽", "naver": "" },
  "q": "政寿司 本店 小樽",
  "tel": "0134-64-1101",
  "rank": "1순위"
}
```
- `map`이 없으면 `q`(또는 `addr`, 이름)로 지도 링크를 자동 생성
- `tel`이 있으면 칩에 번호 배지(일본 렌트 여행은 "내비", 그 외 "전화")
- 국내 여행(KR)에서는 `q`에 **주소**를 넣으면 T맵 버튼 + 주소 복사 버튼이 생김

### 태그 `tags`

`"ok:현금 3만 엔"`, `"warn:야간 산길"`, `"car:통행료 0엔"`, `"stay:1박"`, `"food:식사"`, `"info:…"` 또는 그냥 `"추천"`.

---

## 2. 섹션 `sections`

| 키 | 탭 이름(기본) | 핵심 필드 |
|---|---|---|
| `home` | 홈 | `hero`, `blocks` |
| `plan` | 일정 | `days[]` |
| `eat` | 맛집 | `groups[]` |
| `wish` | 찜 목록 | `groups[]` (맛집과 같은 모양, 맛집 탭 안에 전환 스위치) |
| `talk` | 회화 | `categories[]` |
| `shoot` | 촬영 | `page` 또는 `blocks` |
| `stay` | 숙소 | `items[]` |
| `todo` | 할 일 | `groups[]` (체크리스트) |
| `pack` | 짐 | `groups[]` (체크리스트) |
| `move` | 이동 | `blocks` (차량·택시·교통) |
| `money` | 돈 | `ledger`(가계부), `blocks` (예산표 등) |
| `planb` | 대안 | `items[]` (막힐 때 이렇게) |
| `sos` | 비상 | `contacts[]`, `blocks` |

모든 섹션 공통(선택): `title`(화면 제목), `navLabel`(하단 탭 이름), `desc`(더보기 목록 설명), `top`(구조화 내용 **앞**에 넣을 블록), `blocks`(**뒤**에 넣을 블록).

### home
```json
"home": {
  "hero": { "title": "삿포로 3박 4일 여행", "when": "10월 17일 토~20일 화", "flights": [ { "k": "가는 편 · 인천 T1", "v": "WE531 10:35", "s": "신치토세 13:10 도착" } ] },
  "blocks": [ { "type": "prep", … }, { "type": "now" }, { "type": "stamps" }, { "type": "weather", … }, … ]
}
```
`blocks`가 없으면 기본: 지금·다음 카드 + 날짜 스탬프. 홈 맨 위 D-day는 자동.

### plan.days[]
```json
{
  "date": "2026-10-17", "label": "료칸", "title": "공항 → 시코쓰호 → 조잔케이", "summary": "…",
  "weather": "토 · 맑음 15°/9°",
  "stamp": { "top": "1日目", "place": "支笏湖<br>定山渓", "small": true },
  "facts": [["일몰", "16:50"]],
  "alerts": [ { "tone": "warn", "text": "출발 전 풀충전!" } ],
  "color": "#2563eb",
  "items": [ …item… ],
  "foot": "통행료 0엔 · …"
}
```
item:
```json
{
  "time": "13:45", "title": "국제선 ATM에서 엔화 뽑기", "sub": "짧은 부제(가격·소요)", "note": "설명(HTML 가능)",
  "places": [ place, … ],
  "addr": { "name": "해물화짬뽕", "q": "전북 군산시 구시장로 63" },
  "tel": "063-446-0650",
  "tags": ["ok:현금 3만 엔"],
  "key": true,
  "fork": true,
  "icon": "✈️", "dur": "2h", "badge": "식사",
  "details": [ { "label": "주차", "kind": "park", "places": [ { "rank": "1순위", "name": "…", "q": "주소" } ] }, { "label": "메모", "list": ["…"] } ],
  "alt": "<b>16:20 넘으면</b> 한일옥으로"
}
```
- `time`이 `HH:MM`이면 "지금·다음" 카드가 자동으로 따라감 (`fork:true` = 다른 안, 시간 계산 제외)
- `key:true` = 핵심 일정(점 진하게), `details`가 있으면 "자세히" 버튼
- `plan.checkable: true` = 일정마다 완료 체크 + 일차별 진행 링 + 하단 "다음 목적지" 바

### eat / wish
```json
"eat": {
  "top": [ { "type": "head", "title": "동선 따라 먹을 곳", "text": "…" } ],
  "groups": [
    { "id": "g-airport", "short": "공항", "title": "토 · 신치토세 공항 국내선", "day": 1,
      "items": [ { "label": "1순위 · 라멘", "place": place, "hours": "9:00–21:00", "text": "…", "memo": "우리 메모", "tags": [] } ],
      "also": { "label": "일정에 이미 있는 찜", "places": [ place ] } }
  ]
}
```
그룹이 3개 넘으면 위쪽에 바로가기 칩이 자동 생성(`short` = 칩 이름). `day` = 일차 색(1~8).

### talk (회화북: 검색·★저장·크게 보여주기·음성)
```json
"talk": {
  "sign": { "kicker": "旅の日本語", "title": "일본 렌트여행 회화북", "facts": [ { "k": "경찰", "v": "110" } ], "legend": ["발음의 ‘-’는 길게"] },
  "categories": [
    { "id": "basic", "group": "기본기", "title": "인사·대답 필수", "chip": "인사", "note": "…",
      "phrases": [ { "mean": "감사합니다", "ja": "ありがとうございます", "ko": "아리가토- 고자이마스", "tip": "…" } ] }
  ],
  "red": ["止まれ"], "foot": "…"
}
```
`mean`=한국어 뜻, `ja`=현지어 원문, `ko`=읽는 법.

### shoot (촬영 콘티)
- **bk-shoot-pd 결과물(HTML 한 장)**: `trips/<slug>/shoot.html`로 저장하고 `"shoot": { "page": "shoot.html" }` → 탭 안에 그대로 뜨고 오프라인 저장됨
- 또는 `blocks`로 직접 작성 (삿포로처럼). html 블록 안의 `<input type="checkbox" id="…">`는 자동으로 체크 저장

### stay.items[]
```json
{ "label": "10/17 토 · 1박", "title": "조잔케이 유라쿠소안", "place": place, "price": "34,650엔", "priceNote": "/ 1인 · 식사 없음", "facts": ["체크인 15:00", "…"], "tags": ["ok:주차 무료"], "day": 1 }
```

### todo / pack (체크리스트)
```json
"todo": {
  "head": { "title": "출발 전 할 일", "text": "마감 순서대로" },
  "groups": [ { "title": "금요일까지", "due": "~10/16", "items": [ { "id": "t-idp", "text": "국제운전면허증", "sub": "설명", "tel": "전화번호(선택)" } ] } ]
}
```
`id`는 여행 안에서 겹치면 안 됨(체크 저장 키). 홈의 `prep` 블록에서 `"link": "pack:p-pass"`로 같은 체크를 공유.

### money
```json
"money": { "ledger": { "budget": 220000, "categories": ["식비", "교통", "숙소", "쇼핑", "기타"] }, "blocks": [ …예산표·메모… ] }
```
가계부는 자동(입력·삭제·분류별 합계·원화 환산·내역 복사). 끄려면 `"ledger": false`.

### planb
```json
"planb": { "head": { "title": "막힐 때" }, "listTitle": "상황별로 바꿀 것", "items": [ { "if": "웨이팅 1시간", "then": "옆집으로" } ] }
```

### sos
```json
"sos": { "contacts": [ { "who": "경찰", "what": "사고 신고", "tel": "110" } ], "blocks": [ … ] }
```

---

## 3. 블록 (모든 섹션의 `top`/`blocks`, 일차의 `top`/`blocks`에 씀)

| type | 필드 | 모양 |
|---|---|---|
| `head` | `title, text, id` | 섹션 제목 |
| `sub` | `title, text` | 작은 제목 |
| `text` | `text` | 문단 |
| `cap` | `text` | 작은 회색 설명 |
| `callout` | `title, items[] / paras[] / html, ordered, tone(lake·pick), day` | 강조 박스 |
| `note` | `title, items[] / text / html, tone(ok·warn·info·error)` | 메모 카드 |
| `grid` | `items[note…]` | 메모 2열 |
| `cards` | `items[card…], day` | 카드 2열 (card = `label, title, place, hours, text, memo, tags`) |
| `table` | `head[], rows[[…]]` 또는 `html`, `swipe` | 표 (넓으면 옆으로 밀기) |
| `steps` | `items[{title, text}]` | 순서 |
| `contacts` | `items[{who, what, tel / say(현지어 문장) / map}]` | 번호·복사 버튼 |
| `places` | `items[place], label` | 장소 칩 묶음 |
| `placelist` | `title, items[place]` | 국내식 장소 줄(T맵·복사) |
| `weather` | `days[{d, w, t, p, s}], cap` | 날씨 칸 |
| `dial` | `items[{k, v, tel}]` | 자주 거는 번호 2열 |
| `prep` | `title, text, items[{id, text, link}]` | 홈의 출발 전 체크 (출발 후엔 자동 숨김) |
| `now` | – | 지금·다음 일정 카드 |
| `stamps` | – | 일차 도장 (누르면 그날 일정) |
| `routemap` | `title, svg, cap` | 동선 그림 + 도장 |
| `jump` | `items[{text, href:"#id"}]` | 바로가기 칩 |
| `links` | `items[{text, url}], cap` | 링크 버튼 |
| `ranked` | `title, items[]` | 번호 매긴 TOP 목록 |
| `chips` | `groups[{label, items[]}]` | 앱 목록 같은 칩 묶음 |
| `rows` | `items[{k, v}]` | 키-값 줄 |
| `fold` | `title, count, open, blocks[]` | 접었다 펴는 상자 |
| `image` | `src, alt, cap` | 사진 |
| `page` | `src, title` | 다른 HTML 페이지를 탭 안에 넣기 |
| `parking` | – | 일정의 `details[kind=park]`를 모아 주차 총정리 |
| `planb` | `items[{if, then}]` | 대안 표 |
| `html` | `html` | 템플릿에 안 맞는 고유 콘텐츠 그대로 |

---

## 4. extra (고유 페이지)

템플릿 섹션에 안 맞는 페이지는 `extra`에 넣으면 더보기 목록에 생긴다.
```json
"extra": [ { "id": "onsen", "title": "온천 매너", "desc": "대욕장 이용법", "blocks": [ { "type": "html", "html": "…" } ] } ]
```
