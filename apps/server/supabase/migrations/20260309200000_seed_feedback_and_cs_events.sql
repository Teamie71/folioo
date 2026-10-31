-- Seed FEEDBACK and CS events for admin manual reward granting
INSERT INTO "event" (
    "code", "title", "description", "cta_text", "cta_link",
    "reward_config", "goal_config", "ui_config", "ops_config",
    "start_date", "end_date", "is_active", "max_participation", "display_order"
) VALUES
(
    'FEEDBACK_OBT_W1',
    '피드백 제출',
    'OBT 1주차 피드백 제출 보상',
    '경험 정리하기',
    '/experience',
    '[{"type": "EXPERIENCE", "quantity": 1}, {"type": "PORTFOLIO_CORRECTION", "quantity": 1}]'::jsonb,
    NULL,
    '{"feedbackModal": {"eligibleTitle": "사용 후기 남기고, 추가 이용권 받으세요!", "eligibleDescription": "첫 피드백을 남겨주시면,\n감사의 마음을 담아 원하시는 무료 이용권을 드려요.\n\n이용권은 2 영업일 이내에 지급돼요.", "rewardedTitle": "Folioo 사용 후기를 알려주세요!", "rewardedDescription": "피드백을 남겨주시면,\n소중한 의견을 참고하여 더 나은 Folioo를 만들게요.", "ctaText": "피드백 남기기"}}'::jsonb,
    '{"manualRewardOnly": true, "allowFeedbackAfterReward": true}'::jsonb,
    '2026-03-08', '2026-03-15', true, 1, 10
),
(
    'FEEDBACK_OBT_W2',
    '피드백 제출',
    'OBT 2주차 피드백 제출 보상',
    '경험 정리하기',
    '/experience',
    '[{"type": "EXPERIENCE", "quantity": 1}, {"type": "PORTFOLIO_CORRECTION", "quantity": 1}]'::jsonb,
    NULL,
    '{"feedbackModal": {"eligibleTitle": "사용 후기 남기고, 추가 이용권 받으세요!", "eligibleDescription": "첫 피드백을 남겨주시면,\n감사의 마음을 담아 원하시는 무료 이용권을 드려요.\n\n이용권은 2 영업일 이내에 지급돼요.", "rewardedTitle": "Folioo 사용 후기를 알려주세요!", "rewardedDescription": "피드백을 남겨주시면,\n소중한 의견을 참고하여 더 나은 Folioo를 만들게요.", "ctaText": "피드백 남기기"}}'::jsonb,
    '{"manualRewardOnly": true, "allowFeedbackAfterReward": true}'::jsonb,
    '2026-03-16', '2026-03-22', true, 1, 11
),
(
    'FEEDBACK',
    '피드백 제출',
    '피드백 제출 보상 (상시)',
    '경험 정리하기',
    '/experience',
    '[{"type": "EXPERIENCE", "quantity": 1}, {"type": "PORTFOLIO_CORRECTION", "quantity": 1}]'::jsonb,
    NULL,
    '{"feedbackModal": {"eligibleTitle": "사용 후기 남기고, 추가 이용권 받으세요!", "eligibleDescription": "첫 피드백을 남겨주시면,\n감사의 마음을 담아 원하시는 무료 이용권을 드려요.\n\n이용권은 2 영업일 이내에 지급돼요.", "rewardedTitle": "Folioo 사용 후기를 알려주세요!", "rewardedDescription": "피드백을 남겨주시면,\n소중한 의견을 참고하여 더 나은 Folioo를 만들게요.", "ctaText": "피드백 남기기"}}'::jsonb,
    '{"manualRewardOnly": true, "allowFeedbackAfterReward": true}'::jsonb,
    '2026-03-23', NULL, true, 1, 12
),
(
    'CS',
    '서비스 이용 불편에 대한',
    'CS 보상 (관리자 수동 지급, 다중 지급 가능)',
    '경험 정리하기',
    '/experience',
    '[]'::jsonb,
    NULL, NULL,
    '{"manualRewardOnly": true, "allowMultipleRewards": true}'::jsonb,
    '2026-03-08', NULL, true, 1, 20
)
ON CONFLICT ("code") DO UPDATE SET
    "title" = EXCLUDED."title",
    "description" = EXCLUDED."description",
    "cta_text" = EXCLUDED."cta_text",
    "cta_link" = EXCLUDED."cta_link",
    "reward_config" = EXCLUDED."reward_config",
    "ui_config" = EXCLUDED."ui_config",
    "ops_config" = EXCLUDED."ops_config",
    "display_order" = EXCLUDED."display_order";
