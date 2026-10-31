import { AI_AGENT_DAILY_LIMIT } from 'src/modules/block/application/services/ai-agent-usage.service';
import { KakaoLinkCard } from './kakao-skill-response';

// 카카오톡 챗봇 응답 문구. 회원 안내는 2026-09-30 확정 문구를 사용한다.
// 이미지 없는 안내는 textCard를 사용한다. title 50자, title + description 400자 이내.
export const KAKAO_MESSAGES = {
    UNLINKED: {
        title: 'Folioo 계정 연결이 필요해요',
        description:
            '카카오톡에서 경험을 정리하려면 Folioo 계정 연결이 필요해요.\n웹에서 기존 계정으로 로그인하거나 새로 가입한 뒤 카카오톡 채널 이용을 위한 연결을 완료해 주세요.\n완료 후 이 채팅으로 돌아와 활동을 선택해 주세요.',
        buttonLabel: 'Folioo 계정 연결하기',
    },
    PENDING: {
        title: '가입을 마무리해 주세요',
        description:
            'Folioo 가입과 약관 동의를 아직 마치지 않았어요.\n웹에서 가입을 마친 뒤 이 채팅으로 돌아와 활동을 선택해 주세요.',
        buttonLabel: '웹에서 가입 마무리',
    },
    INVALID_INPUT: '경험 내용은 500자 이내의 텍스트로 보내 주세요.',
    ACCEPTED: 'AI 에이전트가 경험을 정리하고 있어요.\n잠시만 기다려 주세요.',
    AI_FAILED: '앗, 작업 중 오류가 발생했어요.\n웹에서 다시 시도해주세요.',
    DAILY_LIMIT: `오늘 사용 가능한 ${AI_AGENT_DAILY_LIMIT}회를 모두 사용했어요. 내일 다시 이어서 도와드릴게요.`,
    ERROR: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
    NO_ACTIVITY:
        '아직 등록된 활동이 없어요. 「웹에서 활동 만들기」를 눌러 Folioo에 로그인한 뒤 활동을 만들어 주세요.\n완료 후 이 채팅으로 돌아와 활동을 선택해 주세요.',
    SELECT_ACTIVITY:
        '정리할 활동을 선택해 주세요.\n목록에 없는 활동은 Folioo 웹에서 이용해 주세요.',
    NEED_ACTIVITY: '어떤 활동에 정리할 내용인지 먼저 선택 후 내용을 알려주세요.',
    ACTIVITY_SELECTED: (name: string) =>
        `「${name}」 활동을 선택했어요.\n정리할 경험을 500자 이내의 텍스트로 보내 주세요.`,
    ACTIVITY_NOT_FOUND: '선택한 활동을 사용할 수 없어요.\n활동을 다시 선택해 주세요.',
    TURN_IN_PROGRESS:
        '이전 요청을 정리하고 있어요.\n정리가 끝난 뒤 활동을 변경하거나 새 내용을 보내 주세요.',
} as const satisfies Record<string, KakaoLinkCard | string | ((name: string) => string)>;
