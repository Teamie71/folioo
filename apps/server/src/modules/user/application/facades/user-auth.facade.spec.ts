jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UserAuthFacade } from './user-auth.facade';

describe('onboarding without event rewards', () => {
    const userService = { agreeTerms: jest.fn() };
    const facade = new UserAuthFacade(userService as never, {} as never);

    beforeEach(() => jest.resetAllMocks());

    it('preserves agreement preferences and response without an Event dependency', async () => {
        const result = {
            isServiceAgreed: true,
            isPrivacyAgreed: true,
            isMarketingAgreed: false,
            marketingAgreedAt: null,
        };
        userService.agreeTerms.mockResolvedValue(result);

        await expect(facade.onBoarding(7, true, true, false)).resolves.toBe(result);
        expect(userService.agreeTerms).toHaveBeenCalledWith(7, true, true, false);
    });

    it('preserves required-terms validation failures', async () => {
        const error = new BusinessException(ErrorCode.REQUIRED_TERMS_NOT_AGREED);
        userService.agreeTerms.mockRejectedValue(error);
        await expect(facade.onBoarding(7, false, true, false)).rejects.toBe(error);
    });
});
