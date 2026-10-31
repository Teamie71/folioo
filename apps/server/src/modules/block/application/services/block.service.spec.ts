import { Test } from '@nestjs/testing';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockService } from './block.service';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from '../../infrastructure/repositories/experience-meta.repository';
import { Block } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';

function makeBlock(overrides: Partial<Block>): Block {
    return {
        id: '1',
        userId: 1,
        parent: null,
        parentId: null,
        level: 1,
        kind: BlockKind.GROUP,
        position: 0,
        content: null,
        placeholder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as Block;
}

describe('BlockService kakao activities', () => {
    const repository = { findRecentExperiences: jest.fn(), findByIdAndUserId: jest.fn() };
    let service: BlockService;
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                BlockService,
                { provide: BlockRepository, useValue: repository },
                { provide: BlockKindRepository, useValue: {} },
                { provide: ExperienceMetaRepository, useValue: {} },
            ],
        }).compile();
        service = module.get(BlockService);
    });

    it('활동은 10개를 요청하고 빈 이름은 기본 이름으로 표시한다', async () => {
        repository.findRecentExperiences.mockResolvedValue([
            { id: '1', name: null },
            { id: '2', name: '' },
            { id: '3', name: '   ' },
            { id: '4', name: '프로젝트' },
        ]);
        await expect(service.findRecentExperiences(1)).resolves.toEqual([
            { id: '1', name: '이름 없는 활동' },
            { id: '2', name: '이름 없는 활동' },
            { id: '3', name: '이름 없는 활동' },
            { id: '4', name: '프로젝트' },
        ]);
        expect(repository.findRecentExperiences).toHaveBeenCalledWith(1, 10);
    });

    it('본인 소유 활동만 반환하며 다른 유형·없는 활동은 null이다', async () => {
        const activity = makeBlock({ id: '12', kind: BlockKind.EXPERIENCE });
        repository.findByIdAndUserId.mockResolvedValue(activity);
        await expect(service.findExperience('12', 1)).resolves.toBe(activity);
        expect(repository.findByIdAndUserId).toHaveBeenCalledWith('12', 1);
        repository.findByIdAndUserId.mockResolvedValue(makeBlock({ kind: BlockKind.GROUP }));
        await expect(service.findExperience('12', 1)).resolves.toBeNull();
        repository.findByIdAndUserId.mockResolvedValue(null);
        await expect(service.findExperience('12', 1)).resolves.toBeNull();
    });
});

describe('BlockService.moveBlock', () => {
    let service: BlockService;
    let blockRepository: jest.Mocked<BlockRepository>;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                BlockService,
                {
                    provide: BlockRepository,
                    useValue: {
                        findByIdAndUserId: jest.fn(),
                        findAllByUserId: jest.fn(),
                        saveAll: jest.fn((blocks: Block[]) => Promise.resolve(blocks)),
                    },
                },
                { provide: BlockKindRepository, useValue: {} },
                { provide: ExperienceMetaRepository, useValue: {} },
            ],
        }).compile();

        service = moduleRef.get(BlockService);
        blockRepository = moduleRef.get(BlockRepository);
    });

    it('1단계(그룹) 블록의 부모 변경은 거부한다', async () => {
        const group = makeBlock({ id: '1', level: 1, kind: BlockKind.GROUP, parentId: null });
        const otherGroup = makeBlock({ id: '2', level: 1, kind: BlockKind.GROUP, parentId: null });
        blockRepository.findByIdAndUserId.mockResolvedValue(group);
        blockRepository.findAllByUserId.mockResolvedValue([group, otherGroup]);

        await expect(service.moveBlock('1', 1, '2', 0)).rejects.toEqual(
            new BusinessException(ErrorCode.BLOCK_LEVEL_LOCKED)
        );
    });

    it('2단계(활동) 블록은 다른 그룹으로 이동할 수 있다', async () => {
        const sourceGroup = makeBlock({ id: '10', level: 1, kind: BlockKind.GROUP });
        const targetGroup = makeBlock({ id: '20', level: 1, kind: BlockKind.GROUP });
        const experience = makeBlock({
            id: '30',
            level: 2,
            kind: BlockKind.EXPERIENCE,
            parentId: '10',
        });
        blockRepository.findByIdAndUserId.mockResolvedValue(experience);
        blockRepository.findAllByUserId.mockResolvedValue([sourceGroup, targetGroup, experience]);

        const moved = await service.moveBlock('30', 1, '20', 0);

        expect(moved.parentId).toBe('20');
        expect(moved.level).toBe(2);
    });
});

describe('BlockService.findExperienceOrThrow', () => {
    let service: BlockService;
    let blockRepository: jest.Mocked<BlockRepository>;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                BlockService,
                { provide: BlockRepository, useValue: { findByIdAndUserId: jest.fn() } },
                { provide: BlockKindRepository, useValue: {} },
                { provide: ExperienceMetaRepository, useValue: {} },
            ],
        }).compile();

        service = moduleRef.get(BlockService);
        blockRepository = moduleRef.get(BlockRepository);
    });

    it('본인 소유 활동(EXPERIENCE) 블록을 반환한다', async () => {
        const experience = makeBlock({ id: '30', level: 2, kind: BlockKind.EXPERIENCE });
        blockRepository.findByIdAndUserId.mockResolvedValue(experience);

        await expect(service.findExperienceOrThrow('30', 1)).resolves.toBe(experience);
    });

    it('활동이 아닌 블록은 BLOCK_NOT_FOUND', async () => {
        blockRepository.findByIdAndUserId.mockResolvedValue(
            makeBlock({ id: '10', kind: BlockKind.GROUP })
        );

        await expect(service.findExperienceOrThrow('10', 1)).rejects.toEqual(
            new BusinessException(ErrorCode.BLOCK_NOT_FOUND)
        );
    });

    it('다른 사용자의 블록(조회 결과 없음)은 BLOCK_NOT_FOUND', async () => {
        blockRepository.findByIdAndUserId.mockResolvedValue(null);

        await expect(service.findExperienceOrThrow('30', 2)).rejects.toEqual(
            new BusinessException(ErrorCode.BLOCK_NOT_FOUND)
        );
    });
});
