# Folioo ERD

> 포트폴리오 관리 플랫폼 데이터베이스 설계서
> v2.9.0 | 2026-08-07

---

## 테이블 목록

| 도메인                   | 테이블                           | 설명                                 |
| ------------------------ | -------------------------------- | ------------------------------------ |
| **user**                 | `users`                          | 사용자 정보                          |
|                          | `social_user`                    | 소셜 로그인 정보                     |
|                          | `user_agreement`                 | 약관 동의                            |
|                          | `term`                           | 약관 정의                            |
|                          | `withdrawn_user`                 | 탈퇴 사용자 이력                     |
| **experience**           | `experience`                     | 경험 정리                            |
|                          | `experience_source`              | 경험 정리 파일 (OCR 추출)            |
| **portfolio**            | `portfolio`                      | 포트폴리오                           |
| **portfolio-correction** | `portfolio_correction`           | 포트폴리오 첨삭                      |
|                          | `correction_portfolio_selection` | 첨삭-포트폴리오 선택 매핑            |
|                          | `correction_item`                | 첨삭 항목                            |
|                          | `correction_rag_data`            | RAG 데이터 (기업 분석용)             |
| **insight**              | `insight`                        | 인사이트                             |
|                          | `insight_activity`               | 인사이트-활동 매핑                   |
|                          | `activity`                       | 활동                                 |
| **ticket**               | `ticket_product`                 | 이용권 상품 (구매용)                 |
|                          | `ticket`                         | 이용권 (보유/사용 추적)              |
|                          | `ticket_grant`                   | 이용권 지급 ledger                   |
|                          | `ticket_grant_notice`            | 이용권 지급 안내 ledger              |
| **payment**              | `payment`                        | PayApp 결제 건                       |
| **event**                | `event`                          | 이벤트 정의                          |
|                          | `event_participation`            | 이벤트 참여/진행도                   |
|                          | `event_feedback_submission`      | 이벤트 피드백 제출 이력              |
| **block** (경험 정리 v3) | `block_kind`                     | 블록 종류 정의 (메타)                |
|                          | `block`                          | 사용자 블록 트리 (1~5단계)           |
|                          | `experience_meta`                | EXPERIENCE 블록 메타데이터           |
|                          | `review`                         | 블록 첨삭 대상 마킹                  |
|                          | `experience_map`                 | 사용자별 트리 버전 (낙관적 잠금)     |
|                          | `ai_experience_session`          | 사용자별 AI 세션 (1:1)               |
|                          | `ai_experience_request`          | AI 요청 이력 (멱등/재시도/커밋 상태) |
|                          | `ai_commit_log`                  | AI 커밋 롤백용 스냅샷 (최신 1건)     |

> **Note**: `block` 계열 스키마는 경험 정리 v3 개편(구조화 트리)을 위해 신설되었습니다.
> 기존 `experience`/`portfolio` 스키마는 삭제하지 않고 그대로 유지하며, `experience_meta.experience_id`로
> 기존 `experience` 레코드를 참조(EXTERNAL 원본 보관)할 수 있습니다.

---

## ERD 관계도

```
users
   │
   ├── 1:N ─ social_user (소셜 로그인)
   │
   ├── 1:N ─ user_agreement (약관 동의)
   │
   ├── 1:N ─ experience ─── 1:N ─ experience_source (OCR 추출)
   │
   ├── 1:N ─ portfolio ─── N:1 ─ experience (경험에서 생성, nullable)
   │
   ├── 1:N ─ portfolio_correction ─── 1:N ─ correction_portfolio_selection
   │                                        └─── N:1 ─ portfolio
   │
   ├── 1:N ─ portfolio_correction ─── 1:N ─ correction_item
   │                                        └─── N:1 ─ portfolio
   │
    ├── 1:N ─ activity ─── N:N ─ insight_activity ─── N:N ─ insight
    │
    ├── 1:N ─ ticket_grant ─── 1:N ─ ticket_grant_notice
    │           └── 1:N ─ ticket (지급 ledger 기반 추적)
    │
    ├── 1:N ─ ticket (이용권 보유)
    │           ├── N:1 ─ payment (구매로 획득 시)
    │           ├── N:1 ─ event_participation (이벤트로 획득 시)
    │           └── N:1 ─ ticket_grant (지급 ledger 연결, nullable)
   │
   ├── 1:N ─ payment ─── N:1 ─ ticket_product (이용권 상품)
   │
   ├── 1:N ─ event_participation ─── N:1 ─ event (이벤트 정의)
   │
   └── 1:N ─ event_feedback_submission ─── N:1 ─ event (외부 피드백 이력)

users
   ├── 1:N ─ block (소유 트리, parent_id 자기참조로 1~5단계 구성)
   │            └── N:1 ─ block_kind (종류 정의: GROUP_UNCATEGORIZED/GROUP/EXPERIENCE/SECTION_*/CONTENT)
   │
   ├── block(level=2, kind=EXPERIENCE) ─ 1:1 ─ experience_meta ─── N:1 ─ experience (nullable, EXTERNAL 원본)
   │
   ├── block(level=2, kind=EXPERIENCE) ─ 1:N ─ review (첨삭 대상 마킹)
   │
   ├── 1:1 ─ experience_map (트리 버전, 낙관적 잠금)
   │
   ├── 1:1 ─ ai_experience_session ─── 1:N ─ ai_experience_request (세션 요청 이력)
   │
   └── 1:1 ─ ai_commit_log (최신 커밋 1건, 롤백용)
```

