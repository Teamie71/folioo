# TypeScript/NestJS 코드 스타일 가이드

## 기본 원칙

1. **TypeScript Strict Mode** 사용
2. **ESLint + Prettier** 규칙 준수
3. **일관성** 있는 코드 작성
4. **가독성** 우선

## DTO 작성 규칙

> **Note**: 프로젝트에서 [NestJS Swagger CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin)을 사용 중이므로
> `@ApiProperty()` 데코레이터는 **필수가 아닙니다**.
> 다만, `example` 값이나 `enum` 타입 등 **자세한 명세가 필요한 경우**에만 사용합니다.

### Request DTO

```typescript
// class-validator 데코레이터 사용
export class CreateUserReqDTO {
    @IsEmail()
    @ApiProperty({ example: 'user@example.com' }) // example 명시 필요한 경우
    email: string;

    @IsString()
    @MinLength(2)
    @MaxLength(20)
    name: string; // 기본 타입은 플러그인이 자동 추론

    @IsOptional()
    @IsString()
    bio?: string;

    @IsEnum(LoginType)
    @ApiProperty({ enum: LoginType }) // enum 타입은 명시 필요
    loginType: LoginType;
}
```

### Response DTO

```typescript
export class UserResDTO {
    id: string; // Swagger 플러그인이 자동 추론
    email: string;
    name: string;

    // 정적 팩토리 메서드
    static from(user: User): UserResDTO {
        const dto = new UserResDTO();
        dto.id = user.id;
        dto.email = user.email;
        dto.name = user.name;
        return dto;
    }
}
```

## Entity 작성 규칙

### 기본 구조

```typescript
@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    bio?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
```

### DELETE 응답 컨벤션

`TransformInterceptor`가 성공 응답을 `CommonResponse.success(result)`로 감싸는 구조이므로,
DELETE API는 `204` 대신 `200 OK`와 간단한 메시지(`string`)를 반환합니다.

```typescript
@Delete(':portfolioId')
@ApiOkResponse({
    schema: {
        example: {
            timestamp: '2026-01-02T14:56:23.295Z',
            isSuccess: true,
            error: null,
            result: '포트폴리오가 삭제되었습니다.',
        },
    },
})
async deletePortfolio(@Param('portfolioId', ParseIntPipe) portfolioId: number): Promise<string> {
    await this.portfolioService.delete(portfolioId);
    return '포트폴리오가 삭제되었습니다.';
}
```

### 관계 매핑

> **Note**: 모듈 간 순환참조 방지를 위해 **단방향 매핑(`@ManyToOne`)만 사용**합니다.
> **`@OneToMany` 사용 금지** — SWC 컴파일러 환경에서 순환참조를 유발합니다.

```typescript
// ✅ 단방향 관계 (ManyToOne만 사용)
@ManyToOne(() => User, { onDelete: 'CASCADE' })
user: User;
```

```typescript
// ❌ 양방향 관계 (사용 금지)
// Portfolio 엔티티에서
@OneToMany(() => CorrectionItem, (item) => item.portfolio)
correctionItems: CorrectionItem[];
```

### 크로스 도메인 조인 쿼리 (엔티티 클래스 참조 패턴)

`@OneToMany` 없이도 QueryBuilder에서 다른 엔티티와 조인할 수 있습니다.
**엔티티 클래스를 직접 참조**하여 타입 안전한 조인을 수행합니다.

```typescript
// ❌ 하드코딩된 테이블/컬럼명 (유지보수 취약)
.innerJoin('correction_item', 'ci', 'ci.portfolioId = portfolio.id')

// ❌ @OneToMany 관계 활용 (순환참조 위험)
.innerJoin('portfolio.correctionItems', 'ci')

// ✅ 엔티티 클래스 참조 (권장)
.innerJoin(CorrectionItem, 'ci', 'ci.portfolio.id = portfolio.id')
```

## 에러 처리 패턴 (계층별 책임)

### 원칙

| 계층           | 책임          | 에러 처리 방식                  |
| -------------- | ------------- | ------------------------------- |
| **Repository** | 데이터 접근   | throw 금지 — `null`/결과 반환만 |
| **Service**    | 비즈니스 로직 | 비즈니스 로직 에러 throw        |
| **Controller** | HTTP 처리     | 입력 검증만 (ValidationPipe)    |

