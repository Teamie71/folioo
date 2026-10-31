import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockService } from '../services/block.service';
import { ExperienceMapService } from '../services/experience-map.service';
import { ExperienceMetaService } from '../services/experience-meta.service';
import { AiCommitLogService } from '../services/ai-commit-log.service';
import { BlockCommitService } from '../services/block-commit.service';
import { AiCommitRequestRepository } from '../../infrastructure/repositories/ai-commit-request.repository';
import { AiCommitRequest } from '../../domain/ai-commit-request.entity';
import {
    BlockResDTO,
    CreateBlockReqDTO,
    ExperienceMapResDTO,
    MoveBlockReqDTO,
    UpdateBlockContentReqDTO,
} from '../dtos/block.dto';
import { CommitReqDTO, CommitResDTO, CommitStatusResDTO } from '../dtos/experience-map-commit.dto';
import { RevertResDTO } from '../dtos/experience-map-revert.dto';
import { BlockKind } from '../../domain/enums/block-kind.enum';

const INITIAL_GROUP_CONTENT = '새로운 그룹 1';
const INITIAL_EXPERIENCE_CONTENT = '새로운 활동 1';

@Injectable()
export class ExperienceMapFacade {
    constructor(
        private readonly blockService: BlockService,
        private readonly experienceMapService: ExperienceMapService,
        private readonly experienceMetaService: ExperienceMetaService,
        private readonly aiCommitLogService: AiCommitLogService,
        private readonly blockCommitService: BlockCommitService,
        private readonly aiCommitRequestRepository: AiCommitRequestRepository
    ) {}

    @Transactional()
    async getMap(userId: number): Promise<ExperienceMapResDTO> {
        await this.ensureInitialData(userId);
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        const blocks = await this.blockService.getTreeByUserId(userId);
        const experienceBlockIds = blocks
            .filter((block) => block.kind === BlockKind.EXPERIENCE)
            .map((block) => block.id);
        const experienceMetas =
            await this.experienceMetaService.findAllByBlockIds(experienceBlockIds);
        const revertibleRequestId = await this.aiCommitLogService.findRevertibleRequestId(
            userId,
            experienceMap.mapVersion
        );
        return ExperienceMapResDTO.from(
            experienceMap,
            blocks,
            experienceMetas,
            revertibleRequestId
        );
    }

    @Transactional()
    async createBlock(userId: number, body: CreateBlockReqDTO): Promise<BlockResDTO> {
        await this.blockService.getOrCreateRootBlock(userId);
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        this.experienceMapService.assertVersion(experienceMap, body.expectedMapVersion);
        const block = await this.blockService.createBlock(
            userId,
            body.kind,
            body.parentId ?? null,
            body.content ?? null
        );
        await this.experienceMapService.bumpVersion(experienceMap);
        await this.aiCommitLogService.discardByUserId(userId);
        return BlockResDTO.fromEntity(block);
    }

    @Transactional()
    async updateBlockContent(
        userId: number,
        blockId: string,
        body: UpdateBlockContentReqDTO
    ): Promise<BlockResDTO> {
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        this.experienceMapService.assertVersion(experienceMap, body.expectedMapVersion);
        const block = await this.blockService.updateContent(blockId, userId, body.content ?? null);
        await this.experienceMapService.bumpVersion(experienceMap);
        await this.aiCommitLogService.discardByUserId(userId);
        return BlockResDTO.fromEntity(block);
    }

    @Transactional()
    async deleteBlock(userId: number, blockId: string, expectedMapVersion: string): Promise<void> {
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        this.experienceMapService.assertVersion(experienceMap, expectedMapVersion);
        await this.blockService.deleteBlock(blockId, userId);
        await this.experienceMapService.bumpVersion(experienceMap);
        await this.aiCommitLogService.discardByUserId(userId);
    }

    @Transactional()
    async moveBlock(userId: number, blockId: string, body: MoveBlockReqDTO): Promise<BlockResDTO> {
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        this.experienceMapService.assertVersion(experienceMap, body.expectedMapVersion);
        const block = await this.blockService.moveBlock(
            blockId,
            userId,
            body.parentId,
            body.position
        );
        await this.experienceMapService.bumpVersion(experienceMap);
        await this.aiCommitLogService.discardByUserId(userId);
        return BlockResDTO.fromEntity(block);
    }

