import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AgreeTermsReqDTO {
    @ApiProperty({ description: '서비스 이용약관 동의 여부', example: true })
    @IsBoolean()
    isServiceAgreed: boolean;

    @ApiProperty({ description: '개인정보 처리방침 동의 여부', example: true })
    @IsBoolean()
    isPrivacyAgreed: boolean;

    @ApiProperty({ description: '마케팅 수신 동의 여부', example: false })
    @IsBoolean()
    isMarketingAgreed: boolean;
}

export class AgreeTermsResDTO {
    @ApiProperty({ description: '서비스 이용약관 동의 여부', example: true })
    isServiceAgreed: boolean;

    @ApiProperty({ description: '개인정보 처리방침 동의 여부', example: true })
    isPrivacyAgreed: boolean;

    @ApiProperty({ description: '마케팅 수신 동의 여부', example: false })
    isMarketingAgreed: boolean;

    @ApiProperty({
        description: '마케팅 수신 동의 시각 (비동의 상태면 null)',
        example: '2026-03-06T12:00:00.000Z',
        nullable: true,
    })
    marketingAgreedAt: Date | null;

    static from(
        isServiceAgreed: boolean,
        isPrivacyAgreed: boolean,
        isMarketingAgreed: boolean,
        marketingAgreedAt: Date | null
    ): AgreeTermsResDTO {
        const dto = new AgreeTermsResDTO();
        dto.isServiceAgreed = isServiceAgreed;
        dto.isPrivacyAgreed = isPrivacyAgreed;
        dto.isMarketingAgreed = isMarketingAgreed;
        dto.marketingAgreedAt = marketingAgreedAt;
        return dto;
    }
}
