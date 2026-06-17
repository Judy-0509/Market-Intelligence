# Market Intelligence

증권사 / 마켓 인텔리전스 리서치 포털 UI. Claude Design의 "Market Brief" 컴포넌트를 바닐라 HTML/CSS/JS로 재현한 정적 사이트입니다.

**Live:** https://judy-0509.github.io/Market-Intelligence/

## 화면
- **홈** — 자동 순환 히어로 캐러셀(4개 인사이트, 8.5초 간격, 슬라이딩 전환), 최신 리포트 카드(전체/스마트폰/오토/휴머노이드 필터 · 응용처별 랜덤 썸네일), "많이 본 리포트" 랭킹 사이드바
- **리포트** — 응용처별(전체/Smartphone/Humanoid/Auto) 세로 리스트, 북마크 토글

## 파일
- `index.html` — 마크업과 정적 헤더
- `styles.css` — 전체 스타일
- `app.js` — 상태 · 렌더링 · 인터랙션(캐러셀, 필터, 북마크)

## 로컬 미리보기
정적 파일이라 빌드가 필요 없습니다. 어떤 정적 서버로도 열 수 있습니다:

    python -m http.server 8000

그 뒤 브라우저에서 http://localhost:8000 접속.

## 운영 방식
- 이 저장소를 **단일 원본(source of truth)** 으로 사용합니다.
- 코드는 로컬 디스크에 저장하지 않고 GitHub API를 통해 직접 커밋합니다.

## 이미지 교체
`app.js`의 `imagePools`와 히어로 `bg` 값은 현재 플레이스홀더 그라데이션입니다. 실제 사진을 `url("...")` 로 교체하면 동일한 랜덤 매칭 로직으로 그대로 적용됩니다.
