import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';

export function requireSocialProfileField(
    value: unknown,
    field: string,
    socialType: LoginType
): string {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }

    throw new BusinessException(ErrorCode.INVALID_SOCIAL_PROFILE, {
        socialType,
        field,
    });
}

export function getOptionalSocialProfileField(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
}
