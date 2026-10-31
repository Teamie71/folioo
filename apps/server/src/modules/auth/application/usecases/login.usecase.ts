import { Injectable } from '@nestjs/common';
import { SocialUser } from 'src/modules/user/domain/social-user.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { SocialUserRepository } from 'src/modules/user/infrastructure/repositories/social-user.repository';
import { UserRepository } from 'src/modules/user/infrastructure/repositories/user.repository';
import { TokenService } from '../../infrastructure/services/token.service';
import { AuthTokenStoreService } from '../../infrastructure/services/auth-token-store.service';
import { Transactional } from 'typeorm-transactional';
import type { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

export interface LoginResult {
    refreshToken: string;
    isNewUser: boolean;
}

@Injectable()
export class LoginUsecase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly socialUserRepository: SocialUserRepository,
        private readonly tokenService: TokenService,
        private readonly authTokenStoreService: AuthTokenStoreService
    ) {}

    @Transactional()
    async execute(command: SocialUserAfterOAuth): Promise<LoginResult> {
        const existingSocialUser = await this.socialUserRepository.findByLoginTypeAndLoginId(
            command.socialType,
            command.id
        );

        let user: User;
        if (existingSocialUser) {
            user = existingSocialUser.user;
            if (user.isDeactivated()) {
                throw new BusinessException(ErrorCode.DEACTIVATED_USER);
            }

            let shouldSaveSocialUser = false;
            if (existingSocialUser.email !== command.email) {
                existingSocialUser.email = command.email;
                shouldSaveSocialUser = true;
            }

            if (
                command.refreshToken &&
                existingSocialUser.oauthRefreshToken !== command.refreshToken
            ) {
                existingSocialUser.oauthRefreshToken = command.refreshToken;
                shouldSaveSocialUser = true;
            }

            if (shouldSaveSocialUser) {
                await this.socialUserRepository.save(existingSocialUser);
            }
        } else {
            const newUser = User.createPendingUser(command.nickname);
            user = await this.userRepository.save(newUser);

            const socialUser = SocialUser.create(
                user.id,
                command.socialType,
                command.id,
                command.email,
                command.refreshToken
            );
            await this.socialUserRepository.save(socialUser);
        }

        const isNewUser = user.status === UserStatus.PENDING;
        const refreshToken = await this.tokenService.generateRefreshToken(user);
        await this.authTokenStoreService.whitelistRefreshToken(refreshToken, user.id);
        return { refreshToken, isNewUser };
    }
}
