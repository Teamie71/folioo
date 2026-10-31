import { BlockKind } from './block-kind.enum';

// block_kind_enum(DB)과 별개로 유지하는 API/AI 계약용 식별자.
// DB enum이 바뀌어도 slot_id 등 외부 계약이 깨지지 않도록 분리한다.
export enum SectionKind {
    DETAIL = 'DETAIL',
    ACHIEVEMENT = 'ACHIEVEMENT',
    TASK = 'TASK',
    PROBLEM_SOLVING = 'PROBLEM_SOLVING',
    LEARNING = 'LEARNING',
}

export const SECTION_KIND_LABEL: Readonly<Record<SectionKind, string>> = {
    [SectionKind.DETAIL]: '상세정보',
    [SectionKind.ACHIEVEMENT]: '주요성과',
    [SectionKind.TASK]: '담당업무',
    [SectionKind.PROBLEM_SOLVING]: '문제해결',
    [SectionKind.LEARNING]: '배운 점',
};

export const SECTION_KIND_TO_BLOCK_KIND: Readonly<Record<SectionKind, BlockKind>> = {
    [SectionKind.DETAIL]: BlockKind.SECTION_DETAIL,
    [SectionKind.ACHIEVEMENT]: BlockKind.SECTION_ACHIEVEMENT,
    [SectionKind.TASK]: BlockKind.SECTION_TASK,
    [SectionKind.PROBLEM_SOLVING]: BlockKind.SECTION_PROBLEM_SOLVING,
    [SectionKind.LEARNING]: BlockKind.SECTION_LEARNING,
};

export const BLOCK_KIND_TO_SECTION_KIND: ReadonlyMap<BlockKind, SectionKind> = new Map(
    Object.entries(SECTION_KIND_TO_BLOCK_KIND).map(([sectionKind, blockKind]) => [
        blockKind,
        sectionKind as SectionKind,
    ])
);
