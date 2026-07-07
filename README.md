# Market Intelligence — 스마트폰 TAM 수립·점검 지원 시스템

조사기관(Omdia/IDC/Counterpoint 등) 전망 데이터와 내부 취합 파일(`tam.xlsx`)을 다루는 도구 모음.

## 로드맵

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 취합 자동화 + 시각화용 DB(SQLite) 구축 | 사전조사 중 |
| 2 | 조사기관 최신 전망 조회 — 정적 HTML 대시보드 | 대기 |
| 3 | 전망 자동 분석 및 워닝 | 대기 |

## 현재 단계: 엑셀 구조 프로파일링 (Phase 1 사전조사)

사내 PC에서 엑셀 구조를 JSON으로 추출합니다. **원본은 수정하지 않습니다.**

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Get-ExcelProfile.ps1 -Path "엑셀폴더" -Recurse
```

자세한 사용법·옵션·보안 체크리스트: [`tools/사내_실행가이드.md`](tools/사내_실행가이드.md)

> ⚠️ **이 저장소는 public입니다.** 추출된 `excel_profile*.json`이나 실제 TAM 데이터를
> 절대 이 저장소에 커밋하지 마세요 (`.gitignore`로 1차 차단되어 있음).