> **Note**: `experience_meta`, `review`는 `(block_id, block_kind)` 복합 FK로 `block(id, kind)`를 참조하며,
> `block_kind`를 `EXPERIENCE`로 고정하는 CHECK 제약으로 EXPERIENCE 블록에만 연결되도록 강제합니다.

---

## Enum 정의

```typescript
// 사용자
UserState: 'GUEST' | 'ACTIVE' | 'INACTIVE';

// 소셜 로그인
LoginType: 'KAKAO' | 'NAVER' | 'GOOGLE';

// 약관
TermType: 'SERVICE' | 'PRIVACY' | 'MARKETING';

// 경험 정리
ExperienceStatus: 'ON_CHAT' | 'GENERATE' | 'DONE' | 'GENERATE_FAILED';

// 포트폴리오
SourceType: 'INTERNAL' | 'EXTERNAL';

// 포트폴리오 첨삭
PortfolioCorrectionStatus: 'DONE' |
    'NOT_STARTED' |
    'DOING_RAG' |
    'COMPANY_INSIGHT' |
    'GENERATING' |
    'FAILED' |
    'RAG_FAILED';

// PDF 추출
PdfExtractionStatus: 'PENDING' | 'EXTRACTING' | 'DONE' | 'FAILED';

// 블록 (경험 정리 v3)
BlockKind: 'GROUP_UNCATEGORIZED' |
    'GROUP' |
    'EXPERIENCE' |
    'SECTION_DETAIL' | // 상세정보
    'SECTION_ACHIEVEMENT' | // 주요성과
    'SECTION_TASK' | // 담당업무
    'SECTION_PROBLEM_SOLVING' | // 문제해결
    'SECTION_LEARNING' | // 배운 점
    'CONTENT';

// AI 경험 정리 요청 (varchar 컬럼, DB enum 아님 — 앱 레벨에서만 검증)
AiExperienceRequestStatus: 'running' | 'completed' | 'failed';

// 인사이트
InsightCategory: '대인관계' | '문제해결' | '학습' | '레퍼런스' | '기타';

// 이용권
TicketType: 'EXPERIENCE' | 'PORTFOLIO_CORRECTION';
TicketStatus: 'AVAILABLE' | 'USED' | 'EXPIRED';
TicketSource: 'PURCHASE' | 'EVENT' | 'ADMIN';
TicketGrantSourceType: 'EVENT' | 'SIGNUP' | 'ADMIN' | 'COMPENSATION' | 'PURCHASE';
TicketGrantActorType: 'SYSTEM' | 'ADMIN' | 'INTERNAL_API';
TicketGrantNoticeStatus: 'PENDING' | 'SHOWN' | 'DISMISSED';

// 결제 (PayApp 연동)
PaymentStatus: 'REQUESTED' | 'WAITING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL_REFUNDED';
PayType: 'CARD' |
    'PHONE' |
    'BANK_TRANSFER' |
    'VIRTUAL_ACCOUNT' |
    'KAKAO_PAY' |
    'NAVER_PAY' |
    'TOSS_PAY';
```

> **Note**: `PaymentStatus`는 PayApp `pay_state` 값을 매핑합니다. `PayType`은 PayApp `pay_type` 값을 매핑합니다. 매핑 로직은 Gateway 레이어에서 처리.

---

## 테이블 상세

> **Naming Policy**: DB 테이블/컬럼은 snake_case로 통일합니다.
> 코드(엔티티/DTO) 프로퍼티는 camelCase를 유지하며, TypeORM `namingStrategy`로 매핑합니다.
>
> **Common Columns**: 아래 테이블들은 공통으로 `created_at`, `updated_at` 컬럼을 포함합니다. (`BaseEntity`)

### users (사용자)

| 컬럼           | 타입        | 설명                        |
| -------------- | ----------- | --------------------------- |
| id             | number      | PK                          |
| name           | varchar(10) | 이름                        |
| phone_num      | varchar(11) | 전화번호 (nullable)         |
| status         | ENUM        | 인증 상태 (PENDING, ACTIVE) |
| is_active      | boolean     | 활성 여부                   |
| deactivated_at | datetime    | 비활성화 일시 (nullable)    |

> **Note**: 테이블명 `users`는 PostgreSQL 예약어 `user` 회피.
> `status`는 전화번호 인증 진행 상태를 나타내며, 소셜 회원가입 초기값은 `PENDING`입니다.
> 이메일은 `social_user.email`에서 관리합니다.

