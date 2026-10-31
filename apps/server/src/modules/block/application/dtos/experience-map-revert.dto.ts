import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RevertReqDTO {
    @IsUUID()
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    request_id: string;
}

export class RevertResDTO {
    @ApiProperty({ example: 44 })
    map_version: number;

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    reverted_request_id: string;

    static of(mapVersion: number, requestId: string): RevertResDTO {
        const dto = new RevertResDTO();
        dto.map_version = mapVersion;
        dto.reverted_request_id = requestId;
        return dto;
    }
}
