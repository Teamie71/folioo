import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonResponse } from '../dtos/common-response.dto';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, CommonResponse<T>> {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<CommonResponse<T>> {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip) {
            return next.handle() as unknown as Observable<CommonResponse<T>>;
        }

        return next.handle().pipe(map((data: T) => CommonResponse.success<T>(data)));
    }
}
