# 프로젝트 아키텍처

## 개요

Folioo Server는 **계층형 아키텍처(Layered Architecture)**를 채택합니다. 패키지 구조는 **Domain-Centric Modular** 구조를 따릅니다.
Package by Feature + Layered Architecture를 결합하여 도메인별로 코드를 그룹화하고, 각 도메인 내부에서 계층을 분리합니다.

---

## 계층 구조

```
Presentation Layer (Controller)
         ↓
Application Layer (Service, Facade, DTO)
         ↓
Infrastructure Layer (TypeORM Repository)
         ↓
Domain Layer (Entity)
```

### 금지 사항

- **순환 의존**: 패키지 간 순환 참조 절대 금지
- **레이어 역전**: 하위 계층이 상위 계층 의존 금지
- **의존 우회**: 인접하지 않은 하위 계층 의존 금지 (예: controller → repository)
- **타 도메인 간 의존**: application 레이어를 통해서만 허용

---

## 패키지 구조

```
src/
├── common/                      # 공통 모듈
│   ├── decorators/              # 커스텀 데코레이터
│   ├── dtos/                    # 공통 DTO
│   ├── entities/                # 베이스 엔티티
│   ├── exceptions/              # 커스텀 예외 (BusinessException, ErrorCode)
│   ├── filters/                 # 예외 필터 (GlobalExceptionFilter)
│   ├── guards/                  # 가드 (InternalApiKeyGuard)
│   ├── interceptors/            # 인터셉터 (TransformInterceptor)
│   ├── ports/                   # 포트 인터페이스 (AI 릴레이)
│   └── utils/                   # 공통 유틸
│
├── config/                      # 설정
│   ├── swagger.config.ts        # Swagger 설정
│   └── typeorm-config.ts        # TypeORM 설정
│
└── modules/                     # 비즈니스 도메인
    ├── auth/                    # 인증 (Generic)
    ├── user/                    # 사용자 (Generic)
    │   ├── domain/              # 도메인 계층
    │   │   ├── enums/           # enum
    │   │   ├── types/           # 타입 정보
    │   │   └── entities/        # 엔티티
    │   ├── application/         # 애플리케이션 계층
    │   │   ├── facades/         # 파사드 (선택)
    │   │   ├── services/        # 서비스
    │   │   └── dtos/            # DTO
    │   ├── infrastructure/      # 인프라 계층
    │   │   └── repositories/    # TypeORM 리포지토리 구현체
    │   └── presentation/        # 프레젠테이션 계층
    │       └── controllers/     # 컨트롤러
    ├── experience/              # 기존 Portfolio/경험맵 관계용 엔티티만 유지
    ├── portfolio/               # 포트폴리오 (Core)
    ├── portfolio-correction/    # 포트폴리오 첨삭 (Core)
    ├── event/                   # 피드백 활성 기간·참여 FK (Legacy)
    └── internal/                # AI 서버 연동 내부 API (Supporting)
```

#### 인프라 모듈 (src/ 직속)

```
src/
├── infra/
│   └── ai-relay/               # AI 서버 HTTP 릴레이 어댑터
└── modules/
```

---

## 계층별 책임

### Presentation Layer (Controller)

- HTTP 요청/응답 처리
- 입력 유효성 검사 (ValidationPipe)
- Swagger 문서화
- 인증/인가 처리

```typescript
@Controller('users')
@ApiTags('User')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get(':id')
    @ApiOperation({ summary: '사용자 조회' })
    async findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }
}
```

### Application Layer (Service)

- 비즈니스 로직 구현
- 트랜잭션 관리
- DTO 변환
- **비즈니스 로직 에러 처리** (BusinessException throw)

```typescript
@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async findOne(id: string): Promise<UserResDTO> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return UserResDTO.from(user);
    }
}
```

### Domain Layer (Entity)

- 도메인 모델 정의
- 비즈니스 규칙 캡슐화

```typescript
@Entity('users')
export class User extends BaseEntity {
    @Column({ unique: true })
    email: string;

    @Column()
    name: string;
}
```

### Infrastructure Layer (Repository)

- 데이터 접근 구현 (ORM 활용)

```typescript
@Injectable()
export class UserRepository {
    async findById(id: number): Promise<User | null> {
        const user = await this.userRepository.findOne({ where: { id } });
        return user;
    }
}
```

---

## 의존성 규칙

### 개요

```
Controller → Service → Repository → Entity
    ↓           ↓           ↓
   DTO         DTO       Entity
```

- 상위 계층은 하위 계층에만 의존
- 같은 계층 간 순환 의존 금지
- Entity는 다른 계층에 의존하지 않음
- 타도메인 간의 참조는 Application Layer에서만 허용

### Application Layer 내부 의존성 규칙

Application Layer 내부에서도 명확한 **호출 위계(Hierarchy)**를 따릅니다.

1.  **구성요소 정의**
    - **Facade (Orchestrator):** 여러 `Service`를 조합하여 비즈니스 흐름(Flow)을 제어합니다. 순수한 비즈니스 로직(계산, 검증)은 포함하지 않습니다.
    - **Service (Worker):** 단일 도메인의 비즈니스 로직을 수행합니다. 원자적(Atomic)인 처리를 담당합니다.

2.  **호출 규칙**
    - **Facade → Service:** 가능 (⭕)
    - **Service → Facade:** 금지 (❌ - 순환 참조 방지)
    - **Service → Service (동일 도메인):** 단방향 호출 허용
    - **Service → Service (타 도메인):** 금지 (❌). 타 도메인 로직이 필요할 경우 반드시 Facade를 통해 조합해야 합니다.

---

## 테스트 전략

| 계층       | 테스트 유형 | 도구          |
| ---------- | ----------- | ------------- |
| Controller | E2E 테스트  | Supertest     |
| Service    | 단위 테스트 | Jest + Mock   |
| Repository | 통합 테스트 | TestContainer |

---

| 버전  | 날짜       | 변경 내용                                                                |
| ----- | ---------- | ------------------------------------------------------------------------ |
| 1.3.0 | 2026-03-23 | 패키지 구조 현행화 — 13개 도메인 모듈 전체 반영, upload 모듈 제거        |
| 1.2.0 | 2026-02-03 | ARCHITECTURE.md 파일을 물리적 구조와 도메인 설계 및 전략을 기준으로 분리 |
| 1.1.0 | 2026-01-28 | 파일 처리 방식 변경 (S3 → busboy 스트리밍), 에러 처리 패턴 명시          |
| 1.0.0 | 2026-01-16 | 최초 작성                                                                |