### Repository 계층

Repository는 **순수 데이터 접근만** 담당합니다. 데이터가 없으면 `null`을 반환하고 판단은 Service에 위임합니다.

```typescript
// ✅ 올바른 패턴
@Injectable()
export class UserRepository {
    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    // 존재 여부 확인용 (null 반환 허용)
    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({ where: { email } });
    }
}
```

### Service 계층

Service는 **비즈니스 로직과 모든 예외 처리(NOT_FOUND 포함)**를 담당합니다.

```typescript
// ✅ 올바른 패턴
@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async findByIdOrThrow(userId: number): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    async getProfile(userId: number): Promise<UserResDTO> {
        const user = await this.findByIdOrThrow(userId);
        return UserResDTO.from(user);
    }

    async checkEmailExists(email: string): Promise<boolean> {
        // 존재 여부 확인은 null 반환 메서드 사용
        const user = await this.userRepository.findByEmail(email);
        return user !== null;
    }

    async updateProfile(userId: number, dto: UpdateProfileReqDTO): Promise<UserResDTO> {
        const user = await this.findByIdOrThrow(userId);

        // 비즈니스 로직 에러는 Service에서 처리
        if (dto.email && dto.email !== user.email) {
            const existing = await this.userRepository.findByEmail(dto.email);
            if (existing) {
                throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
        }

        // ... 업데이트 로직
        return UserResDTO.from(user);
    }
}
```

### Repository 메서드 네이밍 컨벤션

| 메서드 패턴      | 반환 타입               | 설명                                |
| ---------------- | ----------------------- | ----------------------------------- |
| `findByXOrThrow` | `Promise<User>`         | Service 계층에서 사용, 없으면 throw |
| `findByX`        | `Promise<User \| null>` | 없으면 null 반환 (존재 여부 확인용) |

## Controller 작성 규칙

### 클래스 레벨 데코레이터 순서

```typescript
@ApiTags('User') // 1. Swagger 태그
@Controller('users') // 2. 라우트 정의
export class UserController {
    constructor(private readonly userService: UserService) {}
}
```

### 메서드 레벨 데코레이터 순서

**순서: 라우팅 → 보안/권한 → 문서화 → 기능수정**

| 순서 | 그룹          | 데코레이터 예시                                                                                           |
| ---- | ------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | **라우팅**    | `@Get`, `@Post`, `@Patch`, `@Delete`, `@Put`                                                              |
| 2    | **보안/권한** | `@Public`, `@UseGuards`, `@Roles`                                                                         |
| 3    | **문서화**    | `@ApiOperation`, `@ApiBody`, `@ApiQuery`, `@ApiResponse`, `@ApiCommonResponse`, `@ApiCommonErrorResponse` |
| 4    | **기능수정**  | `@HttpCode`, `@Header`, `@Redirect`, `@UseInterceptors`, `@UsePipes`                                      |

### 기본 구조

```typescript
@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get(':id')
    @ApiOperation({ summary: '사용자 조회' })
    @ApiCommonResponse(UserResDTO)
    @ApiCommonErrorResponse(ErrorCode.USER_NOT_FOUND)
    async findOne(@Param('id') id: string): Promise<UserResDTO> {
        return this.userService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: '사용자 생성' })
    @ApiBody({ type: CreateUserReqDTO })
    @ApiCommonResponse(UserResDTO)
    @ApiCommonErrorResponse(ErrorCode.BAD_REQUEST)
    async create(@Body() dto: CreateUserReqDTO): Promise<UserResDTO> {
        return this.userService.create(dto);
    }
}
```

## Facade / Service 작성 규칙

### Facade (Orchestrator)

여러 도메인의 Service를 조합하여 비즈니스 흐름(Flow)을 제어합니다. 순수한 비즈니스 로직(계산, 검증)은 포함하지 않습니다.

```typescript
@Injectable()
export class ExternalPortfolioFacade {
    constructor(
        private readonly externalPortfolioService: ExternalPortfolioService, // 포트폴리오 도메인
        private readonly portfolioCorrectionService: PortfolioCorrectionService // 첨삭 도메인
    ) {}

    @Transactional()
    async createExternalPortfolioBlock(correctionId: number, userId: number) {
        // 각 서비스에 위임만 하고, 흐름을 조율
        const correction = await this.portfolioCorrectionService.findByIdOrThrow(correctionId);
        const savedPortfolio = await this.externalPortfolioService.createEmptyPortfolio(userId);
        await this.portfolioCorrectionService.createCorrectionItem(savedPortfolio, correction);
        return StructuredPortfolioResDTO.from(savedPortfolio);
    }
}
```

