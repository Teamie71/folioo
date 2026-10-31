import { ApiProperty } from '@nestjs/swagger';

export class InternalHealthResDTO {
    @ApiProperty({ example: 'folioo-server' })
    readonly service: string;

    @ApiProperty({ example: 'ok' })
    readonly status: string;

    constructor(service: string, status: string) {
        this.service = service;
        this.status = status;
    }

    static ok(): InternalHealthResDTO {
        return new InternalHealthResDTO('folioo-server', 'ok');
    }
}
