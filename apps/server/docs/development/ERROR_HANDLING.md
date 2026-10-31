# 예외 처리 가이드

## 개요

Folioo 서버는 애플리케이션 코드에서 NestJS 내장 예외를 직접 throw하지 않고,
자체 정의한 `BusinessException` + `ErrorCode`를 통해 일관된 에러 처리를 수행합니다.

## 아키텍처

```
throw BusinessException(ErrorCode)
        ↓
  GlobalExceptionFilter (@Catch)
        ↓
  CommonResponse.fail()  ←  표준화된 에러 응답
        ↓
  (500 이상일 경우 Sentry 전송)
```

### 핵심 컴포넌트

| 컴포넌트                 | 위치                                            | 역할                                      |
| ------------------------ | ----------------------------------------------- | ----------------------------------------- |
| `BusinessException`      | `src/common/exceptions/business.exception.ts`   | 커스텀 예외 클래스 (`HttpException` 확장) |
| `ErrorCode` (enum)       | `src/common/exceptions/error-code.enum.ts`      | 에러 코드 열거형 정의                     |
| `ErrorMap`               | `src/common/exceptions/error-code.ts`           | 에러 코드 → 메시지 + HTTP 상태 코드 매핑  |
| `GlobalExceptionFilter`  | `src/common/filters/global-exception.filter.ts` | 전역 예외 필터 (Sentry 연동)              |
| `CommonResponse`         | `src/common/dtos/common-response.dto.ts`        | 표준 응답 래퍼 클래스                     |
| `ApiCommonErrorResponse` | `src/common/decorators/swagger.decorator.ts`    | Swagger 에러 문서화 데코레이터            |

## ErrorCode 네이밍 규칙

### 형식

```
<DOMAIN><HTTP_STATUS><SEQUENCE?>
```

| 구성 요소     | 설명                                      | 예시           |
| ------------- | ----------------------------------------- | -------------- |
| `DOMAIN`      | 도메인 접두사 (대문자)                    | `USER`, `AUTH` |
| `HTTP_STATUS` | HTTP 상태 코드 (3자리)                    | `404`, `409`   |
| `SEQUENCE`    | 동일 도메인+상태 코드 내 구분 번호 (선택) | `1`, `2`       |

### enum name 규칙

- **대문자 + 언더스코어** (`SCREAMING_SNAKE_CASE`)
- 의미가 명확하게 드러나야 함

### 예시

```typescript
// 기본 형식: DOMAIN + HTTP_STATUS
USER_NOT_FOUND = 'USER404';
PORTFOLIO_NOT_FOUND = 'PORTFOLIO404';

// 동일 도메인 + 상태 코드가 여러 개인 경우: SEQUENCE 추가
DUPLICATE_EXPERIENCE_NAME = 'EXPERIENCE4091'; // 첫 번째 409
EXPERIENCE_MAX_LIMIT = 'EXPERIENCE4092'; // 두 번째 409

// 공통 에러
BAD_REQUEST = 'COMMON400';
UNAUTHORIZED = 'COMMON401';
INTERNAL_SERVER_ERROR = 'COMMON500';
```

### 현재 도메인별 에러 코드 목록