### social_user (소셜 로그인)

| 컬럼       | 타입         | 설명                               |
| ---------- | ------------ | ---------------------------------- |
| id         | number       | PK                                 |
| user_id    | number       | FK → users.id                      |
| login_type | ENUM         | 로그인 타입 (KAKAO, NAVER, GOOGLE) |
| login_id   | varchar(255) | 소셜 로그인 ID                     |
| email      | varchar(255) | 이메일                             |

> **Note**: `login_id`는 `varchar(255)`. 소셜 플랫폼 ID가 JS `number` 범위(2^53)를 초과할 수 있어 문자열로 저장.

### user_agreement (약관 동의)

| 컬럼      | 타입        | 설명                                    |
| --------- | ----------- | --------------------------------------- |
| id        | number      | PK                                      |
| user_id   | number      | FK → users.id                           |
| term_type | ENUM        | 약관 종류 (SERVICE, PRIVACY, MARKETING) |
| version   | varchar(10) | 약관 버전                               |
| is_agree  | boolean     | 동의 여부                               |
| agree_at  | datetime    | 동의 일시                               |

### experience (경험 정리)

| 컬럼     | 타입        | 설명                           |
| -------- | ----------- | ------------------------------ |
| id       | number      | PK                             |
| user_id  | number      | FK → users.id                  |
| name     | varchar(20) | 경험명                         |
| hope_job | ENUM        | 희망 직무                      |
| status   | ENUM        | 상태 (ON_CHAT, GENERATE, DONE) |

### experience_source (경험정리 파일)

| 컬럼           | 타입   | 설명               |
| -------------- | ------ | ------------------ |
| id             | number | PK                 |
| experience_id  | number | FK → experience.id |
| extracted_text | text   | OCR 추출 텍스트    |
| ocr_meta_data  | jsonb  | OCR 메타데이터     |

### portfolio (포트폴리오)

| 컬럼              | 타입         | 설명                          |
| ----------------- | ------------ | ----------------------------- |
| id                | number       | PK                            |
| user_id           | number       | FK → users.id                 |
| experience_id     | int (null)   | FK → experience.id (nullable) |
| name              | varchar(20)  | 활동명                        |
| description       | varchar(400) | 상세정보                      |
| responsibilities  | varchar(400) | 담당업무                      |
| problem_solving   | varchar(400) | 문제해결                      |
| learnings         | varchar(400) | 배운점                        |
| source_type       | ENUM         | 타입 (INTERNAL, EXTERNAL)     |
| contribution_rate | int          | 기여도                        |

> **Note**: `experience_id`는 nullable. `source_type = 'EXTERNAL'`인 포트폴리오는 경험 정리 없이 직접 생성 가능.

### portfolio_correction (포트폴리오 첨삭)

| 컬럼            | 타입          | 설명            |
| --------------- | ------------- | --------------- |
| id              | number        | PK              |
| user_id         | number        | FK → users.id   |
| title           | varchar(50)   | 제목            |
| company_name    | varchar(20)   | 지원기업명      |
| position_name   | varchar(20)   | 지원직무명      |
| job_description | varchar(700)  | Job Description |
| company_insight | varchar(2000) | 기업분석정보    |
| highlight_point | varchar(200)  | 참조포인트      |
| status          | ENUM          | 상태            |

> **Note**: `user_id`는 도메인 원칙에 따른 필수적인 관계 (`portfolio`, `insight`과 동일 패턴).

### correction_item (활동 첨삭)

| 컬럼                    | 타입             | 설명                         |
| ----------------------- | ---------------- | ---------------------------- |
| id                      | number           | PK                           |
| description             | jsonb (nullable) | 상세정보 첨삭                |
| responsibilities        | jsonb (nullable) | 담당업무 첨삭                |
| problem_solving         | jsonb (nullable) | 문제해결 첨삭                |
| learnings               | jsonb (nullable) | 배운점 첨삭                  |
| overall_review          | jsonb (nullable) | 총평 첨삭                    |
| portfolio_correction_id | number           | FK → portfolio_correction.id |
| portfolio_id            | number           | FK → portfolio.id            |

### correction_portfolio_selection (첨삭-포트폴리오 선택 매핑)

| 컬럼                    | 타입    | 설명                         |
| ----------------------- | ------- | ---------------------------- |
| id                      | number  | PK                           |
| portfolio_correction_id | number  | FK → portfolio_correction.id |
| portfolio_id            | number  | FK → portfolio.id            |
| is_active               | boolean | 선택 활성화 여부             |

> **Note**: `portfolio_correction_id + portfolio_id` 복합 unique로 동일 첨삭 내 중복 선택 매핑을 방지합니다.

### insight (인사이트)

| 컬럼        | 타입         | 설명          |
| ----------- | ------------ | ------------- |
| id          | number       | PK            |
| user_id     | number       | FK → users.id |
| title       | varchar(50)  | 제목          |
| category    | ENUM         | 카테고리      |
| description | varchar(250) | 내용          |

