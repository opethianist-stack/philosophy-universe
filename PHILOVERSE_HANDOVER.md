# PHILOVERSE_HANDOVER.md
> Claude Code 인계 문서: 프로젝트 히스토리, 확정 결정, 다음 작업

---

## 1. 프로젝트 개요

- **이름**: Philoverse (필로버스)
- **형태**: 단일 `index.html` 파일(~617KB)로 된 서양철학사 인터랙티브 시각화
- **배포**: https://philosophy-universe.vercel.app/ (GitHub `opethianist-stack/philosophy-universe`의 `main`과 Vercel 자동 배포 연결, 정적 호스팅)
- **대상**: 철학 입문자 (고등학생 ~ 대학 초년생)
- **목표**: 지적 위압감 없이 사상사를 탐색하게 하기. 서지 정보보다 핵심 개념과 철학사적 위치를 우선하고, 시각적 화려함보다 가독성을 우선
- **부가 목적**: 제작자(송무석)의 포트폴리오
- **협업 모델**: 사용자 = 비전·큐레이션·품질 판단 / Claude = 코드·데이터 직렬화·초안 작성. 계정 생성·결제·크리덴셜 입력은 항상 사용자 몫
- **커밋 이력 주의**: 모든 커밋이 GitHub 웹 업로드("Add files via upload")라서 커밋 메시지에 결정 이력이 없음. 이 문서가 유일한 이력 기록

### 시각화 구조
- 2D 캔버스: 세로축 = 시간(비선형, 철학적 밀도 반영), 가로축 = 사조(tradition)
- 사조별 성운(nebula) 효과, 서양 주류 밖에서 진입한 철학자는 혜성(comet) 효과 (`COMET_IDS` 9명)
- 시간적으로 멀지만 개념적으로 연결된 사상가 간 웜홀(wormhole) 연결 (10개)
- 추천 항로 5개(A~E), 핵심 질문 필터 8개, 관계선 클릭 팝업
- 주제 항로(TOPIC_ROUTES) 패널, 입문 모드(영향력 0.85+ 67명), 시대별 연표 토글
- 사조 라벨: 캔버스 상단 스트립(`drawTradLabels()`) + 필터 패널, 데스크톱 호버 툴팁 / 모바일 ⓘ 클릭 확장
- 첫 진입 모달: 철학자 우주 둘러보기 / 문제의식에서 시작하기 / 사조 영향 관계로 보기 (localStorage `philoverse_entry_seen`)
- 사조 영향 그래프: 전체화면 오버레이, force-directed, 임계값 슬라이더·가중치(강도/개수) 전환 (`initTradGraph`)
- 2.5D 깊이감: 사조별 z값(`TRAD_Z`) + 마우스 패럴랙스, 효과 패널에서 토글

---

## 2. 현재 데이터 규모 (`index.html` 기준 실측)

| 자산 | 규모 |
|---|---|
| 철학자 (`RAW.n`) | 213명 |
| 영향 관계 (`RAW.l`) | 562개 |
| 웜홀 (`RAW.wormholes`) | 10개 |
| 사조 (traditions) | **41개** = 근대·현대 31 + 고대·중세 10. `colors` / `TRAD_KO` / `TRAD_INFO` / `TRAD_Z` / 필터 패널 모두 41로 일치. TRAD_INFO 5필드(era / meaning / reps / q / metaphor) 완비 |
| 시대 밴드 (`EPOCHS`) | 11개 |
| 역사 이벤트 (`HISTORICAL_EVENTS`) | 43개 |
| 주제 항로 (`TOPIC_ROUTES`) | 22개 |
| EXTRA (hook/problem/metaphor) | 213명 전원 보유 |
| 임베딩 대상 문서 | 276개 = 학자 213 + 사조 41 + 항로 22. 텍스트 총 ~110,000자 ≈ 88,000 토큰 |