| 도메인         | ErrorCode                         | 값               | HTTP 상태 | 메시지                                                                |
| -------------- | --------------------------------- | ---------------- | --------- | --------------------------------------------------------------------- |
| **Common**     | `BAD_REQUEST`                     | `COMMON400`      | 400       | 잘못된 요청입니다.                                                    |
|                | `UNAUTHORIZED`                    | `COMMON401`      | 401       | 유효하지 않은 사용자입니다.                                           |
|                | `INTERNAL_SERVER_ERROR`           | `COMMON500`      | 500       | 잠시 후 다시 시도해주세요.                                            |
|                | `NOT_IMPLEMENTED`                 | `COMMON501`      | 501       | 아직 구현되지 않은 기능입니다.                                        |
| **Auth**       | `ALREADY_VERIFY_USER`             | `AUTH409`        | 409       | 이미 인증 이력이 있는 번호입니다.                                     |
|                | `SMS_CODE_NOT_FOUND`              | `AUTH_CODE404`   | 404       | 인증 시간이 만료되었습니다. 재전송 버튼을 눌러주세요.                 |
|                | `SMS_CODE_MISMATCH`               | `AUTH_CODE400`   | 400       | 인증 번호가 일치하지 않습니다. 다시 확인해 주세요.                    |
|                | `REFRESH_TOKEN_EXPIRED`           | `AUTH4011`       | 401       | 리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.                  |
|                | `REFRESH_TOKEN_MISSING`           | `AUTH4012`       | 401       | 리프레시 토큰이 없습니다.                                             |
|                | `INVALID_REFRESH_TOKEN`           | `AUTH4013`       | 401       | 유효하지 않은 토큰입니다.                                             |
| **User**       | `USER_NOT_FOUND`                  | `USER404`        | 404       | 해당하는 사용자를 찾을 수 없습니다.                                   |
| **Insight**    | `LOG_NOT_FOUND`                   | `LOG404`         | 404       | 해당하는 인사이트 로그를 찾을 수 없습니다.                            |
|                | `DUPLICATE_LOG_NAME`              | `LOG409`         | 409       | 인사이트 로그의 제목은 중복될 수 없습니다.                            |
|                | `ACTIVITY_NOT_FOUND`              | `ACTIVITY404`    | 404       | 해당하는 활동 분류 태그를 찾을 수 없습니다.                           |
|                | `DUPLICATE_ACTIVITY_NAME`         | `ACTIVITY4091`   | 409       | 활동명은 중복될 수 없습니다.                                          |
|                | `FULL_ACTIVITY_NAME`              | `ACTIVITY4092`   | 409       | 활동 분류 태그는 최대 10개까지 가질 수 있습니다.                      |
| **Experience** | `EXPERIENCE_NOT_FOUND`            | `EXPERIENCE404`  | 404       | 해당하는 경험을 찾을 수 없습니다.                                     |
|                | `DUPLICATE_EXPERIENCE_NAME`       | `EXPERIENCE4091` | 409       | 경험 정리 제목은 중복될 수 없습니다.                                  |
|                | `EXPERIENCE_MAX_LIMIT`            | `EXPERIENCE4092` | 409       | 경험 정리는 최대 15개까지 가질 수 있습니다.                           |
| **Portfolio**  | `PORTFOLIO_NOT_FOUND`             | `PORTFOLIO404`   | 404       | 해당하는 포트폴리오를 찾을 수 없습니다.                               |
| **Correction** | `CORRECTION_NOT_FOUND`            | `CORRECTION404`  | 404       | 해당하는 첨삭 결과를 찾을 수 없습니다.                                |
|                | `CORRECTION_MAX_LIMIT`            | `CORRECTION4091` | 409       | 포트폴리오 첨삭은 최대 15개까지 가질 수 있습니다.                     |
|                | `CORRECTION_BLOCK_LIMIT_EXCEEDED` | `CORRECTION4092` | 409       | 포트폴리오 첨삭은 최대 5개의 활동블록(포트폴리오)을 가질 수 있습니다. |

## 새 에러 코드 추가 방법

### Step 1: ErrorCode enum에 코드 추가

```typescript
// src/common/exceptions/error-code.enum.ts
export enum ErrorCode {
    // ... 기존 코드

    // 새 도메인 에러
    NEW_DOMAIN_ERROR = 'DOMAIN400',
}
```

### Step 2: ErrorMap에 메시지 + 상태 코드 매핑 추가