### insight_activity (인사이트-활동 매핑)

| 컬럼        | 타입   | 설명             |
| ----------- | ------ | ---------------- |
| id          | number | PK               |
| insight_id  | number | FK → insight.id  |
| activity_id | number | FK → activity.id |

> **Note**: 인사이트와 활동의 N:M 관계를 위한 매핑 테이블. 하나의 인사이트는 여러 활동에 연결될 수 있고, 하나의 활동도 여러 인사이트에 연결될 수 있습니다.

### activity (활동)

| 컬럼    | 타입        | 설명          |
| ------- | ----------- | ------------- |
| id      | number      | PK            |
| user_id | number      | FK → users.id |
| name    | varchar(20) | 활동명        |

### ticket_product (이용권 상품)

| 컬럼           | 타입       | 설명                                           |
| -------------- | ---------- | ---------------------------------------------- |
| id             | number     | PK                                             |
| type           | ENUM       | 이용권 타입 (EXPERIENCE, PORTFOLIO_CORRECTION) |
| quantity       | int        | 수량 (1, 3, 5)                                 |
| price          | int        | 판매가 (VAT 포함)                              |
| original_price | int (null) | 할인 전 가격 (null이면 할인 없음)              |
| is_active      | boolean    | 판매 활성 여부 (NOT NULL, DEFAULT true)        |
| display_order  | int        | 표시 순서 (NOT NULL, DEFAULT 0)                |

> **Note**: 이용권 상품 예시 — 경험 정리 1회권 1000원, 3회권 2,800원(~7%↓), 5회권 4,400원(~12%↓)

### ticket (이용권)

| 컬럼                   | 타입          | 설명                                           |
| ---------------------- | ------------- | ---------------------------------------------- |
| id                     | number        | PK                                             |
| user_id                | number        | FK → users.id                                  |
| type                   | ENUM          | 이용권 타입 (EXPERIENCE, PORTFOLIO_CORRECTION) |
| status                 | ENUM          | 상태 (AVAILABLE, USED, EXPIRED) NOT NULL       |
| source                 | ENUM          | 획득 경로 (PURCHASE, EVENT, ADMIN) NOT NULL    |
| payment_id             | number (null) | FK → payment.id (구매 시)                      |
| event_participation_id | number (null) | FK → event_participation.id (이벤트 시)        |
| ticket_grant_id        | number (null) | FK → ticket_grant.id (지급 ledger 연결)        |
| used_at                | datetime      | 사용 일시 (nullable)                           |
| expired_at             | datetime      | 만료 일시 (nullable)                           |

> **Note**: 3회권 구매 시 `ticket` 레코드 3개 생성. 잔여 이용권 조회 = `SELECT COUNT(*) FROM ticket WHERE user_id = ? AND type = ? AND status = 'AVAILABLE'`. `ticket_grant_id`는 지급 ledger와 실제 인벤토리를 느슨하게 연결하는 추적용 컬럼입니다.

### ticket_grant (이용권 지급 ledger)

| 컬럼            | 타입                | 설명                                                                    |
| --------------- | ------------------- | ----------------------------------------------------------------------- |
| id              | number              | PK                                                                      |
| user_id         | number              | FK → users.id                                                           |
| source_type     | ENUM                | 지급 출처 분류 (`EVENT`, `SIGNUP`, `ADMIN`, `COMPENSATION`, `PURCHASE`) |
| source_ref_id   | number (null)       | event_participation.id / payment.id 등 출처 참조 ID                     |
| actor_type      | ENUM                | 지급 수행 주체 (`SYSTEM`, `ADMIN`, `INTERNAL_API`)                      |
| actor_id        | varchar(64) (null)  | 운영자 또는 시스템 식별자                                               |
| reason_code     | varchar(64) (null)  | 내부 reason 분류 코드                                                   |
| reason_text     | varchar(500) (null) | 운영 메모/지급 사유                                                     |
| reward_snapshot | jsonb               | 지급 당시 이용권 구성 스냅샷                                            |
| granted_at      | datetime            | 실제 지급 시각                                                          |

> **Note**: `ticket_grant`는 지급 사실과 운영 맥락을 남기는 ledger입니다. `ticket`은 실제 인벤토리, `ticket_grant_notice`는 사용자 노출 상태를 담당합니다.

### ticket_grant_notice (이용권 지급 안내 ledger)

| 컬럼            | 타입                | 설명                                        |
| --------------- | ------------------- | ------------------------------------------- |
| id              | number              | PK                                          |
| ticket_grant_id | number              | FK → ticket_grant.id                        |
| user_id         | number              | FK → users.id                               |
| status          | ENUM                | 안내 상태 (`PENDING`, `SHOWN`, `DISMISSED`) |
| title           | varchar(100)        | 사용자 노출 제목                            |
| body            | text                | 사용자 노출 본문                            |
| cta_text        | varchar(50) (null)  | CTA 문구                                    |
| cta_link        | varchar(255) (null) | CTA 링크                                    |
| payload         | jsonb (null)        | 프론트 확장용 payload                       |
| shown_at        | datetime (null)     | 최초 노출 시각                              |
| dismissed_at    | datetime (null)     | 닫기 처리 시각                              |
| expires_at      | datetime (null)     | 노출 만료 시각                              |

