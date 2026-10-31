import { TraitKind } from '../domain/enums/trait-kind.enum';

// 실제 검사지 1~12번 문항 텍스트 기준 확정 매핑.
// 6점 척도 방향: "그렇다"=6(그 특성이 강함), "그렇지 않다"=1. 13~15번 트레이드오프 표와
// 동일하게 "동의할수록 점수가 높아지는" 방향으로 통일되어 있다.
export const TRAIT_QUESTION_MAP: Readonly<Record<number, TraitKind>> = {
    1: TraitKind.SOCIAL, // 누군가에게 도움이 되는 일을 할 때 보람을 느낀다.
    2: TraitKind.INVESTIGATIVE, // 바로 답을 찾기보다 가설을 세우고 검증해 보는 편이다.
    3: TraitKind.REALISTIC, // 무언가를 만들거나 고쳐서 눈에 보이는 결과를 내는 일에 흥미가 있다.
    4: TraitKind.ENTERPRISING, // 목표를 세우고 사람들을 이끌어 결과를 만드는 일이 재미있다.
    5: TraitKind.ARTISTIC, // 글, 이미지, 영상 등으로 생각과 감정을 표현하는 활동을 즐긴다.
    6: TraitKind.CONVENTIONAL, // 정해진 절차와 기준에 따라 일을 체계적으로 처리할 때 만족스럽다.
    7: TraitKind.INVESTIGATIVE, // 자료나 데이터를 살펴보며 원인과 규칙을 찾아내는 과정이 재미있다.
    8: TraitKind.ARTISTIC, // 기존 방식보다 나만의 아이디어와 표현으로 결과물을 만들고 싶다.
    9: TraitKind.CONVENTIONAL, // 일의 세세한 부분까지 빠짐없이 정리해야 마음이 편하다.
    10: TraitKind.ENTERPRISING, // 내 아이디어에 사람들을 설득해 실행으로 옮기는 일이 흥미롭다.
    11: TraitKind.SOCIAL, // 다른 사람의 고민을 듣고 해결 방법을 함께 찾는 데 관심이 있다.
    12: TraitKind.REALISTIC, // 직접 기계나 장비를 다루며 문제를 해결하는 일이 즐겁다.
};

export interface TradeoffPair {
    questionNo: number;
    left: TraitKind;
    right: TraitKind;
}

// 13~15번: 두 특성의 트레이드오프 문항.
export const TRADEOFF_PAIRS: readonly TradeoffPair[] = [
    { questionNo: 13, left: TraitKind.ENTERPRISING, right: TraitKind.INVESTIGATIVE },
    { questionNo: 14, left: TraitKind.REALISTIC, right: TraitKind.SOCIAL },
    { questionNo: 15, left: TraitKind.ARTISTIC, right: TraitKind.CONVENTIONAL },
];

// 6단계 응답(1~6) -> [좌측 배점, 우측 배점]. 응답값 1이 "그렇다", 6이 "그렇지 않다"를 뜻한다.
export const TRADEOFF_SCORE_TABLE: Readonly<Record<number, readonly [number, number]>> = {
    1: [5.5, 0.5], // 그렇다
    2: [4.5, 1.5], // 그렇다 -1
    3: [3.5, 2.5], // 그렇다 -2
    4: [2.5, 3.5], // 그렇지 않다 -2
    5: [1.5, 4.5], // 그렇지 않다 -1
    6: [0.5, 5.5], // 그렇지 않다
};

export const TRAIT_ANSWER_COUNT = 15;
