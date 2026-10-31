import { SectionKind } from '../enums/section-kind.enum';

// AI 서버는 이 값을 기동 시 캐시하고 1시간 TTL로 재사용한다.
// 슬롯 문구(placeholder/example)를 바꿀 때마다 반드시 갱신할 것.
export const TEMPLATE_CATALOG_VERSION = '2026-08-20';

export interface CategorySlot {
    slotId: string;
    sectionKind: SectionKind;
    slot: string;
    placeholder: string;
    example: string;
    isAnchor: boolean;
}

export interface SubTemplateSlot {
    slotId: string;
    slot: string;
    placeholder: string;
    example: string;
}

export interface SubTemplate {
    sectionKind: SectionKind;
    templateId: string;
    label: string;
    slots: SubTemplateSlot[];
}

// level 4 카테고리 슬롯 (10개). 순서 = 화면/생성 순서.
export const CATEGORY_SLOTS: readonly CategorySlot[] = [
    {
        slotId: 'DETAIL.MOTIVATION',
        sectionKind: SectionKind.DETAIL,
        slot: 'MOTIVATION',
        placeholder:
            '어떤 계기로 이 활동을 시작했으며, 최종적으로 달성하고자 한 목표는 무엇인가요?',
        example:
            '교내 커뮤니티의 비효율적인 게시판형 거래 방식을 개선하고, 전공 서적 거래의 편의성과 신뢰도를 높이기 위한 전용 플랫폼 기획 및 앱 리뉴얼',
        isAnchor: false,
    },
    {
        slotId: 'DETAIL.PERIOD',
        sectionKind: SectionKind.DETAIL,
        slot: 'PERIOD',
        placeholder: '전체 진행 기간은 언제부터 언제까지였나요?',
        example: '2023.09 ~ 2023.12 (4개월)',
        isAnchor: false,
    },
    {
        slotId: 'DETAIL.ROLE',
        sectionKind: SectionKind.DETAIL,
        slot: 'ROLE',
        placeholder: '본인의 역할은 무엇이었으며, 전체 인원과 역할 분담은 어떻게 구성되었나요?',
        example: '기획 1명 (본인), 디자인 1명, 개발 2명 (총 4인 팀)',
        isAnchor: false,
    },
    {
        slotId: 'DETAIL.TARGET',
        sectionKind: SectionKind.DETAIL,
        slot: 'TARGET',
        placeholder: '주요 타깃, 사용자, 혹은 고객은 누구였나요?',
        example:
            '비싼 전공 서적 가격에 부담을 느끼며, 교내 직거래를 통해 택배비 절약과 빠른 거래를 원하는 대학생',
        isAnchor: false,
    },
    {
        slotId: 'DETAIL.STACK',
        sectionKind: SectionKind.DETAIL,
        slot: 'STACK',
        placeholder: '진행 과정에서 본인이 직접 활용한 기술, 방법론, 혹은 툴은 무엇인가요?',
        example: 'Figma, Notion, Slack, Google Analytics, IDI(심층 인터뷰), Usability Test',
        isAnchor: false,
    },
    {
        slotId: 'ACHIEVEMENT.QUANTITATIVE',
        sectionKind: SectionKind.ACHIEVEMENT,
        slot: 'QUANTITATIVE',
        placeholder: '수치로 증명할 수 있는 정량적인 성과는 무엇인가요?',
        example: '리뉴얼 전 대비 DAU(일간 활성 사용자) 150% 증가',
        isAnchor: false,
    },
    {
        slotId: 'ACHIEVEMENT.QUALITATIVE',
        sectionKind: SectionKind.ACHIEVEMENT,
        slot: 'QUALITATIVE',
        placeholder: '간접적인 지표로 확인할 수 있는 정성적인 성과는 무엇인가요?',
        example: '"검색부터 구매 약속까지 과정이 직관적이다"라는 사용자 피드백 다수 확보',
        isAnchor: false,
    },
    {
        slotId: 'TASK.SUMMARY',
        sectionKind: SectionKind.TASK,
        slot: 'SUMMARY',
        placeholder: '담당한 주요 업무 또는 역할을 적어주세요.',
        example: '사용자 리서치 및 문제 정의',
        isAnchor: true,
    },
    {
        slotId: 'PROBLEM_SOLVING.SUMMARY',
        sectionKind: SectionKind.PROBLEM_SOLVING,
        slot: 'SUMMARY',
        placeholder: '문제해결 에피소드를 한 줄로 요약해 주세요.',
        example: '신규 프로모션 페이지 가입 이탈 문제 해결',
        isAnchor: true,
    },
    {
        slotId: 'LEARNING.GROWTH',
        sectionKind: SectionKind.LEARNING,
        slot: 'GROWTH',
        placeholder:
            '이 활동을 통해 새롭게 배우거나 성장한 점은 무엇이며, 향후 어떻게 활용할 계획인가요?',
        example:
            '이번 프로젝트에서는 구글 애널리틱스를 기초적으로만 활용했지만, 향후에는 SQL을 학습하여 직접 DB에서 데이터를 추출하고 더 정교하게 사용자 행동 데이터를 분석해 보고 싶다.',
        isAnchor: false,
    },
];