> **Note**: 사용자에게 보여줄 문구와 내부 운영 사유를 분리하기 위해 별도 ledger로 관리합니다. 여러 기기/세션에서도 서버 기준으로 안내 상태를 추적합니다.

### payment (결제 — PayApp 연동)

| 컬럼              | 타입         | 설명                                      |
| ----------------- | ------------ | ----------------------------------------- |
| id                | number       | PK                                        |
| user_id           | number       | FK → users.id                             |
| ticket_product_id | number       | FK → ticket_product.id                    |
| mul_no            | number       | PayApp 결제요청번호 (UNIQUE)              |
| pay_url           | varchar(255) | PayApp 결제창 URL (nullable)              |
| status            | ENUM         | 결제 상태 (NOT NULL, DEFAULT 'REQUESTED') |
| pay_type          | ENUM         | 결제 수단 (nullable, 결제완료 시 확정)    |
| amount            | int          | 결제 요청 금액                            |
| card_name         | varchar(63)  | 카드사명 (nullable, 카드결제 시)          |
| pay_auth_code     | varchar(63)  | 승인번호 (nullable, 카드결제 시)          |
| card_quota        | varchar(31)  | 할부개월 (nullable)                       |
| paid_at           | datetime     | 결제완료 시각 (nullable)                  |
| cancelled_at      | datetime     | 취소 시각 (nullable)                      |
| var1              | varchar(127) | PayApp 임의변수1 — 주문추적용 (nullable)  |
| var2              | varchar(127) | PayApp 임의변수2 (nullable)               |

> **Note**: PayApp `feedbackurl`(webhook)로 결제 상태 변경을 수신합니다. `mul_no`는 PayApp의 결제 건 식별자이며 결제 취소 시에도 사용됩니다. PayApp `pay_state` 숫자 코드는 Gateway 레이어에서 `PaymentStatus` enum으로 변환합니다.

### event (이벤트)

| 컬럼              | 타입         | 설명                                                      |
| ----------------- | ------------ | --------------------------------------------------------- |
| id                | number       | PK                                                        |
| code              | varchar(50)  | 이벤트 고유 코드 (UNIQUE) — 'SIGNUP_REWARD' 등            |
| title             | varchar(100) | 이벤트 제목                                               |
| description       | varchar(500) | 이벤트 설명                                               |
| cta_text          | varchar(50)  | CTA 버튼 텍스트                                           |
| cta_link          | varchar(255) | CTA 링크 (nullable)                                       |
| reward_config     | jsonb        | 보상 설정 — `[{type, quantity}]`                          |
| goal_config       | jsonb (null) | 달성 조건 — `{target, dailyLimit}` (null=즉시지급)        |
| ui_config         | jsonb (null) | UI 템플릿 설정 — 피드백 모달/진행 카드 문구, CTA 템플릿   |
| ops_config        | jsonb (null) | 운영 옵션 — 수동 지급 전용 여부, 보상 후 피드백 허용 여부 |
| start_date        | date         | 시작일                                                    |
| end_date          | date (null)  | 종료일 (null=무기한)                                      |
| is_active         | boolean      | 활성 여부 (NOT NULL, DEFAULT true)                        |
| max_participation | int          | 최대 참여 횟수 (NOT NULL, DEFAULT 1)                      |
| display_order     | int          | 표시 순서 (NOT NULL, DEFAULT 0)                           |

> **Note**: `reward_config` 예시: `[{"type": "EXPERIENCE", "quantity": 1}, {"type": "PORTFOLIO_CORRECTION", "quantity": 1}]`. `goal_config` 예시: `{"target": 10, "dailyLimit": 1}` (인사이트 로그 10개, 일 1개 인정). jsonb 기반이므로 **이벤트 추가 시 스키마 변경 불필요**.

### event_participation (이벤트 참여)

| 컬럼               | 타입                | 설명                                                    |
| ------------------ | ------------------- | ------------------------------------------------------- |
| id                 | number              | PK                                                      |
| user_id            | number              | FK → users.id                                           |
| event_id           | number              | FK → event.id                                           |
| progress           | int                 | 챌린지 진행도 (NOT NULL, DEFAULT 0)                     |
| is_completed       | boolean             | 달성 여부 (NOT NULL, DEFAULT false)                     |
| completed_at       | datetime            | 달성 일시 (nullable)                                    |
| last_progressed_at | datetime (null)     | 마지막 진행도 반영 시각 (dailyLimit 계산용)             |
| reward_granted_at  | datetime            | 보상 지급 일시 (nullable)                               |
| reward_status      | enum                | 보상 상태 — `NOT_GRANTED/UNDER_REVIEW/GRANTED/REJECTED` |
| granted_by         | varchar(64) (null)  | 지급 처리자 식별자 (운영/PM)                            |
| grant_reason       | varchar(500) (null) | 지급 사유/메모                                          |

