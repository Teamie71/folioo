import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { AiAgentUsageService } from 'src/modules/block/application/services/ai-agent-usage.service';
import { AiExperienceSessionService } from 'src/modules/block/application/services/ai-experience-session.service';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { KakaoTurnService } from '../services/kakao-turn.service';
import type { CompleteKakaoTurnReqDTO } from '../dtos/kakao-turn.dto';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/application/services/user.service';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { User } from 'src/modules/user/domain/user.entity';
import { BlockService } from 'src/modules/block/application/services/block.service';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import type {
    KakaoSkillReqDTO,
    KakaoSkillResDTO,
    KakaoSkillResponse,
} from '../dtos/kakao-skill.dto';
import { KAKAO_MESSAGES } from '../kakao-messages';
import {
    activityQuickReplies,
    linkCardResponse,
    textCardResponse,
    textResponse,
} from '../kakao-skill-response';
import type { KakaoButton } from '../dtos/kakao-skill.dto';

export type ResolvedKakaoUser =
    | { kind: 'LINKED'; userId: number; link: KakaoChannelLink }
    | { kind: 'UNLINKED' }
    | { kind: 'PENDING' };

@Injectable()
export class KakaoSkillFacade {
    private readonly logger = new Logger(KakaoSkillFacade.name);

    private recovering = false;
    private recoveryCursor = 0;
    // ponytail: 확정 미접수 보상 재시도는 메모리에 보관한다. 재시작까지 보장하려면 턴 원장이 필요하다.
    private readonly rejected = new Map<string, number>();

    constructor(
        private readonly userService: UserService,
        private readonly kakaoChannelLinkService: KakaoChannelLinkService,
        private readonly configService: ConfigService,
        private readonly blockService: BlockService,
        private readonly sessions: AiExperienceSessionService,
        private readonly usage: AiAgentUsageService,
        private readonly turns: KakaoTurnService
    ) {}

    async chat(payload: KakaoSkillReqDTO): Promise<KakaoSkillResponse> {
        const startedAt = Date.now();
        const utterance = payload.userRequest?.utterance;
        if (typeof utterance === 'string' && utterance.trim() === '/활동변경') {
            return this.activities(payload);
        }
        try {
            const prepared = await this.prepareChat(payload, startedAt);
            if ('version' in prepared) return prepared;
            return await this.submit(prepared.userId, prepared.blockId, payload, startedAt);
        } catch {
            this.logger.error('Kakao chat skill failed');
            return textResponse(KAKAO_MESSAGES.ERROR);
        }
    }

    @Transactional()
    private async prepareChat(
        payload: KakaoSkillReqDTO,
        startedAt: number
    ): Promise<KakaoSkillResDTO | { userId: number; blockId: string }> {
        await this.setBudget(startedAt);
        const resolved = await this.resolveUser(
            payload.userRequest?.user?.properties?.appUserId,
            startedAt
        );
        if (resolved.kind !== 'LINKED') return this.guideCard(resolved.kind);
        if (this.kakaoChannelLinkService.isTurnInProgress(resolved.link)) {
            return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
        }
        if (resolved.link.hasDeletedActivity()) return this.unavailableActivityResponse();
        if (!resolved.link.currentBlockId) {
            return this.activityListResponse(resolved.userId, KAKAO_MESSAGES.NEED_ACTIVITY, true);
        }
        await this.setBudget(startedAt);
        const activity = await this.blockService.findExperience(
            resolved.link.currentBlockId,
            resolved.userId
        );
        if (!activity) return this.unavailableActivityResponse();
        return { userId: resolved.userId, blockId: activity.id };
    }

    async activities(payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        try {
            return await this.prepareActivities(payload, Date.now());
        } catch {
            this.logger.error('Kakao activities skill failed');
            return textResponse(KAKAO_MESSAGES.ERROR);
        }
    }

    @Transactional()
    private async prepareActivities(
        payload: KakaoSkillReqDTO,
        startedAt: number
    ): Promise<KakaoSkillResDTO> {
        await this.setBudget(startedAt);
        const resolved = await this.resolveUser(
            payload.userRequest?.user?.properties?.appUserId,
            startedAt
        );
        if (resolved.kind !== 'LINKED') return this.guideCard(resolved.kind);
        if (this.kakaoChannelLinkService.isTurnInProgress(resolved.link)) {
            return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
        }
        return this.activityListResponse(resolved.userId);
    }

