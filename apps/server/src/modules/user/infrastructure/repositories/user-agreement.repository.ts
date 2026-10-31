import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { TermType } from '../../domain/enums/term-type.enum';

@Injectable()
export class UserAgreementRepository {
    constructor(
        @InjectRepository(UserAgreement)
        private readonly userAgreementRepository: Repository<UserAgreement>
    ) {}

    async save(entity: UserAgreement): Promise<UserAgreement> {
        return this.userAgreementRepository.save(entity);
    }

    async findByUserIdAndTermId(userId: number, termId: number): Promise<UserAgreement | null> {
        return this.userAgreementRepository.findOne({
            where: { userId, termId },
        });
    }

    async findByUserIdAndTermType(
        userId: number,
        termType: TermType
    ): Promise<UserAgreement | null> {
        return this.userAgreementRepository
            .createQueryBuilder('ua')
            .innerJoin('ua.term', 'term')
            .where('ua.userId = :userId', { userId })
            .andWhere('term.termType = :termType', { termType })
            .andWhere('term.isActive = true')
            .orderBy('ua.id', 'DESC')
            .getOne();
    }
}
