# TAM 대시보드 (Phase 2 UI 뼈대)

스마트폰 TAM 조회용 정적 대시보드. Vite + React + TypeScript + shadcn/ui
(프리셋 `b1au68YWO`)로 만들고, `vite-plugin-singlefile`로 JS/CSS를 전부 인라인한
**단일 HTML 파일**로 빌드합니다. 사내 PC에서 서버·Node 설치 없이 파일을
더블클릭해서 열 수 있습니다 (`file://`, 네트워크 요청 없음).

## 개발

```powershell
npm install
npm run dev
```

## 빌드

```powershell
npm run build
```

결과물은 `dist/index.html` 하나뿐입니다 (JS/CSS 전부 인라인). 이 파일은
**의도적으로 git에 커밋되어 있습니다** — 실데이터가 채워지기 전 사내 Python
스크립트가 채워 넣을 템플릿이기 때문입니다.

타입체크: `npm run typecheck` · 린트: `npm run lint`

## 데이터 연동 계약 (사내 Python 스크립트용)

`dist/index.html`의 `<head>`에는 다음 마커가 그대로 들어 있습니다:

```html
<script>/*TAM_DATA_START*/window.__TAM_DATA__=null/*TAM_DATA_END*/</script>
```

사내 스크립트는 `/*TAM_DATA_START*/...(중략).../*TAM_DATA_END*/` 블록 전체를
찾아 `window.__TAM_DATA__=null` 부분을 아래 `TamData` 형태의 JSON 리터럴로
문자열 치환하면 됩니다 (마커 주석은 그대로 유지). 앱은 `window.__TAM_DATA__`가
`null`이 아니면 그 값을 쓰고, `null`이면 `src/data/sample.ts`의 샘플 데이터로
동작합니다.

```ts
type TamData = {
  generated_at: string          // ISO 문자열
  unit: string                  // 예: "백만 대"
  baseline_year: number         // 예: 2025
  vintages: { id: string; label: string }[]   // 예: {id:"2026-06", label:"6월 연전망"}
  rows: TamRow[]
}

type TamRow = {
  vendor: string                          // 표시명
  kind: "total" | "group" | "member" | "vendor"
  y25: number | null                      // '25 기준
  blocks: Record<string, {                // key = vintage id
    y26: number | null
    y27: number | null
    yoy26: number | null                  // 비율, 0.083 = +8.3%
    yoy27: number | null
  }>
  mom: { y26: number | null; y27: number | null } | null   // 최신 - 이전 vintage, 절대값
}
```

전체 타입 정의는 `src/data/types.ts`, 예시 데이터·파생값 계산 로직은
`src/data/sample.ts`를 참고하세요. `vintages` 배열에 항목을 추가하면 표에
열 그룹이 자동으로 늘어납니다 (jun/jul 하드코딩 없음).

## 구조

- `src/data/types.ts`, `src/data/sample.ts` — 데이터 타입 · 샘플 데이터
- `src/lib/format.ts` — 숫자/YoY/전월비 포맷 및 색상 규칙
- `src/components/tam-table.tsx` — TAM 표 (2행 그룹 헤더, sticky 헤더 등)
- `src/components/ui/` — shadcn CLI로 추가한 컴포넌트 (table, badge, card, button)
