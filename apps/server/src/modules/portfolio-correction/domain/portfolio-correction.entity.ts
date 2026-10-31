import { BaseEntity } from '../../../common/entities/base.entity';
import { JobDescriptionType } from './enums/jobdescription-type.enum';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { CorrectionStatus } from './enums/correction-status.enum';
import { PdfExtractionStatus } from './enums/pdf-extraction-status.enum';

export const MAX_CORRECTIONS_PER_USER = 15;
export const COMPANY_INSIGHT_MAX_LENGTH = 2000;

@Entity()
export class PortfolioCorrection extends BaseEntity {
    @Column({ length: 20 })
    title: string;

    @Column({ length: 20 })
    companyName: string;

    @Column({ length: 20 })
    positionName: string;

    @Column({ length: 1000 })
    jobDescription: string;

    @Column({
        type: 'enum',
        enum: JobDescriptionType,
        default: JobDescriptionType.TEXT,
    })
    jobDescriptionType: JobDescriptionType;

    @Column({ length: COMPANY_INSIGHT_MAX_LENGTH, nullable: true })
    companyInsight: string;

    @Column({ length: 200, nullable: true })
    highlightPoint: string;

    @Column({ type: 'text', nullable: true })
    overallReview: string | null;

    @Column({ type: 'text', nullable: true })
    extractedText: string;

    @Column({ type: 'text', nullable: true })
    originalFileName: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    extractedAt: Date;

    @Column({
        type: 'enum',
        enum: PdfExtractionStatus,
        default: PdfExtractionStatus.NONE,
    })
    pdfExtractionStatus: PdfExtractionStatus;

    @Column({
        type: 'enum',
        enum: CorrectionStatus,
        default: CorrectionStatus.NOT_STARTED,
    })
    status: CorrectionStatus;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    static create(
        userId: number,
        title: string,
        companyName: string,
        positionName: string,
        jobDescription: string,
        jobDescriptionType: JobDescriptionType
    ): PortfolioCorrection {
        const correction = new PortfolioCorrection();
        correction.user = { id: userId } as User;
        correction.companyName = companyName;
        correction.positionName = positionName;
        correction.jobDescription = jobDescription;
        correction.jobDescriptionType = jobDescriptionType;
        correction.title = title;

        return correction;
    }
}
