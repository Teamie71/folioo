import { ApiProperty } from '@nestjs/swagger';

export class InternalTemplateSlotResDTO {
    @ApiProperty({ example: 'PROBLEM_SOLVING.TROUBLESHOOTING.SUMMARY' })
    slotId: string;

    @ApiProperty({ example: 4 })
    level: number;

    @ApiProperty({ example: '문제해결 에피소드를 한 줄로 요약해 주세요.' })
    placeholder: string;

    @ApiProperty({ example: '신규 프로모션 페이지 가입 이탈 문제 해결' })
    example: string;
}

export class InternalTemplateSubTemplateResDTO {
    @ApiProperty({ example: 'TROUBLESHOOTING' })
    templateId: string;

    @ApiProperty({ example: '기술 트러블슈팅' })
    label: string;

    @ApiProperty({ type: () => [InternalTemplateSlotResDTO] })
    slots: InternalTemplateSlotResDTO[];
}

export class InternalTemplateSectionResDTO {
    @ApiProperty({ example: 'PROBLEM_SOLVING' })
    sectionId: string;

    @ApiProperty({ example: '문제해결' })
    label: string;

    @ApiProperty({ required: false, nullable: true, example: 'PROBLEM_SOLVING.SUMMARY' })
    anchorSlotId: string | null;

    @ApiProperty({ type: () => [InternalTemplateSlotResDTO], description: 'level 4 카테고리 슬롯' })
    slots: InternalTemplateSlotResDTO[];

    @ApiProperty({
        type: () => [InternalTemplateSubTemplateResDTO],
        description: 'level 5 하위 템플릿 (없으면 빈 배열)',
    })
    subTemplates: InternalTemplateSubTemplateResDTO[];
}

export class InternalTemplateCatalogResDTO {
    @ApiProperty({
        example: '2026-08-20',
        description: '문구가 바뀔 때마다 갱신되는 카탈로그 버전',
    })
    version: string;

    @ApiProperty({ type: () => [InternalTemplateSectionResDTO] })
    sections: InternalTemplateSectionResDTO[];
}