```typescript
// src/common/exceptions/error-code.ts
export const ErrorMap: Record<ErrorCode, ErrorDetail> = {
    // ... 기존 매핑

    [ErrorCode.NEW_DOMAIN_ERROR]: {
        message: '사용자 친화적인 한국어 에러 메시지',
        statusCode: HttpStatus.BAD_REQUEST,
    },
};
```

### Step 3: 서비스/리포지토리에서 사용

```typescript
throw new BusinessException(ErrorCode.NEW_DOMAIN_ERROR);

// 추가 상세 정보가 필요한 경우 details 파라미터 사용
throw new BusinessException(ErrorCode.NEW_DOMAIN_ERROR, { field: 'email' });
```

## 계층별 에러 처리 책임

### 설계 원칙

**모든 `BusinessException`은 Service 계층에서 throw합니다.** Repository는 순수 데이터 접근만 담당하며, 예외를 직접 발생시키지 않습니다. NOT_FOUND를 포함한 모든 에러 판단은 Service의 책임입니다.

### 정리

| 계층           | 에러 종류                           | 예시                                                    |
| -------------- | ----------------------------------- | ------------------------------------------------------- |
| **Repository** | throw 금지 — 순수 데이터 접근만     | `findById` → `Entity \| null` 반환                      |
| **Service**    | 모든 비즈니스 에러 (NOT_FOUND 포함) | `USER_NOT_FOUND`, `EXPERIENCE_MAX_LIMIT`, `DUPLICATE_*` |
| **Controller** | 입력 검증만                         | `ValidationPipe` + `class-validator` 자동 처리          |

### Repository 계층 — 순수 데이터 접근

Repository는 **예외를 throw하지 않습니다**. 데이터가 없으면 `null`을 반환하고, 판단은 Service에 위임합니다.

```typescript
@Injectable()
export class UserRepository {
    // 없으면 null 반환 — 판단은 Service에서
    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    // 존재 여부 확인용
    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({ where: { email } });
    }
}
```

### Service 계층 — 모든 비즈니스 에러

NOT_FOUND를 포함한 **모든 에러는 Service에서 throw**합니다. `findByIdOrThrow` 패턴은 Service에 위치합니다.

```typescript
@Injectable()
export class ExperienceService {
    // NOT_FOUND 에러 — Service에서 판단하고 throw
    async findByIdOrThrow(id: number): Promise<Experience> {
        const experience = await this.experienceRepository.findById(id);
        if (!experience) {
            throw new BusinessException(ErrorCode.EXPERIENCE_NOT_FOUND);
        }
        return experience;
    }

    async validateCreation(userId: number, name: string): Promise<void> {
        // 개수 제한 검증
        const count = await this.experienceRepository.countByUserId(userId);
        if (count >= MAX_EXPERIENCES_PER_USER) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAX_LIMIT);
        }

        // 중복 검증
        const isDuplicate = await this.experienceRepository.existsByName(userId, name);
        if (isDuplicate) {
            throw new BusinessException(ErrorCode.DUPLICATE_EXPERIENCE_NAME);
        }
    }
}
```

### Controller 계층 — 입력 검증만

Controller에서는 **직접 예외를 throw하지 않습니다**. 입력 검증은 `ValidationPipe` + `class-validator` 데코레이터로 자동 처리됩니다.

```typescript
@Controller('experiences')
export class ExperienceController {
    @Post()
    async create(@Body() dto: CreateExperienceReqDTO): Promise<ExperienceResDTO> {
        // ✅ DTO의 class-validator로 입력 검증 자동 처리
        // ✅ 비즈니스 에러는 Service에서 throw
        return this.experienceService.create(dto);
    }
}
```

### Service 메서드 네이밍 컨벤션

| 메서드 패턴       | 위치        | 반환 타입                 | 용도                             |
| ----------------- | ----------- | ------------------------- | -------------------------------- |
| `findByIdOrThrow` | **Service** | `Promise<Entity>`         | 없으면 `BusinessException` throw |
| `findById`        | Repository  | `Promise<Entity \| null>` | 없으면 `null` 반환 (순수 조회)   |