### 사조 목록 (41)
- **고대·중세 (10)**: presocratics, ancient-greek, cynicism, stoicism, epicureanism, neoplatonism, alexandrian-school, patristics, scholasticism, islamic-philosophy
- **근대 (5)**: continental-rationalism, british-empiricism, enlightenment, german-idealism, neo-kantianism
- **19~20세기 대륙 (13)**: vitalism, phenomenology, existentialism, hermeneutics, psychoanalysis, critical-theory, structuralism, post-structuralism, postmodernism, classical-marxism, western-marxism, post-marxism, sociology
- **영미·과학 (3)**: analytic-philosophy, philosophy-of-science, pragmatism
- **정치철학 전통 (6)**: political-philosophy, liberalism, republicanism, conservatism, communitarianism, anarchism
- **현대 확장 (4)**: postcolonialism, feminist-philosophy, speculative-realism-new-materialism, cultural-studies

### 사조 개수 변천 (커밋 기준)
| 커밋 | 날짜 | 학자 | 관계 | 사조 |
|---|---|---|---|---|
| `297c133` | 04-27 | 105 | 228 | 10 |
| `b859787` ~ `b312e02` | 04-27 ~ 05-03 | 105 | 228 | 24 |
| `093eebf` | 05-04 | 172 | 461 | 30 |
| `b56f5c6` | 05-06 | 172 | 461 | 29 (사변적 실재론 + 신유물론 통합) |
| `7cc73aa` | 05-08 | 213 | 562 | 41 (+postmodernism, classical-marxism, 고대·중세 10) |
| `df76d7a` | 05-26 | 213 | 562 | 41 (현재 배포본) |

HTML `#legend`는 CSS로 숨겨져 있고(`display:none`, 필터 패널과 중복) 05-06 시점의 29개 항목에서 갱신되지 않았음. 과거 문서의 "29개" 표기는 이 시점 기준.

---

## 3. 히스토리 요약

### 04-25 ~ 05-03 — 구상 단계
- 105명 / 관계 228개 / 사조 24개로 시작. SEP·Routledge·Oxford Handbook 분류 기준
- 비선형 시간축, 웜홀, 성운, 혜성, 추천 항로, 핵심 질문 필터, 관계선 클릭 팝업 구현
- Vercel + GitHub 자동 배포 파이프라인 구축
- 05-03에 `philosophy_universe.html`을 올렸다가 삭제하고 `index.html`로 일원화

### 05-04 ~ 05-06 — 확장 및 사조 정리
- 172명 / 461개 관계로 확장, 첫 진입 모달 도입 (05-04)
- 사조 통합: 사변적 실재론 + 신유물론 → `speculative-realism-new-materialism` (30 → 29)
- 생철학(vitalism) 정리: 하위징아·카이와 → sociology 이동, 쇼펜하우어·니체·베르그송만 유지
- 구조주의/후기구조주의와 실존주의/현상학은 분리 유지
- TRAD_INFO 작성, 사조 라벨 스트립 + 호버/모바일 ⓘ 툴팁 (`showTradTooltipAtPoint` / `hideTradTooltipExternal` 전역 함수화)
- 2.5D 깊이감(`TRAD_Z`, 패럴랙스) 도입 (05-06)

### 05-08 — 고대·중세 보강 + 사조 영향 그래프
- 172 → 213명, 461 → 562개 관계. 사조 29 → 41 (postmodernism, classical-marxism, 고대·중세 10개 추가)
- 고대/중세 좌표 재배치 (평균 간격 4.8 → 36.4 유닛)
- EPOCHS 11개, HISTORICAL_EVENTS 43개, TOPIC_ROUTES 22개로 확장
- 사조 영향 그래프(force-directed) 구현
- "비유로 이해하기" 38명 리라이팅 (품질 기준은 §5)

### 05-26 — RAG Phase 1 + Phase 2 클라이언트
- EXTRA 213명 전원 완비 (Phase 0)
- 검색 패널에 키워드(TF-IDF) / 의미(AI) 모드 토글 추가 (Phase 1)
- Phase 2 클라이언트 코드(`loadSemanticIndex`, `runSemanticSearch`, 코사인 유사도) 포함해 배포. 백엔드와 `embeddings.json`은 미작성·미배포

