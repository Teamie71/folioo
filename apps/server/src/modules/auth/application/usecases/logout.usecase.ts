import { Injectable } from '@nestjs/common';
import { AuthTokenStoreService } from '../../infrastructure/services/auth-token-store.service';

interface LogoutCommand {
    accessToken: string;
    refreshToken: string | null;
}

@Injectable()
export class LogoutUsecase {
    constructor(private readonly authTokenStoreService: AuthTokenStoreService) {}

    async execute(command: LogoutCommand): Promise<void> {
        await this.authTokenStoreService.blacklistAccessToken(command.accessToken);

        if (command.refreshToken) {
            await this.authTokenStoreService.removeRefreshToken(command.refreshToken);
        }
    }
}
