// 카카오 오픈빌더 스킬 요청/응답 포맷 (필요한 필드만).
// https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format
//
// 요청은 class가 아닌 interface로 둔다. 전역 ValidationPipe(forbidNonWhitelisted)는 class DTO에만
// 적용되므로, 카카오가 보내는 수많은 필드 때문에 400이 나지 않게 검증을 건너뛰게 한다.
export interface KakaoSkillReqDTO {
    bot?: { id?: string };
    userRequest?: {
        utterance?: string;
        callbackUrl?: string;
        user?: {
            id?: string;
            properties?: { appUserId?: string; plusfriendUserKey?: string };
        };
    };
    action?: { clientExtra?: Record<string, unknown> };
}

export interface KakaoWebLinkButton {
    action: 'webLink';
    label: string;
    webLinkUrl: string;
}

export interface KakaoMessageButton {
    action: 'message';
    label: string;
    messageText: string;
}

export type KakaoButton = KakaoWebLinkButton | KakaoMessageButton;

export interface KakaoQuickReply {
    label: string;
    action: 'block';
    blockId: string;
    extra: { block_id: string };
}

export type KakaoOutput =
    | { simpleText: { text: string } }
    | { textCard: { title?: string; description: string; buttons: KakaoButton[] } };

export interface KakaoSkillResDTO {
    version: '2.0';
    template: { outputs: KakaoOutput[]; quickReplies?: KakaoQuickReply[] };
}

export interface KakaoCallbackResDTO {
    version: '2.0';
    useCallback: true;
    data: { text: string };
}

export type KakaoSkillResponse = KakaoSkillResDTO | KakaoCallbackResDTO;