> **Note**: 이벤트별 동작 — 최초 가입: `goal_config=null` → 가입 시 즉시 participation 생성 + ticket 발급. 피드백: 관리자 검토 후 `reward_granted_at` 설정. 인사이트 챌린지: `POST /insights` 성공 시 `progress++`, `progress == target`이면 `is_completed=true` (보상은 `POST /events/:eventCode/reward-claim` 호출 시 지급). `dailyLimit` 계산과 이벤트 활성 날짜는 KST(Asia/Seoul) 기준으로 처리.

### event_feedback_submission (외부 피드백 제출 이력)

| 컬럼                      | 타입                | 설명                                             |
| ------------------------- | ------------------- | ------------------------------------------------ |
| id                        | number              | PK                                               |
| event_id                  | number              | FK → event.id                                    |
| user_id                   | number (null)       | FK → users.id (매칭 실패 시 null 가능)           |
| phone_num                 | varchar(20)         | 피드백 제출자 전화번호(정규화 값)                |
| source                    | enum                | 수집 경로 — `GOOGLE_FORM/IN_APP`                 |
| external_submission_id    | varchar(100) (null) | 외부 제출 건 식별자(멱등 처리용)                 |
| review_status             | enum                | 검토 상태 — `PENDING/APPROVED/REJECTED/REWARDED` |
| reviewed_by               | varchar(64) (null)  | 검토자 식별자                                    |
| reviewed_at               | datetime (null)     | 검토 완료 시각                                   |
| review_note               | varchar(500) (null) | 검토 메모                                        |
| rewarded_participation_id | number (null)       | 보상 지급 연결 participation ID                  |

> **Note**: `event_id + external_submission_id` 복합 unique로 외부 폼 제출건을 멱등 처리합니다. 정책상 보상 지급 이후에도 피드백 추가 제출은 허용합니다.

### block_kind (블록 종류 정의)

| 컬럼             | 타입            | 설명                                               |
| ---------------- | --------------- | -------------------------------------------------- |
| kind             | ENUM (PK)       | 블록 종류                                          |
| is_text_editable | boolean         | 사용자가 content를 직접 수정 가능한지 여부         |
| is_deletable     | boolean         | 사용자가 삭제 가능한지 여부                        |
| fixed_level      | smallint (null) | 고정 위계 (1~5). CONTENT는 4~5단계를 오가므로 null |
| placeholder      | text            | 폴백 플레이스홀더 — `내용을 입력해 주세요`         |

> **Note**: `block_kind_enum` 값 9종: `GROUP_UNCATEGORIZED`, `GROUP`, `EXPERIENCE`,
> `SECTION_DETAIL`(상세정보), `SECTION_ACHIEVEMENT`(주요성과), `SECTION_TASK`(담당업무),
> `SECTION_PROBLEM_SOLVING`(문제해결), `SECTION_LEARNING`(배운 점), `CONTENT`.
> 레코드는 마이그레이션에서 9종 모두 시드됩니다.

### block (사용자 블록 트리)

| 컬럼        | 타입               | 설명                                                  |
| ----------- | ------------------ | ----------------------------------------------------- |
| id          | bigserial (PK)     | 블록 PK                                               |
| user_id     | integer            | FK → users.id, CASCADE                                |
| parent_id   | bigint (null)      | FK → block.id (자기참조), CASCADE, level 1은 null     |
| level       | smallint           | 1~5 CHECK. 자식 = 부모 + 1 (트리거로 강제)            |
| kind        | ENUM               | FK → block_kind.kind                                  |
| position    | integer            | 형제 내 순서 (UNIQUE 걸지 않음 — 재정렬 중 중복 허용) |
| content     | varchar(500, null) | 블록 내용. 빈 슬롯은 null                             |
| placeholder | text (null)        | 슬롯별 안내 문구. AI가 신규 슬롯 생성 시 메인이 부여  |
| created_at  | timestamptz        |                                                       |
| updated_at  | timestamptz        | DB 트리거(`set_block_updated_at`)로 자동 갱신         |

> **Note**: `UNIQUE(id, kind)` 복합 유니크로 `experience_meta`/`review`의 `(block_id, block_kind)` 복합 FK 대상이 됩니다.
> `enforce_block_level` 트리거가 INSERT/UPDATE 시 `level = 부모.level + 1`(루트는 1)을 강제합니다.

### experience_meta (EXPERIENCE 블록 메타데이터)

| 컬럼              | 타입           | 설명                                                    |
| ----------------- | -------------- | ------------------------------------------------------- |
| block_id          | bigint (PK)    | FK → block.id, 2단계 EXPERIENCE 블록                    |
| block_kind        | ENUM           | 복합FK용, `EXPERIENCE` 고정 CHECK                       |
| contribution_rate | int (null)     | 기여도                                                  |
| source_type       | ENUM           | `portfolio_source_type_enum` 재사용 (INTERNAL/EXTERNAL) |
| status            | ENUM           | `portfolio_status_enum` 재사용                          |
| experience_id     | int (null, UK) | FK → experience.id, EXTERNAL 원본 보관용                |

