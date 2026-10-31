import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AgreeMarketingReqDTO {
    @ApiProperty({ description: '마케팅 수신 동의 여부', example: true })
    @IsBoolean()
    isMarketingAgreed: boolean;
}

export class AgreeMarketingResDTO {
    @ApiProperty({ description: '마케팅 수신 동의 여부', example: true })
    isMarketingAgreed: boolean;

    @ApiProperty({
        description: '마케팅 수신 동의 시각 (비동의 상태면 null)',
        example: '2026-03-01T12:00:00.000Z',
        nullable: true,
    })
    marketingAgreedAt: Date | null;

    static from(isMarketingAgreed: boolean, marketingAgreedAt: Date | null): AgreeMarketingResDTO {
        const dto = new AgreeMarketingResDTO();
        dto.isMarketingAgreed = isMarketingAgreed;
        dto.marketingAgreedAt = marketingAgreedAt;
        return dto;
    }
}
