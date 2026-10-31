import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Block, BLOCK_CONTENT_MAX_LENGTH } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';
import { ExperienceMeta } from '../../domain/experience-meta.entity';
import { ExperienceMap } from '../../domain/experience-map.entity';
import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import { PortfolioStatus } from 'src/modules/portfolio/domain/enums/portfolio-status.enum';

export class CreateBlockReqDTO {
    @IsEnum(BlockKind)
    @ApiProperty({ enum: BlockKind, example: BlockKind.GROUP })
    kind: BlockKind;

    @IsOptional()
    @IsString()
    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: '12',
        description: '부모 블록 id (bigint라 문자열로 주고받는다). 루트 GROUP 생성 시 생략',
    })
    parentId?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(BLOCK_CONTENT_MAX_LENGTH)
    @ApiProperty({ required: false, nullable: true, maxLength: BLOCK_CONTENT_MAX_LENGTH })
    content?: string | null;

    @IsString()
    @ApiProperty({
        type: 'string',
        example: '1',
        description:
            '요청 전 GET /experience-map으로 읽은 mapVersion. 그 사이 다른 요청이 먼저 반영돼 현재 값과 다르면 409로 거부된다.',
    })
    expectedMapVersion: string;
}

export class UpdateBlockContentReqDTO {
    @IsOptional()
    @IsString()
    @MaxLength(BLOCK_CONTENT_MAX_LENGTH)
    @ApiProperty({ required: false, nullable: true, maxLength: BLOCK_CONTENT_MAX_LENGTH })
    content?: string | null;

    @IsString()
    @ApiProperty({
        type: 'string',
        example: '1',
        description:
            '요청 전 GET /experience-map으로 읽은 mapVersion. 그 사이 다른 요청이 먼저 반영돼 현재 값과 다르면 409로 거부된다.',
    })
    expectedMapVersion: string;
}

export class DeleteBlockQueryDTO {
    @IsString()
    @ApiProperty({
        type: 'string',
        example: '1',
        description:
            '요청 전 GET /experience-map으로 읽은 mapVersion. 그 사이 다른 요청이 먼저 반영돼 현재 값과 다르면 409로 거부된다.',
    })
    expectedMapVersion: string;
}

export class MoveBlockReqDTO {
    @IsOptional()
    @IsString()
    @ApiProperty({
        type: 'string',
        required: false,
        nullable: true,
        example: '12',
        description:
            '새 부모 블록 id (bigint라 문자열로 주고받는다). 생략하면 같은 부모 내에서 순서만 변경한다. ' +
            '1단계(그룹) 블록은 위계(부모)를 변경할 수 없다. 2단계(활동) 블록은 다른 그룹으로 이동할 수 있다.',
    })
    parentId?: string | null;

    @IsInt()
    @Min(0)
    @ApiProperty({ example: 0, minimum: 0, description: '새 부모(또는 기존 부모) 내에서의 순서' })
    position: number;

    @IsString()
    @ApiProperty({
        type: 'string',
        example: '1',
        description:
            '요청 전 GET /experience-map으로 읽은 mapVersion. 그 사이 다른 요청이 먼저 반영돼 현재 값과 다르면 409로 거부된다.',
    })
    expectedMapVersion: string;
}

export class ExperienceMetaResDTO {
    @ApiProperty({ type: Number, required: false, nullable: true })
    contributionRate: number | null;

    @ApiProperty({ enum: SourceType })
    sourceType: SourceType;

    @ApiProperty({ enum: PortfolioStatus })
    status: PortfolioStatus;

    @ApiProperty({ type: Number, required: false, nullable: true })
    experienceId: number | null;

    static from(experienceMeta: ExperienceMeta): ExperienceMetaResDTO {
        const dto = new ExperienceMetaResDTO();
        dto.contributionRate = experienceMeta.contributionRate;
        dto.sourceType = experienceMeta.sourceType;
        dto.status = experienceMeta.status;
        dto.experienceId = experienceMeta.experienceId;
        return dto;
    }
}

export class BlockResDTO {
    @ApiProperty({
        type: 'string',
        example: '12',
        description: 'bigint라 JS number 정밀도(2^53) 초과를 피하기 위해 문자열로 반환한다.',
    })
    id: string;

    @ApiProperty({
        type: 'string',
        nullable: true,
        example: '12',
        description: 'bigint라 문자열로 반환한다. 1단계(루트) 블록은 null.',
    })
    parentId: string | null;

    level: number;
    @ApiProperty({ enum: BlockKind })
    kind: BlockKind;
    position: number;
    content: string | null;
    placeholder: string | null;
    createdAt: string;
    updatedAt: string;
    @ApiProperty({ type: () => ExperienceMetaResDTO, required: false })
    experienceMeta?: ExperienceMetaResDTO;
    @ApiProperty({ type: () => [BlockResDTO] })
    children: BlockResDTO[];

    static fromEntity(block: Block, experienceMeta?: ExperienceMeta): BlockResDTO {
        const dto = new BlockResDTO();
        dto.id = block.id;
        dto.parentId = block.parentId;
        dto.level = block.level;
        dto.kind = block.kind;
        dto.position = block.position;
        dto.content = block.content;
        dto.placeholder = block.placeholder;
        dto.createdAt = block.createdAt.toISOString();
        dto.updatedAt = block.updatedAt.toISOString();
        dto.experienceMeta = experienceMeta ? ExperienceMetaResDTO.from(experienceMeta) : undefined;
        dto.children = [];
        return dto;
    }
}

export class ExperienceMapResDTO {
    @ApiProperty({
        type: 'string',
        example: '1',
        description: '낙관적 잠금 버전 (bigint라 문자열로 반환)',
    })
    mapVersion: string;
    @ApiProperty({ type: () => [BlockResDTO] })
    roots: BlockResDTO[];
    @ApiProperty({
        type: String,
        nullable: true,
        example: '550e8400-e29b-41d4-a716-446655440000',
        description:
            '지금 되돌릴 수 있는 AI 작업의 request_id. 채팅의 request_id와 같을 때만 되돌리기 버튼을 노출한다. ' +
            '최신 AI 작업이 아니거나, 24시간이 지났거나, 이후 맵 변경이 있으면 null.',
    })
    revertibleRequestId: string | null;

    static from(
        experienceMap: ExperienceMap,
        blocks: Block[],
        experienceMetas: ExperienceMeta[],
        revertibleRequestId: string | null
    ): ExperienceMapResDTO {
        const experienceMetaByBlockId = new Map(
            experienceMetas.map((meta) => [meta.blockId, meta])
        );

        const nodeById = new Map<string, BlockResDTO>();
        const childrenByParentId = new Map<string | null, BlockResDTO[]>();

        for (const block of blocks) {
            const node = BlockResDTO.fromEntity(block, experienceMetaByBlockId.get(block.id));
            nodeById.set(block.id, node);
            const siblings = childrenByParentId.get(block.parentId) ?? [];
            siblings.push(node);
            childrenByParentId.set(block.parentId, siblings);
        }

        for (const node of nodeById.values()) {
            node.children = childrenByParentId.get(node.id) ?? [];
        }

        const dto = new ExperienceMapResDTO();
        dto.mapVersion = experienceMap.mapVersion;
        dto.roots = childrenByParentId.get(null) ?? [];
        dto.revertibleRequestId = revertibleRequestId;
        return dto;
    }
}
