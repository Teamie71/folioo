import { ValueKind } from './enums/value-kind.enum';
import { TraitKind } from './enums/trait-kind.enum';

export type TraitVector = Record<TraitKind, number>;
export type ValueVector = Record<ValueKind, number>;

export interface TraitAnswer {
    questionNo: number;
    value: number;
}

export interface InputSnapshot {
    traitAnswers: TraitAnswer[];
    valueRanking: ValueKind[];
    majorField: string | null;
}

export interface ScoredJob {
    code: string;
    name: string;
    matchRate: number;
    summary: string;
    coreSkills: string[];
    recommendedActivities: string[];
}

export interface ScoredCompanyType {
    code: string;
    name: string;
    matchRate: number;
    description: string;
    tip: string | null;
}
