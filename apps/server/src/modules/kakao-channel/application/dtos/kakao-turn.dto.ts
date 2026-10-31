import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, Matches } from 'class-validator';

export const KAKAO_TURN_OUTCOMES = ['SUCCEEDED', 'FAILED', 'COMMIT_UNKNOWN'] as const;
export const KAKAO_DELIVERY_STATUSES = ['SUCCESS', 'FAIL', 'UNKNOWN', 'NOT_ATTEMPTED'] as const;
export type KakaoTurnOutcome = (typeof KAKAO_TURN_OUTCOMES)[number];
export type KakaoDeliveryStatus = (typeof KAKAO_DELIVERY_STATUSES)[number];

export class CompleteKakaoTurnReqDTO {
    @ApiProperty({ example: '123' })
    @IsString()
    @Matches(/^[1-9]\d{0,9}$/)
    user_id: string;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    request_id: string;

    @ApiProperty({ enum: KAKAO_TURN_OUTCOMES })
    @IsIn(KAKAO_TURN_OUTCOMES)
    outcome: KakaoTurnOutcome;

    @ApiProperty({ enum: KAKAO_DELIVERY_STATUSES })
    @IsIn(KAKAO_DELIVERY_STATUSES)
    delivery_status: KakaoDeliveryStatus;
}

export interface KakaoTurnRequest {
    user_id: string;
    block_id: string;
    request_id: string;
    utterance: string;
    callback_url: string;
    expires_at: string;
}

export interface KakaoTurnStatus {
    request_id: string;
    state: 'ACCEPTED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'COMMIT_UNKNOWN';
    delivery_status: KakaoDeliveryStatus;
}