// level 5 하위 템플릿 (7종 x 4슬롯 = 28개). TASK/PROBLEM_SOLVING 앵커 아래에만 붙는다.
export const SUB_TEMPLATES: readonly SubTemplate[] = [
    {
        sectionKind: SectionKind.TASK,
        templateId: 'BASIC',
        label: '기본',
        slots: [
            {
                slotId: 'TASK.BASIC.PURPOSE',
                slot: 'PURPOSE',
                placeholder:
                    '이 업무를 진행한 목적은 무엇이며, 구체적으로 어떤 목표를 달성하고자 했나요?',
                example:
                    '신규 브랜드 인지도를 확대하고, 2030 타겟 고객의 공식 SNS 채널 팔로워 1만 명 확보를 목표로 설정',
            },
            {
                slotId: 'TASK.BASIC.RESEARCH',
                slot: 'RESEARCH',
                placeholder:
                    '원활한 업무 수행을 위해 조사한 정보나 추가로 학습한 내용은 무엇인가요?',
                example:
                    '최근 소셜 미디어 알고리즘 변화와 타겟층이 선호하는 숏폼 영상 트렌드, 타사의 바이럴 성공 사례를 집중적으로 조사',
            },
            {
                slotId: 'TASK.BASIC.EXECUTION',
                slot: 'EXECUTION',
                placeholder: '실제 작업은 어떤 방식으로, 어떤 과정을 거쳐서 진행했나요?',
                example:
                    '브랜드 핵심 메시지를 15초 이내로 압축한 숏폼 시리즈를 제작하고, A/B 테스트를 통해 반응률이 높은 소재에 광고 예산을 집중하는 방식으로 운영',
            },
            {
                slotId: 'TASK.BASIC.RESULT',
                slot: 'RESULT',
                placeholder:
                    '업무 완료 후 나타난 결과는 무엇이며, 이 과정을 통해 배운 점은 무엇인가요?',
                example:
                    '캠페인 한 달 만에 목표 팔로워 1만 명을 조기 달성했으며, 영상 도입부 3초의 시각적 요소가 사용자 체류 시간과 전환에 미치는 결정적인 영향을 체득',
            },
        ],
    },
    {
        sectionKind: SectionKind.PROBLEM_SOLVING,
        templateId: 'BASIC',
        label: '기본',
        slots: [
            {
                slotId: 'PROBLEM_SOLVING.BASIC.PROBLEM',
                slot: 'PROBLEM',
                placeholder: '어떤 문제가 발생했으며, 이를 해결해야 했던 이유는 무엇인가요?',
                example:
                    '신규 프로모션 페이지 이탈률 70% 초과, 목표 가입자 수 달성을 위해 전환율 개선 필요',
            },
            {
                slotId: 'PROBLEM_SOLVING.BASIC.CAUSE',
                slot: 'CAUSE',
                placeholder: '문제의 원인은 무엇이었고, 어떤 방식으로 원인을 파악했나요?',
                example:
                    'GA4 퍼널 분석으로 사용자 이탈 구간을 추적하여, 모호한 CTA 카피와 복잡한 혜택 설명이 가입 단계의 병목 원인임을 확인',
            },
            {
                slotId: 'PROBLEM_SOLVING.BASIC.SOLUTION',
                slot: 'SOLUTION',
                placeholder: '해결책을 도출한 과정과 구체적인 실행 방법은 무엇인가요?',
                example:
                    '핵심 혜택을 직관적으로 강조한 3가지 카피로 A/B 테스트 기획 후 일정 기간 노출하여 클릭률 변화를 추적',
            },
            {
                slotId: 'PROBLEM_SOLVING.BASIC.RESULT',
                slot: 'RESULT',
                placeholder:
                    '해결책 적용 후 나타난 결과와 그 검증 방법, 그리고 이 과정을 통해 배운 점은 무엇인가요?',
                example:
                    '개선안 적용 후 가입 전환율 15% 상승, 타깃 니즈에 맞춘 직관적인 메시징과 데이터 기반 가설 검증의 중요성을 체득',
            },
        ],
    },
    {
        sectionKind: SectionKind.PROBLEM_SOLVING,
        templateId: 'INTERPERSONAL',
        label: '대인관계',
        slots: [
            {
                slotId: 'PROBLEM_SOLVING.INTERPERSONAL.SITUATION',
                slot: 'SITUATION',
                placeholder: '누구와 어떤 상황에서 의견 차이나 문제가 발생했나요?',
                example:
                    '자료 조사 범위와 회의 진행 방식을 두고 팀원들 간의 의견 대립 및 참여도 저하 발생',
            },
            {
                slotId: 'PROBLEM_SOLVING.INTERPERSONAL.ACTION',
                slot: 'ACTION',
                placeholder: '문제를 해결하기 위해 상대방과 어떻게 소통하고 어떤 행동을 취했나요?',
                example:
                    '팀원들과 개별 면담을 통해 각자의 불만 사항과 상황을 청취. 이후 회의 시간 제한, 역할 재분배 등 모두가 동의할 수 있는 명확한 규칙 수립 및 제안',
            },
            {
                slotId: 'PROBLEM_SOLVING.INTERPERSONAL.OUTCOME',
                slot: 'OUTCOME',
                placeholder:
                    '본인의 대응으로 인해 상대방의 반응이나 상황은 어떻게 변화하고 마무리되었나요?',
                example:
                    '새로운 규칙 도입 후 팀원들이 불만을 해소하고 적극적으로 아이디어를 제시하기 시작했으며, 갈등 없이 기한 내에 최종 기획서 제출 완료',
            },
            {
                slotId: 'PROBLEM_SOLVING.INTERPERSONAL.LEARNING',
                slot: 'LEARNING',
                placeholder:
                    '이 과정을 통해 배운 점은 무엇이며, 향후 유사한 상황에 어떻게 적용할 계획인가요?',
                example:
                    '상호 존중을 바탕으로 한 개별 소통과 명확한 규칙 수립이 팀워크에 미치는 긍정적인 영향을 배움. 향후 협업 시 초기 단계부터 명확한 역할 분담과 규칙을 세팅할 계획',
            },
        ],
    },
    {
        sectionKind: SectionKind.PROBLEM_SOLVING,
        templateId: 'PERFORMANCE',
        label: '성과 부진 개선',
        slots: [
            {
                slotId: 'PROBLEM_SOLVING.PERFORMANCE.METRIC',
                slot: 'METRIC',
                placeholder:
                    '문제가 된 성과 지표는 무엇이며, 목표치와 실제 상태의 차이는 어느 정도였나요?',
                example: '뉴스레터 오픈율 목표치는 25%이지만, 12%에 머물러 있어 개선이 시급한 상황',
            },
            {
                slotId: 'PROBLEM_SOLVING.PERFORMANCE.CAUSE',
                slot: 'CAUSE',
                placeholder: '목표에 도달하지 못한 근본적인 원인을 무엇으로 분석했나요?',
                example:
                    '기존 구독자 데이터 분석 결과, 발송 시간대가 타깃의 주 활동 시간과 맞지 않고 제목이 길어 클릭을 유도하지 못함을 확인',
            },
            {
                slotId: 'PROBLEM_SOLVING.PERFORMANCE.ACTION',
                slot: 'ACTION',
                placeholder: '개선을 위해 기존 방식을 어떻게 변경하고 어떤 새로운 시도를 했나요?',
                example:
                    '발송 시간을 출근 시간대로 변경하고, 제목을 15자 이내로 단축하여 핵심 키워드를 전면에 배치',
            },
            {
                slotId: 'PROBLEM_SOLVING.PERFORMANCE.RESULT',
                slot: 'RESULT',
                placeholder: '실행 후 지표는 어떻게 달라졌으며, 개선 효과를 어떻게 검증했나요?',
                example:
                    '변경 후 오픈율 28%로 상승. A/B 테스트를 통해 제목 길이와 발송 시간의 상관관계를 교차 검증하여 효과 입증',
            },
        ],
    },
    {
        sectionKind: SectionKind.PROBLEM_SOLVING,
        templateId: 'TROUBLESHOOTING',
        label: '기술 트러블슈팅',
        slots: [
            {
                slotId: 'PROBLEM_SOLVING.TROUBLESHOOTING.PROBLEM',
                slot: 'PROBLEM',
                placeholder:
                    '어떤 문제가 발생했으며, 그 문제가 미친 구체적인 영향 범위는 어디까지였나요?',
                example:
                    '대규모 트래픽 발생 시 결제 페이지 로딩 속도가 5초 이상 지연되어 사용자의 결제 이탈 발생',
            },
            {
                slotId: 'PROBLEM_SOLVING.TROUBLESHOOTING.CAUSE',
                slot: 'CAUSE',
                placeholder:
                    '문제의 원인은 무엇이었으며, 이를 파악하기 위해 어떤 검증 과정을 거쳤나요?',
                example:
                    'APM 툴을 활용해 병목 구간을 모니터링한 결과, 불필요한 데이터베이스 쿼리의 중복 호출이 원인임을 확인',
            },
            {
                slotId: 'PROBLEM_SOLVING.TROUBLESHOOTING.SOLUTION',
                slot: 'SOLUTION',
                placeholder:
                    '어떤 해결책을 선택하여 적용했으며, 여러 방법 중 그 방법을 채택한 이유는 무엇인가요?',
                example:
                    '쿼리 최적화 및 캐싱(Redis) 도입 선택. 서버 증설보다 비용 효율적이고 근본적인 성능 개선이 가능하기 때문',
            },
            {
                slotId: 'PROBLEM_SOLVING.TROUBLESHOOTING.VERIFICATION',
                slot: 'VERIFICATION',
                placeholder:
                    '해결 여부를 어떻게 검증했으며, 재발 방지를 위해 어떤 대책을 수립했나요?',
                example:
                    '부하 테스트 도구로 시뮬레이션하여 응답 속도가 1초 이내로 단축됨을 확인. 이후 슬로우 쿼리 알림 모니터링 시스템 구축',
            },
        ],
    },
    {
        sectionKind: SectionKind.PROBLEM_SOLVING,
        templateId: 'FEEDBACK',
        label: '피드백 대응',
        slots: [
            {
                slotId: 'PROBLEM_SOLVING.FEEDBACK.RECEIVED',
                slot: 'RECEIVED',
                placeholder: '어떤 요청이나 불편 사항, 피드백이 반복적으로 접수되었나요?',
                example: '사내 비품 신청 과정이 전반적으로 어렵다는 불만이 다수 접수됨',
            },
            {
                slotId: 'PROBLEM_SOLVING.FEEDBACK.NEED',
                slot: 'NEED',
                placeholder:
                    '표면적인 의견 뒤에 있는 실제 니즈나 근본적인 문제점은 무엇으로 파악했나요?',
                example:
                    '신청 양식 간소화뿐만 아니라, 신청 내역과 투명한 진행 상황 공유가 사용자들의 핵심 니즈임을 파악',
            },
            {
                slotId: 'PROBLEM_SOLVING.FEEDBACK.ACTION',
                slot: 'ACTION',
                placeholder: '이를 해결하기 위해 구체적으로 어떤 대응책이나 개선안을 실행했나요?',
                example:
                    'Notion을 활용하여 신청 양식을 통일하고, 칸반 보드 형태로 처리 상태를 실시간으로 확인 가능하게 개선',
            },
            {
                slotId: 'PROBLEM_SOLVING.FEEDBACK.OUTCOME',
                slot: 'OUTCOME',
                placeholder: '조치 이후 피드백을 준 대상의 반응이나 상황은 어떻게 달라졌나요?',
                example:
                    '비품 신청 관련 중복 문의가 80% 감소했으며, 팀원들로부터 업무 효율성과 투명성이 크게 높아졌다는 긍정적 피드백 확보',
            },
        ],
    },
    {
        sectionKind: SectionKind.PROBLEM_SOLVING,
        templateId: 'RECOVERY',
        label: '실패 회복',
        slots: [
            {
                slotId: 'PROBLEM_SOLVING.RECOVERY.FAILURE',
                slot: 'FAILURE',
                placeholder: '아쉬웠던 결과, 구체적인 실수, 혹은 직면했던 한계는 무엇이었나요?',
                example:
                    '첫 프로젝트 진행 시, 아이디어 기획에 과도한 시간을 쏟아 핵심 기능 구현을 기한 내에 마치지 못함',
            },
            {
                slotId: 'PROBLEM_SOLVING.RECOVERY.CAUSE',
                slot: 'CAUSE',
                placeholder:
                    '이러한 결과나 실수가 발생하게 된 핵심적인 원인은 무엇이라고 판단했나요?',
                example:
                    '완벽한 결과물을 만들고자 하는 욕심으로 인해, MVP 정의와 작업의 우선순위 설정에 실패한 것이 원인',
            },
            {
                slotId: 'PROBLEM_SOLVING.RECOVERY.EFFORT',
                slot: 'EFFORT',
                placeholder: '이를 극복하고 보완하기 위해 구체적으로 어떤 노력을 했나요?',
                example:
                    '애자일 방법론과 스프린트 개념을 학습하고, 다음 프로젝트부터는 핵심 기능 위주로 백로그를 작성하여 일정 관리 방식을 개선',
            },
            {
                slotId: 'PROBLEM_SOLVING.RECOVERY.CHANGE',
                slot: 'CHANGE',
                placeholder: '이전과 비교하여 결과가 어떻게 변화했나요?',
                example:
                    '두 번째 프로젝트에서는 주어진 기한 내에 성공적으로 프로토타입을 배포하고 사용자 테스트까지 완료하며 목표 달성',
            },
        ],
    },
];

