import { Injectable } from '@nestjs/common';
import { UserProfileResDTO, UserSocialAccountResDTO } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from '../../domain/user.entity';
import { UserAgreementRepository } from '../../infrastructure/repositories/user-agreement.repository';
import { TermRepository } from '../../infrastructure/repositories/term.repository';
import { SocialUserRepository } from '../../infrastructure/repositories/social-user.repository';
import { TermType } from '../../domain/enums/term-type.enum';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { AgreeMarketingResDTO } from '../dtos/marketing-agree.dto';
import { AgreeTermsResDTO } from '../dtos/agree-terms.dto';
import { SocialAccountUnlinkClient } from '../../infrastructure/clients/social-account-unlink.client';
import { Transactional } from 'typeorm-transactional';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { LoginType } from '../../domain/enums/login-type.enum';
import { Term } from '../../domain/term.entity';
import { WithdrawnUserRepository } from '../../infrastructure/repositories/withdrawn-user.repository';
import { hashWithdrawalIdentifier } from '../../domain/transformers/withdrawal-identifier.transformer';
import { WithdrawnUser } from '../../domain/withdrawn-user.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userAgreementRepository: UserAgreementRepository,
        private readonly termRepository: TermRepository,
        private readonly socialUserRepository: SocialUserRepository,
        private readonly socialAccountUnlinkClient: SocialAccountUnlinkClient,
        private readonly withdrawnUserRepository: WithdrawnUserRepository
    ) {}

    async getProfile(userId: number): Promise<UserProfileResDTO> {
        const user = await this.findByIdOrThrow(userId);
        const socialAccounts = await this.getUserSocialAccounts(userId);
        const isMarketingAgreed = await this.getMarketingConsent(userId);
        return UserProfileResDTO.from(user, socialAccounts, isMarketingAgreed);
    }

    async updateProfile(userId: number, name: string): Promise<UserProfileResDTO> {
        const user = await this.findByIdOrThrow(userId);
        user.name = name;
        await this.userRepository.save(user);
        const socialAccounts = await this.getUserSocialAccounts(userId);
        const isMarketingAgreed = await this.getMarketingConsent(userId);
        return UserProfileResDTO.from(user, socialAccounts, isMarketingAgreed);
    }

    async updateMarketingConsent(
        userId: number,
        isMarketingAgreed: boolean
    ): Promise<AgreeMarketingResDTO> {
        await this.findByIdOrThrow(userId);

        const marketingTerm = await this.termRepository.findActiveByTermType(TermType.MARKETING);
        if (!marketingTerm) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const now = new Date();
        const agreeAt = isMarketingAgreed ? now : null;

        let agreement = await this.userAgreementRepository.findByUserIdAndTermId(
            userId,
            marketingTerm.id
        );

        if (!agreement) {
            agreement = UserAgreement.create(userId, marketingTerm.id, isMarketingAgreed, agreeAt);
        } else {
            agreement.isAgree = isMarketingAgreed;
            agreement.agreeAt = agreeAt;
        }

        const savedAgreement = await this.userAgreementRepository.save(agreement);

        return AgreeMarketingResDTO.from(savedAgreement.isAgree, savedAgreement.agreeAt);
    }

    async agreeTerms(
        userId: number,
        isServiceAgreed: boolean,
        isPrivacyAgreed: boolean,
        isMarketingAgreed: boolean
    ): Promise<AgreeTermsResDTO> {
        const user = await this.findByIdOrThrow(userId);

        if (user.status !== UserStatus.PENDING) {
            throw new BusinessException(ErrorCode.ALREADY_AGREED_USER);
        }

        if (!isServiceAgreed || !isPrivacyAgreed) {
            throw new BusinessException(ErrorCode.REQUIRED_TERMS_NOT_AGREED);
        }

        const activeTerms = await this.termRepository.findAllActive();
        const termMap = this.buildTermMap(activeTerms);

        const serviceTerm = termMap.get(TermType.SERVICE);
        const privacyTerm = termMap.get(TermType.PRIVACY);
        const marketingTerm = termMap.get(TermType.MARKETING);

        if (!serviceTerm || !privacyTerm || !marketingTerm) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const now = new Date();
        const marketingAgreeAt = isMarketingAgreed ? now : null;

        await Promise.all([
            this.saveAgreement(userId, serviceTerm.id, true, now),
            this.saveAgreement(userId, privacyTerm.id, true, now),
            this.saveAgreement(userId, marketingTerm.id, isMarketingAgreed, marketingAgreeAt),
        ]);

        user.status = UserStatus.ACTIVE;
        await this.userRepository.save(user);

        return AgreeTermsResDTO.from(true, true, isMarketingAgreed, marketingAgreeAt);
    }

    async withdraw(userId: number): Promise<void> {
        const user = await this.findByIdOrThrow(userId);
        if (user.isDeactivated()) {
            throw new BusinessException(ErrorCode.DEACTIVATED_USER);
        }

        const socialUser = await this.socialUserRepository.findByUserId(userId);
        if (socialUser) {
            await this.socialAccountUnlinkClient.unlinkSocialAccount(socialUser);
        }

        await this.finalizeWithdrawal(user);
    }

    @Transactional()
    private async finalizeWithdrawal(user: User): Promise<void> {
        const now = new Date();
        const isDeactivated = await this.userRepository.deactivateById(user.id, now);
        if (!isDeactivated) {
            const latestUser = await this.userRepository.findById(user.id);
            if (!latestUser) {
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }

            if (latestUser.isDeactivated()) {
                throw new BusinessException(ErrorCode.DEACTIVATED_USER);
            }

            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const socialUser = await this.socialUserRepository.findByUserId(user.id);
        if (socialUser) {
            const plainIdentifier = `${socialUser.loginType}:${socialUser.loginId}`;
            const encryptedIdentifier = hashWithdrawalIdentifier(plainIdentifier);
            const withdrawnAccount = WithdrawnUser.from(encryptedIdentifier, now);
            await this.withdrawnUserRepository.upsert(withdrawnAccount);
        }

        await this.socialUserRepository.deleteByUserId(user.id);
    }

    async findAllActiveUserIds(): Promise<number[]> {
        return this.userRepository.findAllActiveUserIds();
    }

    async findByPhoneNumOrThrow(phoneNum: string): Promise<User> {
        const user = await this.userRepository.findByPhoneNum(phoneNum);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    async checkUserActive(userId: number, allowPending?: boolean): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        if (user.isDeactivated()) {
            throw new BusinessException(ErrorCode.DEACTIVATED_USER);
        }

        if (!allowPending && user.status === UserStatus.PENDING) {
            throw new BusinessException(ErrorCode.PENDING_USER);
        }
    }

    async findByKakaoLoginId(kakaoLoginId: string): Promise<User | null> {
        const socialUser = await this.socialUserRepository.findByLoginTypeAndLoginId(
            LoginType.KAKAO,
            kakaoLoginId
        );
        return socialUser?.user ?? null;
    }

    async findKakaoLoginIdByUserId(userId: number): Promise<string | null> {
        const socialUser = await this.socialUserRepository.findByUserIdAndLoginType(
            userId,
            LoginType.KAKAO
        );
        return socialUser?.loginId ?? null;
    }

    async findByIdOrThrow(userId: number): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    private async getMarketingConsent(userId: number): Promise<boolean> {
        const marketingAgreement = await this.userAgreementRepository.findByUserIdAndTermType(
            userId,
            TermType.MARKETING
        );

        return marketingAgreement?.isAgree ?? false;
    }

    private async getUserSocialAccounts(userId: number): Promise<UserSocialAccountResDTO[]> {
        const socialAccounts =
            await this.socialUserRepository.findProfileSocialAccountsByUserId(userId);

        return socialAccounts.map((socialAccount) =>
            UserSocialAccountResDTO.from(socialAccount.loginType, socialAccount.email)
        );
    }

    private buildTermMap(terms: Term[]): Map<TermType, Term> {
        const map = new Map<TermType, Term>();
        for (const term of terms) {
            if (!map.has(term.termType)) {
                map.set(term.termType, term);
            }
        }
        return map;
    }

    private async saveAgreement(
        userId: number,
        termId: number,
        isAgree: boolean,
        agreeAt: Date | null
    ): Promise<UserAgreement> {
        let agreement = await this.userAgreementRepository.findByUserIdAndTermId(userId, termId);

        if (!agreement) {
            agreement = UserAgreement.create(userId, termId, isAgree, agreeAt);
        } else {
            agreement.isAgree = isAgree;
            agreement.agreeAt = agreeAt;
        }

        return this.userAgreementRepository.save(agreement);
    }
}