### Service (Worker)

단일 도메인의 비즈니스 로직을 수행합니다. **자기 도메인의 Repository만** 의존합니다.

```typescript
// ✅ 올바른 패턴 - 자기 도메인의 Repository만 의존
@Injectable()
export class ExternalPortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}
}

// ❌ 잘못된 패턴 - 타 도메인의 Repository를 직접 의존
@Injectable()
export class ExternalPortfolioService {
    constructor(
        private readonly portfolioRepository: PortfolioRepository,
        private readonly correctionItemRepository: CorrectionItemRepository // 타 도메인!
    ) {}
}
```

### 호출 규칙

| 호출 방향                       | 허용 |
| ------------------------------- | ---- |
| Facade → Service                | ⭕   |
| Service → Facade                | ❌   |
| Service → Service (동일 도메인) | ⭕   |
| Service → Service (타 도메인)   | ❌   |

타 도메인 로직이 필요한 경우 반드시 **Facade를 통해** 조합해야 합니다.

### 비즈니스 규칙 배치

도메인과 직접 연관된 비즈니스 상수(제한 값 등)는 **엔티티 파일에 정의**하여 export합니다.

```typescript
// ✅ 올바른 패턴 - 엔티티 파일에 비즈니스 상수 정의
// portfolio.entity.ts
export const MAX_EXTERNAL_PORTFOLIO_BLOCKS = 5;

@Entity()
export class Portfolio extends BaseEntity { ... }

// ❌ 잘못된 패턴 - 서비스 파일에 비즈니스 상수 정의
// external-portfolio.service.ts
const MAX_BLOCKS = 5; // 도메인 규칙이 서비스에 흩어짐
```

## 계층 간 의존성 규칙

### 허용되는 의존 방향

```
Controller → Facade / Service → Repository → Entity
```

- 상위 계층은 하위 계층에만 의존
- **인접하지 않은 하위 계층 의존 금지** (예: Controller → Repository)
- **타 도메인 간 의존은 Application Layer를 통해서만 허용**

### 금지되는 의존 방향

```typescript
// ❌ Controller가 Repository를 직접 사용
@Controller('users')
export class UserController {
    constructor(private readonly userRepository: UserRepository) {} // 금지!
}

// ❌ 하위 계층이 상위 계층을 의존
@Injectable()
export class UserRepository {
    constructor(private readonly userService: UserService) {} // 금지!
}

// ❌ 타 도메인 Service 간 직접 호출
@Injectable()
export class ExternalPortfolioService {
    constructor(private readonly correctionService: PortfolioCorrectionService) {} // 금지!
}
```

## 금지 사항

### 1. any 타입 사용 금지

```typescript
// ❌ 나쁜 예
function process(data: any) { ... }

// ✅ 좋은 예
function process(data: UserData) { ... }
function process<T>(data: T) { ... }
```

### 2. 콜백 지옥 금지

```typescript
// ❌ 나쁜 예
getUser(id, (user) => {
    getPortfolios(user.id, (portfolios) => {
        // ...
    });
});

// ✅ 좋은 예
const user = await this.userService.findOne(id);
const portfolios = await this.portfolioService.findByUserId(user.id);
```

### 3. 매직 넘버/스트링 금지

```typescript
// ❌ 나쁜 예
if (status === 1) { ... }
if (role === 'admin') { ... }

// ✅ 좋은 예
enum Status { ACTIVE = 1, INACTIVE = 0 }
enum Role { ADMIN = 'admin', USER = 'user' }

if (status === Status.ACTIVE) { ... }
if (role === Role.ADMIN) { ... }
```

### 4. console.log 금지 (프로덕션)

```typescript
// ❌ 나쁜 예
console.log('User created:', user);

// ✅ 좋은 예
this.logger.log(`User created: ${user.id}`);
```

## 권장 사항

### 1. 일관된 에러 처리