    @Transactional()
    async commit(dto: CommitReqDTO): Promise<CommitResDTO> {
        const userId = Number(dto.user_id);
        const itemsHash = this.hashItems(dto.items);

        const existingRequest = await this.aiCommitRequestRepository.findByUserIdAndRequestId(
            userId,
            dto.request_id
        );
        if (existingRequest) {
            if (existingRequest.itemsHash !== itemsHash) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_REQUEST_ID_REUSED);
            }
            return existingRequest.result as unknown as CommitResDTO;
        }

        const experienceMap = await this.experienceMapService.findForUpdateOrThrow(userId);
        if (experienceMap.mapVersion !== String(dto.base_map_version)) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT, {
                currentMapVersion: experienceMap.mapVersion,
            });
        }

        const allBlocks = await this.blockService.getTreeByUserId(userId);
        const { applied, createdBlockIds, updatedBlocksPreviousContent, deletedBlocks } =
            await this.blockCommitService.execute(userId, dto.items, allBlocks);

        const previousVersion = experienceMap.mapVersion;
        const updatedMap = await this.experienceMapService.bumpVersion(experienceMap);

        const result = new CommitResDTO();
        result.request_id = dto.request_id;
        result.previous_version = Number(previousVersion);
        result.map_version = Number(updatedMap.mapVersion);
        result.applied = applied;

        await this.aiCommitLogService.recordCommit(userId, {
            requestId: dto.request_id,
            previousVersion,
            committedVersion: updatedMap.mapVersion,
            createdBlockIds,
            updatedBlocks: updatedBlocksPreviousContent,
            deletedBlocks,
        });

        const ledgerEntry = new AiCommitRequest();
        ledgerEntry.userId = userId;
        ledgerEntry.requestId = dto.request_id;
        ledgerEntry.itemsHash = itemsHash;
        ledgerEntry.result = result as unknown as Record<string, unknown>;
        await this.aiCommitRequestRepository.save(ledgerEntry);

        return result;
    }

    @Transactional()
    async revert(userId: number, requestId: string): Promise<RevertResDTO> {
        const experienceMap = await this.experienceMapService.findForUpdateOrThrow(userId);
        const log = await this.aiCommitLogService.findRevertibleOrThrow(userId, requestId);

        if (experienceMap.mapVersion !== log.committedVersion) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT, {
                currentMapVersion: experienceMap.mapVersion,
            });
        }

        // 순서: 생성분 삭제 → 삭제분 복원 → 내용 복원 (삭제 전에 수정된 블록도 원래 내용으로 돌아가도록)
        await this.blockService.deleteByIds(log.createdBlockIds);
        if (log.deletedBlocks) {
            await this.blockService.restoreDeleted(userId, log.deletedBlocks);
        }
        if (log.updatedBlocks) {
            await this.blockService.restoreContent(
                userId,
                log.updatedBlocks as Record<string, string | null>
            );
        }

        const updatedMap = await this.experienceMapService.bumpVersion(experienceMap);
        await this.aiCommitLogService.discardByUserId(userId);

        return RevertResDTO.of(Number(updatedMap.mapVersion), requestId);
    }

    async getCommitStatus(requestId: string): Promise<CommitStatusResDTO> {
        const entry = await this.aiCommitRequestRepository.findByRequestId(requestId);
        const status = new CommitStatusResDTO();
        status.committed = entry !== null;
        status.result = entry ? (entry.result as unknown as CommitResDTO) : null;
        return status;
    }

    // 신규 사용자: 미분류 루트 + 그룹 1 + 활동 1(하위 SECTION 5·기본 CONTENT 슬롯 18개 자동 생성)
    // = 총 26블록. 경험 맵 행이 없고 루트 외 블록도 없을 때만 만든다
    // (기존 경험 정리를 이관받아 블록은 있지만 맵 행이 없는 사용자에게 중복 생성하지 않도록).
    private async ensureInitialData(userId: number): Promise<void> {
        const root = await this.blockService.getOrCreateRootBlock(userId);
        if (await this.experienceMapService.tryFind(userId)) {
            return;
        }
        const blocks = await this.blockService.getTreeByUserId(userId);
        if (blocks.some((block) => block.id !== root.id)) {
            return;
        }

        const group = await this.blockService.createBlock(
            userId,
            BlockKind.GROUP,
            null,
            INITIAL_GROUP_CONTENT
        );
        await this.blockService.createBlock(
            userId,
            BlockKind.EXPERIENCE,
            group.id,
            INITIAL_EXPERIENCE_CONTENT
        );
    }

    // request_id 재사용 판정 근거. items 배열을 그대로 직렬화해 해시한다
    // (검증을 통과한 DTO라 필드 순서가 항상 동일하다).
    private hashItems(items: CommitReqDTO['items']): string {
        return createHash('sha256').update(JSON.stringify(items)).digest('hex');
    }
}