이후 사용자 이직으로 공백 → Phase 2 백엔드 작성부터 재개.

---

## 4. 확정 결정사항 (변경 금지)

- **Nick Land 제외** (완전 배제). `delanda`는 마누엘 데란다로 무관
- 볼테르 노드 크기 축소 유지 (현재 14, 전체 범위 12~17)
- 카시러는 **neo-kantianism** 분류 (이 사조의 유일한 소속)
- 프랑크푸르트학파는 **critical-theory** 단일 사조 + themes에 세대 서브태그 (`프랑크푸르트학파1세대` 벤야민·아도르노·프롬 / `2세대` 하버마스 / `3세대` 호네트)
- 알튀세르는 **structuralism**
- ID `bachler`는 **의도적 철자**: 절대 수정하지 말 것
- **거부된 기능**: 랜덤 학자 카드, 관계선 호버 팝업 (클릭 팝업은 유지). 스코프를 타이트하게 유지
- 검색은 키워드 매칭 + 임베딩 의미 검색까지만. 챗봇형 UI는 Phase 3 이전에 도입하지 않음

---

## 5. 콘텐츠 품질 기준

### "비유로 이해하기" (metaphor) 작성 규칙
1. 철학자 이름을 언급하지 않은 **구체적 일상 장면**으로 시작 → 그 다음 사상과 연결
2. 도입부 형식은 **평서문 / 질문 / 가정법 / 직접화법**으로 다양하게. 모든 항목을 "마치 ~"로 시작하는 것 금지
3. 직접 인용보다 일상 비유 우선

현황: 학자 EXTRA 213개 중 "마치"로 시작 0개. TRAD_INFO 사조 비유는 41개 전부 "마치 ~"로 시작 (규칙 적용 범위 미정).

### 사조 변경 시 동기화 체크리스트 (하나라도 빠지면 렌더링 깨짐)
- [ ] `RAW.colors`
- [ ] `TRAD_KO`
- [ ] `TRAD_INFO`
- [ ] `TRAD_Z`
- [ ] HTML 필터 패널 (`#filter-panel input[data-trad]`)
- [ ] HTML 범례 (`#legend`, 현재 숨김 상태이며 29개에서 멈춰 있음)
- [ ] 메타 통계 (`#meta`, 진입 모달 문구 "41개 사조")

### 빌드/검증 패턴
- 데이터 수정: 정규식으로 RAW JSON 추출 → 파싱 → 수정 → 재직렬화 → 원위치 기록
- 모든 변경 후 `new Function(scriptContent)`로 JS 문법 검증 후 파일 출력
- 최종 품질은 사용자가 렌더링 결과를 직접 눈으로 확인해서 판정. 논리 검증만으로 완료 처리하지 말 것

---

## 6. RAG 로드맵

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 데이터 정비: 213명 전원 EXTRA(hook/problem/metaphor) 완비 | ✅ 완료 |
| 1 | 클라이언트 TF-IDF 키워드 검색 + "의미 검색" 사이드 패널 | ✅ 완료 (배포본 포함) |
| **2** | **OpenAI 임베딩 기반 의미 검색 (검색 = RAG의 R)** | 🔶 클라이언트 배포됨, **백엔드·`embeddings.json` 미배포** ← 현재 위치 |
| 3 | LLM 응답 생성 (사용자 고민에 가이드 답변 + 항로 추천, RAG의 G) | 계획만 존재 |
| 4 | 운영·개선 (사용 통계, 캐싱, 응답 품질 평가) | 계획만 존재 |

각 Phase는 독립적으로 가치를 가짐. Phase 2에서 멈춰도 완결된 기능.

### Phase 2 확정 아키텍처 결정
- **백엔드**: Vercel Functions (Cloudflare Workers 검토 후 기각. 기존 Vercel/GitHub 계정 활용)
- **임베딩 모델**: OpenAI `text-embedding-3-small`, **1536차원 그대로** (차원 축소 안 함)
- **임베딩 저장**: 정적 파일 `embeddings.json`, 클라이언트가 **검색 시작 시 lazy load**. Vercel KV 기각
  - 용량: 1.7MB는 float32 바이너리 기준. 클라이언트가 JSON 숫자 배열을 기대하므로 소수점 6자리 반올림 시 약 4MB(전송 시 gzip/brotli 압축)