프로젝트에서 정의한 `BusinessException`과 `ErrorCode`를 사용하여 에러를 처리합니다.
애플리케이션 코드(Controller/Service/Repository)에서 `NotFoundException`, `BadRequestException` 등을 **직접 throw하지 않습니다**.

단, 전역 `ValidationPipe`/`ParseIntPipe`처럼 프레임워크 파이프가 내부적으로 생성한 `BadRequestException`은
`GlobalExceptionFilter`에서 `ErrorCode.BAD_REQUEST`로 표준화하여 처리할 수 있습니다.

```typescript
// ✅ 올바른 사용
throw new BusinessException(ErrorCode.USER_NOT_FOUND);
throw new BusinessException(ErrorCode.BAD_REQUEST);

// ✅ 추가 디버깅 정보가 필요한 경우 details 사용
throw new BusinessException(ErrorCode.USER_NOT_FOUND, { requestedId: userId });

// ❌ 금지 — NestJS 내장 예외 사용
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
```

### ErrorCode 네이밍 규칙

```
<DOMAIN><HTTP_STATUS><SEQUENCE?>
```

- enum name: `SCREAMING_SNAKE_CASE` (의미가 명확하게 드러나야 함)
- enum value: `도메인 접두사` + `HTTP 상태 코드` + `구분 번호(선택)`
- 새 에러 코드 추가 시: `error-code.enum.ts`에 코드, `error-code.ts`에 메시지+상태 코드 매핑 모두 추가

```typescript
// 기본: DOMAIN + HTTP_STATUS
USER_NOT_FOUND = 'USER404';

// 동일 도메인+상태 코드가 여러 개: SEQUENCE 추가
DUPLICATE_EXPERIENCE_NAME = 'EXPERIENCE4091';
EXPERIENCE_MAX_LIMIT = 'EXPERIENCE4092';
```

> 상세 가이드: `docs/development/ERROR_HANDLING.md` 참조

### 2. Optional Chaining 사용

```typescript
// ❌ 나쁜 예
if (user && user.profile && user.profile.avatar) { ... }

// ✅ 좋은 예
if (user?.profile?.avatar) { ... }
```

### 3. Nullish Coalescing 사용

```typescript
// ❌ 나쁜 예
const name = user.name || 'Unknown';

// ✅ 좋은 예
const name = user.name ?? 'Unknown';
```

### 4. Destructuring 활용

```typescript
// ❌ 나쁜 예
const email = dto.email;
const name = dto.name;

// ✅ 좋은 예
const { email, name } = dto;
```

## Import 정렬 순서

> 현재 프로젝트는 tsconfig paths alias(`@modules/*` 등)를 사용하지 않고,
> `baseUrl` 기반의 `src/...` 절대 import를 사용합니다.

```typescript
// 1. Node.js 내장 모듈
import * as path from 'path';

// 2. 외부 패키지
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 3. 내부 모듈 (절대 경로)
import { User } from 'src/modules/user/domain/user.entity';

// 4. 상대 경로
import { CreateUserReqDTO } from './dto/create-user.dto';
```

## package.json Scripts 작성 가이드

### CI/Docker 환경 고려

npm lifecycle scripts (`prepare`, `postinstall` 등)는 CI/Docker 환경에서 자동으로 실행되므로 환경 체크가 필요합니다.

#### prepare 스크립트

Git hooks 관리 도구(husky)는 `.git` 폴더가 필요하므로 존재 여부를 확인해야 합니다:

```json
{
    "scripts": {
        "prepare": "node -e \"if (require('fs').existsSync('.git')) { require('child_process').execSync('husky', {stdio: 'inherit'}) }\""
    }
}
```

**이유:**

- Docker 컨테이너 빌드 시 `.git` 폴더가 없어 husky 실행 실패
- `pnpm install` 실행 시 `prepare` 스크립트가 자동으로 실행됨
- `.git`이 있는 환경에서는 husky 실행 오류를 정상적으로 전파하여 설정 문제를 즉시 발견 가능

### pnpm 버전 명시

`packageManager` 필드로 pnpm 버전을 명시하면 CI/CD와 Dockerfile에서 동일한 버전을 사용할 수 있습니다:

```json
{
    "packageManager": "pnpm@10.28.0"
}
```

Dockerfile에서 이 버전과 일치시켜야 합니다:

```dockerfile
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
```