### review (블록 첨삭 대상 마킹)

| 컬럼       | 타입           | 설명                              |
| ---------- | -------------- | --------------------------------- |
| id         | bigserial (PK) | 첨삭 PK                           |
| block_id   | bigint         | 첨삭 대상 = EXPERIENCE 블록       |
| block_kind | ENUM           | 복합FK용, `EXPERIENCE` 고정 CHECK |
| created_at | timestamptz    |                                   |

### experience_map (사용자별 트리 버전)

| 컬럼        | 타입         | 설명                              |
| ----------- | ------------ | --------------------------------- |
| user_id     | integer (PK) | FK → users.id, CASCADE            |
| map_version | bigint       | 낙관적 잠금 — 메인 커밋 시에만 +1 |
| updated_at  | timestamptz  |                                   |

### ai_experience_session (사용자별 AI 세션)

| 컬럼       | 타입         | 설명                   |
| ---------- | ------------ | ---------------------- |
| user_id    | integer (PK) | FK → users.id, CASCADE |
| session_id | uuid (UK)    | LangGraph thread_id    |
| active_gap | jsonb (null) | 직전 턴 gap 제안       |
| created_at | timestamptz  |                        |
| updated_at | timestamptz  |                        |

> **Note**: `UNIQUE(user_id, session_id)`가 `ai_experience_request`의 복합 FK 대상입니다.

### ai_experience_request (AI 요청 이력)

| 컬럼              | 타입               | 설명                                            |
| ----------------- | ------------------ | ----------------------------------------------- |
| user_id           | integer (PK)       | 복합 PK                                         |
| request_id        | uuid (PK)          | 메인이 티켓과 함께 발급                         |
| session_id        | uuid               | FK → ai_experience_session(user_id, session_id) |
| request_hash      | char(64)           | 멱등성 판정                                     |
| status            | varchar(20)        | `running` / `completed` / `failed`              |
| failed_node       | varchar(100, null) | 실패 노드                                       |
| retryable         | boolean            | 재시도 버튼 노출 여부                           |
| retry_expires_at  | timestamptz (null) | 30분                                            |
| lease_expires_at  | timestamptz (null) | 5분, 만료 시 커밋 여부 확인                     |
| base_map_version  | bigint (null)      | 커밋 요청 시 기준                               |
| committed_version | bigint (null)      | 커밋 결과                                       |
| input_meta        | jsonb (null)       |                                                 |
| result            | jsonb (null)       | 커밋 API 응답 저장                              |
| suggestion        | jsonb (null)       |                                                 |
| error             | jsonb (null)       |                                                 |
| created_at        | timestamptz        |                                                 |
| updated_at        | timestamptz        |                                                 |

### ai_commit_log (커밋 롤백용 스냅샷)

| 컬럼              | 타입         | 설명                                           |
| ----------------- | ------------ | ---------------------------------------------- |
| user_id           | integer (PK) | FK → users.id, CASCADE, 사용자별 최신 1건      |
| request_id        | uuid         | 커밋한 요청                                    |
| previous_version  | bigint       | 되돌릴 목표 버전                               |
| committed_version | bigint       | 현재 map_version과 대조                        |
| created_block_ids | bigint[]     | 롤백 시 자식부터 삭제                          |
| updated_blocks    | jsonb (null) | 이전 content 복원용                            |
| created_at        | timestamptz  | 24시간 TTL (배치로 정리, DB 네이티브 TTL 아님) |

---

## 인덱스 설계

> PostgreSQL은 FK에 자동 인덱스를 생성하지 않음. 아래 FK 컬럼에 `@Index()` 필요.

