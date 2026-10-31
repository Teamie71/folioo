import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockKindEntity } from '../../domain/block-kind.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';

@Injectable()
export class BlockKindRepository {
    constructor(
        @InjectRepository(BlockKindEntity)
        private readonly blockKindRepository: Repository<BlockKindEntity>
    ) {}

    async findByKind(kind: BlockKind): Promise<BlockKindEntity | null> {
        return this.blockKindRepository.findOne({ where: { kind } });
    }
}
