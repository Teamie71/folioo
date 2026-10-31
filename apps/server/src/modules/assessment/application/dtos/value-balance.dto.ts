import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';
import { ValueKind, VALUE_KIND_LABEL } from '../../domain/enums/value-kind.enum';
import { getComparisonCard } from '../../domain/catalog/value-comparison-catalog';
import { ValueBalanceProgress } from '../services/value-balance-session.service';

export class ValueBalanceAnswerReqDTO {
    @IsOptional()
    @IsUUID()
    @ApiProperty({
        required: false,
        description: '진행 중인 세션 토큰. 생략하면 새 세션을 시작하고 첫 질문을 반환한다.',
    })
    token?: string;

    @ValidateIf((dto: ValueBalanceAnswerReqDTO) => dto.token !== undefined)
    @IsInt()
    @Min(0)
    @ApiProperty({
        required: false,
        description:
            'token이 있으면 필수. 응답 대상 질문 번호(0-index). 이미 답한 번호를 다시 보내면 그 지점 이후 응답은 폐기되고 새로 이어진다.',
    })
    sequence?: number;

    @ValidateIf((dto: ValueBalanceAnswerReqDTO) => dto.token !== undefined)
    @IsEnum(ValueKind)
    @ApiProperty({
        required: false,
        enum: ValueKind,
        description: 'token이 있으면 필수. 선택한 가치.',
    })
    chosen?: ValueKind;
}

class ValueComparisonOptionResDTO {
    @ApiProperty({ enum: ValueKind })
    valueKind: ValueKind;

    @ApiProperty({ description: '가치 라벨(한글)' })
    label: string;

    @ApiProperty({ description: '카드 문구' })
    card: string;
}

export class ValueBalanceResultResDTO {
    @ApiProperty({ type: [String], enum: ValueKind, description: '1위부터 5위까지의 순위' })
    ranking: ValueKind[];

    @ApiProperty({ description: '가치별 가중치(합계 1)', example: { WORK_LIFE_BALANCE: 0.333 } })
    weights: Partial<Record<ValueKind, number>>;
}

export class ValueBalanceQuestionResDTO {
    @ApiProperty({ description: '세션 토큰. 이후 요청에 계속 사용한다.' })
    token: string;

    @ApiProperty({ description: '가치관 밸런스게임이 완료되었는지 여부' })
    completed: boolean;

    @ApiProperty({ required: false, description: '완료 전까지는 응답할 질문 번호(0-index)' })
    sequence?: number;

    @ApiProperty({ required: false, type: ValueComparisonOptionResDTO })
    left?: ValueComparisonOptionResDTO;

    @ApiProperty({ required: false, type: ValueComparisonOptionResDTO })
    right?: ValueComparisonOptionResDTO;

    @ApiProperty({ required: false, type: ValueBalanceResultResDTO })
    result?: ValueBalanceResultResDTO;

    static from(progress: ValueBalanceProgress): ValueBalanceQuestionResDTO {
        const dto = new ValueBalanceQuestionResDTO();
        dto.token = progress.token;
        dto.completed = progress.isComplete;

        if (!progress.isComplete && progress.next) {
            const card = getComparisonCard(progress.next.left, progress.next.right);
            dto.sequence = progress.next.sequence;
            dto.left = {
                valueKind: card.left,
                label: VALUE_KIND_LABEL[card.left],
                card: card.leftCard,
            };
            dto.right = {
                valueKind: card.right,
                label: VALUE_KIND_LABEL[card.right],
                card: card.rightCard,
            };
        }

        if (progress.isComplete && progress.ranking && progress.weights) {
            dto.result = { ranking: progress.ranking, weights: progress.weights };
        }

        return dto;
    }
}