    async selectActivity(payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        const startedAt = Date.now();
        try {
            const selected = await this.prepareSelection(payload, startedAt);
            if ('version' in selected) return selected;
            // 저장 트랜잭션을 마친 뒤에만 외부 AI 세션을 확보한다.
            await this.prewarm(selected.userId, selected.blockId, startedAt);
            return textResponse(KAKAO_MESSAGES.ACTIVITY_SELECTED(selected.name));
        } catch {
            this.logger.error('Kakao select-activity skill failed');
            return textResponse(KAKAO_MESSAGES.ERROR);
        }
    }

    @Transactional()
    private async prepareSelection(
        payload: KakaoSkillReqDTO,
        startedAt: number
    ): Promise<KakaoSkillResDTO | { userId: number; blockId: string; name: string }> {
        await this.setBudget(startedAt);
        const resolved = await this.resolveUser(
            payload.userRequest?.user?.properties?.appUserId,
            startedAt
        );
        if (resolved.kind !== 'LINKED') return this.guideCard(resolved.kind);
        if (this.kakaoChannelLinkService.isTurnInProgress(resolved.link)) {
            return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
        }
        const blockId = payload.action?.clientExtra?.block_id;
        if (
            typeof blockId !== 'string' ||
            !/^[1-9]\d{0,18}$/.test(blockId) ||
            BigInt(blockId) > 9223372036854775807n
        ) {
            return this.invalidSelectionResponse(resolved.userId);
        }
        await this.setBudget(startedAt);
        const activity = await this.blockService.findExperience(blockId, resolved.userId);
        if (!activity) return this.invalidSelectionResponse(resolved.userId);
        await this.setBudget(startedAt);
        if (!(await this.kakaoChannelLinkService.selectBlock(resolved.userId, activity.id))) {
            return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
        }
        return {
            userId: resolved.userId,
            blockId: activity.id,
            name: activity.content?.trim() ? activity.content : '이름 없는 활동',
        };
    }

    // appUserId(카카오 앱 회원번호)로 Folioo 사용자를 찾는다.
    // 1) 연결 행 → 2) 카카오 가입자면 social_user(KAKAO)로 찾아 연결 행 자동 생성.
    // 탈퇴(비활성) 사용자의 연결은 지워서 같은 카카오 계정으로 재가입·재연결할 수 있게 한다.
    async resolveUser(
        appUserId: string | undefined,
        startedAt?: number
    ): Promise<ResolvedKakaoUser> {
        if (!appUserId) {
            return { kind: 'UNLINKED' };
        }

        const budget = async () => {
            if (startedAt !== undefined) await this.setBudget(startedAt);
        };
        await budget();
        const link = await this.kakaoChannelLinkService.findByKakaoAppUserId(appUserId);
        if (link) {
            await budget();
            const user = await this.userService.findByIdOrThrow(link.userId);
            if (!user.isDeactivated()) {
                return this.toResolved(user, link);
            }
            await budget();
            await this.kakaoChannelLinkService.unlink(link.userId);
        }

        await budget();
        const kakaoUser = await this.userService.findByKakaoLoginId(appUserId);
        if (!kakaoUser || kakaoUser.isDeactivated()) {
            return { kind: 'UNLINKED' };
        }

        await budget();
        const createdLink = await this.kakaoChannelLinkService.link(kakaoUser.id, appUserId);
        return this.toResolved(kakaoUser, createdLink);
    }

    private setBudget(startedAt: number): Promise<void> {
        return this.kakaoChannelLinkService.setQueryTimeout(this.remaining(startedAt, 1000) || 1);
    }

    private toResolved(user: User, link: KakaoChannelLink): ResolvedKakaoUser {
        return user.status === UserStatus.PENDING
            ? { kind: 'PENDING' }
            : { kind: 'LINKED', userId: user.id, link };
    }

    private async activityListResponse(
        userId: number,
        description: string = KAKAO_MESSAGES.SELECT_ACTIVITY,
        needsSelection = false
    ): Promise<KakaoSkillResDTO> {
        const activities = await this.blockService.findRecentExperiences(userId);
        if (!activities.length) {
            return textCardResponse(KAKAO_MESSAGES.NO_ACTIVITY, [
                {
                    action: 'webLink',
                    label: '웹에서 활동 만들기',
                    webLinkUrl: this.configService.getOrThrow<string>(
                        'KAKAO_WEB_ACTIVITY_LIST_URL'
                    ),
                },
            ]);
        }
        const buttons: KakaoButton[] = [
            {
                action: 'webLink',
                label: '웹에서 활동 보기',
                webLinkUrl: this.configService.getOrThrow<string>('KAKAO_WEB_EXPERIENCE_URL'),
            },
        ];
        if (needsSelection)
            buttons.unshift({
                action: 'message',
                label: '활동 선택하기',
                messageText: '/활동변경',
            });
        return textCardResponse(
            description,
            buttons,
            activityQuickReplies(
                activities,
                this.configService.getOrThrow<string>('KAKAO_SELECT_ACTIVITY_BLOCK_ID')
            )
        );
    }