- **검색 연산 분담**: 백엔드는 쿼리 임베딩 생성 프록시만 담당. **코사인 유사도 계산은 클라이언트**에서 수행
- **API 키 관리**: 운영자 키(Vercel 환경변수 `OPENAI_API_KEY`) + IP 기반 일일 호출 한도. 저장소가 없어 한도는 함수 인스턴스 메모리 기준(인스턴스 재시작·분산 시 초기화되는 best-effort). 실질적 비용 상한은 OpenAI 대시보드의 월 사용 한도로 설정. BYOK는 공개 확장 시점에 재검토
- **비용 전망**: 문서 임베딩 1회 ~$0.002, 쿼리 임베딩 월 ~$0.015 수준 (일 100명 × 5회 가정)

---

## 7. Phase 2 구성

예전 세션의 `philoverse-deploy/` 패키지는 저장소 이력에 존재하지 않음 → §6 결정대로 재작성해 저장소에 포함.

```
philosophy-universe/
├── index.html                 ← 시각화 본체 (Phase 2 클라이언트 포함)
├── embeddings.json            ← 생성 산출물 (276 docs × 1536차원), 저장소에 커밋
├── api/
│   └── search.js              ← Vercel Function: POST {query} → {embedding} + IP 한도
├── scripts/
│   └── generate_embeddings.js ← index.html에서 문서 추출 → OpenAI 임베딩 → embeddings.json
├── package.json
├── .env.example               ← OPENAI_API_KEY 템플릿
├── .gitignore                 ← .env, node_modules 제외
└── .vercelignore              ← scripts/, 문서, .env 배포 제외
```

### 클라이언트 ↔ 백엔드 계약 (`index.html`에 이미 구현된 쪽 기준)
- 요청: `POST /api/search`, body `{ "query": "<문자열>" }`
- 성공 응답: `{ "embedding": number[1536] }`
- 실패 응답: HTTP 4xx/5xx + `{ "error": "<메시지>" }` (클라이언트가 `data.error`를 그대로 표시)
- `embeddings.json`: `{ model, dimensions, count, docs: [{ type, id, title, meta, snippet, embedding }] }`, `type`은 `philosopher` / `tradition` / `topic`

### 클라이언트 측 검색 흐름
1. 의미(AI) 모드에서 검색 → `loadSemanticIndex()`가 `embeddings.json` 로드(1회, 메모리 캐시)
2. `fetch('/api/search')` → IP 한도 확인 → OpenAI 쿼리 임베딩 → 1536차원 벡터 반환
3. 276개 문서 벡터와 코사인 유사도 계산 → 상위 15개를 기존 검색 패널 카드 UI로 표시

---

## 8. Phase 2 작업 순서

### 사용자가 직접 하는 일
1. OpenAI API 키 발급 (platform.openai.com, 결제수단 등록 필요). 월 사용 한도 설정 권장
2. 로컬 `.env`에 `OPENAI_API_KEY=...` 입력 (절대 커밋 금지)
3. Vercel 대시보드 → philosophy-universe → Settings → Environment Variables에 `OPENAI_API_KEY` 등록 (Production + Preview)

### Claude Code가 하는 일
1. ~~저장소 상태 파악~~ (완료: 배포 패키지 부재, `index.html`은 Phase 2 클라이언트까지 포함)
2. ~~`api/search.js`, `scripts/generate_embeddings.js`, `package.json` 등 작성~~ (완료)
3. `node --env-file=.env scripts/generate_embeddings.js` 실행 → `embeddings.json` 생성·검증 (276 docs, 1536차원)
4. `vercel dev` 또는 Preview 배포로 `/api/search` 동작 확인
5. `main` 반영 → 자동 배포
6. 배포 후 확인: Vercel Functions 탭에 `api/search` 존재, 환경변수 반영, 라이브 사이트에서 의미 검색 동작

