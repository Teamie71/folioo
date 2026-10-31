import { ApiProperty } from '@nestjs/swagger';
import { SectionKind } from '../../domain/enums/section-kind.enum';
import { CategorySlot, SubTemplate } from '../../domain/templates/template-catalog';

export class TemplateSlotResDTO {
    @ApiProperty({ example: 'DETAIL.MOTIVATION' })
    slotId: string;

    @ApiProperty({
        example: '어떤 계기로 이 활동을 시작했으며, 최종적으로 달성하고자 한 목표는 무엇인가요?',
    })
    placeholder: string;

    @ApiProperty({ example: '교내 커뮤니티의 비효율적인 게시판형 거래 방식을 개선하고...' })
    example: string;

    static fromCategorySlot(slot: CategorySlot): TemplateSlotResDTO {
        const dto = new TemplateSlotResDTO();
        dto.slotId = slot.slotId;
        dto.placeholder = slot.placeholder;
        dto.example = slot.example;
        return dto;
    }
}

export class TemplateSubTemplateResDTO {
    @ApiProperty({ example: 'BASIC' })
    templateId: string;

    @ApiProperty({ example: '기본' })
    label: string;

    @ApiProperty({ type: () => [TemplateSlotResDTO] })
    slots: TemplateSlotResDTO[];

    static from(subTemplate: SubTemplate): TemplateSubTemplateResDTO {
        const dto = new TemplateSubTemplateResDTO();
        dto.templateId = subTemplate.templateId;
        dto.label = subTemplate.label;
        dto.slots = subTemplate.slots.map((slot) => {
            const slotDto = new TemplateSlotResDTO();
            slotDto.slotId = slot.slotId;
            slotDto.placeholder = slot.placeholder;
            slotDto.example = slot.example;
            return slotDto;
        });
        return dto;
    }
}

export class TemplateSectionResDTO {
    @ApiProperty({ enum: SectionKind })
    sectionKind: SectionKind;

    @ApiProperty({ required: false, nullable: true, example: 'TASK.SUMMARY' })
    anchorSlotId: string | null;

    @ApiProperty({ type: () => [TemplateSlotResDTO], description: 'level 4 카테고리 슬롯' })
    slots: TemplateSlotResDTO[];

    @ApiProperty({
        type: () => [TemplateSubTemplateResDTO],
        description: 'level 5 하위 템플릿 (없으면 빈 배열)',
    })
    subTemplates: TemplateSubTemplateResDTO[];
}

export class TemplateCatalogResDTO {
    @ApiProperty({ type: () => [TemplateSectionResDTO] })
    sections: TemplateSectionResDTO[];
}
