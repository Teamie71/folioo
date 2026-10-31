# 네이밍 컨벤션

## 폴더 네이밍

### 1. 도메인(모듈) 이름: **단수형 (Singular)**

하나의 도메인 개념을 나타내는 폴더는 **단수**를 사용합니다.
`UserModule`, `UserService`라고 부르지 `UsersService`라고 부르지 않는 것과 같습니다.

```
✅ src/modules/user
✅ src/modules/auth
✅ src/modules/portfolio

⚠️ src/modules/users      # REST API 경로가 /users라고 해서 폴더까지 복수로 하면 어색함
```

### 2. 아키텍처 레이어 이름: **단수형 (Singular)**

"특정 계층 그 자체"를 의미하므로 **단수**를 사용합니다.

```
✅ domain          # 도메인 계층
✅ application     # 응용 계층
✅ infrastructure  # (또는 infra)
✅ presentation    # (또는 interface)
```

### 3. 구성 요소 모음 폴더: **복수형 (Plural)**

특정 역할을 하는 **파일들이 여러 개 모여 있는 폴더**는 **복수형**을 사용합니다.

```
✅ dtos           # CreateUserDTO, UpdateUserDTO 등 여러 개
✅ entities       # User, UserProfile 등 여러 엔티티
✅ exceptions     # 여러 에러 정의
✅ utils
✅ decorators
✅ guards
✅ interceptors
✅ filters
```

### 전체 구조 예시

```
 src/modules/user/           # 단수 (도메인)
 ├── domain/                 # 단수 (계층)
 │   ├── entities/           # 복수 (구성 요소 모음)
 │   └── repositories/       # 복수
 ├── application/            # 단수 (계층)
 │   ├── services/           # 복수
 │   └── dtos/               # 복수
 └── presentation/           # 단수 (계층)
     └── user.controller.ts  # Controller는 presentation 폴더에 위치
```

## 파일 네이밍

### 규칙

| 유형        | 형식               | 예시                        |
| ----------- | ------------------ | --------------------------- |
| Controller  | `*.controller.ts`  | `user.controller.ts`        |
| Service     | `*.service.ts`     | `user.service.ts`           |
| Module      | `*.module.ts`      | `user.module.ts`            |
| Entity      | `*.entity.ts`      | `user.entity.ts`            |
| DTO         | `*.dto.ts`         | `create-user.dto.ts`        |
| Interface   | `*.interface.ts`   | `user.interface.ts`         |
| Guard       | `*.guard.ts`       | `jwt-auth.guard.ts`         |
| Decorator   | `*.decorator.ts`   | `current-user.decorator.ts` |
| Filter      | `*.filter.ts`      | `http-exception.filter.ts`  |
| Interceptor | `*.interceptor.ts` | `transform.interceptor.ts`  |
| Spec        | `*.spec.ts`        | `user.service.spec.ts`      |
| E2E         | `*.e2e-spec.ts`    | `user.e2e-spec.ts`          |

### 복합어 파일명

케밥 케이스 사용:

```
create-user.dto.ts
jwt-auth.guard.ts
http-exception.filter.ts
```

## 클래스 네이밍

| 유형        | 접미사        | 예시                   |
| ----------- | ------------- | ---------------------- |
| Controller  | `Controller`  | `UserController`       |
| Service     | `Service`     | `UserService`          |
| Module      | `Module`      | `UserModule`           |
| Entity      | (없음)        | `User`                 |
| Repository  | `Repository`  | `UserRepository`       |
| DTO (생성)  | `ReqDTO`      | `CreateUserReqDTO`     |
| DTO (수정)  | `ReqDTO`      | `UpdateUserReqDTO`     |
| DTO (응답)  | `ResDTO`      | `UserResDTO`           |
| Guard       | `Guard`       | `JwtAuthGuard`         |
| Decorator   | `Decorator`   | `CurrentUserDecorator` |
| Filter      | `Filter`      | `HttpExceptionFilter`  |
| Interceptor | `Interceptor` | `TransformInterceptor` |
| Interface   | (없음)        | `UserPayload`          |

## 변수/함수 네이밍

### 변수

```typescript
// camelCase 사용
const userName = 'John';
const isActive = true;
const portfolioList = [];

// 상수는 UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 10;
```

### 함수

```typescript
// 동사로 시작하는 camelCase
function getUserById(id: string) {}
function createPortfolio(dto: CreatePortfolioDTO) {}
function validateToken(token: string) {}

// Boolean 반환 함수는 is/has/can 접두사
function isValidEmail(email: string): boolean {}
function hasPermission(user: User): boolean {}
function canAccessResource(user: User, resource: Resource): boolean {}
```

### 이벤트 핸들러

```typescript
// handle + 이벤트명
function handleClick() {}
function handleSubmit() {}
function handleUserCreated(event: UserCreatedEvent) {}
```
