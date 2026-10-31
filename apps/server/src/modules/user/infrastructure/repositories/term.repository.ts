import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Term } from '../../domain/term.entity';
import { TermType } from '../../domain/enums/term-type.enum';

@Injectable()
export class TermRepository {
    constructor(
        @InjectRepository(Term)
        private readonly termRepository: Repository<Term>
    ) {}

    async findActiveByTermType(termType: TermType): Promise<Term | null> {
        return this.termRepository.findOne({
            where: { termType, isActive: true },
            order: { id: 'DESC' },
        });
    }

    async findAllActive(): Promise<Term[]> {
        return this.termRepository.find({
            where: { isActive: true },
            order: { id: 'DESC' },
        });
    }
}