### 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `generate_embeddings.js` 401 | 잘못된 API 키 | `.env` 점검 |
| `generate_embeddings.js` 429 | 결제수단 미등록 / 한도 초과 | OpenAI Billing 확인 |
| 사이트는 뜨는데 검색만 안 됨 | API 함수 미배포 or 환경변수 누락 | Vercel → Functions 탭에서 `api/search` 확인, 환경변수 추가 후 재배포 |
| "인덱스 로드 실패: embeddings.json not found" | `embeddings.json` 미배포 | 저장소 루트에 파일 존재 확인 후 재배포 |
| 백엔드 에러 "server not configured" | `OPENAI_API_KEY` 미설정 | Vercel 환경변수 등록 후 재배포 |

**현재 라이브 상태**: 검색 패널의 "의미 (AI)" 모드가 노출되어 있으나 백엔드가 없어 선택 시 인덱스 로드 실패가 표시됨.

---

## 9. Phase 2 이후 대기 중인 과제

1. **검색 품질 평가** → 임베딩 텍스트 합성 방식 조정
2. ~~모바일 최적화~~ (§11 항목 모두 처리). 남은 것: 실기기 Safari 확인, 시트 드래그 제스처, 데스크톱 글자 크기·대비
3. **UI/UX 고도화 큐**: 성운 레이어 정제, 관계선 팝업 안정화
4. **범례·통계 동기화**: 숨겨진 `#legend`를 41개로 갱신하거나 제거
5. Phase 3: LLM 가이드 응답 / Phase 4: 운영·통계

완료되어 큐에서 제외: 2.5D 깊이감(05-06), 사조 간 영향 관계 시각화(force-directed, 05-08)

---

## 10. 협업 방식 메모

- 구현 전 **명확히 라벨링된 옵션**을 제시하면 사용자가 빠르게 결정함 ("옵션 b로 진행" 식)
- 디자인 방향은 커밋 전 목업 요청 가능성 있음
- 시각 밀도·가독성에 민감. 이를 해치는 기능은 거부됨
- 산출물(문서·다이어그램 포함)에 작업 맥락 메타 서술 넣지 말 것. 구조적 라벨(제목/헤더)만 사용

---

## 11. 모바일 검토 결과 (iPhone 13 / SE / 가로 모드, Playwright)

### 치명 (수정 완료)
1. ~~가로 오버플로~~: 상단바에 로고·통계·검색창·버튼 4개가 한 줄로 들어가 390px 폭을 넘기면서 레이아웃 뷰포트가 560px로 늘어나 모달·카드 오른쪽이 잘리던 문제
   - 600px 이하: 상단바 2행(로고+버튼 / 전체폭 검색창), `#meta` 숨김, 검색창 16px(iOS 포커스 확대 방지), 패널 버튼은 1행 가로 스크롤, `#hint` 숨김
   - 374px 이하: ＋/－ 버튼 숨김 (핀치 줌으로 대체)
   - 진입·주제 선택 모달이 화면보다 길면 위가 잘리지 않고 스크롤되도록 변경
   - 확인: 320 / 360 / 390px, 가로 모드, 데스크톱 1280px에서 가로 오버플로 없음
2. ~~의미 검색 패널이 항상 열린 채 시작~~: `#search-panel`의 `display:flex` 제거 (열린 상태는 원래 `togglePanel`이 인라인 `block`으로 표시했으므로 모양 변화 없음)

