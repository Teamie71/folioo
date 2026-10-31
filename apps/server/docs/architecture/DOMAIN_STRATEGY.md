# 도메인 설계 및 전략

## DDD 도메인 분류 기준

### 1. 비즈니스 중요도에 따른 분류 (Subdomain)

| 분류                         | 기준                                                | 전략                      |
| ---------------------------- | --------------------------------------------------- | ------------------------- |
| **핵심 도메인 (Core)**       | 프로젝트의 진짜 이유, 경쟁사와 차별화되는 핵심 기능 | 가장 공들여 개발          |
| **지원 도메인 (Supporting)** | 핵심은 아니지만 서비스 운영에 필요한 기능           | 적당한 수준으로 개발      |
| **일반 도메인 (Generic)**    | 어느 서비스에나 있는 흔한 기능                      | 외부 라이브러리/SaaS 활용 |

### 2. "언어의 의미"가 바뀌는 경계 (Bounded Context)

**같은 단어(Entity)가 문맥에 따라 뜻이나 필요한 속성이 달라진다면, 거기가 도메인을 나눌 지점입니다.**

예시: 'User(사용자)'

| 도메인  | 관심사                               | 목적                      |
| ------- | ------------------------------------ | ------------------------- |
| Auth    | email, password, loginAt, isVerified | 로그인이 되는가?          |
| Profile | nickname, profileImage, introduce    | 남들에게 어떻게 보이는가? |
| Payment | address, phoneNumber                 | 결제는 어떻게 하는가?     |

> **잘못된 설계**: 모든 속성을 하나의 User 엔티티에 다 넣기 (God Class)
> **DDD 설계**: AuthUser, Profile, Customer 등으로 도메인을 쪼개고 각각 별도 엔티티로 관리

### 3. 데이터의 라이프사이클 (변경의 주기)

같이 변하는 것들은 모으고, 따로 변하는 것들은 분리합니다.

- "A 기능을 수정할 때 B 기능도 같이 수정해야 하나?"
- "트랜잭션이 한 번에 묶여야 하는가?"

---

## 도메인 분류

| 도메인               | 분류       | 설명                                          |
| -------------------- | ---------- | --------------------------------------------- |
| Block                | Core       | 경험맵 구조·AI 티켓·사용량 관리               |
| Assessment           | Core       | 직무 찾기                                     |
| Portfolio            | Core       | 기존 포트폴리오 원문·외부 포트폴리오 관리     |
| Portfolio-Correction | Core       | 포트폴리오 첨삭·기업 분석·PDF 추출            |
| Kakao-Channel        | Supporting | 카카오 스킬·활동 선택·경험 대화               |
| Feedback             | Supporting | 활성 폼 조회·피드백 저장 (보상 없음)          |
| User                 | Generic    | 사용자·가입 약관·탈퇴 이력 관리               |
| Auth                 | Generic    | Kakao/Google/Naver OAuth·JWT 인증             |
| Internal             | Supporting | 현재 AI 기능의 내부 API·콜백                  |
| Experience           | Legacy     | 기존 Portfolio/경험맵 FK·조회용 엔티티만 유지 |
| Event                | Legacy     | 피드백 폼 활성 기간·참여 FK 연결만 유지       |

---

## 외부 서비스 통합

### 인증 (OAuth)

```
src/
└── modules/
    └── auth/
        └── infrastructure/
            ├── strategies/       # Passport 전략
            │   ├── kakao.strategy.ts
            │   ├── google.strategy.ts
            │   └── naver.strategy.ts
            └── guards/           # 인증 가드
```

### 파일 처리 (AI 서버 연동)

> **결정사항 (2026-01)**: S3 사용하지 않음. busboy를 이용한 스트리밍 방식 채택.

**배경**:

- 백엔드에서 PDF 파일을 AI 서버로 전달해야 함
- S3에 저장 후 URL 전달 vs 직접 스트리밍 검토

**결정**:

- `multipart/form-data`로 PDF 파일 수신
- `busboy`를 이용해 메모리 버퍼링 없이 스트리밍
- AI 서버로 직접 전달 (메모리 과부하 방지)

```typescript
// 파일 처리 흐름
Client (PDF)
  → NestJS (busboy 스트리밍)
    → AI Server (직접 전달)
```

**장점**:

- S3 비용 절감
- 단순한 아키텍처

> **Note**: 서비스 기획상 PDF 파일은 10MB 이하로 제한되어 있어, 별도 스토리지 없이 스트리밍 방식으로 처리합니다.

---

## 변경 이력

| 버전  | 날짜       | 변경 내용                                                                |
| ----- | ---------- | ------------------------------------------------------------------------ |
| 1.0.0 | 2026-02-03 | ARCHITECTURE.md 파일을 물리적 구조와 도메인 설계 및 전략을 기준으로 분리 |
| 2.0.0 | 2026-03-08 | 실제 모듈 13개 전체 반영, apple→naver 전략 수정, Payment 구현 완료 반영  |
