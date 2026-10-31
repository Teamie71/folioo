import { ValueKind, VALUE_DISPLAY_PRECEDENCE } from '../enums/value-kind.enum';

export interface ValueComparisonCard {
    left: ValueKind;
    right: ValueKind;
    leftCard: string;
    rightCard: string;
}

// 5개 가치의 모든 쌍(5C2=10) 카드 문구. 실제 대결은 이 중 이진삽입정렬이 필요로 하는
// 5~8개만 골라 순서대로 묻는다. left/right는 VALUE_DISPLAY_PRECEDENCE 기준으로 고정.
const CATALOG: readonly ValueComparisonCard[] = [
    {
        left: ValueKind.REWARD,
        right: ValueKind.WORK_LIFE_BALANCE,
        leftCard: '초봉이 평균의 1.5배지만, 매일 야근하고 주말에도 연락을 받아요.',
        rightCard: '매일 18시에 퇴근하고 주말은 온전히 쉴 수 있지만, 초봉은 평균의 0.8배예요.',
    },
    {
        left: ValueKind.STABILITY,
        right: ValueKind.WORK_LIFE_BALANCE,
        leftCard: '정년까지 안정적으로 다니기 좋지만, 매일 새벽까지 야근해야 해요.',
        rightCard:
            '매일 18시 퇴근하고 주말은 쉬지만, 회사 사정에 따라 맡는 일이 자주 바뀔 수 있어요.',
    },
    {
        left: ValueKind.NAME_VALUE,
        right: ValueKind.WORK_LIFE_BALANCE,
        leftCard: '누구나 아는 큰 회사지만, 매일 야근하고 주말에도 종종 출근해요.',
        rightCard: '매일 18시에 퇴근하고 휴가 사용이 자유롭지만, 회사 이름은 낯설어요.',
    },
    {
        left: ValueKind.GROWTH,
        right: ValueKind.WORK_LIFE_BALANCE,
        leftCard:
            '입사 첫해부터 내 의견을 내고 일을 이끌 수 있지만, 바쁠 때는 밤과 주말을 내야 해요.',
        rightCard: '퇴근 후 시간은 확실히 지킬 수 있지만, 3년 동안 정해진 일만 맡아요.',
    },
    {
        left: ValueKind.REWARD,
        right: ValueKind.STABILITY,
        leftCard:
            '초봉이 평균의 1.5배지만, 성과에 따라 부서가 사라지거나 직무가 계속 바뀔 수 있어요.',
        rightCard:
            '매년 정해진 만큼 연봉이 오르고 갑작스런 부서 이동이 없지만, 초봉은 평균의 0.8배예요.',
    },
    {
        left: ValueKind.REWARD,
        right: ValueKind.NAME_VALUE,
        leftCard: '초봉이 평균의 1.5배이지만, 회사 이름을 아는 사람이 아무도 없어요.',
        rightCard: '누구나 아는 큰 회사이지만, 초봉은 평균의 0.8배예요.',
    },
    {
        left: ValueKind.REWARD,
        right: ValueKind.GROWTH,
        leftCard:
            '초봉이 평균의 1.5배이지만, 매일 같은 일을 반복하고 새로운 일을 배울 기회가 적어요.',
        rightCard:
            '입사 첫해부터 중요한 프로젝트를 맡아서 직접 해볼 수 있지만, 초봉은 평균의 0.8배예요.',
    },
    {
        left: ValueKind.STABILITY,
        right: ValueKind.NAME_VALUE,
        leftCard: '오래 다니고 승진도 예측하기 쉽지만, 회사 이름을 설명해야 할 만큼 낯설어요.',
        rightCard:
            '누구나 아는 회사라 경력은 돋보이지만, 조직 개편이 잦아 맡는 일이 계속 바뀔 수 있어요.',
    },
    {
        left: ValueKind.STABILITY,
        right: ValueKind.GROWTH,
        leftCard: '성과와 관계없이 안정적으로 다닐 수 있지만, 정해진 일만 반복적으로 해요.',
        rightCard:
            '입사하자마자 중요한 일을 맡을 수 있지만, 회사 방향이 바뀌면 내 역할도 크게 달라질 수 있어요.',
    },
    {
        left: ValueKind.NAME_VALUE,
        right: ValueKind.GROWTH,
        leftCard: '누구나 아는 회사에서 일하지만, 시키는대로만 반복적으로 일해야 해요.',
        rightCard:
            '처음부터 끝까지 프로젝트를 주도적으로 해볼 수 있지만, 회사 이름은 아무도 몰라요.',
    },
];

// a, b 순서와 무관하게 VALUE_DISPLAY_PRECEDENCE 기준으로 정렬된 카드를 돌려준다.
export function getComparisonCard(a: ValueKind, b: ValueKind): ValueComparisonCard {
    const [left, right] =
        VALUE_DISPLAY_PRECEDENCE.indexOf(a) < VALUE_DISPLAY_PRECEDENCE.indexOf(b) ? [a, b] : [b, a];
    const card = CATALOG.find((c) => c.left === left && c.right === right);
    if (!card) {
        throw new Error(`No comparison card found for pair: ${a}, ${b}`);
    }
    return card;
}
