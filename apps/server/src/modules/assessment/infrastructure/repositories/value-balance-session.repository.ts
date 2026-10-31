import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValueBalanceSession } from '../../domain/value-balance-session.entity';

@Injectable()
export class ValueBalanceSessionRepository {
    constructor(
        @InjectRepository(ValueBalanceSession)
        private readonly repo: Repository<ValueBalanceSession>
    ) {}

    save(session: ValueBalanceSession): Promise<ValueBalanceSession> {
        return this.repo.save(session);
    }

    findById(id: string): Promise<ValueBalanceSession | null> {
        return this.repo.findOne({ where: { id } });
    }
}
