import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginType } from '../../domain/enums/login-type.enum';
import { SocialUser } from '../../domain/social-user.entity';

export interface UserProfileSocialAccountProjection {
    loginType: LoginType;
    email: string;
}

@Injectable()
export class SocialUserRepository {
    constructor(
        @InjectRepository(SocialUser)
        private readonly socialUserRepository: Repository<SocialUser>
    ) {}

    async save(socialUser: SocialUser): Promise<SocialUser> {
        return await this.socialUserRepository.save(socialUser);
    }

    async findByLoginTypeAndLoginId(
        loginType: LoginType,
        loginId: string
    ): Promise<SocialUser | null> {
        return await this.socialUserRepository.findOne({
            where: {
                loginType,
                loginId,
            },
            relations: {
                user: true,
            },
        });
    }

    async findProfileSocialAccountsByUserId(
        userId: number
    ): Promise<UserProfileSocialAccountProjection[]> {
        const socialUsers = await this.socialUserRepository.find({
            where: {
                userId,
            },
            order: {
                id: 'ASC',
            },
        });

        return socialUsers.map((socialUser) => ({
            loginType: socialUser.loginType,
            email: socialUser.email,
        }));
    }

    async findByUserId(userId: number): Promise<SocialUser | null> {
        return await this.socialUserRepository.findOne({
            where: {
                userId,
            },
            order: {
                id: 'ASC',
            },
        });
    }

    findByUserIdAndLoginType(userId: number, loginType: LoginType): Promise<SocialUser | null> {
        return this.socialUserRepository.findOne({ where: { userId, loginType } });
    }

    async deleteByUserId(userId: number): Promise<void> {
        await this.socialUserRepository.delete({ userId });
    }
}
