import { AiExperienceSessionService } from 'src/modules/block/application/services/ai-experience-session.service';
import { AiAgentUsageService } from 'src/modules/block/application/services/ai-agent-usage.service';
import { KakaoTurnService } from 'src/modules/kakao-channel/application/services/kakao-turn.service';
jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
import { ConfigService } from '@nestjs/config';
import { BlockService } from 'src/modules/block/application/services/block.service';
import { UserService } from 'src/modules/user/application/services/user.service';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { User } from 'src/modules/user/domain/user.entity';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import { KakaoSkillFacade } from './kakao-skill.facade';

function makeUser(id: number, status: UserStatus, isActive = true): User {
    const user = new User();
    user.id = id;
    user.status = status;
    user.isActive = isActive;
    return user;
}

describe('KakaoSkillFacade.resolveUser', () => {
    const users = new Map<number, User>();
    const kakaoLoginIds = new Map<string, User>();
    const links = new Map<string, KakaoChannelLink>();

    const linkService = {
        findByKakaoAppUserId: jest.fn((id: string) => Promise.resolve(links.get(id) ?? null)),
        link: jest.fn((userId: number, id: string) => {
            links.set(id, KakaoChannelLink.create(userId, id));
            return Promise.resolve(links.get(id));
        }),
        unlink: jest.fn((userId: number) => {
            for (const [id, link] of links) if (link.userId === userId) links.delete(id);
            return Promise.resolve();
        }),
    };
    const facade = new KakaoSkillFacade(
        {
            findByIdOrThrow: (id: number) => Promise.resolve(users.get(id)),
            findByKakaoLoginId: (id: string) => Promise.resolve(kakaoLoginIds.get(id) ?? null),
        } as unknown as UserService,
        linkService as unknown as KakaoChannelLinkService,
        new ConfigService(),
        {} as BlockService,
        {} as AiExperienceSessionService,
        {} as AiAgentUsageService,
        {} as KakaoTurnService
    );

    beforeEach(() => {
        users.clear();
        kakaoLoginIds.clear();
        links.clear();
        jest.clearAllMocks();
    });

    it('appUserId가 없으면 미연결', async () => {
        await expect(facade.resolveUser(undefined)).resolves.toEqual({ kind: 'UNLINKED' });
    });

    it('연결 행이 있으면 그 사용자로 식별한다', async () => {
        users.set(1, makeUser(1, UserStatus.ACTIVE));
        links.set('k1', KakaoChannelLink.create(1, 'k1'));

        await expect(facade.resolveUser('k1')).resolves.toEqual(
            expect.objectContaining({ kind: 'LINKED', userId: 1 })
        );
        expect(linkService.link).not.toHaveBeenCalled();
    });

    it('카카오 가입자는 첫 메시지 때 연결 행을 만든다', async () => {
        kakaoLoginIds.set('k1', makeUser(1, UserStatus.ACTIVE));

        await expect(facade.resolveUser('k1')).resolves.toEqual(
            expect.objectContaining({ kind: 'LINKED', userId: 1 })
        );
        expect(links.get('k1')?.userId).toBe(1);
    });

    it('연결도 카카오 가입도 없으면 미연결', async () => {
        await expect(facade.resolveUser('k1')).resolves.toEqual({ kind: 'UNLINKED' });
    });

    it('약관 미동의 사용자는 PENDING', async () => {
        kakaoLoginIds.set('k1', makeUser(1, UserStatus.PENDING));

        await expect(facade.resolveUser('k1')).resolves.toEqual({ kind: 'PENDING' });
    });

    it('탈퇴한 사용자의 연결은 지우고, 같은 카카오 계정으로 재가입한 사용자로 다시 연결한다', async () => {
        users.set(1, makeUser(1, UserStatus.ACTIVE, false));
        links.set('k1', KakaoChannelLink.create(1, 'k1'));
        kakaoLoginIds.set('k1', makeUser(2, UserStatus.ACTIVE));

        await expect(facade.resolveUser('k1')).resolves.toEqual(
            expect.objectContaining({ kind: 'LINKED', userId: 2 })
        );
        expect(links.get('k1')?.userId).toBe(2);
    });

    it('기존 연결의 약관 미동의 사용자도 PENDING', async () => {
        users.set(1, makeUser(1, UserStatus.PENDING));
        links.set('k1', KakaoChannelLink.create(1, 'k1'));
        await expect(facade.resolveUser('k1')).resolves.toEqual({ kind: 'PENDING' });
        expect(linkService.link).not.toHaveBeenCalled();
    });

    it('탈퇴 후 재가입하지 않으면 기존 연결 삭제 후 UNLINKED', async () => {
        users.set(1, makeUser(1, UserStatus.ACTIVE, false));
        links.set('k1', KakaoChannelLink.create(1, 'k1'));
        await expect(facade.resolveUser('k1')).resolves.toEqual({ kind: 'UNLINKED' });
        expect(links.has('k1')).toBe(false);
    });

    it('카카오 가입자가 비활성이면 연결을 만들지 않는다', async () => {
        kakaoLoginIds.set('k1', makeUser(1, UserStatus.ACTIVE, false));
        await expect(facade.resolveUser('k1')).resolves.toEqual({ kind: 'UNLINKED' });
        expect(linkService.link).not.toHaveBeenCalled();
    });
});