| 테이블                           | 인덱스 대상 컬럼                                                               | 비고                    |
| -------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| `social_user`                    | `user_id`                                                                      |                         |
| `user_agreement`                 | `user_id`                                                                      |                         |
| `experience`                     | `user_id`                                                                      |                         |
| `experience_source`              | `experience_id`                                                                |                         |
| `portfolio`                      | `user_id`, `experience_id`                                                     |                         |
| `portfolio_correction`           | `user_id`                                                                      |                         |
| `correction_portfolio_selection` | `portfolio_correction_id`, `portfolio_id`, `portfolio_correction_id+is_active` | 선택 조회 최적화        |
| `correction_item`                | `portfolio_correction_id`, `portfolio_id`                                      |                         |
| `insight`                        | `user_id`                                                                      |                         |
| `insight_activity`               | `insight_id`, `activity_id`                                                    |                         |
| `activity`                       | `user_id`                                                                      |                         |
| `ticket`                         | `user_id`, `payment_id`, `event_participation_id`, `ticket_grant_id`           |                         |
| `ticket_grant`                   | `user_id`, `source_type+source_ref_id`, `actor_type+actor_id`                  | 지급 ledger 조회        |
| `ticket_grant_notice`            | `ticket_grant_id`, `user_id+status`, `status='PENDING'` partial index          | 엔트리 notice 조회      |
| `payment`                        | `user_id`, `ticket_product_id`                                                 |                         |
| `event_participation`            | `user_id`, `event_id` — **UNIQUE 복합키**                                      | 중복 참여 방지          |
| `event_feedback_submission`      | `event_id`, `user_id`, `phone_num`, `event_id+external_submission_id`(UNIQUE)  | 외부 제출 이력/멱등     |
| `block`                          | `user_id`, `parent_id`, `id+kind`(UNIQUE)                                      | 트리 순회, 복합 FK 대상 |
| `review`                         | `block_id`                                                                     |                         |
| `ai_experience_session`          | `user_id+session_id`(UNIQUE)                                                   | 복합 FK 대상            |
| `ai_experience_request`          | `user_id+session_id`, `user_id+request_hash`                                   | 세션 조회, 멱등성 판정  |

---

## 변경 이력

| 버전  | 날짜       | 변경 내용                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 2.9.0 | 2026-08-07 | 경험 정리 v3 개편 — 블록 트리 스키마 신설. `block_kind`, `block`(자기참조 트리, 1~5단계), `experience_meta`(EXPERIENCE 블록 메타, portfolio enum 재사용), `review`(첨삭 대상 마킹), `experience_map`(낙관적 잠금), `ai_experience_session`/`ai_experience_request`/`ai_commit_log`(AI 에이전트 세션·요청·커밋 롤백) 추가. 기존 `experience`/`portfolio` 스키마는 유지 |
| 2.8.0 | 2026-03-23 | 문서 현행화 — `correction_rag_data`, `term`, `withdrawn_user` 테이블 추가, `ExperienceStatus.GENERATE_FAILED`/`CorrectionStatus.FAILED                                                                                                                                                                                                                                | RAG_FAILED`/`PdfExtractionStatus` enum 반영, 버전 헤더 동기화 |
| 2.7.0 | 2026-03-08 | 이용권 지급/노출 분리 구조 반영 — `ticket_grant`, `ticket_grant_notice` 추가, `ticket.ticket_grant_id` 연결, `TicketSource.ADMIN` 반영, 기존 이벤트/결제/운영 지급 흐름과의 공존 구조 문서화                                                                                                                                                                          |
| 2.6.0 | 2026-03-03 | 포트폴리오 첨삭 선택 매핑 테이블(`correction_portfolio_selection`) 추가 및 관련 인덱스 설계 반영                                                                                                                                                                                                                                                                      |
| 2.5.0 | 2026-02-25 | 이벤트 하이브리드 스키마 보강 — `event.ui_config`, `event.ops_config`, `event_participation.reward_status/granted_by/grant_reason` 추가, `event_feedback_submission` 신규(외부 피드백 이력/멱등 처리), 운영 수동 지급 시나리오 반영                                                                                                                                   |
| 2.4.0 | 2026-02-09 | 이벤트 도메인 설계 보완 — `event_participation` UNIQUE(user_id, event_id) 추가, jsonb 타입 안전성 가이드 추가, 동시성 처리 가이드 추가                                                                                                                                                                                                                                |
| 2.3.0 | 2026-02-07 | Insight-Activity N:M 관계 재설계 — `insight_activity` 매핑 테이블 추가, `insight.activity_id` 제거. 인사이트는 pgvector 기반으로 관리.                                                                                                                                                                                                                                |
| 2.2.0 | 2026-02-04 | 설계 리뷰 전건 해결 — `user` → `users`(예약어 회피), snake_case 통일, `user_agreement` FK 정리, `portfolio_correction`에 `user_id` 추가, `login_id` bigint→varchar, FK 인덱스 설계 추가. 설계 리뷰 섹션 제거(전건 해결)                                                                                                                                               |
| 2.1.0 | 2026-02-04 | 크레딧 → 이용권(ticket) 시스템 전면 재설계 — `ticket_product`, `ticket`, `payment`(PayApp 연동), `event`, `event_participation` 신규. `pg_product`, `service_product`, `service_purchase`, `credit_transaction` 삭제. `portfolio.experience_id` nullable 확정. 설계 리뷰 16건 반영 현황 추가                                                                          |
| 2.0.0 | 2026-02-03 | 기획 변경에 따른 ERD 전면 개편 — SocialUser 분리, chat 제거, UserAgreement·Event 추가, User/Experience/Payment/creditTransaction 구조 변경                                                                                                                                                                                                                            |
| 1.1.0 | 2026-01-28 | user.img_url 컬럼 제거 (프로필 이미지 기능 미사용)                                                                                                                                                                                                                                                                                                                    |
| 1.0.0 | 2026-01-16 | 최초 작성 (ERD 이미지 기반)                                                                                                                                                                                                                                                                                                                                           |
