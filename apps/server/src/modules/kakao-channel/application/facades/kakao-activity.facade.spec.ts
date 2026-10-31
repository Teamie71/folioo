import { AiExperienceSessionService } from 'src/modules/block/application/services/ai-experience-session.service';
import { AiAgentUsageService } from 'src/modules/block/application/services/ai-agent-usage.service';
import { KakaoTurnService } from 'src/modules/kakao-channel/application/services/kakao-turn.service';
jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { UserService } from 'src/modules/user/application/services/user.service';
import { BlockService } from 'src/modules/block/application/services/block.service';
import { User } from 'src/modules/user/domain/user.entity';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { Block } from 'src/modules/block/domain/block.entity';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import { KakaoSkillFacade } from './kakao-skill.facade';
import { KAKAO_MESSAGES } from '../kakao-messages';
import { activityQuickReplies, textCardResponse, textResponse } from '../kakao-skill-response';

describe('Kakao activity selection', () => {
    const link = KakaoChannelLink.create(1, 'k1');
    const user = Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true });
    const users = { findByIdOrThrow: jest.fn().mockResolvedValue(user) };
    const links = {
        findByKakaoAppUserId: jest.fn().mockResolvedValue(link),
        selectBlock: jest.fn().mockResolvedValue(true),
        setQueryTimeout: jest.fn().mockResolvedValue(undefined),
        isTurnInProgress: (value: KakaoChannelLink) =>
            KakaoChannelLinkService.prototype.isTurnInProgress(value),
    };
    const blocks = { findRecentExperiences: jest.fn(), findExperience: jest.fn() };
    const config = new ConfigService({
        KAKAO_SELECT_ACTIVITY_BLOCK_ID: 'select-block',
        KAKAO_WEB_ACTIVITY_LIST_URL: 'https://example.test/activities',
        KAKAO_WEB_EXPERIENCE_URL: 'https://example.test/experience',
    });
    const facade = new KakaoSkillFacade(
        users as unknown as UserService,
        links as unknown as KakaoChannelLinkService,
        config,
        blocks as unknown as BlockService,
        { getOrCreate: jest.fn() } as unknown as AiExperienceSessionService,
        {} as AiAgentUsageService,
        {} as KakaoTurnService
    );
    const payload = {
        userRequest: { user: { properties: { appUserId: 'k1' } }, utterance: '경험 내용' },
    };
    let errorLog: jest.SpyInstance;
    let submit: jest.SpyInstance;

    beforeAll(() => {
        errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });
    afterAll(() => {
        errorLog.mockRestore();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        submit = jest
            .spyOn(facade, 'submit')
            .mockResolvedValue(textResponse(KAKAO_MESSAGES.ACCEPTED));
        link.currentBlockId = null;
        link.activitySelectedAt = null;
        link.turnLockedUntil = null;
        blocks.findRecentExperiences
            .mockReset()
            .mockResolvedValue([{ id: '12', name: '프로젝트' }]);
        blocks.findExperience
            .mockReset()
            .mockResolvedValue(Object.assign(new Block(), { id: '12', content: '프로젝트' }));
        links.selectBlock.mockReset().mockResolvedValue(true);
    });

    it('AC-2-3: 활동이 없으면 생성 버튼과 확정 안내를 반환한다', async () => {
        blocks.findRecentExperiences.mockResolvedValue([]);
        const expected = textCardResponse(KAKAO_MESSAGES.NO_ACTIVITY, [
            {
                action: 'webLink',
                label: '웹에서 활동 만들기',
                webLinkUrl: 'https://example.test/activities',
            },
        ]);
        await expect(facade.activities(payload)).resolves.toEqual(expected);
        await expect(facade.chat(payload)).resolves.toEqual(expected);
    });

    it('AC-2-4: 미선택 발화는 선택 안내·버튼·퀵리플라이만 응답한다', async () => {
        const result = await facade.chat(payload);
        if (!('template' in result)) throw new Error('Expected synchronous response');
        expect(result.template.outputs).toEqual([
            {
                textCard: {
                    description: KAKAO_MESSAGES.NEED_ACTIVITY,
                    buttons: [
                        { action: 'message', label: '활동 선택하기', messageText: '/활동변경' },
                        {
                            action: 'webLink',
                            label: '웹에서 활동 보기',
                            webLinkUrl: 'https://example.test/experience',
                        },
                    ],
                },
            },
        ]);
        expect(result.template.quickReplies).toEqual([
            {
                label: '프로젝트',
                action: 'block',
                blockId: 'select-block',
                extra: { block_id: '12' },
            },
        ]);
        expect(links.selectBlock).not.toHaveBeenCalled();
    });

    it('활동 변경은 기존 선택을 유지한 채 목록을 표시한다', async () => {
        link.currentBlockId = '12';
        link.activitySelectedAt = new Date();
        const result = await facade.chat({
            ...payload,
            userRequest: { ...payload.userRequest, utterance: '/활동변경' },
        });
        if (!('template' in result)) throw new Error('Expected synchronous response');
        expect(result.template.outputs).toEqual([
            {
                textCard: {
                    description: KAKAO_MESSAGES.SELECT_ACTIVITY,
                    buttons: [
                        {
                            action: 'webLink',
                            label: '웹에서 활동 보기',
                            webLinkUrl: 'https://example.test/experience',
                        },
                    ],
                },
            },
        ]);
        expect(link.currentBlockId).toBe('12');
        expect(links.selectBlock).not.toHaveBeenCalled();
    });

    it('AC-2-5: 소유 활동을 검증한 뒤 선택 저장과 확정 문구를 반환한다', async () => {
        await expect(
            facade.selectActivity({ ...payload, action: { clientExtra: { block_id: '12' } } })
        ).resolves.toEqual(textResponse(KAKAO_MESSAGES.ACTIVITY_SELECTED('프로젝트')));
        expect(blocks.findExperience).toHaveBeenCalledWith('12', 1);
        expect(links.selectBlock).toHaveBeenCalledWith(1, '12');
    });

    it.each([
        undefined,
        '',
        12,
        {},
        '-1',
        '0',
        '1e2',
        '12;DROP TABLE block',
        '9223372036854775808',
    ])('AC-2-6: 잘못된 block_id %p는 조회·저장 없이 재선택을 안내한다', async (blockId) => {
        const result = await facade.selectActivity({
            ...payload,
            action: { clientExtra: { block_id: blockId } },
        });
        expect(result.template.outputs[0]).toEqual({
            textCard: {
                description: KAKAO_MESSAGES.ACTIVITY_NOT_FOUND,
                buttons: [{ action: 'message', label: '활동 다시 선택', messageText: '/활동변경' }],
            },
        });
        expect(result.template.quickReplies).toHaveLength(1);
        expect(blocks.findExperience).not.toHaveBeenCalled();
        expect(links.selectBlock).not.toHaveBeenCalled();
    });

    it('AC-2-6: 타인 소유·다른 유형 활동은 저장하지 않는다', async () => {
        blocks.findExperience.mockResolvedValue(null);
        await facade.selectActivity({ ...payload, action: { clientExtra: { block_id: '12' } } });
        expect(blocks.findExperience).toHaveBeenCalledWith('12', 1);
        expect(links.selectBlock).not.toHaveBeenCalled();
    });

    it.each(['chat', 'activities', 'selectActivity'] as const)(
        'AC-2-7: 잠금 중 %s는 조회·변경을 막는다',
        async (method) => {
            link.turnLockedUntil = new Date(Date.now() + 60_000);
            await expect(facade[method](payload)).resolves.toEqual(
                textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS)
            );
            expect(blocks.findRecentExperiences).not.toHaveBeenCalled();
            expect(blocks.findExperience).not.toHaveBeenCalled();
            expect(links.selectBlock).not.toHaveBeenCalled();
        }
    );

    it('만료된 잠금은 목록 조회를 막지 않는다', async () => {
        link.turnLockedUntil = new Date(Date.now() - 1);
        await facade.activities(payload);
        expect(blocks.findRecentExperiences).toHaveBeenCalledWith(1);
    });

    it('잠금 만료 시각과 현재 시각이 같으면 진행 중이 아니다', () => {
        const now = new Date();
        link.turnLockedUntil = now;
        expect(KakaoChannelLinkService.prototype.isTurnInProgress(link, now)).toBe(false);
    });

    it('AC-2-8: 삭제 기록이 있으면 최초 미선택과 구별해 재선택을 안내한다', async () => {
        link.activitySelectedAt = new Date();
        const result = await facade.chat(payload);
        if (!('template' in result)) throw new Error('Expected synchronous response');
        expect(result.template.outputs[0]).toEqual({
            textCard: {
                description: KAKAO_MESSAGES.ACTIVITY_NOT_FOUND,
                buttons: [{ action: 'message', label: '활동 다시 선택', messageText: '/활동변경' }],
            },
        });
        expect(blocks.findRecentExperiences).not.toHaveBeenCalled();
    });

    it('선택 활동의 소유권·유형이 바뀌었으면 재선택을 안내한다', async () => {
        link.currentBlockId = '12';
        blocks.findExperience.mockResolvedValue(null);
        const result = await facade.chat(payload);
        if (!('template' in result)) throw new Error('Expected synchronous response');
        expect(result.template.outputs[0]).toMatchObject({
            textCard: { description: KAKAO_MESSAGES.ACTIVITY_NOT_FOUND },
        });
    });

    it('AC-2-9: 긴 이름은 14자 이내로 표시하고 원본 BIGINT ID는 유지한다', () => {
        const result = activityQuickReplies(
            [{ id: '9007199254740993', name: '😀'.repeat(20) }],
            'select-block'
        );
        expect(Array.from(result[0].label)).toHaveLength(14);
        expect(result[0].label).toBe(`${'😀'.repeat(13)}…`);
        expect(result[0].extra.block_id).toBe('9007199254740993');
        expect(
            activityQuickReplies(
                Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), name: '활동' })),
                'select-block'
            )
        ).toHaveLength(10);
    });

    it('AC-2-10: 유효한 활동이 선택돼 있으면 대화 턴 처리로 넘긴다', async () => {
        link.currentBlockId = '12';
        await expect(facade.chat(payload)).resolves.toEqual(textResponse(KAKAO_MESSAGES.ACCEPTED));
        expect(blocks.findExperience).toHaveBeenCalledWith('12', 1);
        expect(submit).toHaveBeenCalledWith(1, '12', payload, expect.any(Number));
    });

    it.each(['activities', 'selectActivity'] as const)(
        '처리 중 오류도 %s는 카카오 200 응답으로 변환한다',
        async (method) => {
            blocks.findRecentExperiences.mockRejectedValue(new Error('database unavailable'));
            await expect(facade[method](payload)).resolves.toEqual(
                textResponse(KAKAO_MESSAGES.ERROR)
            );
            expect(errorLog).toHaveBeenCalled();
        }
    );

    it('선택 저장 중 오류는 완료 응답으로 오인하지 않는다', async () => {
        links.selectBlock.mockRejectedValue(new Error('database unavailable'));
        await expect(
            facade.selectActivity({ ...payload, action: { clientExtra: { block_id: '12' } } })
        ).resolves.toEqual(textResponse(KAKAO_MESSAGES.ERROR));
    });
});
