import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WithdrawnUser } from '../../domain/withdrawn-user.entity';

@Injectable()
export class WithdrawnUserRepository {
    constructor(
        @InjectRepository(WithdrawnUser)
        private readonly withdrawnUserRepository: Repository<WithdrawnUser>
    ) {}

    async upsert(withdrawnUser: WithdrawnUser): Promise<void> {
        await this.withdrawnUserRepository.upsert(withdrawnUser, ['encryptedIdentifier']);
    }
}
