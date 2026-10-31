import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LinkKakaoChannelReqDTO {
    @ApiProperty({ description: '카카오 연결 콜백에서 발급한 연결 전용 토큰' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(4096)
    link_token: string;
}

export class KakaoLinkAuthorizeResDTO {
    @ApiProperty({ description: '카카오 계정 연결 동의 페이지 URL' })
    authorize_url: string;
}

export class KakaoLinkStatusResDTO {
    @ApiProperty({ description: '챗봇 연결 또는 카카오 로그인 계정 보유 여부' })
    linked: boolean;
}

// 카카오가 error_description 등의 필드를 추가해도 콜백은 결과 페이지로 리다이렉트한다.
export interface KakaoLinkCallbackQuery {
    code?: unknown;
    state?: unknown;
    error?: unknown;
}
