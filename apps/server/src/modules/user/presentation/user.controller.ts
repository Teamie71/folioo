import { Body, Controller, Delete, Get, Headers, Patch, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
} from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UpdateUserNameReqDTO, UserProfileResDTO } from '../application/dtos/user-profile.dto';
import {
    AgreeMarketingReqDTO,
    AgreeMarketingResDTO,
} from '../application/dtos/marketing-agree.dto';
import { AgreeTermsReqDTO, AgreeTermsResDTO } from '../application/dtos/agree-terms.dto';
import { User } from 'src/common/decorators/user.decorator';
import { AllowPending } from 'src/common/decorators/allow-pending.decorator';
import { UserService } from '../application/services/user.service';
import { extractAccessTokenFromAuthorization } from 'src/modules/auth/infrastructure/utils/access-token.util';
import type { Request } from 'express';
import { UserAuthFacade } from '../application/facades/user-auth.facade';

@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly userAuthFacade: UserAuthFacade
    ) {}

    @Get('me')
    @ApiOperation({
        summary: '사용자 프로필 조회',
        description: '사용자의 프로필을 조회합니다.',
    })
    @ApiCommonResponse(UserProfileResDTO, {
        exampleResult: {
            name: '폴리오유저',
            socialAccounts: [
                {
                    socialType: 'KAKAO',
                    socialEmail: 'folioo-kakao@example.com',
                },
                {
                    socialType: 'GOOGLE',
                    socialEmail: 'folioo-google@example.com',
                },
            ],
            phoneNum: '01012345678',
            isMarketingAgreed: true,
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND)
    async getProfile(@User('sub') userId: number): Promise<UserProfileResDTO> {
        return await this.userService.getProfile(userId);
    }

    @Post('me/terms')
    @AllowPending()
    @ApiOperation({
        summary: '온보딩 약관 동의',
        description:
            '회원가입 후 서비스 이용약관, 개인정보 처리방침, 마케팅 수신 동의를 처리합니다. 필수 약관(서비스, 개인정보) 동의 시 사용자 상태가 ACTIVE로 전환됩니다.',
    })
    @ApiBody({ type: AgreeTermsReqDTO })
    @ApiCommonResponse(AgreeTermsResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.USER_NOT_FOUND,
        ErrorCode.REQUIRED_TERMS_NOT_AGREED,
        ErrorCode.ALREADY_AGREED_USER,
        ErrorCode.TERM_NOT_FOUND
    )
    async agreeTerms(
        @User('sub') userId: number,
        @Body() body: AgreeTermsReqDTO
    ): Promise<AgreeTermsResDTO> {
        return await this.userAuthFacade.onBoarding(
            userId,
            body.isServiceAgreed,
            body.isPrivacyAgreed,
            body.isMarketingAgreed
        );
    }

    @Patch('me')
    @ApiOperation({
        summary: '사용자 이름/닉네임 변경',
        description: '사용자의 이름/닉네임을 변경합니다.',
    })
    @ApiBody({ type: UpdateUserNameReqDTO })
    @ApiCommonResponse(UserProfileResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND)
    async updateProfile(
        @User('sub') userId: number,
        @Body() body: UpdateUserNameReqDTO
    ): Promise<UserProfileResDTO> {
        return this.userService.updateProfile(userId, body.name);
    }

    @Patch('me/marketing-consent')
    @ApiOperation({
        summary: '마케팅 정보 수신 동의 여부 변경',
        description:
            '사용자의 마케팅 정보 수신 동의 여부를 동의 -> 비동의 또는 비동의 -> 동의로 변경합니다.',
    })
    @ApiBody({ type: AgreeMarketingReqDTO })
    @ApiCommonResponse(AgreeMarketingResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND)
    async updateMarketingConsent(
        @User('sub') userId: number,
        @Body() body: AgreeMarketingReqDTO
    ): Promise<AgreeMarketingResDTO> {
        return this.userService.updateMarketingConsent(userId, body.isMarketingAgreed);
    }

    @Delete('me')
    @ApiOperation({
        summary: '회원 탈퇴',
        description:
            '사용자의 계정을 탈퇴 처리하고 연결된 소셜 로그인 계정을 저장된 OAuth 리프레시 토큰 기반으로 연결 해제합니다.',
    })
    @ApiCommonMessageResponse('회원 탈퇴가 완료되었습니다.')
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.USER_NOT_FOUND,
        ErrorCode.DEACTIVATED_USER,
        ErrorCode.SOCIAL_UNLINK_FAILED
    )
    async withdraw(
        @User('sub') userId: number,
        @Headers('authorization') authorization: string | undefined,
        @Req() req: Request
    ): Promise<string> {
        const accessToken = extractAccessTokenFromAuthorization(authorization)!;

        const refreshToken = req.cookies?.refreshToken as string | undefined;

        await this.userAuthFacade.withdraw(userId, accessToken, refreshToken ?? null);
        return '회원 탈퇴가 완료되었습니다.';
    }
}
