import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonMessageResponse } from 'src/common/decorators/swagger.decorator';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { CompleteKakaoTurnReqDTO } from '../application/dtos/kakao-turn.dto';
import { KakaoSkillFacade } from '../application/facades/kakao-skill.facade';

@ApiTags('Kakao - Internal (AI)')
// 기존 commit/usage API처럼 AI와 합의된 /api/v1 계약 경로를 사용한다.
@Controller('api/v1/kakao')
@Public()
@UseGuards(InternalApiKeyGuard)
@ApiHeader({ name: 'X-API-Key', required: true, description: 'MAIN_BACKEND_API_KEY' })
export class KakaoInternalController {
    constructor(private readonly turns: KakaoSkillFacade) {}

    @Post('turn-complete')
    @HttpCode(200)
    @ApiOperation({ summary: '카카오 턴 결과 및 전달 상태 완료 통지' })
    @ApiCommonMessageResponse('카카오 턴 완료를 확인했습니다.')
    complete(@Body() body: CompleteKakaoTurnReqDTO): Promise<string> {
        if (Number(body.user_id) > 2147483647) throw new BusinessException(ErrorCode.BAD_REQUEST);
        return this.turns.complete(body);
    }
}
