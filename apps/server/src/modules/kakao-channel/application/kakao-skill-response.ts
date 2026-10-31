import type {
    KakaoButton,
    KakaoOutput,
    KakaoQuickReply,
    KakaoSkillResDTO,
} from './dtos/kakao-skill.dto';

export const QUICK_REPLY_LABEL_MAX = 14;

export interface KakaoLinkCard {
    title: string;
    description: string;
    buttonLabel: string;
}

function response(output: KakaoOutput): KakaoSkillResDTO {
    return { version: '2.0', template: { outputs: [output] } };
}

export function textResponse(text: string): KakaoSkillResDTO {
    return response({ simpleText: { text } });
}

export function linkCardResponse(card: KakaoLinkCard, webLinkUrl: string): KakaoSkillResDTO {
    return response({
        textCard: {
            title: card.title,
            description: card.description,
            buttons: [{ action: 'webLink', label: card.buttonLabel, webLinkUrl }],
        },
    });
}

export function textCardResponse(
    description: string,
    buttons: KakaoButton[],
    quickReplies?: KakaoQuickReply[]
): KakaoSkillResDTO {
    const result = response({ textCard: { description, buttons } });
    if (quickReplies?.length) result.template.quickReplies = quickReplies;
    return result;
}

export function activityQuickReplies(
    activities: { id: string; name: string }[],
    selectActivityBlockId: string
): KakaoQuickReply[] {
    return activities.slice(0, 10).map(({ id, name }) => {
        const characters = Array.from(name);
        const label =
            characters.length > QUICK_REPLY_LABEL_MAX
                ? `${characters.slice(0, QUICK_REPLY_LABEL_MAX - 1).join('')}…`
                : name;
        return { label, action: 'block', blockId: selectActivityBlockId, extra: { block_id: id } };
    });
}
