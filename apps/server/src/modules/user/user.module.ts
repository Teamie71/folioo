import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './presentation/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { SocialUser } from './domain/social-user.entity';
import { UserAgreement } from './domain/user-agreement.entity';
import { Term } from './domain/term.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { UserAgreementRepository } from './infrastructure/repositories/user-agreement.repository';
import { TermRepository } from './infrastructure/repositories/term.repository';
import { SocialUserRepository } from './infrastructure/repositories/social-user.repository';
import { UserService } from './application/services/user.service';
import { UserAuthFacade } from './application/facades/user-auth.facade';
import { SocialAccountUnlinkClient } from './infrastructure/clients/social-account-unlink.client';
import { AuthModule } from '../auth/auth.module';
import { WithdrawnUser } from './domain/withdrawn-user.entity';
import { WithdrawnUserRepository } from './infrastructure/repositories/withdrawn-user.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, SocialUser, UserAgreement, Term, WithdrawnUser]),
        forwardRef(() => AuthModule),
    ],
    controllers: [UserController],
    providers: [
        UserRepository,
        SocialUserRepository,
        UserAgreementRepository,
        TermRepository,
        WithdrawnUserRepository,
        SocialAccountUnlinkClient,
        UserService,
        UserAuthFacade,
    ],
    exports: [UserRepository, SocialUserRepository, UserService],
})
export class UserModule {}