## 응답 형식

### 성공 응답

```json
{
    "timestamp": "2024-01-02T12:34:56.000Z",
    "isSuccess": true,
    "error": null,
    "result": { ... }
}
```

### 에러 응답

```json
{
    "timestamp": "2024-01-02T12:34:56.000Z",
    "isSuccess": false,
    "error": {
        "errorCode": "USER404",
        "reason": "해당하는 사용자를 찾을 수 없습니다.",
        "details": null,
        "path": "/api/users/999"
    },
    "result": null
}
```

## Swagger 에러 문서화

`@ApiCommonErrorResponse` 데코레이터를 사용하여 Controller 메서드에 발생 가능한 에러를 문서화합니다.

```typescript
@Get(':id')
@ApiOperation({ summary: '사용자 조회' })
@ApiCommonResponse(UserResDTO)
@ApiCommonErrorResponse(ErrorCode.USER_NOT_FOUND, ErrorCode.UNAUTHORIZED)
async findOne(@Param('id') id: string): Promise<UserResDTO> {
    return this.userService.findOne(id);
}
```

동일한 HTTP 상태 코드를 가진 에러가 여러 개인 경우, Swagger UI에서 examples 드롭다운으로 각각 확인할 수 있습니다.

## 금지 사항

### 1. NestJS 내장 예외 직접 throw 금지

```typescript
// ❌ 금지
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException();
throw new ForbiddenException();
throw new ConflictException();

// ✅ 올바른 사용
throw new BusinessException(ErrorCode.USER_NOT_FOUND);
throw new BusinessException(ErrorCode.BAD_REQUEST);
throw new BusinessException(ErrorCode.UNAUTHORIZED);
```

> 예외: 전역 `ValidationPipe`/`ParseIntPipe`가 프레임워크 내부에서 생성하는 `BadRequestException`은 허용되며,
> `GlobalExceptionFilter`에서 `ErrorCode.BAD_REQUEST`로 표준화해 응답합니다.

### 2. 에러 메시지 하드코딩 금지

```typescript
// ❌ 금지 — 메시지가 ErrorMap과 중복/불일치
throw new BusinessException(ErrorCode.USER_NOT_FOUND, '사용자를 찾을 수 없습니다');

// ✅ 올바른 사용 — 메시지는 ErrorMap에서 자동 매핑
throw new BusinessException(ErrorCode.USER_NOT_FOUND);

// ✅ details는 디버깅용 추가 정보로 사용 가능
throw new BusinessException(ErrorCode.USER_NOT_FOUND, { requestedId: userId });
```

### 3. Controller에서 직접 예외 throw 금지

```typescript
// ❌ 금지 — Controller에서 비즈니스 에러 throw
@Post()
async create(@Body() dto: CreateUserReqDTO) {
    if (await this.userService.existsByEmail(dto.email)) {
        throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS); // 이건 Service 책임
    }
}

// ✅ 올바른 사용 — Service에 위임
@Post()
async create(@Body() dto: CreateUserReqDTO) {
    return this.userService.create(dto); // Service 내부에서 검증
}
```

### 4. 빈 catch 블록 금지

```typescript
// ❌ 금지 — 에러 무시
try {
    await this.userRepository.save(user);
} catch (e) {}

// ✅ 올바른 사용 — 적절한 에러 처리 또는 재throw
try {
    await this.userRepository.save(user);
} catch (error) {
    this.logger.error('사용자 저장 실패', error);
    throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
}
```

## 전역 ValidationPipe

`main.ts`에서 전역 `ValidationPipe`를 설정하여 모든 요청의 DTO 검증을 일관되게 처리합니다.

```typescript
app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    })
);
```

