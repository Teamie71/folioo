import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { MajorField, MajorFieldType } from './enums/major-field.enum';

// 전공-직무 매핑(어느 전공이 어느 직무에 가산/제한되는지)은 비즈니스 튜닝 데이터라
// 코드가 아니라 DB에 둔다. 부팅 시 ruleset.validator가 target_job_codes에 적힌 코드가
// 실제로 jobs 테이블에 존재하는지, 10개 전공 전부 설정이 있는지 검증한다.
@Entity('major_field_configs')
@Unique('major_field_configs_field_version_uq', ['majorField', 'rulesetVersionId'])
export class MajorFieldConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', name: 'major_field' })
    majorField: MajorField;

    @Column({ type: 'varchar' })
    type: MajorFieldType;

    // BONUS: 이 직무들에만 가산점. RESTRICTED: 이 직무들만 대상 풀이 됨. NEUTRAL: 빈 배열.
    @Column({ type: 'jsonb', name: 'target_job_codes' })
    targetJobCodes: string[];

    @Column({ name: 'ruleset_version_id' })
    rulesetVersionId: number;
}