export const DEFAULT_SUB_TEMPLATE_ID = 'BASIC';

export function getCategorySlotsForSection(sectionKind: SectionKind): CategorySlot[] {
    return CATEGORY_SLOTS.filter((slot) => slot.sectionKind === sectionKind);
}

export function getAnchorSlot(sectionKind: SectionKind): CategorySlot | null {
    return CATEGORY_SLOTS.find((slot) => slot.sectionKind === sectionKind && slot.isAnchor) ?? null;
}

export function getSubTemplatesForSection(sectionKind: SectionKind): SubTemplate[] {
    return SUB_TEMPLATES.filter((template) => template.sectionKind === sectionKind);
}

export function getSubTemplate(sectionKind: SectionKind, templateId: string): SubTemplate | null {
    return (
        SUB_TEMPLATES.find(
            (template) => template.sectionKind === sectionKind && template.templateId === templateId
        ) ?? null
    );
}

export function getDefaultSubTemplate(sectionKind: SectionKind): SubTemplate | null {
    return getSubTemplate(sectionKind, DEFAULT_SUB_TEMPLATE_ID);
}

// AI 커밋 API가 slot_id -> placeholder를 부여할 때 쓴다. 카탈로그에 없으면 null(= unknown_slot_id).
export function findSlotPlaceholder(slotId: string): string | null {
    const categorySlot = CATEGORY_SLOTS.find((slot) => slot.slotId === slotId);
    if (categorySlot) {
        return categorySlot.placeholder;
    }

    for (const subTemplate of SUB_TEMPLATES) {
        const slot = subTemplate.slots.find((s) => s.slotId === slotId);
        if (slot) {
            return slot.placeholder;
        }
    }

    return null;
}