| 옵션                   | 설명                                              |
| ---------------------- | ------------------------------------------------- |
| `whitelist`            | DTO에 정의되지 않은 속성을 자동 제거              |
| `forbidNonWhitelisted` | DTO에 정의되지 않은 속성이 있으면 400 에러 반환   |
| `transform`            | 경로 파라미터/쿼리 등을 DTO 타입에 맞게 자동 변환 |

### 숫자 파라미터 검증

`@Param` 또는 `@Query`로 받는 숫자 타입 파라미터는 `ParseIntPipe`를 사용하여 검증합니다.

```typescript
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number): Promise<ResDTO> {
    return this.service.findOne(id);
}
```

`ParseIntPipe` 미사용 시 `"abc"` 같은 입력이 `NaN`으로 변환되어 서비스 계층까지 전달될 수 있습니다. `ParseIntPipe`를 사용하면 유효하지 않은 입력을 컨트롤러 진입 전에 차단합니다.

### Validation 에러 응답 형식

Validation 에러도 `GlobalExceptionFilter`를 통해 `CommonResponse` 형식으로 응답됩니다.

```json
{
    "timestamp": "2026-01-02T12:34:56.000Z",
    "isSuccess": false,
    "error": {
        "errorCode": "COMMON400",
        "reason": "잘못된 요청입니다.",
        "details": ["name must be a string", "property unknownField should not exist"],
        "path": "/api/experiences"
    },
    "result": null
}
```

### 검증/비즈니스 에러 시나리오 표

| 시나리오                                              | 발생 계층               | 내부 예외                               | 표준 응답 errorCode |
| ----------------------------------------------------- | ----------------------- | --------------------------------------- | ------------------- |
| `name` 누락 (`POST /experiences`)                     | ValidationPipe + ReqDTO | `BadRequestException` (프레임워크 내부) | `COMMON400`         |
| `experienceId=abc` (`GET /experiences/:experienceId`) | `ParseIntPipe`          | `BadRequestException` (프레임워크 내부) | `COMMON400`         |
| 경험 제목 중복                                        | Service 비즈니스 검증   | `BusinessException`                     | `EXPERIENCE4091`    |
| 경험 최대 개수 초과                                   | Service 비즈니스 검증   | `BusinessException`                     | `EXPERIENCE4092`    |
| 조회 대상 없음                                        | Service 존재 검증       | `BusinessException`                     | `EXPERIENCE404`     |

프레임워크 검증 에러와 비즈니스 에러는 발생 지점은 다르지만,
`GlobalExceptionFilter`를 거쳐 **동일한 `CommonResponse` 형식**으로 응답합니다.

### DELETE 응답 규칙

프로젝트는 `TransformInterceptor`가 모든 성공 응답을 `CommonResponse.success()`로 감싸므로,
DELETE API도 기본적으로 `200 OK` + 메시지(`string`) 응답을 사용합니다.

```typescript
@Delete(':id')
async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    await this.service.remove(id);
    return '삭제되었습니다.';
}
```

`204 No Content`는 응답 본문이 없어 공통 응답 래퍼 형태를 유지할 수 없으므로,
현재 컨벤션에서는 사용하지 않습니다.

## GlobalExceptionFilter 동작 방식

1. **모든 예외 캐치**: `@Catch()` 데코레이터로 처리되지 않은 모든 예외를 잡음
2. **BusinessException**: `ErrorCode`, `reason`, `details`를 응답에 포함
3. **ValidationPipe / ParseIntPipe 검증 에러**: `COMMON400` 코드 + `details`에 검증 실패 메시지 배열 포함
4. **기타 HttpException**: 가능한 에러 정보를 추출하여 응답
5. **시스템 에러 (Non-HttpException)**: `INTERNAL_SERVER_ERROR`로 래핑
6. **Sentry 연동**: HTTP 500 이상 에러는 자동으로 Sentry에 전송
7. **로깅**: 4xx는 `warn`, 5xx 및 시스템 에러는 `error` 레벨로 기록
