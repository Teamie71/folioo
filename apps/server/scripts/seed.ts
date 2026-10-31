/**
 * Assessment(직무·기업형태 추천 분석) 배점 데이터 시더.
 *
 * pnpm seed --profile=sample      # 기본값. 소수 더미 배점, 로컬/CI용
 * pnpm seed --profile=production  # 실제 배점표(seeds/production/, gitignore 대상)
 *
 * onConflictDoUpdate(upsert)로 멱등하게 동작한다. 배점 튜닝 후 재실행이 잦기 때문이다.
 */
import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from '../src/app.module';
import { RulesetVersion } from '../src/modules/assessment/domain/ruleset-version.entity';
import { Job } from '../src/modules/assessment/domain/job.entity';
import { CompanyType } from '../src/modules/assessment/domain/company-type.entity';
import { Headline } from '../src/modules/assessment/domain/headline.entity';
import { MajorFieldConfig } from '../src/modules/assessment/domain/major-field-config.entity';
import {
    MajorField,
    MajorFieldType,
} from '../src/modules/assessment/domain/enums/major-field.enum';

const SEED_RULESET_VERSION = 'v1';
const DEFAULT_SUMMARY = '직무 소개 문구가 아직 준비되지 않았습니다.';
const DEFAULT_DESCRIPTION = '기업 형태 설명이 아직 준비되지 않았습니다.';

interface JobSeedRow {
    code: string;
    name: string;
    scoreInvestigative: number;
    scoreSocial: number;
    scoreEnterprising: number;
    scoreConventional: number;
    scoreRealistic: number;
    scoreArtistic: number;
    summary?: string;
    coreSkills?: string[];
    recommendedActivities?: string[];
}

interface CompanyTypeSeedRow {
    code: string;
    name: string;
    scoreWorkLifeBalance: number;
    scoreCompensation: number;
    scoreStability: number;
    scoreBrandValue: number;
    scoreGrowth: number;
    description?: string;
    tip?: string | null;
}

interface HeadlineSeedRow {
    topValue: string;
    topTrait: string;
    text: string;
}

interface MajorFieldConfigSeedRow {
    majorField: MajorField;
    type: MajorFieldType;
    targetJobCodes: string[];
}

interface ScoringPolicySeed {
    traitMatchCoefficient: number;
    majorBonusScore: number;
    rocWeights: number[];
    majorFieldConfigs: MajorFieldConfigSeedRow[];
}

function parseProfile(): 'sample' | 'production' {
    const arg = process.argv.find((a) => a.startsWith('--profile='));
    const value = arg ? arg.split('=')[1] : 'sample';
    if (value !== 'sample' && value !== 'production') {
        throw new Error(`Unknown --profile value: "${value}". Use sample or production.`);
    }
    return value;
}

function readJson<T>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `${filePath} not found. production 프로필은 실제 배점표(gitignore 대상)를 로컬에 직접 준비해야 합니다.`
        );
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

async function main(): Promise<void> {
    const profile = parseProfile();
    const rootDir = path.join(__dirname, '..');
    const jobs = readJson<JobSeedRow[]>(path.join(rootDir, 'seeds', profile, 'jobs.json'));
    const companyTypes = readJson<CompanyTypeSeedRow[]>(
        path.join(rootDir, 'seeds', profile, 'company-types.json')
    );
    const headlines = readJson<HeadlineSeedRow[]>(
        path.join(rootDir, 'seeds', profile, 'headlines.json')
    );
    const scoringPolicy = readJson<ScoringPolicySeed>(
        path.join(rootDir, 'seeds', profile, 'scoring-policy.json')
    );

    initializeTransactionalContext();
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });
    const dataSource = app.get<DataSource>(getDataSourceToken());

    try {
        const rulesetRepo = dataSource.getRepository(RulesetVersion);
        let ruleset = await rulesetRepo.findOne({ where: { version: SEED_RULESET_VERSION } });
        ruleset = await rulesetRepo.save(
            rulesetRepo.create({
                ...ruleset,
                version: SEED_RULESET_VERSION,
                note: `seeded via --profile=${profile}`,
                traitMatchCoefficient: scoringPolicy.traitMatchCoefficient,
                majorBonusScore: scoringPolicy.majorBonusScore,
                rocWeights: scoringPolicy.rocWeights,
            })
        );

        const jobRepo = dataSource.getRepository(Job);
        await jobRepo.upsert(
            jobs.map((job) => ({
                ...job,
                summary: job.summary ?? DEFAULT_SUMMARY,
                coreSkills: job.coreSkills ?? [],
                recommendedActivities: job.recommendedActivities ?? [],
                rulesetVersionId: ruleset.id,
            })),
            ['code', 'rulesetVersionId']
        );

        const companyTypeRepo = dataSource.getRepository(CompanyType);
        await companyTypeRepo.upsert(
            companyTypes.map((companyType) => ({
                ...companyType,
                description: companyType.description ?? DEFAULT_DESCRIPTION,
                tip: companyType.tip ?? null,
                rulesetVersionId: ruleset.id,
            })),
            ['code', 'rulesetVersionId']
        );

        const headlineRepo = dataSource.getRepository(Headline);
        await headlineRepo.upsert(headlines, ['topValue', 'topTrait']);

        const majorFieldConfigRepo = dataSource.getRepository(MajorFieldConfig);
        await majorFieldConfigRepo.upsert(
            scoringPolicy.majorFieldConfigs.map((config) => ({
                ...config,
                rulesetVersionId: ruleset.id,
            })),
            ['majorField', 'rulesetVersionId']
        );

        console.log(
            `Seeded profile=${profile} (ruleset ${ruleset.version}): ` +
                `${jobs.length} jobs, ${companyTypes.length} company types, ${headlines.length} headlines, ` +
                `${scoringPolicy.majorFieldConfigs.length} major field configs`
        );
    } finally {
        await app.close();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
