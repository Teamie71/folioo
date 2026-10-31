import { Injectable } from '@nestjs/common';
import { SECTION_KIND_LABEL, SectionKind } from '../../domain/enums/section-kind.enum';
import {
    getAnchorSlot,
    getCategorySlotsForSection,
    getSubTemplatesForSection,
    TEMPLATE_CATALOG_VERSION,
} from '../../domain/templates/template-catalog';
import {
    TemplateCatalogResDTO,
    TemplateSectionResDTO,
    TemplateSlotResDTO,
    TemplateSubTemplateResDTO,
} from '../dtos/template.dto';
import {
    InternalTemplateCatalogResDTO,
    InternalTemplateSectionResDTO,
    InternalTemplateSlotResDTO,
    InternalTemplateSubTemplateResDTO,
} from '../dtos/internal-template.dto';

const CATEGORY_SLOT_LEVEL = 4;
const SUB_TEMPLATE_SLOT_LEVEL = 5;

@Injectable()
export class TemplateCatalogService {
    getCatalog(): TemplateCatalogResDTO {
        const catalog = new TemplateCatalogResDTO();
        catalog.sections = Object.values(SectionKind).map((sectionKind) =>
            this.buildSection(sectionKind)
        );
        return catalog;
    }

    // AI 서버 전용(X-API-Key). level/label/version 등 AI 계약 필드가 추가로 필요해 별도 DTO로 조립한다.
    getInternalCatalog(): InternalTemplateCatalogResDTO {
        const catalog = new InternalTemplateCatalogResDTO();
        catalog.version = TEMPLATE_CATALOG_VERSION;
        catalog.sections = Object.values(SectionKind).map((sectionKind) =>
            this.buildInternalSection(sectionKind)
        );
        return catalog;
    }

    private buildSection(sectionKind: SectionKind): TemplateSectionResDTO {
        const section = new TemplateSectionResDTO();
        section.sectionKind = sectionKind;
        section.anchorSlotId = getAnchorSlot(sectionKind)?.slotId ?? null;
        section.slots = getCategorySlotsForSection(sectionKind).map((slot) =>
            TemplateSlotResDTO.fromCategorySlot(slot)
        );
        section.subTemplates = getSubTemplatesForSection(sectionKind).map((subTemplate) =>
            TemplateSubTemplateResDTO.from(subTemplate)
        );
        return section;
    }

    private buildInternalSection(sectionKind: SectionKind): InternalTemplateSectionResDTO {
        const section = new InternalTemplateSectionResDTO();
        section.sectionId = sectionKind;
        section.label = SECTION_KIND_LABEL[sectionKind];
        section.anchorSlotId = getAnchorSlot(sectionKind)?.slotId ?? null;
        section.slots = getCategorySlotsForSection(sectionKind).map((slot) => {
            const dto = new InternalTemplateSlotResDTO();
            dto.slotId = slot.slotId;
            dto.level = CATEGORY_SLOT_LEVEL;
            dto.placeholder = slot.placeholder;
            dto.example = slot.example;
            return dto;
        });
        section.subTemplates = getSubTemplatesForSection(sectionKind).map((subTemplate) => {
            const dto = new InternalTemplateSubTemplateResDTO();
            dto.templateId = subTemplate.templateId;
            dto.label = subTemplate.label;
            dto.slots = subTemplate.slots.map((slot) => {
                const slotDto = new InternalTemplateSlotResDTO();
                slotDto.slotId = slot.slotId;
                slotDto.level = SUB_TEMPLATE_SLOT_LEVEL;
                slotDto.placeholder = slot.placeholder;
                slotDto.example = slot.example;
                return slotDto;
            });
            return dto;
        });
        return section;
    }
}
