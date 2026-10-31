import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { SavePdfExtractionResultReqDTO } from '../application/dtos/internal-correction-result.dto';
import { InternalCorrectionResultFacade } from '../application/facades/internal-correction-result.facade';

@ApiTags('Internal - Corrections')
@Controller('internal/corrections')
export class InternalPdfExtractionResultController {
    constructor(private readonly internalCorrectionResultFacade: InternalCorrectionResultFacade) {}

    @Post(':correctionId/pdf-extraction-result')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: 'PDF 추출 구조화 결과 콜백 저장 (Internal)',
        description:
            '성공 시 EXTERNAL portfolio 블록을 생성/연결하고, 실패 시 에러 메시지와 상태를 저장합니다.',
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_PDF_EXTRACTION_INVALID_STATUS,
        ErrorCode.CORRECTION_PDF_EXTRACTION_EMPTY_ACTIVITIES,
        ErrorCode.BAD_REQUEST
    )
    @HttpCode(HttpStatus.OK)
    async savePdfExtractionResult(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: SavePdfExtractionResultReqDTO
    ): Promise<string> {
        await this.internalCorrectionResultFacade.savePdfExtractionResult(correctionId, body);
        return 'PDF 추출 구조화 결과가 저장되었습니다.';
    }
}
