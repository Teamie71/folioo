import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonMessageResponse } from './common/decorators/swagger.decorator';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Common')
@Controller()
export class AppController {
    @ApiOperation({
        summary: '서버 상태 확인',
        description:
            '로드밸런서가 서버 상태를 확인할 때 사용하는 헬스체크용 API입니다. 로그인 없이도 테스트 가능합니다.',
    })
    @ApiCommonMessageResponse("I'm Healthy")
    @Public()
    @Get('health')
    getHello(): string {
        return "I'm Healthy";
    }
}
