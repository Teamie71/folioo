import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { User } from 'src/common/decorators/user.decorator';
import type { UserAfterAuth } from 'src/modules/auth/domain/types/jwt-payload.type';
import { KakaoLinkFacade } from '../application/facades/kakao-link.facade';
import {
    KakaoLinkAuthorizeResDTO,
    KakaoLinkStatusResDTO,
    LinkKakaoChannelReqDTO,
} from '../application/dtos/kakao-link.dto';
import type { KakaoLinkCallbackQuery } from '../application/dtos/kakao-link.dto';

@ApiTags('Kakao Channel Link')
@Controller('kakao-channel/link')
export class KakaoLinkController {
    constructor(private readonly kakaoLinkFacade: KakaoLinkFacade) {}

    @Post('authorize')
    @HttpCode(200)
    @ApiBearerAuth()
    @ApiOperation({ summary: '챗봇 전용 카카오 계정 연결 인가 URL 발급' })
    @ApiOkResponse({ type: KakaoLinkAuthorizeResDTO })
    authorize(@User() user: UserAfterAuth): KakaoLinkAuthorizeResDTO {
        return this.kakaoLinkFacade.authorize(user.sub);
    }

    @Get('callback')
    @Public()
    @SkipTransform()
    @ApiOperation({ summary: '카카오 연결 동의 콜백 및 결과 페이지 리다이렉트' })
    @ApiResponse({ status: 302, description: '연결 토큰 또는 오류를 포함한 웹 결과 페이지로 이동' })
    async callback(
        @Query() query: KakaoLinkCallbackQuery,
        @Res() response: Response
    ): Promise<void> {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Referrer-Policy', 'no-referrer');
        response.redirect(await this.kakaoLinkFacade.callback(query));
    }

    @Post()
    @HttpCode(200)
    @ApiBearerAuth()
    @ApiOperation({ summary: '로그인 사용자와 카카오 계정의 챗봇 연결 확정' })
    @ApiOkResponse({ type: String })
    link(@User() user: UserAfterAuth, @Body() body: LinkKakaoChannelReqDTO): Promise<string> {
        return this.kakaoLinkFacade.link(user.sub, body.link_token);
    }

    @Get('status')
    @ApiBearerAuth()
    @ApiOperation({ summary: '챗봇 전용 카카오 연결 여부 조회' })
    @ApiOkResponse({ type: KakaoLinkStatusResDTO })
    status(@User() user: UserAfterAuth): Promise<KakaoLinkStatusResDTO> {
        return this.kakaoLinkFacade.status(user.sub);
    }
}
