import { BusinessException } from 'src/common/exceptions/business.exception';
import { ValueBalanceSessionService } from './value-balance-session.service';
import { ValueBalanceSessionRepository } from '../../infrastructure/repositories/value-balance-session.repository';
import {
    ValueBalanceSession,
    ValueComparisonLogEntry,
} from '../../domain/value-balance-session.entity';
import { ValueBalanceStatus } from '../../domain/enums/value-balance-status.enum';
import { ValueKind } from '../../domain/enums/value-kind.enum';

const { REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE } = ValueKind;

class ValueBalanceSessionRepositoryStub {
    readonly save = jest.fn<Promise<ValueBalanceSession>, [ValueBalanceSession]>();
    readonly findById = jest.fn<Promise<ValueBalanceSession | null>, [string]>();
}

const createSession = (overrides: Partial<ValueBalanceSession> = {}): ValueBalanceSession => {
    const session = ValueBalanceSession.create(
        overrides.userId ?? null,
        overrides.valuesInsertionOrder ?? [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE]
    );
    session.id = overrides.id ?? 'session-1';
    session.status = overrides.status ?? session.status;
    session.valuesAnswerLog = overrides.valuesAnswerLog ?? session.valuesAnswerLog;
    return session;
};

describe('ValueBalanceSessionService', () => {
    let service: ValueBalanceSessionService;
    let repository: ValueBalanceSessionRepositoryStub;

    beforeEach(() => {
        repository = new ValueBalanceSessionRepositoryStub();
        service = new ValueBalanceSessionService(
            repository as unknown as ValueBalanceSessionRepository
        );
    });

    describe('startValueBalance', () => {
        it('creates a session with a shuffled insertion order and returns the first question', async () => {
            repository.save.mockImplementation((session) => Promise.resolve(session));

            const progress = await service.startValueBalance(null);

            expect(repository.save).toHaveBeenCalledTimes(1);
            const savedSession = repository.save.mock.calls[0][0];
            expect(savedSession.valuesInsertionOrder).toHaveLength(5);
            expect(new Set(savedSession.valuesInsertionOrder)).toEqual(
                new Set([REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE])
            );
            expect(progress.isComplete).toBe(false);
            expect(progress.next).not.toBeNull();
            expect(progress.next?.sequence).toBe(0);
        });

        it('tags the session with userId when provided', async () => {
            repository.save.mockImplementation((session) => Promise.resolve(session));

            await service.startValueBalance(7);

            const savedSession = repository.save.mock.calls[0][0];
            expect(savedSession.userId).toBe(7);
        });
    });

    describe('answerValueBalance', () => {
        it('throws JOB_SEARCH_NOT_FOUND when the token does not exist', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.answerValueBalance('missing', 0, REWARD)).rejects.toThrow(
                BusinessException
            );
        });

        it('rejects answering when the values-balance game is already completed', async () => {
            const session = createSession({ status: ValueBalanceStatus.VALUES_DONE });
            repository.findById.mockResolvedValue(session);

            await expect(service.answerValueBalance(session.id, 0, REWARD)).rejects.toThrow(
                BusinessException
            );
        });

        it('rejects a sequence further ahead than the current log', async () => {
            const session = createSession();
            repository.findById.mockResolvedValue(session);

            await expect(service.answerValueBalance(session.id, 5, REWARD)).rejects.toThrow(
                BusinessException
            );
        });

        it('rejects a chosen value that is not part of the expected pair', async () => {
            const session = createSession({
                valuesInsertionOrder: [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE],
            });
            repository.findById.mockResolvedValue(session);

            // sequence 0 is STABILITY vs REWARD; GROWTH is not part of that pair
            await expect(service.answerValueBalance(session.id, 0, GROWTH)).rejects.toThrow(
                BusinessException
            );
        });

        it('records a valid answer and returns the next question', async () => {
            const session = createSession({
                valuesInsertionOrder: [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE],
            });
            repository.findById.mockResolvedValue(session);
            repository.save.mockImplementation((s) => Promise.resolve(s));

            const progress = await service.answerValueBalance(session.id, 0, STABILITY);

            expect(progress.isComplete).toBe(false);
            expect(progress.next).not.toBeNull();
            expect(session.valuesAnswerLog).toHaveLength(1);
            expect(session.valuesAnswerLog[0]).toEqual({
                sequence: 0,
                left: STABILITY,
                right: REWARD,
                chosen: STABILITY,
            });
        });

        it('discards answers after the edited sequence and continues from there', async () => {
            const insertionOrder = [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE];
            const existingLog: ValueComparisonLogEntry[] = [
                { sequence: 0, left: STABILITY, right: REWARD, chosen: STABILITY },
                { sequence: 1, left: NAME_VALUE, right: STABILITY, chosen: NAME_VALUE },
            ];
            const session = createSession({
                valuesInsertionOrder: insertionOrder,
                valuesAnswerLog: existingLog,
            });
            repository.findById.mockResolvedValue(session);
            repository.save.mockImplementation((s) => Promise.resolve(s));

            // 0번 질문(STABILITY vs REWARD) 답을 REWARD로 바꿈 -> 1번 이후 로그는 폐기되어야 함
            const progress = await service.answerValueBalance(session.id, 0, REWARD);

            expect(session.valuesAnswerLog).toHaveLength(1);
            expect(session.valuesAnswerLog[0].chosen).toBe(REWARD);
            expect(progress.isComplete).toBe(false);
        });

        it('completes the game, computes weights, and locks the session once the ranking is final', async () => {
            const insertionOrder = [REWARD, STABILITY];
            const session = createSession({ valuesInsertionOrder: insertionOrder });
            repository.findById.mockResolvedValue(session);
            repository.save.mockImplementation((s) => Promise.resolve(s));

            const progress = await service.answerValueBalance(session.id, 0, STABILITY);

            expect(progress.isComplete).toBe(true);
            expect(progress.ranking).toEqual([STABILITY, REWARD]);
            expect(progress.weights).toEqual({ [STABILITY]: 2 / 3, [REWARD]: 1 / 3 });
            expect(session.status).toBe(ValueBalanceStatus.VALUES_DONE);
            expect(session.valuesCompletedAt).not.toBeNull();
        });
    });
});
