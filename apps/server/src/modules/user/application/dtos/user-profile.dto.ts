import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { LoginType } from '../../domain/enums/login-type.enum';
import { User } from '../../domain/user.entity';

export class UserSocialAccountResDTO {
    @ApiProperty({
        description: '소셜 계정 타입',
        enum: LoginType,
        example: LoginType.KAKAO,
    })
    socialType: LoginType;

    @ApiProperty({
        description: '소셜 계정 이메일',
        example: 'folioo@example.com',
        nullable: true,
    })
    socialEmail: string | null;

    static from(socialType: LoginType, socialEmail: string): UserSocialAccountResDTO {
        const dto = new UserSocialAccountResDTO();
        dto.socialType = socialType;
        dto.socialEmail = socialEmail.trim().length > 0 ? socialEmail : null;
        return dto;
    }
}

export class UserProfileResDTO {
    @ApiProperty({ description: '사용자 닉네임', example: '폴리오유저' })
    name: string;

    @ApiProperty({
        description: '연결된 소셜 계정 목록',
        type: () => [UserSocialAccountResDTO],
        example: [
            {
                socialType: LoginType.KAKAO,
                socialEmail: 'folioo-kakao@example.com',
            },
            {
                socialType: LoginType.GOOGLE,
                socialEmail: 'folioo-google@example.com',
            },
        ],
    })
    socialAccounts: UserSocialAccountResDTO[];

    @ApiProperty({ description: '사용자 전화번호', example: '01012345678', nullable: true })
    phoneNum: string | null;

    @ApiProperty({ description: '마케팅 정보 수신 동의 여부', example: true })
    isMarketingAgreed: boolean;

    static from(
        user: User,
        socialAccounts: UserSocialAccountResDTO[],
        isMarketingAgreed: boolean
    ): UserProfileResDTO {
        const dto = new UserProfileResDTO();
        dto.name = user.name;
        dto.socialAccounts = socialAccounts;
        dto.phoneNum = user.phoneNum;
        dto.isMarketingAgreed = isMarketingAgreed;
        return dto;
    }
}

export class UpdateUserNameReqDTO {
    @ApiProperty({ description: '변경하고자 하는 닉네임을 입력합니다.', example: '새로운 닉네임' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value
    )
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(25)
    name: string;
}
