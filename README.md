# Market Intelligence

증권사 / 마켓 인텔리전스 리서치 포털. **Next.js(App Router) 풀스택**으로 구현했으며,
증권사 리포트를 **마크다운(`.md`) 파일**로 넣으면 사이트가 읽어 목록·홈·상세 페이지로
렌더링합니다.

## 화면
- **홈** (`/`) — 자동 순환 히어로 캐러셀, 최신 리포트 카드(응용처 필터 · 검색), "많이 본 리포트" 랭킹
- **리포트** (`/reports`) — 응용처별(Smartphone/Humanoid/Auto) 리스트, 북마크 토글, 검색
- **리포트 상세** (`/reports/[slug]`) — 마크다운 본문 렌더링(GFM: 표·인용·코드 등)

## 콘텐츠: 리포트 추가하기
`content/reports/` 에 `.md` 파일을 추가하면 됩니다. 파일명이 URL slug가 됩니다
(`smartphone-demand-recovery.md` → `/reports/smartphone-demand-recovery`).

frontmatter 예시:

```markdown
---
title: 스마트폰 수요 회복 신호, 2분기 업황 바닥 통과
app: Smartphone          # 필터 키: Smartphone | Humanoid | Auto
category: Smartphone     # 화면에 표시할 카테고리
author: 김민수
role: IT/전기전자 애널리스트   # 선택
date: 2024-05-20         # 정렬 기준 (YYYY-MM-DD)
views: 12400            # 조회수 (랭킹 정렬 기준)
summary: 한 줄 요약…
tags: ['#출하량', '#프리미엄']
hero: true              # 홈 캐러셀 노출 (선택)
featured: true          # 홈 "최신 리포트" 카드 노출 (선택)
heroTitle: …            # 캐러셀 전용 제목 (선택)
heroBody: …             # 캐러셀 전용 본문 (선택)
heroBg: "radial-gradient(...)"   # 캐러셀 배경 (선택)
---

여기에 **마크다운 본문**을 작성합니다. 표, 인용구, 코드 블록 모두 지원합니다.
```

- 홈 카드 = `featured: true` 리포트 / 캐러셀 = `hero: true` 리포트
- 랭킹 "많이 본 리포트" = `views` 상위 5개
- 본문은 [GitHub Flavored Markdown](https://github.github.com/gfm/)으로 렌더링됩니다.

## 로컬 개발

    npm install
    npm run dev        # http://localhost:3000 (핫 리로드)

프로덕션 모드 실행:

    npm run build
    npm start

## Docker로 배포 (사내 포팅)

Next.js **standalone** 빌드를 멀티스테이지로 패키징한 경량 이미지를 사용합니다.
컨테이너는 **비루트(`node` 유저) · 3000 비특권 포트**로 동작합니다.

### docker compose (권장)

    docker compose up -d --build
    # http://localhost:3000  (호스트 포트 변경: HOST_PORT=8080 docker compose up -d)

compose는 `./content/reports`를 컨테이너에 마운트하므로, **호스트에 `.md` 파일만
추가하면 재빌드 없이** 사이트에 반영됩니다(페이지가 요청 시 콘텐츠를 다시 읽음).

### 단일 컨테이너

    docker build -t market-intelligence .
    docker run -d -p 3000:3000 \
      -v "$PWD/content/reports:/app/content/reports:ro" \
      --security-opt no-new-privileges market-intelligence

### Makefile 단축 명령

    make run                 # 이미지 빌드 후 실행 → http://localhost:3000
    make stop                # 중지/삭제
    make logs                # 로그 확인

### 사내 레지스트리로 푸시

    make push REGISTRY=registry.corp.example/team
    # 또는 수동으로
    docker tag market-intelligence registry.corp.example/team/market-intelligence:latest
    docker push registry.corp.example/team/market-intelligence:latest

> 베이스 이미지를 사내 미러로 받아야 하면 `Dockerfile`의 `FROM node:20-alpine`
> 두 줄을 사내 미러 경로로 바꾸세요.

### 환경 변수
| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `3000` | 서버 리슨 포트 |
| `HOSTNAME` | `0.0.0.0` | 바인드 주소 |
| `CONTENT_DIR` | `/app/content/reports` | 리포트 `.md` 디렉터리 (마운트로 교체 가능) |

## 구조
```
app/                 # App Router (layout, 홈, /reports, /reports/[slug])
components/           # Header, Hero, 리스트, 북마크, providers(검색·북마크·토스트)
lib/reports.ts       # .md 읽기 + frontmatter 파싱
lib/images.ts        # 응용처별 placeholder 썸네일/배경 그라데이션
content/reports/*.md # 증권사 리포트 콘텐츠
Dockerfile           # Next standalone 멀티스테이지
docker-compose.yml   # 사내/로컬 배포
```

## 이미지 교체
`lib/images.ts`의 그라데이션은 placeholder입니다. 실제 사진을 쓰려면 frontmatter에
이미지 필드를 추가하고 `lib/images.ts`의 `thumbnailFor`를 해당 값으로 분기하세요.
