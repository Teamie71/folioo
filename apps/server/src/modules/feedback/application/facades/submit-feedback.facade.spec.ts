jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SubmitFeedbackFacade } from './submit-feedback.facade';

describe('feedback without rewards', () => {
    const dto = { eventId: 3, formId: 4, answers: { q1: 'feedback' } };
    const eventService = { findByIdAndAssertActiveForTodayOrThrow: jest.fn() };
    const participationService = { getOrCreateForUpdate: jest.fn() };
    const formRepository = { findById: jest.fn() };
    const responseRepository = { save: jest.fn() };
    const facade = new SubmitFeedbackFacade(
        eventService as never,
        participationService as never,
        formRepository as never,
        responseRepository as never
    );

    beforeEach(() => {
        jest.resetAllMocks();
        eventService.findByIdAndAssertActiveForTodayOrThrow.mockResolvedValue({ id: 3 });
        formRepository.findById.mockResolvedValue({ id: 4, eventId: 3 });
        participationService.getOrCreateForUpdate.mockResolvedValue({ id: 9 });
        responseRepository.save.mockResolvedValue({ id: 10 });
    });

    it.each(['NOT_GRANTED', 'GRANTED'])(
        'stores feedback without changing %s reward history',
        async (rewardStatus) => {
            const rewardGrantedAt = rewardStatus === 'GRANTED' ? new Date('2026-01-01') : null;
            const participation = { id: 9, rewardStatus, rewardGrantedAt };
            participationService.getOrCreateForUpdate.mockResolvedValue(participation);

            await expect(facade.submit(7, dto)).resolves.toEqual({ rewardGranted: false });

            expect(participationService.getOrCreateForUpdate).toHaveBeenCalledWith(7, 3);
            expect(responseRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ participationId: 9, formId: 4, answers: dto.answers })
            );
            expect(participation).toEqual({ id: 9, rewardStatus, rewardGrantedAt });
        }
    );

    it.each([null, { id: 4, eventId: 99 }])(
        'rejects a missing or mismatched form',
        async (form) => {
            formRepository.findById.mockResolvedValue(form);

            await expect(facade.submit(7, dto)).rejects.toEqual(
                new BusinessException(ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH)
            );
            expect(participationService.getOrCreateForUpdate).not.toHaveBeenCalled();
            expect(responseRepository.save).not.toHaveBeenCalled();
        }
    );

    it('keeps active-period validation before creating or storing anything', async () => {
        const error = new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
        eventService.findByIdAndAssertActiveForTodayOrThrow.mockRejectedValue(error);

        await expect(facade.submit(7, dto)).rejects.toBe(error);
        expect(formRepository.findById).not.toHaveBeenCalled();
        expect(participationService.getOrCreateForUpdate).not.toHaveBeenCalled();
        expect(responseRepository.save).not.toHaveBeenCalled();
    });

    it('propagates storage failure instead of reporting success', async () => {
        const error = new Error('storage failed');
        responseRepository.save.mockRejectedValue(error);
        await expect(facade.submit(7, dto)).rejects.toBe(error);
    });
});
