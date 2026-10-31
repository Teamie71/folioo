import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

// AI 에이전트 일일 사용 한도 원장. request_id(한 턴) 단위로 1행이며,
// 실패 처리된 행은 사용 횟수에서 제외된다.
@Entity('ai_agent_usage')
@Index(['userId', 'usageDate'])
export class AiAgentUsage {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @PrimaryColumn({ name: 'request_id', type: 'uuid' })
    requestId: string;

    // 차감 기준일(KST, YYYY-MM-DD). 실패 후 재시도로 다시 차감되면 그날로 갱신된다.
    @Column({ name: 'usage_date', type: 'date' })
    usageDate: string;

    @Column({ type: 'boolean', default: false })
    failed: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
