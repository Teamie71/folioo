import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { safeEqual } from 'src/common/utils/safe-equal.util';
import { KakaoSkillReqDTO } from '../../application/dtos/kakao-skill.dto';

export const KAKAO_SKILL_SECRET_HEADER = 'x-kakao-skill-secret';

type KakaoSkillRequest = {
    headers?: Record<string, string | string[] | undefined>;
    body?: KakaoSkillReqDTO;
};

// 오픈빌더는 스킬 요청에 서명을 붙이지 않는다. 스킬 설정의 커스텀 헤더에 넣은 시크릿과
// body의 bot.id로 우리 봇에서 온 요청인지 확인한다. 이게 없으면 appUserId 위조로 남의 계정에 쓸 수 있다.
@Injectable()
export class KakaoSkillGuard implements CanActivate {
    private readonly logger = new Logger(KakaoSkillGuard.name);

    constructor(private readonly configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const expectedSecret = this.configService.get<string>('KAKAO_SKILL_SECRET');
        const expectedBotId = this.configService.get<string>('KAKAO_BOT_ID');

        if (!expectedSecret || !expectedBotId) {
            this.logger.error('KAKAO_SKILL_SECRET/KAKAO_BOT_ID is not configured');
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const request = context.switchToHttp().getRequest<KakaoSkillRequest>();
        const rawSecret = request.headers?.[KAKAO_SKILL_SECRET_HEADER];
        const providedSecret = Array.isArray(rawSecret) ? rawSecret[0] : rawSecret;

        if (
            !providedSecret ||
            !safeEqual(providedSecret, expectedSecret) ||
            request.body?.bot?.id !== expectedBotId
        ) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return true;
    }
}
