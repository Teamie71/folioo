import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { ValueBalanceSessionRepository } from '../../infrastructure/repositories/value-balance-session.repository';
import { ValueBalanceSession } from '../../domain/value-balance-session.entity';
import { ValueBalanceStatus } from '../../domain/enums/value-balance-status.enum';
import { ALL_VALUE_KINDS, ValueKind } from '../../domain/enums/value-kind.enum';
import { NextComparison, computeWeights, replay } from '../../domain/value-balance-algorithm';

export interface ValueBalanceProgress {
    token: string;
    isComplete: boolean;
    next: NextComparison | null;
    ranking: ValueKind[] | null;
    weights: Partial<Record<ValueKind, number>> | null;
}

@Injectable()
export class ValueBalanceSessionService {
    constructor(private readonly valueBalanceSessionRepository: ValueBalanceSessionRepository) {}

    async startValueBalance(userId: number | null): Promise<ValueBalanceProgress> {
        const insertionOrder = shuffle(ALL_VALUE_KINDS);
        const session = ValueBalanceSession.create(userId, insertionOrder);
        const state = replay(insertionOrder, []);
        const saved = await this.valueBalanceSessionRepository.save(session);

        return {
            token: saved.id,
            isComplete: state.isComplete,
            next: state.next,
            ranking: state.isComplete ? state.sorted : null,
            weights: null,
        };
    }

    async answerValueBalance(
        token: string,
        sequence: number,
        chosen: ValueKind
    ): Promise<ValueBalanceProgress> {
        const session = await this.findByIdOrThrow(token);
        if (session.status !== ValueBalanceStatus.VALUES_IN_PROGRESS) {
            throw new BusinessException(ErrorCode.ASSESSMENT_VALUE_BALANCE_ALREADY_COMPLETED);
        }
        if (sequence < 0 || sequence > session.valuesAnswerLog.length) {
            throw new BusinessException(ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_SEQUENCE);
        }

        // sequence가 기존 로그 길이보다 작으면 "이전 응답 수정" — 그 지점 이후 로그는 폐기하고
        // 다시 재생한다. sequence가 로그 길이와 같으면 새 답변이다.
        const truncatedLog = session.valuesAnswerLog.slice(0, sequence);
        const stateBeforeAnswer = replay(session.valuesInsertionOrder, truncatedLog);
        if (stateBeforeAnswer.isComplete || !stateBeforeAnswer.next) {
            throw new BusinessException(ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_SEQUENCE);
        }

        const { left, right } = stateBeforeAnswer.next;
        if (chosen !== left && chosen !== right) {
            throw new BusinessException(ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_ANSWER);
        }

        const newLog = [...truncatedLog, { sequence, left, right, chosen }];
        const newState = replay(session.valuesInsertionOrder, newLog);

        if (newState.isComplete) {
            const weights = computeWeights(newState.sorted);
            session.completeValues(newState.sorted, weights);
            await this.valueBalanceSessionRepository.save(session);
            return {
                token: session.id,
                isComplete: true,
                next: null,
                ranking: newState.sorted,
                weights,
            };
        }

        session.valuesAnswerLog = newLog;
        await this.valueBalanceSessionRepository.save(session);
        return {
            token: session.id,
            isComplete: false,
            next: newState.next,
            ranking: null,
            weights: null,
        };
    }

    private async findByIdOrThrow(token: string): Promise<ValueBalanceSession> {
        const session = await this.valueBalanceSessionRepository.findById(token);
        if (!session) {
            throw new BusinessException(ErrorCode.ASSESSMENT_VALUE_BALANCE_NOT_FOUND);
        }
        return session;
    }
}

function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
