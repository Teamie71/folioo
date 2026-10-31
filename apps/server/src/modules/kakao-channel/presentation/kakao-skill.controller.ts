import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { KakaoSkillFacade } from '../application/facades/kakao-skill.facade';
import type {
    KakaoSkillReqDTO,
    KakaoSkillResDTO,
    KakaoSkillResponse,
} from '../application/dtos/kakao-skill.dto';
import {
    KAKAO_SKILL_SECRET_HEADER,
    KakaoSkillGuard,
} from '../infrastructure/guards/kakao-skill.guard';

// 카카오 오픈빌더 스킬 서버. 응답은 CommonResponse로 감싸지 않고 카카오 스킬 포맷 그대로 200으로 돌려준다.
@ApiTags('Kakao Skill')
@ApiHeader({ name: KAKAO_SKILL_SECRET_HEADER, required: true, description: 'KAKAO_SKILL_SECRET' })
@Controller('kakao/skill')
@Public()
@SkipTransform()
@UseGuards(KakaoSkillGuard)
export class KakaoSkillController {
    constructor(private readonly kakaoSkillFacade: KakaoSkillFacade) {}

    @Post('chat')
    @HttpCode(200)
    @ApiOperation({
        summary: '자유 발화 처리 (폴백 블록)',
        description:
            'appUserId로 Folioo 사용자를 식별한다. 미연결이면 연결 안내 카드, 약관 미동의면 가입 마무리 카드를 응답한다.',
    })
    chat(@Body() payload: KakaoSkillReqDTO): Promise<KakaoSkillResponse> {
        return this.kakaoSkillFacade.chat(payload);
    }

    @Post('activities')
    @HttpCode(200)
    @ApiOperation({ summary: '정리할 활동 목록 조회 및 활동 변경' })
    activities(@Body() payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        return this.kakaoSkillFacade.activities(payload);
    }

    @Post('select-activity')
    @HttpCode(200)
    @ApiOperation({ summary: '카카오톡에서 정리할 활동 선택' })
    selectActivity(@Body() payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        return this.kakaoSkillFacade.selectActivity(payload);
    }
}
