# BK Trip — 다음 세션 클로드용 안내서

형(사용자)의 여행 허브(화면에 보이는 이름은 **"여행 기록"**, 레포·코드 이름은 BK Trip). 여행마다 `trip.json`만 채우면 페이지가 완성되는 **템플릿 구조**다.
프레임워크·빌드 없음. 순수 HTML/CSS/JS + Vercel 정적 배포. 형은 코딩 초보라 설명은 쉽게, 말투는 반말·편하게.

- 사이트: https://bk-trip-plan.vercel.app (여행 주소: `/<slug>`, 예: `/sapporo`)
- 레포: github.com/brat-KIM/BK-trip-plan · Vercel 팀 `brats-projects-c0d7a362` 프로젝트 `bk-trip-plan`

## 폴더 구조

```
/                       허브 홈 (index.html) — 위쪽 귀여운 여행 그림(인라인 SVG .hub-art, 인사말이 그 위에 겹침) + 진행중·다가오는 여행은 가로 파노라마 포스터, 끝난 여행은 작은 포스터 2열
/trips.json             여행 목록 (허브 카드용 요약)
/trips/<slug>/trip.json 여행별 데이터 전부  ← 평소엔 여기만 고치면 됨
/trips/<slug>/img/      여행별 사진 (선택)
/trips/_schema.md       trip.json 필드 설명서 (꼭 읽기)
/app/                   공통 렌더러: index.html, app.js(그리는 코드), theme.js(하늘·포스터 그림), base.css(삿포로 원본 톤),
                        app.css(추가 컴포넌트), skin.css(디자인 D 스킨 — 맨 마지막에 덮어씀. 디자인 손볼 땐 여기)
/scripts/themes.json    여행별 테마 예시 (나라 느낌 색·그림)
/sw.js                  서비스워커 1개 (오프라인: 한 번 연 여행은 데이터 끊겨도 보임)
/manifest.webmanifest   PWA "여행 기록", 아이콘은 /assets/ (탭 아이콘은 /favicon.ico + /assets/favicon.svg. 아이콘 바꾸면 링크의 ?v= 숫자도 올리기 — 크롬이 옛 아이콘을 오래 기억함)
/vercel.json            /<slug> → /app/index.html 연결, 전 페이지 noindex 헤더
/scripts/new-trip.mjs   새 여행 뼈대 만들기
/scripts/serve.mjs      로컬 미리보기 서버
/scripts/migrate/       옛 사이트 3개 이식 때 쓴 변환·대조 스크립트 (report.md = 대조 결과)
/_originals/            옛 사이트 원본 백업. 절대 수정 금지, 배포 제외(.vercelignore)
```

## 새 여행 추가하는 법

1. 뼈대 만들기
   ```bash
   node scripts/new-trip.mjs <slug> "<제목>" <시작일> <종료일> --region "<지역>" --country <JP|KR|AU…> --with "여친"
   # 예: node scripts/new-trip.mjs osaka "오사카 2박 3일" 2027-01-10 2027-01-12 --region "일본 오사카" --country JP --with 여친
   ```
   → `trips/osaka/trip.json`(날짜별 빈 일정 + 빈 섹션) 생성 + `trips.json`에 자동 등록.
2. `trips/<slug>/trip.json` 채우기 (아래 "채우는 법").
3. 확인: `node scripts/serve.mjs` 띄우고 `http://localhost:4173/<slug>` (클라우드 세션이면 아래 "검증" 스크립트로).
4. 커밋·푸시 → 자동 배포 (아래 "배포").

## trip.json 채우는 법

- **필드 설명은 `trips/_schema.md`가 정답.** 헷갈리면 `trips/sapporo/trip.json`(제일 풍부한 예시), `trips/gunsan/trip.json`(국내·T맵·완료체크 예시)을 본다.
- 빈 섹션은 화면에 안 나온다. 채운 섹션만 탭이 생김. 하단 탭 표준: 해외 **홈·일정·맛집·회화·촬영**, 국내 **홈·일정·맛집·체크·촬영** + 오른쪽 동그란 ⋯(더보기)에 나머지 타일. 새 여행엔 `nav`를 쓰지 말고 표준을 쓴다(군산·시드니만 옛 탭 그대로 지정돼 있음 — 형이 "일단 그대로"라고 함).
- 일정 `items[].time`을 `"HH:MM"`으로 쓰면 홈의 "지금·다음 일정" 카드가 현지 시각(`tz`) 기준으로 자동으로 따라간다.
- 일본어 등 현지어는 항상 `{ "ja": "原文", "ko": "읽는법/뜻" }`. 회화 문장은 `{ "mean": "뜻", "ja": "原文", "ko": "읽는법" }`.
- 지도는 링크만: 장소에 `map.google`/`map.naver` URL 또는 `q`(검색어·주소). **유료 지도/날씨/환율 API 절대 금지.**
- 국내(`country: "KR"`)는 장소 `q`에 주소를 넣으면 T맵 버튼 + 주소 복사 자동.
- 체크리스트 `id`는 여행 안에서 고유하게(저장 키가 됨). 이미 쓰던 id를 바꾸면 형 폰에 저장된 체크가 풀린다.
- 확인 못 한 영업시간·가격은 지어내지 말고 `★`(확인필요) 표시. 출처는 `foot` 블록에.
- **여행지마다 그곳만의 포스터 필수**: `theme.landmark`에 대표 랜드마크를 꼭 넣는다(삿포로=TV타워, 군산=철길, 시드니=하버브리지, 다카마쓰=우동+야돈). 없는 곳은 `app/theme.js`의 `LANDMARK`에 평면 일러스트로 새로 그린다(베이징=만리장성, 두바이=버즈 알 아랍·사막 선인장 같은 느낌). 커버 큰 글자 `glyph`는 그 나라 글자로(국내=한글, 일본=한자).
- 허브 포스터: 진행중·다가오는 여행은 가로 파노라마, 끝나면 자동으로 작은 2열. 아직 내용 없는 여행은 trips.json에만 `"draft": true`로 넣으면 "준비 중"(링크 없음) 카드로 뜬다. 지금 다카마쓰가 이 상태 — trip.json 만들 때 `new-trip.mjs takamatsu …`로 만들고 draft는 빠짐.
- **나라 느낌은 `theme`으로 낸다** (디자인 D = 그 나라 하늘 그라데이션 + 평면 포스터 그림 + 커버 큰 글자). `new-trip.mjs`가 나라별 기본 테마를 넣어 주니, 그 나라 하늘·노을·바다 색과 현지어 `glyph`(예: 大阪, 濟州, BANGKOK)만 다듬으면 된다. 필드는 `_schema.md` "테마", 예시는 `scripts/themes.json`. trip.json과 trips.json 두 곳 다 같은 값.
- 템플릿에 안 맞는 고유 내용은 `html` 블록이나 `extra` 페이지로. 그래도 디자인 톤(base.css 클래스: `note`, `answer`, `card`, `grid2`, `sec-head` …)을 맞춘다.
- `trips.json`의 제목·날짜·커버는 trip.json과 같은 값으로 같이 고친다(허브 카드가 이걸 봄).

