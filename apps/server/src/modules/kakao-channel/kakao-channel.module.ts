import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { KakaoTurnService } from './application/services/kakao-turn.service';
import { KakaoInternalController } from './presentation/kakao-internal.controller';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { BlockModule } from '../block/block.module';
import { KakaoChannelLink } from './domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from './infrastructure/repositories/kakao-channel-link.repository';
import { KakaoChannelLinkService } from './application/services/kakao-channel-link.service';
import { KakaoSkillFacade } from './application/facades/kakao-skill.facade';
import { KakaoSkillController } from './presentation/kakao-skill.controller';
import { KakaoOAuthClient } from './infrastructure/clients/kakao-oauth.client';
import { KakaoLinkTokenService } from './application/services/kakao-link-token.service';
import { KakaoLinkFacade } from './application/facades/kakao-link.facade';
import { KakaoLinkController } from './presentation/kakao-link.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([KakaoChannelLink]),
        UserModule,
        BlockModule,
        AiRelayModule,
        HttpModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('KAKAO_LINK_STATE_SECRET'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [KakaoSkillController, KakaoLinkController, KakaoInternalController],
    providers: [
        KakaoChannelLinkRepository,
        KakaoChannelLinkService,
        KakaoSkillFacade,
        KakaoTurnService,
        KakaoOAuthClient,
        KakaoLinkTokenService,
        KakaoLinkFacade,
    ],
})
export class KakaoChannelModule {}
