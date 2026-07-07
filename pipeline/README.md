# 연전망 적재 파이프라인 (Phase 1)

매월 EDM에서 받는 "연전망" 엑셀(S.LSI 스마트폰 SET TAM 전망)을 SQLite DB(`tam.db`)에
누적 적재하는 파이프라인입니다. 아직 대시보드는 없습니다 (Phase 2에서 별도 진행).

## 준비물

- Python 3.10 이상
- `openpyxl` (그 외 외부 의존성 없음, stdlib `sqlite3` 사용)

```powershell
pip install openpyxl
```

## 실행

저장소 루트 또는 `pipeline/` 폴더 어디서든, 실제 경로에 맞게 아래 명령을 실행합니다.

```powershell
python pipeline\load_forecast.py --source "<연전망.xlsx 경로>" --sheet "6월 연전망용" --vintage 2026-06 --db tam.db
```

| 옵션 | 필수 | 설명 |
|---|---|---|
| `--source` | O | 연전망 엑셀 파일 경로 |
| `--sheet` | O | 시트명 (예: `"6월 연전망용"`) |
| `--vintage` | O | 이 전망이 발표된 시점, `YYYY-MM` 형식 (예: `2026-06`) |
| `--db` | X (기본 `tam.db`) | 적재할 SQLite DB 파일 경로 |

성공하면 적재된 vintage, 벤더 수, 연도, `Total/2026` 값을 콘솔에 출력하고 종료 코드 0을
반환합니다. 실패하면(파일/시트 없음, 헤더 라벨 인식 실패, 알 수 없는 벤더명, 숫자가 아닌
값 등) 원인을 구체적으로 출력하고 종료 코드 1을 반환합니다 — 애매하면 절대 추측해서
적재하지 않습니다.

## DB에 들어있는 것

- `forecast` 테이블: `(vintage, vendor, year)` 단위의 원본 예측치 (`value`는 소스가 빈 칸이면
  `NULL`, 0으로 임의 치환하지 않음).
- `v_yoy`: 같은 vintage 안에서의 전년비(YoY).
- `v_revision`: 같은 (vendor, year)를 직전 vintage와 비교한 리비전(delta).
- `v_latest`: 가장 최신 vintage의 전체 행.

같은 vintage를 다시 적재하면 기존 값이 삭제되고 새 값으로 교체됩니다 (멱등 재적재).

## 표시용 집계 규칙 (대시보드에서 사용 예정)

아래 두 집계는 DB에 저장하지 않고, 나중에 화면(대시보드)에 표시할 때 그 자리에서 계산합니다.

- **CN Total** = Huawei + Honor + Oppo + Vivo + Xiaomi + Lenovo + Transsion + CN others
- **Others** = HMD (Nokia) + Local

## 연간 컬럼 인식 로직 (참고)

`load_forecast.py`의 `locate_year_columns()` 함수가 헤더 행(4행)에서 '25/'26/'27 연간
컬럼을 찾습니다. 사내 `update_tam.py`로 2026-07-07 확정된 규칙(어퍼스트로피 접두 문자열
라벨, 예: `'26`)을 그대로 반영했습니다. 이 규칙이 이후에도 바뀌면 이 함수만 고치면 됩니다.

## 매월 적재 — 사내 Claude Code(Sonnet)에 붙여넣는 프롬프트

```
연전망 엑셀을 TAM DB에 적재해줘. 반드시 아래 순서대로만 진행하고, 각 단계 결과를
나에게 그대로 보여줘. 스크립트를 수정하지 마.

1) 아래 명령으로 적재해:
   python pipeline\load_forecast.py --source "<연전망 엑셀 경로>" --sheet "<시트명, 예: 6월 연전망용>" --vintage <YYYY-MM> --db tam.db

2) 콘솔 출력을 그대로 나에게 보여줘 (성공/실패 메시지 전부).

3) 만약 에러가 나면 (헤더 라벨, 벤더명, 숫자가 아닌 값 등) 에러 메시지를 그대로
   보여주고, 절대 네가 임의로 코드를 고치거나 값을 추측해서 넣지 마 -- 나에게 먼저 물어봐.

4) 성공하면 4단계는 끝. tam.db 파일 경로만 알려줘.
```

`<연전망 엑셀 경로>`, `<시트명>`, `<YYYY-MM>`만 실제 값으로 바꾸면 됩니다.

## 테스트

```powershell
python pipeline\tests\test_pipeline.py
```

합성(가짜) 엑셀 픽스처를 임시 폴더에 생성해 파이프라인 전체를 검증합니다. pytest 등
외부 의존성 없이 `assert` 기반으로 동작하며, 실패 시 0이 아닌 종료 코드를 반환합니다.