## 촬영 콘티(bk-shoot-pd 결과물) 넣는 법

bk-shoot-pd 스킬이 만든 촬영 콘티 카드는 HTML 한 장짜리 페이지다.
1. 그 HTML 전체를 `trips/<slug>/shoot.html`로 저장 (외부 폰트 링크 정도는 그대로 둬도 됨).
2. trip.json → `"sections": { "shoot": { "page": "shoot.html" } }`
3. 그러면 "촬영" 탭 안에 그대로 뜨고(새 창 버튼도 있음), 여행 열 때 오프라인용으로 같이 저장된다. 체크박스 저장도 원래 페이지 방식대로 동작.
- 아티팩트 링크(claude.ai)만 있으면: 아티팩트 내용을 읽어서 위처럼 파일로 저장. 링크만 걸고 싶으면 `shoot.blocks`에 `{ "type": "links", "items": [{ "text": "촬영 콘티", "url": "…" }] }`.
- 삿포로처럼 콘티를 trip.json 블록으로 직접 넣는 방식도 된다(`shoot.blocks` 안 `html` 블록, `sh-*` 클래스는 base.css에 있음). html 안 `<input type="checkbox" id="…">`는 `trip:<slug>:shoot`에 자동 저장.

## 검증 (배포 전에 꼭)

```bash
node scripts/serve.mjs 4173 &          # 로컬 서버 (vercel.json 리라이트 흉내)
node scripts/check.cjs                 # 갤럭시 폭 360px로 허브 + 모든 여행의 모든 탭 열기 → "no errors" 나와야 함
SHOTS=1 OUT=/tmp/shots node scripts/check.cjs osaka   # 특정 여행만 + 스크린샷
```
check.cjs가 보는 것: 콘솔 에러, 깨진 앵커(#id)·`data-go` 대상·이미지, 가로 넘침, 중복 id. Playwright는 클라우드 세션에 기본 설치돼 있음.
이식 대조가 필요하면 `node scripts/migrate/compare.cjs` → `scripts/migrate/report.md`.

## 배포

- GitHub `brat-KIM/BK-trip-plan`이 Vercel 프로젝트 `bk-trip-plan`에 Git 연동돼 있다. **프로덕션 브랜치(main)에 푸시하면 자동 배포**, 다른 브랜치는 미리보기 배포(Vercel 로그인 필요할 수 있음).
- 세션 규칙상 작업 브랜치가 따로 주어지면 거기에 푸시하고, main 반영은 형한테 물어보거나 PR로.
- 앱 껍데기(`/app/*`, `index.html`, `sw.js`) 구조를 크게 바꾸면 `sw.js`의 `VERSION`을 올린다(지금 `bk-trip-v6` → 다음 `bk-trip-v7`). 새 파일을 추가했으면 `sw.js`의 `SHELL` 목록에도 넣는다. trip.json만 바꾸는 건 안 올려도 됨(네트워크 우선이라 바로 반영).
- 지켜야 할 것: 전 페이지 noindex 유지(meta + `X-Robots-Tag` + robots.txt), 비밀번호/PIN 없음, 유료 기능·유료 API 금지, `_originals/` 수정 금지.

## 옛 주소

옛 사이트 3개(sapporo-trip-ten / gunsan-trip-green / sydney-trip .vercel.app)는 각각 Vercel 프로젝트가 따로 있다. 새 주소(/sapporo, /gunsan, /sydney)로 보내는 리다이렉트 설정은 `scripts/redirects/`에 준비돼 있고, **형이 확인한 다음에만** 적용한다. (적용 여부는 그 폴더 README 참고)
