import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { LogoutUsecase } from 'src/modules/auth/application/usecases/logout.usecase';
import { UserService } from '../services/user.service';
import { AgreeTermsResDTO } from '../dtos/agree-terms.dto';

@Injectable()
export class UserAuthFacade {
    constructor(
        private readonly userService: UserService,
        private readonly logoutUsecase: LogoutUsecase
    ) {}

    async withdraw(
        userId: number,
        accessToken: string,
        refreshToken: string | null
    ): Promise<void> {
        await this.userService.withdraw(userId);
        await this.logoutUsecase.execute({
            accessToken,
            refreshToken,
        });
    }

    @Transactional()
    async onBoarding(
        userId: number,
        isServiceAgreed: boolean,
        isPrivacyAgreed: boolean,
        isMarketingAgreed: boolean
    ): Promise<AgreeTermsResDTO> {
        const agreed = await this.userService.agreeTerms(
            userId,
            isServiceAgreed,
            isPrivacyAgreed,
            isMarketingAgreed
        );

        return agreed;
    }
}