    private unavailableActivityResponse(): KakaoSkillResDTO {
        return textCardResponse(KAKAO_MESSAGES.ACTIVITY_NOT_FOUND, [
            {
                action: 'message',
                label: '활동 다시 선택',
                messageText: '/활동변경',
            },
        ]);
    }

    private async invalidSelectionResponse(userId: number): Promise<KakaoSkillResDTO> {
        const response = this.unavailableActivityResponse();
        const activities = await this.blockService.findRecentExperiences(userId);
        if (activities.length) {
            response.template.quickReplies = activityQuickReplies(
                activities,
                this.configService.getOrThrow<string>('KAKAO_SELECT_ACTIVITY_BLOCK_ID')
            );
        }
        return response;
    }

    private guideCard(kind: 'UNLINKED' | 'PENDING'): KakaoSkillResDTO {
        const webGuideUrl = this.configService.getOrThrow<string>('KAKAO_WEB_GUIDE_URL');
        return linkCardResponse(KAKAO_MESSAGES[kind], webGuideUrl);
    }

    remaining(startedAt: number, cap = 3000): number {
        // 마지막 직렬화·트랜잭션 정리용 여유도 남긴다.
        return Math.max(0, Math.min(cap, 3800 - (Date.now() - startedAt)));
    }

    failureResponse(): KakaoSkillResDTO {
        return textCardResponse(KAKAO_MESSAGES.AI_FAILED, [
            {
                action: 'webLink',
                label: '웹에서 다시 시도하기',
                webLinkUrl: this.configService.getOrThrow<string>('KAKAO_WEB_EXPERIENCE_URL'),
            },
        ]);
    }

    async prewarm(userId: number, blockId: string, startedAt: number): Promise<void> {
        const timeout = this.remaining(startedAt);
        if (!timeout) return;
        try {
            await this.sessions.getOrCreate(userId, blockId, timeout);
        } catch {
            this.logger.warn('Kakao session prewarm failed');
        }
    }

