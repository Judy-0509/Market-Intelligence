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
- `Dockerfile` · `nginx.conf` · `docker-compose.yml` — 컨테이너 배포 구성
- `Makefile` — 빌드/실행 단축 명령

## 로컬 미리보기
정적 파일이라 빌드가 필요 없습니다. 어떤 정적 서버로도 열 수 있습니다:

    python -m http.server 8000

그 뒤 브라우저에서 http://localhost:8000 접속.

## Docker로 배포 (사내 포팅)

빌드 단계가 없는 순수 정적 프론트엔드를 **nginx** 컨테이너로 서빙합니다.
컨테이너는 **비루트(uid 101) · 읽기 전용 루트 FS · 8080 비특권 포트**로 동작해
사내 보안 정책(쿠버네티스/스웜/하버 등)에 그대로 포팅할 수 있습니다.

### docker compose (권장)

    docker compose up -d --build
    # http://localhost:8080  (호스트 포트 변경: HOST_PORT=9000 docker compose up -d)

### 단일 컨테이너

    docker build -t market-intelligence .
    docker run -d -p 8080:8080 --read-only --tmpfs /tmp \
      --security-opt no-new-privileges market-intelligence

### Makefile 단축 명령

    make run                 # 빌드 후 실행 → http://localhost:8080
    make stop                # 중지/삭제
    make logs                # 로그 확인

### 사내 레지스트리로 푸시

    make push REGISTRY=registry.corp.example/team
    # 또는 수동으로
    docker tag market-intelligence registry.corp.example/team/market-intelligence:latest
    docker push registry.corp.example/team/market-intelligence:latest

> nginx 베이스 이미지를 사내 미러로 받아야 하면 `Dockerfile`의 `FROM nginx:1.27-alpine`
> 한 줄을 사내 미러 경로(예: `registry.corp.example/library/nginx:1.27-alpine`)로 바꾸세요.

### 헬스 체크
- 엔드포인트: `GET /healthz` → `200 ok`
- 컨테이너 `HEALTHCHECK`와 compose `healthcheck`가 이 경로를 사용합니다.

## 운영 방식
- 이 저장소를 **단일 원본(source of truth)** 으로 사용합니다.
- 코드는 로컬 디스크에 저장하지 않고 GitHub API를 통해 직접 커밋합니다.

## 이미지 교체
`app.js`의 `imagePools`와 히어로 `bg` 값은 현재 플레이스홀더 그라데이션입니다. 실제 사진을 `url("...")` 로 교체하면 동일한 랜덤 매칭 로직으로 그대로 적용됩니다.
