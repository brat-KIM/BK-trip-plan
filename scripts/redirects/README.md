# 옛 주소 → 새 허브 리다이렉트 (준비만 해둔 상태)

| 옛 Vercel 프로젝트 | 옛 주소 | 보낼 곳 | 상태 |
|---|---|---|---|
| sapporo-trip | https://sapporo-trip-ten.vercel.app | https://bk-trip-plan.vercel.app/sapporo | 준비됨 (미적용) |
| gunsan-trip | https://gunsan-trip-green.vercel.app | https://bk-trip-plan.vercel.app/gunsan | 준비됨 (미적용, 프로젝트 일시정지 중) |
| sydney-trip | https://sydney-trip.vercel.app | https://bk-trip-plan.vercel.app/sydney | 준비됨 (미적용, 프로젝트 일시정지 중) |

각 폴더 = 그 프로젝트에 새로 올릴 배포 파일 묶음.
- `vercel.json`: 모든 경로를 새 주소로 보냄(임시 리다이렉트 307 — 되돌리기 쉬움). 주소 뒤 `#eat` 같은 탭 표시는 그대로 따라감.
- `index.html`: 혹시 리다이렉트가 안 먹을 때를 위한 예비 이동 페이지.
- `sapporo-trip/sw.js`: 옛 삿포로 사이트는 폰에 서비스워커가 깔려 있어서, 옛 캐시를 지우고 스스로 해제하는 정리용 파일. (그래서 sw.js만 리다이렉트에서 뺌)

## 적용하는 법 (형이 OK한 다음에만)

클로드가 Vercel 도구로:
1. gunsan-trip, sydney-trip은 일시정지 상태라 먼저 `unpause_project` (정지 상태에선 503이라 리다이렉트도 안 됨)
2. 프로젝트마다 `create_deployment` — `project: <프로젝트명>`, `target: production`, `files`: 이 폴더 파일들(utf-8 인라인), `projectSettings: { framework: null }`
3. 옛 주소를 열어서 새 주소로 넘어가는지 확인
- 원래대로 돌리기: 그 프로젝트의 이전 배포(sapporo `dpl_5SkrZiUX5mQiTuNHDSYyxSbfzFko`, gunsan `dpl_7jFFwvo4fc5Urpudx49FHihHzzy3`, sydney `dpl_92E4TYp69bQKEbNizMMFhhPXpWNX`)를 다시 프로덕션으로 승격(promote/rollback).
- 시드니 프로젝트는 GitHub(SydneyTrip) 연동이라, 나중에 그 레포에 푸시하면 리다이렉트 배포가 원래 사이트로 덮일 수 있음.
