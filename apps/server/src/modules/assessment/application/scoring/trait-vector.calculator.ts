import { TraitVector, TraitAnswer } from '../../domain/types';
import { ALL_TRAIT_KINDS, TraitKind } from '../../domain/enums/trait-kind.enum';
import { SCALE_MIN, SCALE_MAX } from '../../constants/scoring.constant';
import {
    TRAIT_QUESTION_MAP,
    TRADEOFF_PAIRS,
    TRADEOFF_SCORE_TABLE,
    TRAIT_ANSWER_COUNT,
} from '../../constants/traits.constant';

// 순수 함수: 15개 응답 -> 6차원 성향 벡터. 1~12번은 응답값 그대로, 13~15번은
// 대립쌍 배점표를 적용한다. 특성별로 3문항(1~12에서 2 + 13~15에서 1) 합산 후 평균.
export function calculateTraitVector(answers: readonly TraitAnswer[]): TraitVector {
    assertValidAnswers(answers);

    const sums: Record<TraitKind, number> = {
        [TraitKind.INVESTIGATIVE]: 0,
        [TraitKind.SOCIAL]: 0,
        [TraitKind.ENTERPRISING]: 0,
        [TraitKind.CONVENTIONAL]: 0,
        [TraitKind.REALISTIC]: 0,
        [TraitKind.ARTISTIC]: 0,
    };

    const answerByQuestionNo = new Map(answers.map((a) => [a.questionNo, a.value]));

    for (const [questionNoStr, trait] of Object.entries(TRAIT_QUESTION_MAP)) {
        const value = answerByQuestionNo.get(Number(questionNoStr))!;
        sums[trait] += value;
    }

    for (const pair of TRADEOFF_PAIRS) {
        const value = answerByQuestionNo.get(pair.questionNo)!;
        const [leftScore, rightScore] = TRADEOFF_SCORE_TABLE[value];
        sums[pair.left] += leftScore;
        sums[pair.right] += rightScore;
    }

    const vector = {} as TraitVector;
    for (const trait of ALL_TRAIT_KINDS) {
        vector[trait] = sums[trait] / 3;
    }
    return vector;
}

function assertValidAnswers(answers: readonly TraitAnswer[]): void {
    if (answers.length !== TRAIT_ANSWER_COUNT) {
        throw new Error(
            `Expected exactly ${TRAIT_ANSWER_COUNT} trait answers, got ${answers.length}`
        );
    }
    const questionNos = new Set(answers.map((a) => a.questionNo));
    if (questionNos.size !== TRAIT_ANSWER_COUNT) {
        throw new Error('Duplicate questionNo in trait answers');
    }
    for (let q = 1; q <= TRAIT_ANSWER_COUNT; q++) {
        if (!questionNos.has(q)) {
            throw new Error(`Missing answer for questionNo ${q}`);
        }
    }
    for (const answer of answers) {
        if (
            !Number.isInteger(answer.value) ||
            answer.value < SCALE_MIN ||
            answer.value > SCALE_MAX
        ) {
            throw new Error(
                `Answer value out of range for questionNo ${answer.questionNo}: ${answer.value}`
            );
        }
    }
}
