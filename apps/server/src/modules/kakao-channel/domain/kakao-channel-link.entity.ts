import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// 카카오톡 채널(챗봇)에서 사용자를 식별하기 위한 연결. 로그인 수단이 아니다.
@Entity('kakao_channel_link')
export class KakaoChannelLink {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    // 스킬 요청의 userRequest.user.properties.appUserId (카카오 앱 회원번호)
    @Column({ name: 'kakao_app_user_id', type: 'varchar', length: 64, unique: true })
    kakaoAppUserId: string;

    @Column({ name: 'current_block_id', type: 'bigint', nullable: true })
    currentBlockId: string | null;

    @Column({ name: 'activity_selected_at', type: 'timestamptz', nullable: true })
    activitySelectedAt: Date | null;

    @Column({ name: 'turn_request_id', type: 'uuid', nullable: true })
    turnRequestId: string | null;

    @Column({ name: 'turn_locked_until', type: 'timestamptz', nullable: true })
    turnLockedUntil: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    static create(userId: number, kakaoAppUserId: string): KakaoChannelLink {
        const link = new KakaoChannelLink();
        link.userId = userId;
        link.kakaoAppUserId = kakaoAppUserId;
        link.currentBlockId = null;
        link.activitySelectedAt = null;
        return link;
    }

    hasDeletedActivity(): boolean {
        return this.currentBlockId === null && this.activitySelectedAt !== null;
    }
}
