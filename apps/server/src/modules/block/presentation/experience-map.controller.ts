import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import {
    BlockResDTO,
    CreateBlockReqDTO,
    DeleteBlockQueryDTO,
    ExperienceMapResDTO,
    MoveBlockReqDTO,
    UpdateBlockContentReqDTO,
} from '../application/dtos/block.dto';

@ApiTags('ExperienceMap')
@Controller('experience-map')
export class ExperienceMapController {
    constructor(private readonly experienceMapFacade: ExperienceMapFacade) {}

    @Get()
    @ApiOperation({
        summary: '경험 정리 구조화 맵 조회',
        description:
            '사용자의 블록 트리 전체를 조회합니다. 최초 조회 시 미분류 루트 블록과 트리 버전이 자동으로 생성됩니다.',
    })
    @ApiCommonResponse(ExperienceMapResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getMap(@User('sub') userId: number): Promise<ExperienceMapResDTO> {
        return this.experienceMapFacade.getMap(userId);
    }

    @Post('blocks')
    @ApiOperation({
        summary: '블록 생성',
        description:
            'GROUP(루트), EXPERIENCE(GROUP/미분류 하위), SECTION_*(EXPERIENCE 하위), CONTENT(EXPERIENCE/SECTION/CONTENT 하위)만 직접 생성할 수 있습니다. ' +
            'EXPERIENCE 생성 시 SECTION 5종(상세정보/주요성과/담당업무/문제해결/배운 점)과 experience_meta가 같은 트랜잭션에서 함께 생성됩니다. ' +
            '단, 응답의 children은 생성 직후엔 항상 빈 배열이라 자동 생성된 SECTION을 보려면 GET /experience-map을 다시 호출해야 합니다. ' +
            'SECTION_*은 삭제 후 재생성이 가능하도록 직접 생성을 허용하지만, 같은 활동에 같은 종류의 SECTION이 이미 있으면 BLOCK4091로 거부됩니다(빈 SECTION만 생성되고, 최초 활동 생성 때의 질문 템플릿은 함께 생성되지 않습니다). ' +
            'CONTENT를 EXPERIENCE 바로 아래에 만들면 카테고리 구분 없는 자유 블록이 되며, 몇 개를 이미 갖고 있어도 계속 추가할 수 있습니다.',
    })
    @ApiBody({
        type: CreateBlockReqDTO,
        examples: {
            group: {
                summary: 'GROUP 생성 (루트)',
                description: 'parentId를 생략해야 합니다.',
                value: { kind: 'GROUP', content: '2026', expectedMapVersion: '1' },
            },
            experience: {
                summary: 'EXPERIENCE 생성',
                description:
                    'parentId는 미분류(GROUP_UNCATEGORIZED) 또는 본인 소유 GROUP의 id여야 합니다. ' +
                    '성공 시 SECTION 5종이 함께 생성됩니다.',
                value: {
                    kind: 'EXPERIENCE',
                    parentId: '12',
                    content: '새로운 활동 1',
                    expectedMapVersion: '1',
                },
            },
            section: {
                summary: 'SECTION 재생성 (삭제했던 기본 카테고리 복구)',
                description:
                    'parentId는 본인 소유 EXPERIENCE의 id여야 합니다. content는 무시되고 항상 null로 저장됩니다. ' +
                    '이미 같은 종류의 SECTION이 있으면 BLOCK4091이 발생합니다.',
                value: {
                    kind: 'SECTION_ACHIEVEMENT',
                    parentId: '15',
                    expectedMapVersion: '1',
                },
            },
            content: {
                summary: 'CONTENT 생성 (SECTION 하위)',
                description: 'parentId는 SECTION_* 블록 또는 4단계 CONTENT 블록의 id여야 합니다.',
                value: {
                    kind: 'CONTENT',
                    parentId: '34',
                    content: '전공 서적 거래 편의성 개선 프로젝트',
                    expectedMapVersion: '1',
                },
            },
            freeContent: {
                summary: 'CONTENT 생성 (EXPERIENCE 바로 하위, 자유 블록)',
                description: 'parentId는 본인 소유 EXPERIENCE의 id여야 합니다.',
                value: {
                    kind: 'CONTENT',
                    parentId: '15',
                    content: '카테고리에 얽매이지 않는 메모',
                    expectedMapVersion: '1',
                },
            },
        },
    })
    @ApiCommonResponse(BlockResDTO, {
        exampleResults: {
            experience: {
                summary: 'EXPERIENCE 생성 응답',
                result: {
                    id: '15',
                    parentId: '12',
                    level: 2,
                    kind: 'EXPERIENCE',
                    position: 0,
                    content: '새로운 활동 1',
                    placeholder: null,
                    createdAt: '2026-08-16T14:49:34.935Z',
                    updatedAt: '2026-08-16T14:49:34.935Z',
                    children: [],
                },
            },
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_PARENT_NOT_FOUND,
        ErrorCode.BLOCK_INVALID_PLACEMENT,
        ErrorCode.BLOCK_CONTENT_TOO_LONG,
        ErrorCode.BLOCK_SECTION_ALREADY_EXISTS,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT
    )
    async createBlock(
        @User('sub') userId: number,
        @Body() body: CreateBlockReqDTO
    ): Promise<BlockResDTO> {
        return this.experienceMapFacade.createBlock(userId, body);
    }

    @Patch('blocks/:blockId')
    @ApiOperation({
        summary: '블록 내용 수정',
        description:
            '블록의 content를 수정합니다. 수정 불가능한 종류(SECTION 등)의 블록은 수정할 수 없습니다.',
    })
    @ApiCommonResponse(BlockResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.BLOCK_NOT_EDITABLE,
        ErrorCode.BLOCK_CONTENT_TOO_LONG,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT
    )
    async updateBlockContent(
        @User('sub') userId: number,
        @Param('blockId') blockId: string,
        @Body() body: UpdateBlockContentReqDTO
    ): Promise<BlockResDTO> {
        return this.experienceMapFacade.updateBlockContent(userId, blockId, body);
    }

    @Delete('blocks/:blockId')
    @ApiOperation({
        summary: '블록 삭제',
        description:
            '블록을 삭제합니다. 1단계(그룹) 블록은 하위 활동을 미분류로 옮긴 뒤 단독으로 삭제되고, 그 외 블록은 하위 블록과 함께 삭제됩니다. 삭제 불가능한 블록(미분류)은 삭제할 수 없습니다.',
    })
    @ApiCommonMessageResponse('블록이 성공적으로 삭제되었습니다.')
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.BLOCK_NOT_DELETABLE,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT
    )
    async deleteBlock(
        @User('sub') userId: number,
        @Param('blockId') blockId: string,
        @Query() query: DeleteBlockQueryDTO
    ): Promise<string> {
        await this.experienceMapFacade.deleteBlock(userId, blockId, query.expectedMapVersion);
        return '블록이 성공적으로 삭제되었습니다.';
    }

    @Patch('blocks/:blockId/position')
    @ApiOperation({
        summary: '블록 순서/위치 변경 (드래그 앤 드롭)',
        description:
            '블록의 형제 내 순서를 바꾸거나(parentId 생략), 다른 부모로 이동합니다. ' +
            '1단계(그룹)는 위계를 바꿀 수 없고 순서만 변경할 수 있습니다. ' +
            '2단계(활동)는 다른 그룹(또는 미분류)으로 이동할 수 있습니다. ' +
            '3~5단계는 3~5단계 내에서만 위계를 바꿀 수 있으며, 하위 블록도 함께 이동하고 이동 후 최대 5단계를 넘을 수 없습니다.',
    })
    @ApiCommonResponse(BlockResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.BLOCK_PARENT_NOT_FOUND,
        ErrorCode.BLOCK_LEVEL_LOCKED,
        ErrorCode.BLOCK_INVALID_PLACEMENT,
        ErrorCode.BLOCK_SECTION_ALREADY_EXISTS,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT
    )
    async moveBlock(
        @User('sub') userId: number,
        @Param('blockId') blockId: string,
        @Body() body: MoveBlockReqDTO
    ): Promise<BlockResDTO> {
        return this.experienceMapFacade.moveBlock(userId, blockId, body);
    }
}
