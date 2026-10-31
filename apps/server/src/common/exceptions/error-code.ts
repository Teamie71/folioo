import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

interface ErrorDetail {
    message: string;
    statusCode: HttpStatus;
}

export const ErrorMap: Record<ErrorCode, ErrorDetail> = {
    [ErrorCode.KAKAO_LINK_TOKEN_INVALID]: {
        message: '카카오 연결 정보가 유효하지 않습니다. 다시 시도해 주세요.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.KAKAO_ACCOUNT_ALREADY_LINKED]: {
        message: '이미 다른 Folioo 계정에 연결된 카카오 계정입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.KAKAO_CHANNEL_ALREADY_LINKED]: {
        message: '이미 다른 카카오 계정이 연결되어 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.BAD_REQUEST]: {
        message: '잘못된 요청입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.UNAUTHORIZED]: {
        message: '유효하지 않은 사용자입니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.INTERNAL_SERVER_ERROR]: {
        message: '잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.NOT_IMPLEMENTED]: {
        message: '아직 구현되지 않은 기능입니다.',
        statusCode: HttpStatus.NOT_IMPLEMENTED,
    },
    [ErrorCode.AI_RELAY_REQUEST_FAILED]: {
        message: 'AI 서버 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.INVALID_SOCIAL_PROFILE]: {
        message: '소셜 로그인 프로필 정보가 유효하지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.REFRESH_TOKEN_EXPIRED]: {
        message: '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.REFRESH_TOKEN_MISSING]: {
        message: '리프레시 토큰이 없습니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.INVALID_REFRESH_TOKEN]: {
        message: '유효하지 않은 토큰입니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.DEACTIVATED_USER]: {
        message: '탈퇴한 사용자입니다.',
        statusCode: HttpStatus.UNAUTHORIZED,
    },
    [ErrorCode.PENDING_USER]: {
        message: '약관 동의가 필요합니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.SOCIAL_UNLINK_FAILED]: {
        message: '소셜 계정 연결 해제에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.ALREADY_VERIFY_USER]: {
        message: '이미 인증 이력이 있는 번호입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.SMS_CODE_MISMATCH]: {
        message: '인증 번호가 일치하지 않습니다. 다시 확인해 주세요.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.SMS_CODE_NOT_FOUND]: {
        message: '인증 시간이 만료되었습니다. 재전송 버튼을 눌러주세요.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.USER_NOT_FOUND]: {
        message: '해당하는 사용자를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.REQUIRED_TERMS_NOT_AGREED]: {
        message: '필수 약관에 모두 동의해야 합니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.ALREADY_AGREED_USER]: {
        message: '이미 약관에 동의한 사용자입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.TERM_NOT_FOUND]: {
        message: '해당하는 약관을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.PORTFOLIO_NOT_FOUND]: {
        message: '해당하는 포트폴리오를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.PORTFOLIO_EXTRACT_FAILED]: {
        message: 'AI 서버 텍스트 추출에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.BAD_GATEWAY,
    },
    [ErrorCode.INTERVIEW_AI_RELAY_FAILED]: {
        message: 'AI 인터뷰 세션 중계에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.CORRECTION_NOT_FOUND]: {
        message: '해당하는 첨삭 결과를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.CORRECTION_MAX_LIMIT]: {
        message: '포트폴리오 첨삭은 최대 15개까지 가질 수 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED]: {
        message: '포트폴리오 첨삭은 최대 5개의 활동블록(포트폴리오)을 가질 수 있습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.COMPANY_INSIGHT_ALREADY_EXISTS]: {
        message: '기업 분석 정보가 이미 존재합니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.COMPANY_INSIGHT_NOT_READY]: {
        message: '기업 분석 정보가 아직 생성되지 않았습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.CORRECTION_INVALID_STATUS_TRANSITION]: {
        message: '유효하지 않은 첨삭 상태 전이입니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.CORRECTION_PDF_EXTRACTION_INVALID_STATUS]: {
        message: 'PDF 추출 상태가 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.CORRECTION_PDF_EXTRACTION_EMPTY_ACTIVITIES]: {
        message: 'PDF 추출 결과에 activities가 없습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.CORRECTION_AI_RELAY_FAILED]: {
        message: 'AI 첨삭 생성 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    [ErrorCode.EVENT_NOT_FOUND]: {
        message: '해당하는 이벤트를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.EVENT_PARTICIPATION_NOT_FOUND]: {
        message: '해당하는 이벤트 참여 기록을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.EVENT_NOT_ACTIVE]: {
        message: '현재 활성화된 이벤트가 아닙니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH]: {
        message: '요청한 질문지가 해당 이벤트와 일치하지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.BLOCK_NOT_FOUND]: {
        message: '블록을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.BLOCK_PARENT_NOT_FOUND]: {
        message: '부모 블록을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.BLOCK_NOT_DELETABLE]: {
        message: '삭제할 수 없는 블록입니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.BLOCK_NOT_EDITABLE]: {
        message: '수정할 수 없는 블록입니다.',
        statusCode: HttpStatus.FORBIDDEN,
    },
    [ErrorCode.BLOCK_INVALID_PLACEMENT]: {
        message: '해당 위치에 생성할 수 없는 블록 종류입니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.BLOCK_CONTENT_TOO_LONG]: {
        message: '허용된 글자 수를 초과했습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.BLOCK_LEVEL_LOCKED]: {
        message: '해당 블록은 다른 블록의 하위로 이동할 수 없습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.BLOCK_SECTION_ALREADY_EXISTS]: {
        message: '이미 존재하는 카테고리입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT]: {
        message: '다른 곳에서 먼저 수정되었습니다. 최신 상태를 다시 불러와 주세요.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_MAP_NOT_INITIALIZED]: {
        message: '경험 정리 맵이 아직 생성되지 않았습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.EXPERIENCE_MAP_REQUEST_ID_REUSED]: {
        message: '이미 사용된 요청 ID이며 내용이 일치하지 않습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.EXPERIENCE_MAP_REVERT_EXPIRED]: {
        message: '되돌릴 수 없는 요청입니다. 최신 기록이 아니거나 유효 시간이 지났습니다.',
        statusCode: HttpStatus.GONE,
    },
    [ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY]: {
        message: '해당 레벨에서는 허용되지 않는 작업입니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.EXPERIENCE_MAP_INVALID_TARGET]: {
        message: '대상 블록의 소유권 또는 수정 가능 여부가 유효하지 않습니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.EXPERIENCE_MAP_UNKNOWN_SLOT_ID]: {
        message: '템플릿 카탈로그에 존재하지 않는 slotId입니다.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    },
    [ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED]: {
        message: '오늘 AI 에이전트 사용 횟수를 모두 사용했습니다.',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
    },
    [ErrorCode.ASSESSMENT_NOT_FOUND]: {
        message: '해당 직무·기업형태 추천 분석 결과를 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.ASSESSMENT_ALREADY_CLAIMED]: {
        message: '이미 다른 계정에 등록된 결과입니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.ASSESSMENT_INVALID_INPUT]: {
        message: '응답 데이터가 올바르지 않습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.ASSESSMENT_RULESET_NOT_READY]: {
        message: '아직 배점 데이터가 준비되지 않았습니다.',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    },
    [ErrorCode.ASSESSMENT_VALUE_BALANCE_NOT_FOUND]: {
        message: '해당 가치관 밸런스게임 세션을 찾을 수 없습니다.',
        statusCode: HttpStatus.NOT_FOUND,
    },
    [ErrorCode.ASSESSMENT_VALUE_BALANCE_ALREADY_COMPLETED]: {
        message: '이미 완료된 가치관 밸런스게임은 응답을 수정할 수 없습니다.',
        statusCode: HttpStatus.CONFLICT,
    },
    [ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_SEQUENCE]: {
        message: '아직 도달하지 않은 질문에는 응답할 수 없습니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
    [ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_ANSWER]: {
        message: '해당 질문의 두 선택지 중 하나가 아닙니다.',
        statusCode: HttpStatus.BAD_REQUEST,
    },
};