### 주요
3. ~~첫 화면에서 노드가 거의 보이지 않는 빈 영역으로 시작함~~ → 수정 완료: 600px 이하에서 `initialPosition()`이 배율 0.7로, 화면에 보이는 시대 구간(상단바~탭바)의 가장 왼쪽 노드부터 보이게 시작 (390px 기준 처음 보이는 노드 0 → 14개, 데카르트~헤겔). 데스크톱 초기 위치는 변경 없음
4. ~~터치 타깃이 작음~~ / 5. ~~사이드 패널이 고정폭으로 좌상단에 붙음~~ → 하단 탭바 + 시트(B안)로 수정 완료
   - 600px 이하: 패널 버튼 6개를 하단 탭바(높이 52px, 아이콘 + 짧은 라벨 `data-short`)로 이동
   - 패널은 탭바 위로 올라오는 시트(상단 여백 150px 확보), 드래그 핸들 모양 + 스크롤해도 고정되는 ✕ 닫기(`closePanel()`)
   - 사조 필터 2열, 버튼·체크 행 40px 이상, 입력창 16px
   - 모바일에서 학자 카드(`#card`)와 시트는 동시에 하나만: 카드가 뜨면 시트 닫힘(`showCard`), 탭을 누르면 카드 닫힘(`togglePanel`)
   - 데스크톱 레이아웃·동작은 변경 없음 (라벨은 `.pb-ic` + `.pb-lb` 두 span으로 분리됐지만 표시는 동일)
   - 미구현: 시트 드래그로 크기 조절, 아래로 쓸어 닫기
6. ~~사조 영향 그래프 라벨 겹침~~ → 수정 완료 (데스크톱 포함)
   - 배치: 노드 충돌을 원 반지름 대신 라벨 폭을 포함한 박스로 판정하고, 힘이 아닌 위치 직접 보정(반복 3회)으로 처리 → 허브 노드 주변에서도 라벨이 원에 눌리지 않음
   - 그리기: 원을 모두 그린 뒤 라벨을 포커스 → 이웃 → 호버 → 큰 노드 순으로 배치, 이미 놓인 라벨과 겹치면 생략 (포커스 계열은 항상 표시)
   - 밝은 원(과학철학·정신분석)의 원 안 라벨은 어두운 글자, 원 아래 라벨은 화면 밖으로 잘리지 않게 보정
   - 첫 표시 시 레이아웃에 맞춰 자동 맞춤(배율 ≤ 1). 사용자가 줌·패닝하면 중단, "레이아웃 재계산" 시 재개
   - 터치 지원 추가(이전엔 마우스 이벤트만 있었음): 탭 선택, 한 손가락 드래그(노드 이동·패닝), 두 손가락 핀치 줌. `touch-action:none`
   - 모바일 컨트롤 박스 2줄로 압축, 헤더 한 줄(통계 숨김), 안내 문구 터치용으로 교체
   - 결과(Playwright 실측): 데스크톱 41개 라벨 전부 표시·겹침 0 (수정 전 원-라벨 가림 다수, 라벨 간 겹침 3). 390px는 전체 맞춤 상태에서 19개 표시·겹침 0, 나머지는 확대하면 표시 (수정 전 10개가 화면 밖)
7. ~~글자 크기·대비~~ → 수정 완료 (600px 이하만, 데스크톱 변경 없음)
   - 체계: 라벨·메타 11px / 보조 본문 12px / 본문 13px, 흰색 불투명도 0.55 이상 (`</style>` 직전 "모바일 글자 크기·대비" 블록)
   - 대상: 탭바 라벨, 관계 범례, 진입·주제 선택 모달, 시트 제목, 추천 항로·핵심 질문 설명, 효과 패널, 주제 항로 결과(태그·질문·항로 카드), 의미 검색 결과, 학자 카드 전체, 관계선 팝업, 사조 그래프 컨트롤·정보 패널
   - 학자 카드 사조명은 사조 색을 글자색으로 쓰므로 `filter:brightness(2)`로 밝힘 (가장 어두운 `#791F1F`도 대비 5.3)
   - 측정(Playwright, 390px, 화면별 보이는 텍스트 전수): 수정 전 12px 미만 또는 대비 4.5 미만 항목 다수(최저 8.5px, 대비 1.8) → 수정 후 11px 미만 없음, 대비 4.5 미만 없음 (장식용 SVG 글자 제외)
   - 미적용: 캔버스에 직접 그리는 노드·시대 라벨, 데스크톱 전체 (데스크톱도 9~10px·저대비 텍스트가 같은 수준으로 남아 있음)

### 양호
- 노드 선택 시 하단 시트 카드(`#card`), 핀치 줌, 모바일 ⓘ 사조 툴팁은 동작함
