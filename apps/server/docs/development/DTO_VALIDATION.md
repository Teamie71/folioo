# DTO Validation Rules

This project uses a strict global `ValidationPipe` configuration.

Reference: `src/main.ts`

```ts
new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
});
```

## Why This Matters

- `whitelist: true`: removes properties that do not have any class-validator decorators.
- `forbidNonWhitelisted: true`: instead of removing them, the request fails with `400`.
- `transform: true`: enables class-transformer based type conversion (when configured on fields).

Because of this, Request DTOs must follow the rules below.

## Request DTO Rules (ReqDTO)

### 1) Every field must have at least one validator decorator

If a field exists on the DTO but has no validator decorators, it is treated as non-whitelisted and will cause `400`.

```ts
export class ExampleReqDTO {
    // OK
    @IsString()
    title: string;

    // BAD: missing decorators -> request can fail with 400
    // description: string;
}
```

### 2) Optional fields must include `@IsOptional()`

```ts
export class ExampleReqDTO {
    @IsOptional()
    @IsString()
    memo?: string;
}
```

### 3) Type conversion (number/boolean/date) requires explicit transformers

With `transform: true`, primitive conversion is not automatic for all cases.
Use `class-transformer` helpers to make types predictable.

```ts
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PaginationQueryReqDTO {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;
}
```

### 4) String trimming policy (recommended)

To avoid subtle validation issues, normalize user input at the DTO boundary.

```ts
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class ExampleReqDTO {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    title: string;
}
```

## Response DTO Rules (ResDTO)

- Response DTOs do not need class-validator decorators.
- Prefer static factories like `static from(entity: Entity): ResDTO`.
