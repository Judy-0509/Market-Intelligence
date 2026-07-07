# writing-skills — 사내 보고서 문체 학습·작성 스킬

사내에서 쓰는 보고서(붙여넣은 텍스트)로 개인 문체를 "학습"시키고, 그 문체로 새 보고서를
쓰게 하는 Claude Code 스킬 3종 모음이다. 모든 처리는 사용자의 PC에서 실행되는
Claude Code 안에서만 이루어진다 — 문서가 이 저장소나 외부로 나가지 않는다.

## 설치

`writing-skills/` 아래 3개 스킬 폴더(`style-extractor/`, `my-report-style/`,
`humanize-korean/`)를 폴더째 그대로 사내 PC의 다음 경로에 복사한다.

```
C:\Users\<계정>\.claude\skills\
```

복사 후 구조:

```
C:\Users\<계정>\.claude\skills\
  style-extractor\
  my-report-style\
  humanize-korean\   (선택 설치 — 없어도 나머지 2개는 정상 동작)
```

**왜 사용자 레벨(`~/.claude/skills/`)인가:** 문체 프로파일(`style-profile.md`)은
문서를 학습할수록 그 사용자의 개인 데이터가 쌓이는 파일이다. 프로젝트 저장소에
두면 다른 프로젝트나 다른 사람과 공유되거나 실수로 커밋될 위험이 있으므로,
사용자 계정에만 귀속되는 사용자 레벨 스킬 폴더에 설치한다.

## 사용 흐름 (3단계)

### ① 학습 — `style-extractor`

과거에 쓴 보고서를 붙여넣으며 학습을 요청한다.

```
이 보고서로 내 문체 학습해줘:

(여기에 보고서 원문 붙여넣기)
```

또는 파일 경로로:

```
C:\보고서\6월실적보고.md 이 문서로 문체 학습해줘
```

여러 편을 학습시킬수록 프로파일이 정교해진다. 최소 3편 이상 학습하면 대부분
항목이 "확정" 등급이 된다.

### ② 작성 — `my-report-style`

학습된 문체로 새 보고서를 요청한다.

```
7월 실적 보고서 작성해줘. 매출 120억, 전월 대비 +5%p, 신규 계약 3건.
```

학습된 문체가 없으면 스킬이 먼저 학습을 안내하고 멈춘다 — ①을 먼저 실행한다.

### ③ 퇴고 (선택) — `humanize-korean`

AI가 쓴 티가 남아있으면 마지막에 한 번 더 윤문을 요청한다 (설치했을 때만).

```
AI 티 없애줘
```

## "학습"의 정체 (정직하게 설명)

이 스킬 시스템의 "학습"은 **모델을 다시 훈련하는 것이 아니다.** Claude 자체는
전혀 바뀌지 않는다. 실제로 일어나는 일은:

1. `style-extractor`가 붙여넣은 보고서를 분석해 문체 규칙(구조·문장·숫자·기호·
   어휘·톤)을 뽑아낸다.
2. 그 규칙을 `my-report-style/style-profile.md`라는 마크다운 파일에 누적한다
   (스킬 파일 메모리 방식).
3. `my-report-style`이 다음 요청 때 이 파일을 읽어 그대로 적용한다.

즉 "학습"은 파일 하나가 점점 자세해지는 것이다. 문서를 더 넣을수록 프로파일의
"확정" 항목이 늘어나 결과가 더 정교해진다. **원문 자체(문장·문단)는 프로파일에
저장되지 않는다** — 프로파일에는 문체 규칙과 15자 이내 짧은 예시 구만 남는다.

## 보안 노트

> ⚠️ **이 저장소는 public이다.** 사내에서 실제로 채워진(학습이 진행된)
> `style-profile.md`를 이 저장소에 절대 커밋하지 않는다.

- 이 저장소에 있는 `my-report-style/style-profile.md`는 항상 빈 템플릿
  (`(미학습)` 상태) 그대로 유지한다. 실제 학습은 사내 PC의
  `~/.claude/skills/my-report-style/style-profile.md`에서만 일어나며, 그 파일은
  이 저장소 밖에 있으므로 원래 커밋될 일이 없다.
- 저장소 안(`writing-skills/`)에서 직접 테스트하며 프로파일을 채워보고 싶다면,
  파일명을 `style-profile.local.md`로 따로 만들어 쓴다 — `.gitignore`에
  `writing-skills/**/style-profile.local.md`가 등록되어 있어 커밋되지 않는다.
  테스트가 끝나면 이 파일은 지운다.
- 원칙: **사내에서 채운 프로파일은 사내에만 둔다.**

## humanize-korean 출처·라이선스·수정 내역

- **출처:** [github.com/epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai)
- **가져온 경로:** `.claude/skills/humanize-korean/` (SKILL.md + references/*)
- **고정 커밋:** `14aeb52d13e737beb4e999cb7cb92275d0969689`
- **가져온 날짜:** 2026-07-07
- **라이선스:** MIT (`writing-skills/humanize-korean/LICENSE`에 원본 그대로 포함)
- **수정 내역:**
  1. **제외한 파일:** `agents/*.md`(6종 에이전트 정의), `tests/*`, `references/metrics.py`,
     `references/metrics_v2.py`, `references/baseline.json`,
     `references/baseline_v2.json`, `references/ai-tell-taxonomy.md`,
     `references/rewriting-playbook.md`, `references/scholarship.md`,
     `references/web-service-spec.md` — code/pipeline 자산(`agents/`, `tests/`,
     `*.py`)이거나, 제외된 Strict 모드(5인 에이전트 파이프라인) 전용 참고자료라
     Fast 모드만 남긴 이 벤더링본에서는 쓰이지 않기 때문.
  2. **SKILL.md 재작성:** 원본은 Fast 모드에서도 `humanize-monolith`라는 별도
     에이전트를 `Agent` 도구로 호출했다. 그 에이전트 정의가 제외 대상이므로, 이
     벤더링본은 하위 에이전트 호출 없이 **이 스킬을 실행하는 모델이 직접 단일
     패스로** 탐지→윤문→자체검증을 수행하도록 절차를 고쳤다. Strict 모드
     섹션(Phase A~D, 팀 병렬 검증) 전체와 "에이전트 호출 규칙" 섹션은 삭제했다.
     탐지 패턴·처방·자체검증 항목·등급 기준 등 **규칙 내용 자체는 바꾸지 않았다.**
  3. **references/quick-rules.md 소폭 수정:** 첫 문단에서 `humanize-monolith`
     에이전트를 전제로 한 설명을 "이 스킬을 실행하는 모델이 직접 적용"하는
     설명으로 바꾸고, 벤더링 수정 고지를 추가했다. 또한 말미 각주의
     `references/scholarship.md` 언급에 "(이 벤더링본에는 미포함, 원본 저장소
     참조)" 주석을 덧붙였다 (해당 파일은 제외 대상이라 실제로 존재하지 않으므로).
     표·규칙 내용은 원본과 동일.
  4. **참고 자료 링크 정리:** SKILL.md의 "참고 자료" 절에서 제외된 파일에 대한
     링크(ai-tell-taxonomy.md, rewriting-playbook.md, web-service-spec.md)를
     제거하고 quick-rules.md 링크만 남겼다.
  5. 정밀 검증이 필요한 경우를 위해, 등급이 낮게 나왔을 때 원본 저장소에서 전체
     Strict 파이프라인을 설치하라는 안내 문구를 추가했다.
