import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';
import { SectionKind } from '../../domain/enums/section-kind.enum';

export enum CommitItemAction {
    ADD = 'add',
    UPDATE = 'update',
    DELETE = 'delete',
}

export class CommitItemReqDTO {
    @IsString()
    @ApiProperty({ example: 'it_1' })
    item_id: string;

    @IsIn([CommitItemAction.ADD, CommitItemAction.UPDATE, CommitItemAction.DELETE])
    @ApiProperty({ enum: CommitItemAction })
    action: CommitItemAction;

    @IsOptional()
    @IsString()
    @ApiProperty({ required: false, nullable: true, example: '3021' })
    parent_id?: string | null;

    @IsOptional()
    @IsString()
    @ApiProperty({
        required: false,
        nullable: true,
        description:
            '같은 요청에서 앞서 정의한 add item을 부모로 쓸 때. 부모가 자식보다 먼저 나와야 한다.',
    })
    parent_item_id?: string | null;

    @IsOptional()
    @IsEnum(SectionKind)
    @ApiProperty({ required: false, nullable: true, enum: SectionKind })
    section_kind?: SectionKind | null;

    @IsOptional()
    @IsString()
    @ApiProperty({ required: false, nullable: true, example: 'PROBLEM_SOLVING.SUMMARY' })
    slot_id?: string | null;

    @IsOptional()
    @IsString()
    @ApiProperty({ required: false, nullable: true, maxLength: 500 })
    content?: string | null;

    @IsOptional()
    @IsString()
    @ApiProperty({ required: false, nullable: true, description: '같은 부모의 형제. null이면 끝' })
    after_id?: string | null;

    @IsOptional()
    @IsString()
    @ApiProperty({
        required: false,
        description:
            'update/delete 시 필수. delete는 CONTENT(4·5단계) 블록만 가능하고 하위 블록도 함께 삭제된다.',
    })
    target_id?: string;
}

export class CommitReqDTO {
    @IsString()
    @ApiProperty({ example: '123' })
    user_id: string;

    @IsUUID()
    @ApiProperty()
    request_id: string;

    @IsInt()
    @ApiProperty({ example: 42 })
    base_map_version: number;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CommitItemReqDTO)
    @ApiProperty({ type: () => [CommitItemReqDTO] })
    items: CommitItemReqDTO[];
}

export class CommitAppliedItemResDTO {
    @ApiProperty({ example: 'it_1' })
    item_id: string;

    @ApiProperty({ enum: CommitItemAction })
    action: CommitItemAction;

    @ApiProperty({ example: '3701' })
    block_id: string;

    @ApiProperty({ example: '교내 커머스 리뉴얼 > 문제해결' })
    path: string;

    static of(
        itemId: string,
        action: CommitItemAction,
        blockId: string,
        path: string
    ): CommitAppliedItemResDTO {
        const dto = new CommitAppliedItemResDTO();
        dto.item_id = itemId;
        dto.action = action;
        dto.block_id = blockId;
        dto.path = path;
        return dto;
    }
}

export class CommitResDTO {
    @ApiProperty()
    request_id: string;

    @ApiProperty({ example: 42 })
    previous_version: number;

    @ApiProperty({ example: 43 })
    map_version: number;

    @ApiProperty({ type: () => [CommitAppliedItemResDTO] })
    applied: CommitAppliedItemResDTO[];
}

export class CommitStatusResDTO {
    @ApiProperty()
    committed: boolean;

    @ApiProperty({ required: false, nullable: true, type: () => CommitResDTO })
    result: CommitResDTO | null;
}
