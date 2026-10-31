import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { TemplateCatalogService } from '../application/services/template-catalog.service';
import { TemplateCatalogResDTO } from '../application/dtos/template.dto';

@ApiTags('Template')
@Controller('templates')
export class TemplateController {
    constructor(private readonly templateCatalogService: TemplateCatalogService) {}

    @Get()
    @ApiOperation({
        summary: '블록 템플릿 카탈로그 조회',
        description:
            '섹션별 level 4 카테고리 슬롯과 level 5 하위 템플릿(담당업무/문제해결) 목록을 조회합니다. slot_id, placeholder, 작성 예시를 포함합니다.',
    })
    @ApiCommonResponse(TemplateCatalogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getTemplates(): TemplateCatalogResDTO {
        return this.templateCatalogService.getCatalog();
    }
}