    async submit(
        userId: number,
        blockId: string,
        payload: KakaoSkillReqDTO,
        startedAt: number
    ): Promise<KakaoSkillResponse> {
        const utterance = payload.userRequest?.utterance;
        if (typeof utterance !== 'string' || !utterance.trim() || [...utterance].length > 500) {
            return textResponse(KAKAO_MESSAGES.INVALID_INPUT);
        }
        const callbackUrl = payload.userRequest?.callbackUrl;
        if (!this.turns.isValidCallbackUrl(callbackUrl)) return this.failureResponse();
        const requestId = randomUUID();
        try {
            // 만료된 잠금은 새 요청으로 덮기 전에 기존 결과를 한 번 확인한다.
            const previous = await this.kakaoChannelLinkService.findByUserId(userId);
            if (
                previous?.turnRequestId &&
                !this.kakaoChannelLinkService.isTurnInProgress(previous)
            ) {
                await this.recoverUser(
                    userId,
                    previous.turnRequestId,
                    this.remaining(startedAt, 1000)
                );
                const unresolved = await this.kakaoChannelLinkService.findByUserId(userId);
                if (unresolved?.turnRequestId === previous.turnRequestId) {
                    this.logger.warn('Kakao expired turn requires outcome verification', {
                        userId,
                        requestId: previous.turnRequestId,
                    });
                }
            }
            const sessionTimeout = this.remaining(startedAt, 1000);
            if (!sessionTimeout) return this.failureResponse();
            const session = await this.sessions.getOrCreate(userId, blockId, sessionTimeout);
            const reservationTimeout = this.remaining(startedAt);
            if (!reservationTimeout) return this.failureResponse();
            const reserved = await this.reserve(userId, blockId, requestId, reservationTimeout);
            if (!reserved) return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);

            const timeoutMs = this.remaining(startedAt);
            if (!timeoutMs) {
                await this.compensate(userId, requestId, this.remaining(startedAt, 500));
                return this.failureResponse();
            }
            const accepted = await this.turns.accept(
                session.sessionId,
                {
                    user_id: String(userId),
                    block_id: blockId,
                    request_id: requestId,
                    utterance,
                    callback_url: callbackUrl,
                    expires_at: new Date(startedAt + 50_000).toISOString(),
                },
                timeoutMs
            );
            if (accepted === 'REJECTED') {
                await this.compensate(userId, requestId, this.remaining(startedAt, 500));
                return this.failureResponse();
            }
            return { version: '2.0', useCallback: true, data: { text: KAKAO_MESSAGES.ACCEPTED } };
        } catch (error) {
            if (
                error instanceof BusinessException &&
                (error.getResponse() as { errorCode?: string }).errorCode ===
                    ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED
            ) {
                return textResponse(KAKAO_MESSAGES.DAILY_LIMIT);
            }
            this.logger.error('Kakao turn preparation failed');
            return this.failureResponse();
        }
    }

    @Transactional()
    async reserve(
        userId: number,
        blockId: string,
        requestId: string,
        timeoutMs: number
    ): Promise<boolean> {
        const startedAt = Date.now();
        const remaining = () => Math.max(1, timeoutMs - (Date.now() - startedAt));
        await this.usage.lockUser(userId, timeoutMs);
        await this.kakaoChannelLinkService.setQueryTimeout(remaining());
        const user = await this.userService.findByIdOrThrow(userId);
        if (user.isDeactivated() || user.status !== UserStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        await this.kakaoChannelLinkService.setQueryTimeout(remaining());
        await this.blockService.findExperienceOrThrow(blockId, userId);
        await this.kakaoChannelLinkService.setQueryTimeout(remaining());
        if (!(await this.kakaoChannelLinkService.acquireTurnLock(userId, blockId, requestId)))
            return false;
        await this.usage.consume(userId, requestId, new Date(), remaining());
        return true;
    }

    @Transactional()
    async complete(body: CompleteKakaoTurnReqDTO, timeoutMs = 3000): Promise<string> {
        const startedAt = Date.now();
        const remaining = () => Math.max(1, timeoutMs - (Date.now() - startedAt));
        const userId = Number(body.user_id);
        await this.usage.lockUser(userId, remaining());
        await this.kakaoChannelLinkService.setQueryTimeout(remaining());
        if (!(await this.usage.hasReservation(userId, body.request_id)))
            return '카카오 턴 완료를 확인했습니다.';
        if (body.outcome === 'COMMIT_UNKNOWN') return '카카오 턴 결과를 확인하고 있습니다.';
        if (body.outcome === 'FAILED')
            await this.usage.markFailed(userId, body.request_id, remaining());
        await this.kakaoChannelLinkService.setQueryTimeout(remaining());
        await this.kakaoChannelLinkService.releaseTurnLock(userId, body.request_id);
        return '카카오 턴 완료를 확인했습니다.';
    }

    private async compensate(userId: number, requestId: string, timeoutMs = 3000): Promise<void> {
        this.rejected.set(requestId, userId);
        if (!timeoutMs) return;
        try {
            await this.complete(
                {
                    user_id: String(userId),
                    request_id: requestId,
                    outcome: 'FAILED',
                    delivery_status: 'NOT_ATTEMPTED',
                },
                timeoutMs
            );
            this.rejected.delete(requestId);
        } catch {
            this.logger.error('Kakao rejected turn compensation failed');
        }
    }

    async recoverUser(userId: number, requestId: string, timeoutMs = 1000): Promise<void> {
        const startedAt = Date.now();
        if (!timeoutMs) return;
        if (this.rejected.has(requestId)) {
            await this.compensate(userId, requestId, timeoutMs);
            return;
        }
        const status = await this.turns.getStatus(userId, requestId, timeoutMs);
        if (!status || !['SUCCEEDED', 'FAILED', 'EXPIRED'].includes(status.state)) return;
        await this.complete(
            {
                user_id: String(userId),
                request_id: requestId,
                outcome: status.state === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
                delivery_status: status.delivery_status,
            },
            Math.max(1, timeoutMs - (Date.now() - startedAt))
        );
    }

    @Interval(10_000)
    async recoverPending(): Promise<void> {
        if (this.recovering) return;
        this.recovering = true;
        try {
            // 연결 행이 삭제되거나 새 턴으로 바뀌어도 이미 확정된 미접수 보상은 재시도한다.
            for (const [requestId, userId] of [...this.rejected].slice(0, 10)) {
                await this.compensate(userId, requestId, 1000);
            }
            const pending = await this.kakaoChannelLinkService.findPendingTurns(
                this.recoveryCursor
            );
            this.recoveryCursor = pending.at(-1)?.userId ?? 0;
            await Promise.all(
                pending.map(async (link) => {
                    try {
                        await this.recoverUser(link.userId, link.turnRequestId!);
                    } catch {
                        this.logger.error('Kakao turn recovery failed');
                    }
                })
            );
        } catch {
            this.logger.error('Kakao pending turn scan failed');
        } finally {
            this.recovering = false;
        }
    }
}
