import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { ValueKind } from '../../domain/enums/value-kind.enum';
import { RulesetVersionRepository } from '../../infrastructure/repositories/ruleset-version.repository';
import { JobRepository } from '../../infrastructure/repositories/job.repository';
import { CompanyTypeRepository } from '../../infrastructure/repositories/company-type.repository';
import { HeadlineRepository } from '../../infrastructure/repositories/headline.repository';
import { AssessmentResultRepository } from '../../infrastructure/repositories/assessment-result.repository';
import { MajorFieldConfigRepository } from '../../infrastructure/repositories/major-field-config.repository';
import { AssessmentResult } from '../../domain/assessment-result.entity';
import { MajorField } from '../../domain/enums/major-field.enum';
import { TraitAnswer, TraitVector, ValueVector } from '../../domain/types';
import { calculateTraitVector } from '../scoring/trait-vector.calculator';
import { calculateValueWeights } from '../scoring/value-weight.calculator';
import { resolveJobPool } from '../scoring/job-pool.resolver';
import { scoreJobs } from '../scoring/job-score.calculator';
import { scoreCompanyTypes } from '../scoring/company-type.calculator';
import { resolveTopTrait, resolveTopValue } from '../scoring/headline.resolver';
import { TOP_JOBS_COUNT, TOP_COMPANY_TYPES_COUNT } from '../../constants/scoring.constant';

export interface CreateAssessmentInput {
    userId: number | null;
    traitAnswers: TraitAnswer[];
    valueRanking: ValueKind[];
    majorField: MajorField | null;
}

@Injectable()
export class AssessmentService {
    constructor(
        private readonly rulesetVersionRepository: RulesetVersionRepository,
        private readonly jobRepository: JobRepository,
        private readonly companyTypeRepository: CompanyTypeRepository,
        private readonly headlineRepository: HeadlineRepository,
        private readonly assessmentResultRepository: AssessmentResultRepository,
        private readonly majorFieldConfigRepository: MajorFieldConfigRepository
    ) {}

    async createAssessment(input: CreateAssessmentInput): Promise<AssessmentResult> {
        const ruleset = await this.rulesetVersionRepository.findLatest();
        if (!ruleset) {
            throw new BusinessException(ErrorCode.ASSESSMENT_RULESET_NOT_READY);
        }

        let traitVector: TraitVector;
        let valueWeights: ValueVector;
        try {
            traitVector = calculateTraitVector(input.traitAnswers);
            valueWeights = calculateValueWeights(input.valueRanking, ruleset.rocWeights);
        } catch (error) {
            throw new BusinessException(
                ErrorCode.ASSESSMENT_INVALID_INPUT,
                error instanceof Error ? error.message : undefined
            );
        }

        const majorFieldConfigs = await this.majorFieldConfigRepository.findAllByRulesetVersionId(
            ruleset.id
        );
        const majorFieldConfigMap = new Map(majorFieldConfigs.map((c) => [c.majorField, c]));
        const jobPool = resolveJobPool(input.majorField, majorFieldConfigMap);
        const jobs = jobPool.isRestricted
            ? await this.jobRepository.findAllActiveByCodesAndRulesetVersionId(
                  jobPool.restrictedJobCodes,
                  ruleset.id
              )
            : await this.jobRepository.findAllActiveByRulesetVersionId(ruleset.id);

        const topJobs = scoreJobs(
            jobs.map((job) => ({
                code: job.code,
                name: job.name,
                traits: job.toTraitVector(),
                summary: job.summary,
                coreSkills: job.coreSkills,
                recommendedActivities: job.recommendedActivities,
            })),
            traitVector,
            jobPool.bonusJobCodes,
            TOP_JOBS_COUNT,
            ruleset.traitMatchCoefficient,
            ruleset.majorBonusScore
        );

        const companyTypes = await this.companyTypeRepository.findAllActiveByRulesetVersionId(
            ruleset.id
        );
        const [topCompanyType] = scoreCompanyTypes(
            companyTypes.map((companyType) => ({
                code: companyType.code,
                name: companyType.name,
                values: companyType.toValueVector(),
                description: companyType.description,
                tip: companyType.tip,
            })),
            valueWeights,
            TOP_COMPANY_TYPES_COUNT
        );

        const topTrait = resolveTopTrait(traitVector);
        const topValue = resolveTopValue(input.valueRanking);
        const headline = await this.headlineRepository.findByValueAndTrait(topValue, topTrait);

        const result = AssessmentResult.create({
            userId: input.userId,
            rulesetVersion: ruleset.version,
            inputSnapshot: {
                traitAnswers: input.traitAnswers,
                valueRanking: input.valueRanking,
                majorField: input.majorField,
            },
            traitVector,
            valueRanking: input.valueRanking,
            valueWeights,
            headline: headline?.text ?? '',
            topJobs,
            companyType: topCompanyType,
        });

        return this.assessmentResultRepository.save(result);
    }

    async getResultOrThrow(uuid: string): Promise<AssessmentResult> {
        const result = await this.assessmentResultRepository.findByUuid(uuid);
        if (!result) {
            throw new BusinessException(ErrorCode.ASSESSMENT_NOT_FOUND);
        }
        return result;
    }

    async claim(uuid: string, userId: number): Promise<AssessmentResult> {
        const result = await this.getResultOrThrow(uuid);
        if (result.claimedAt) {
            throw new BusinessException(ErrorCode.ASSESSMENT_ALREADY_CLAIMED);
        }
        result.claim(userId);
        return this.assessmentResultRepository.save(result);
    }

    async getStatusForUser(userId: number): Promise<AssessmentResult | null> {
        return this.assessmentResultRepository.findLatestByUserId(userId);
    }
}
