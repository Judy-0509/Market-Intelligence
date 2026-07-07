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

**v2 BREAKING CHANGE:** 이전 계약(단일 소스, `vintages` 최상위 배열)은 아직
소비자(사내 프로듀서 스크립트)가 없는 상태에서 교체되었습니다 — 호환 shim
없음. 이제 내부 S.LSI + 관계사 + 조사기관 등 **복수 소스**의 전망을 한 표에
같이 보여줍니다.

```ts
type TamData = {
  generated_at: string          // ISO 문자열
  unit: string                  // 예: "백만 대"
  baseline_year: number         // 예: 2025
  sources: TamSource[]          // 순서: 내부 -> 관계사 -> 조사기관
  rows: TamRow[]
}

type TamSource = {
  id: string                                  // 예: "slsi", "affil-a", "omdia"
  label: string                               // 예: "S.LSI", "관계사 A", "Omdia"
  kind: "internal" | "affiliate" | "research"  // 내부 / 관계사 / 조사기관 (헤더 색·범례에 사용)
  vintages: { id: string; label: string }[]   // 이 소스의 전망 빈티지, 1개 이상, 오름차순
}

type TamRow = {
  vendor: string                          // 표시명
  kind: "total" | "group" | "member" | "vendor"
  y25: number | null                      // '25 기준 (모든 소스가 공유하는 단일 컬럼)
  blocks: Record<string, Record<string, {  // blocks[sourceId][vintageId]
    y26: number | null
    y27: number | null
    yoy26: number | null                  // 비율, 0.083 = +8.3%
    yoy27: number | null
  }>>
  mom: Record<string, { y26: number | null; y27: number | null } | null>  // mom[sourceId]
}
```

**주의 (소스별 mom 규칙):** `mom[sourceId]`는 데이터 생성측이 계산해 넣는
값입니다 (해당 소스의 최신 빈티지 − 직전 빈티지, 데이터 생성측 책임). UI는
주어진 값을 그대로 표시할 뿐, 재계산하거나 빈티지 쌍이 맞는지 검증하지
않습니다. 소스의 빈티지가 1개뿐이면 `mom[sourceId]`는 `null`(또는 키 생략) —
전월비 컬럼 자체가 표에 나타나지 않습니다.

**주의 (블록 누락 규칙):** 특정 (소스, 빈티지) 조합에 데이터가 없으면
`blocks[sourceId][vintageId]`를 생략하세요 — 해당 셀들은 전부 "–"로
표시됩니다. 한 행의 다른 소스나, 한 소스의 다른 행에는 영향을 주지 않습니다.

**주의 (합계/CN 합계 포함 모든 행 값은 생성측 책임):** UI는 아무것도 계산하지
않습니다. 모든 행 값 — 합계(`total`)/CN 합계(`group`) 행 포함 — 은 데이터
생성측이 제공한 값을 그대로 표시할 뿐, 재계산도 검증도 하지 않습니다. 합계
행이 표에 값으로 나오려면 생성측이 그 행의 `blocks`를 반드시 직접 채워야
합니다 (생략하면 그 셀들도 그냥 "–"). 번들 샘플 데이터에서 "누락 항목을 빼고
있는 항목만 합산"한 것은 샘플을 만들 때 쓴 authoring 방식일 뿐 UI 기능이
아닙니다.

**주의 (vintage id 형식):** vintage `id`는 zero-padded `"YYYY-MM"` 형식이어야
합니다 (예: `"2026-09"`). 최신 빈티지 배지가 id 문자열 정렬로 결정되므로
`"2026-9"` 같은 형식은 오동작합니다.

전체 타입 정의는 `src/data/types.ts`, 예시 데이터·파생값 계산 로직은
`src/data/sample.ts`를 참고하세요. `sources` 배열에 소스나 `vintages`를
추가하면 표에 소스 그룹·열 그룹이 자동으로 늘어납니다 (하드코딩 없음).

## 구조

- `src/data/types.ts`, `src/data/sample.ts` — 데이터 타입 · 샘플 데이터
- `src/lib/format.ts` — 숫자/YoY/전월비 포맷 및 색상 규칙
- `src/components/tam-table.tsx` — TAM 표 (소스별 3행 그룹 헤더, sticky 헤더 등)
- `src/components/ui/` — shadcn CLI로 추가한 컴포넌트 (table, badge, card, button)
